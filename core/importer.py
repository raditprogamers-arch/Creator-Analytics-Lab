"""Modular platform import adapters and dataset ingestion engine."""

import json
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
from sqlalchemy import select, and_

from core.cleaner import clean_text, clean_numeric, parse_datetime
from core.validators import ValidationResult, validate_content_record, validate_metric_value
from core.database import (
    get_db_session,
    Platform,
    Content,
    ImportHistory,
    MetricSnapshot,
)


class BasePlatformAdapter(ABC):
    """Abstract base class for platform-specific CSV export structures."""

    platform_name: str = "Generic"

    @abstractmethod
    def detect(self, columns: List[str]) -> bool:
        """Return True if CSV headers match this platform's schema."""
        pass

    @abstractmethod
    def map_row(self, row: Dict[str, Any], default_captured_at: datetime) -> Dict[str, Any]:
        """Convert raw platform row dictionary to canonical content & metric structures."""
        pass


class YouTubeAdapter(BasePlatformAdapter):
    """Adapter for YouTube Studio Video Analytics CSV exports."""

    platform_name = "YouTube"

    def detect(self, columns: List[str]) -> bool:
        cols_lower = [c.strip().lower() for c in columns]
        return any("video" in c for c in cols_lower) and any("views" in c for c in cols_lower)

    def map_row(self, row: Dict[str, Any], default_captured_at: datetime) -> Dict[str, Any]:
        # Case-insensitive lookup helper
        lookup = {k.strip().lower(): v for k, v in row.items()}

        external_id = (
            lookup.get("video")
            or lookup.get("video id")
            or lookup.get("content")
            or lookup.get("id")
        )
        title = (
            lookup.get("video title")
            or lookup.get("title")
            or f"YouTube Video {external_id}"
        )
        published_at_raw = (
            lookup.get("video publish time")
            or lookup.get("published_at")
            or lookup.get("publish time")
        )

        content_data = {
            "external_id": clean_text(external_id),
            "title": clean_text(title),
            "content_type": clean_text(lookup.get("content_type")) or "long_form",
            "language": clean_text(lookup.get("language")),
            "published_at": parse_datetime(published_at_raw),
            "content_url": f"https://www.youtube.com/watch?v={external_id}" if external_id else None,
        }

        # Metrics mapping
        metrics: Dict[str, Optional[float]] = {
            "views": clean_numeric(lookup.get("views")),
            "watch_time_hours": clean_numeric(lookup.get("watch time (hours)") or lookup.get("watch time")),
            "likes": clean_numeric(lookup.get("likes")),
            "comments": clean_numeric(lookup.get("comments") or lookup.get("comments added")),
            "shares": clean_numeric(lookup.get("shares")),
            "subscribers": clean_numeric(lookup.get("subscribers")),
            "impressions": clean_numeric(lookup.get("impressions")),
        }

        return {
            "content": content_data,
            "metrics": {k: v for k, v in metrics.items() if v is not None},
            "captured_at": default_captured_at,
        }


class TikTokAdapter(BasePlatformAdapter):
    """Adapter for TikTok Analytics CSV exports."""

    platform_name = "TikTok"

    def detect(self, columns: List[str]) -> bool:
        cols_lower = [c.strip().lower() for c in columns]
        return any("tiktok" in c or "post time" in c or "video views" in c for c in cols_lower)

    def map_row(self, row: Dict[str, Any], default_captured_at: datetime) -> Dict[str, Any]:
        lookup = {k.strip().lower(): v for k, v in row.items()}

        external_id = (
            lookup.get("video id")
            or lookup.get("item id")
            or lookup.get("id")
        )
        title = (
            lookup.get("video title")
            or lookup.get("caption")
            or lookup.get("title")
            or f"TikTok Post {external_id}"
        )
        post_time_raw = lookup.get("post time") or lookup.get("create time") or lookup.get("published_at")

        content_data = {
            "external_id": clean_text(external_id),
            "title": clean_text(title),
            "content_type": clean_text(lookup.get("content_type")) or "short_form",
            "language": clean_text(lookup.get("language")),
            "published_at": parse_datetime(post_time_raw),
            "content_url": f"https://www.tiktok.com/@creator/video/{external_id}" if external_id else None,
        }

        metrics: Dict[str, Optional[float]] = {
            "views": clean_numeric(lookup.get("video views") or lookup.get("views") or lookup.get("play count")),
            "likes": clean_numeric(lookup.get("likes") or lookup.get("like count")),
            "comments": clean_numeric(lookup.get("comments") or lookup.get("comment count")),
            "shares": clean_numeric(lookup.get("shares") or lookup.get("share count")),
        }

        return {
            "content": content_data,
            "metrics": {k: v for k, v in metrics.items() if v is not None},
            "captured_at": default_captured_at,
        }


class SpotifyAdapter(BasePlatformAdapter):
    """Adapter for Spotify for Artists CSV exports."""

    platform_name = "Spotify"

    def detect(self, columns: List[str]) -> bool:
        cols_lower = [c.strip().lower() for c in columns]
        return any("streams" in c or "listeners" in c or "track" in c for c in cols_lower)

    def map_row(self, row: Dict[str, Any], default_captured_at: datetime) -> Dict[str, Any]:
        lookup = {k.strip().lower(): v for k, v in row.items()}

        external_id = lookup.get("track uri") or lookup.get("isrc") or lookup.get("track id") or lookup.get("id")
        title = lookup.get("track name") or lookup.get("track") or lookup.get("title")
        release_date_raw = lookup.get("release date") or lookup.get("published_at")

        content_data = {
            "external_id": clean_text(external_id),
            "title": clean_text(title),
            "content_type": clean_text(lookup.get("content_type")) or "music_release",
            "language": clean_text(lookup.get("language")),
            "published_at": parse_datetime(release_date_raw),
            "content_url": None,
        }

        metrics: Dict[str, Optional[float]] = {
            "streams": clean_numeric(lookup.get("streams")),
            "listeners": clean_numeric(lookup.get("listeners")),
            "saves": clean_numeric(lookup.get("saves")),
        }

        return {
            "content": content_data,
            "metrics": {k: v for k, v in metrics.items() if v is not None},
            "captured_at": default_captured_at,
        }


