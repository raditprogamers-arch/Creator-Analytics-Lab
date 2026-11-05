"""Database connectivity, schema definitions, and migration utilities for Creator Analytics Lab."""

import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from contextlib import contextmanager

from sqlalchemy import (
    create_engine,
    Engine,
    text,
    Column,
    Integer,
    String,
    Text,
    Numeric,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
    select,
)
from sqlalchemy.orm import (
    declarative_base,
    sessionmaker,
    Session,
    relationship,
)
from sqlalchemy.dialects.postgresql import JSONB

from core.config import (
    get_database_url,
    normalize_sqlalchemy_url,
    mask_database_url,
    SUPPORTED_PLATFORMS,
)

Base = declarative_base()


class Platform(Base):
    """Platform entity: YouTube, TikTok, Spotify, etc."""
    __tablename__ = "platforms"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True, index=True)
    platform_type = Column(String(50), nullable=False)  # video, short_video, music_streaming
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    contents = relationship("Content", back_populates="platform", cascade="all, delete-orphan")
    imports = relationship("ImportHistory", back_populates="platform")


class Content(Base):
    """Content entity: Published items across creator platforms."""
    __tablename__ = "contents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    platform_id = Column(Integer, ForeignKey("platforms.id", ondelete="CASCADE"), nullable=False, index=True)
    external_id = Column(String(255), nullable=False)  # Platform video/track/post ID
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    content_type = Column(String(50), nullable=False, index=True)  # music_cover, original_song, short_form, etc.
    language = Column(String(50), nullable=True, index=True)  # id, en, ja, jv, su, etc.
    published_at = Column(DateTime(timezone=True), nullable=True, index=True)
    content_url = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    platform = relationship("Platform", back_populates="contents")
    metric_snapshots = relationship("MetricSnapshot", back_populates="content", cascade="all, delete-orphan")

    __table_args__ = (
        # Ensure external ID is unique per platform
        UniqueConstraint("platform_id", "external_id", name="uq_content_platform_external_id"),
        Index("idx_contents_platform_published", "platform_id", "published_at"),
    )


class ImportHistory(Base):
    """Import operations log for auditability and error inspection."""
    __tablename__ = "import_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    platform_id = Column(Integer, ForeignKey("platforms.id", ondelete="SET NULL"), nullable=True, index=True)
    imported_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    total_rows = Column(Integer, default=0, nullable=False)
    successful_rows = Column(Integer, default=0, nullable=False)
    rejected_rows = Column(Integer, default=0, nullable=False)
    import_status = Column(String(50), nullable=False)  # completed, partial, failed
    error_summary = Column(Text, nullable=True)  # JSON or text summary of rejected rows

    # Relationships
    platform = relationship("Platform", back_populates="imports")
    metric_snapshots = relationship("MetricSnapshot", back_populates="import_record")


class MetricSnapshot(Base):
    """Historical performance measurements of content over time."""
    __tablename__ = "metric_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    content_id = Column(Integer, ForeignKey("contents.id", ondelete="CASCADE"), nullable=False, index=True)
    import_id = Column(Integer, ForeignKey("import_history.id", ondelete="SET NULL"), nullable=True)
    metric_name = Column(String(50), nullable=False, index=True)  # views, likes, comments, shares, etc.
    metric_value = Column(Numeric(16, 2), nullable=False)
    captured_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    content = relationship("Content", back_populates="metric_snapshots")
    import_record = relationship("ImportHistory", back_populates="metric_snapshots")

    __table_args__ = (
        # Prevent identical duplicate metric snapshots for the same content at the exact same timestamp
        UniqueConstraint("content_id", "metric_name", "captured_at", name="uq_metric_snapshot"),
        Index("idx_metric_content_name_time", "content_id", "metric_name", "captured_at"),
    )


# Engine singleton
_engine: Optional[Engine] = None
_session_factory: Optional[sessionmaker] = None