ADAPTERS = [YouTubeAdapter(), TikTokAdapter(), SpotifyAdapter()]


def get_adapter_for_platform(platform_name: str) -> Optional[BasePlatformAdapter]:
    """Retrieve corresponding platform adapter by name."""
    for adapter in ADAPTERS:
        if adapter.platform_name.lower() == platform_name.lower():
            return adapter
    return None


def auto_detect_adapter(columns: List[str]) -> Optional[BasePlatformAdapter]:
    """Attempt to detect platform adapter from CSV header signatures."""
    for adapter in ADAPTERS:
        if adapter.detect(columns):
            return adapter
    return None


def process_dataset_import(
    df: pd.DataFrame,
    filename: str,
    platform_name: str,
    captured_at: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Validate, clean, normalize, and persist imported creator dataset within a database transaction."""
    if captured_at is None:
        captured_at = datetime.now(timezone.utc)

    adapter = get_adapter_for_platform(platform_name) or YouTubeAdapter()
    val_result = ValidationResult()
    seen_external_ids = set()

    # Step 1: In-memory normalization and validation
    for idx, row in df.iterrows():
        raw_dict = row.to_dict()
        try:
            mapped = adapter.map_row(raw_dict, captured_at)
            content_attrs = mapped["content"]
            valid, err_msg = validate_content_record(int(idx) + 1, content_attrs, seen_external_ids)

            if not valid:
                val_result.add_rejected(int(idx) + 1, raw_dict, err_msg or "Validation failed")
                continue

            # Validate each metric value
            valid_metrics = {}
            for m_name, m_val in mapped["metrics"].items():
                m_valid, m_err = validate_metric_value(m_name, m_val)
                if m_valid and m_val is not None:
                    valid_metrics[m_name] = m_val

            mapped["metrics"] = valid_metrics
            val_result.add_valid(mapped)
        except Exception as e:
            val_result.add_rejected(int(idx) + 1, raw_dict, f"Row parsing exception: {str(e)}")

    # Step 2: Atomic database persistence
    with get_db_session() as session:
        # Get platform entity
        platform = session.execute(
            select(Platform).where(Platform.name == platform_name)
        ).scalar_one_or_none()
        if not platform:
            platform = Platform(name=platform_name, platform_type="creator_platform")
            session.add(platform)
            session.flush()

        # Create Import History record
        status = "completed" if val_result.rejected_count == 0 else ("partial" if val_result.valid_count > 0 else "failed")
        import_record = ImportHistory(
            filename=filename,
            platform_id=platform.id,
            imported_at=datetime.now(timezone.utc),
            total_rows=val_result.total_count,
            successful_rows=val_result.valid_count,
            rejected_rows=val_result.rejected_count,
            import_status=status,
            error_summary=json.dumps(val_result.rejected_rows[:100], default=str) if val_result.rejected_rows else None,
        )
        session.add(import_record)
        session.flush()

        saved_content_count = 0
        saved_snapshots_count = 0

        # Persist valid rows
        for item in val_result.valid_rows:
            c_info = item["content"]
            # Check if content already exists for this platform
            existing_content = session.execute(
                select(Content).where(
                    and_(
                        Content.platform_id == platform.id,
                        Content.external_id == c_info["external_id"],
                    )
                )
            ).scalar_one_or_none()

            if existing_content:
                # Update metadata if newer or provided
                if c_info.get("title"):
                    existing_content.title = c_info["title"]
                if c_info.get("content_type"):
                    existing_content.content_type = c_info["content_type"]
                if c_info.get("language"):
                    existing_content.language = c_info["language"]
                content_entity = existing_content
            else:
                content_entity = Content(
                    platform_id=platform.id,
                    external_id=c_info["external_id"],
                    title=c_info["title"],
                    content_type=c_info.get("content_type", "other"),
                    language=c_info.get("language"),
                    published_at=c_info.get("published_at"),
                    content_url=c_info.get("content_url"),
                )
                session.add(content_entity)
                session.flush()
                saved_content_count += 1

            # Insert metric snapshots for this point in time
            for m_name, m_val in item["metrics"].items():
                # Check for existing snapshot at exact same time to prevent duplicate error
                existing_snapshot = session.execute(
                    select(MetricSnapshot).where(
                        and_(
                            MetricSnapshot.content_id == content_entity.id,
                            MetricSnapshot.metric_name == m_name,
                            MetricSnapshot.captured_at == captured_at,
                        )
                    )
                ).scalar_one_or_none()

                if not existing_snapshot:
                    snapshot = MetricSnapshot(
                        content_id=content_entity.id,
                        import_id=import_record.id,
                        metric_name=m_name,
                        metric_value=m_val,
                        captured_at=captured_at,
                    )
                    session.add(snapshot)
                    saved_snapshots_count += 1

    return {
        "success": val_result.valid_count > 0,
        "import_id": import_record.id,
        "status": status,
        "total_rows": val_result.total_count,
        "successful_rows": val_result.valid_count,
        "rejected_rows": val_result.rejected_count,
        "new_contents_created": saved_content_count,
        "snapshots_recorded": saved_snapshots_count,
        "rejected_details": val_result.rejected_rows,
    }