def get_engine() -> Engine:
    """Create or return existing SQLAlchemy engine connected to Neon PostgreSQL."""
    global _engine, _session_factory
    if _engine is None:
        raw_url = get_database_url()
        if not raw_url:
            raise ValueError(
                "DATABASE_URL is not set. Please configure DATABASE_URL in your .env file or Streamlit Secrets."
            )
        db_url = normalize_sqlalchemy_url(raw_url)
        _engine = create_engine(
            db_url,
            pool_pre_ping=True,  # Automatically tests connection vitality before use
            pool_recycle=300,   # Recycle connections every 5 minutes (ideal for serverless PostgreSQL)
            pool_size=5,
            max_overflow=10,
        )
        _session_factory = sessionmaker(bind=_engine, expire_on_commit=False)
    return _engine


@contextmanager
def get_db_session():
    """Context manager for safe database transactions."""
    get_engine()
    assert _session_factory is not None
    session: Session = _session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def test_connection() -> Dict[str, Any]:
    """Test connection to Neon PostgreSQL and gather operational metrics."""
    raw_url = get_database_url()
    if not raw_url:
        return {
            "success": False,
            "error": "DATABASE_URL environment variable is missing",
            "masked_url": "None",
        }

    start_time = time.time()
    try:
        engine = get_engine()
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT version(), current_database(), current_user, now();")
            ).fetchone()
            latency_ms = round((time.time() - start_time) * 1000, 2)

            # Check existing tables
            tables_query = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            existing_tables = [row[0] for row in conn.execute(tables_query).fetchall()]

            return {
                "success": True,
                "latency_ms": latency_ms,
                "version": result[0] if result else "Unknown",
                "database": result[1] if result else "Unknown",
                "user": result[2] if result else "Unknown",
                "server_time": str(result[3]) if result else "Unknown",
                "tables": existing_tables,
                "masked_url": mask_database_url(raw_url),
            }
    except Exception as e:
        return {
            "success": False,
            "latency_ms": round((time.time() - start_time) * 1000, 2),
            "error": str(e),
            "masked_url": mask_database_url(raw_url),
        }


def init_db() -> Dict[str, Any]:
    """Initialize schema tables and seed standard platforms."""
    engine = get_engine()
    Base.metadata.create_all(bind=engine)

    seeded_count = 0
    with get_db_session() as session:
        for p in SUPPORTED_PLATFORMS:
            existing = session.execute(
                select(Platform).where(Platform.name == p["name"])
            ).scalar_one_or_none()
            if not existing:
                platform = Platform(name=p["name"], platform_type=p["platform_type"])
                session.add(platform)
                seeded_count += 1

    return {
        "success": True,
        "tables_created": list(Base.metadata.tables.keys()),
        "platforms_seeded": seeded_count,
    }


def get_platforms() -> List[Dict[str, Any]]:
    """Retrieve all configured platforms."""
    try:
        with get_db_session() as session:
            platforms = session.execute(select(Platform).order_by(Platform.name)).scalars().all()
            return [
                {
                    "id": p.id,
                    "name": p.name,
                    "platform_type": p.platform_type,
                    "created_at": p.created_at,
                }
                for p in platforms
            ]
    except Exception:
        return []


def get_overview_counts() -> Dict[str, int]:
    """Retrieve entity counts for overview dashboard."""
    try:
        with get_db_session() as session:
            content_count = session.execute(text("SELECT COUNT(*) FROM contents")).scalar() or 0
            snapshots_count = session.execute(text("SELECT COUNT(*) FROM metric_snapshots")).scalar() or 0
            imports_count = session.execute(text("SELECT COUNT(*) FROM import_history")).scalar() or 0
            platforms_count = session.execute(text("SELECT COUNT(*) FROM platforms")).scalar() or 0
            return {
                "contents": content_count,
                "snapshots": snapshots_count,
                "imports": imports_count,
                "platforms": platforms_count,
            }
    except Exception:
        return {"contents": 0, "snapshots": 0, "imports": 0, "platforms": 0}

