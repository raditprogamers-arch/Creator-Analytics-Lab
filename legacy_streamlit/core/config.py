"""Configuration management for Creator Analytics Lab.

Supports loading database credentials and app settings from:
1. Streamlit Secrets (for Streamlit Cloud or .streamlit/secrets.toml)
2. Local .env file (standard python-dotenv)
3. Local .env.local file (Neon CLI default)
4. System environment variables
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any
from urllib.parse import urlparse
import dotenv

# Load .env.local and .env
BASE_DIR = Path(__file__).resolve().parent.parent
dotenv.load_dotenv(BASE_DIR / ".env.local")
dotenv.load_dotenv(BASE_DIR / ".env")


def get_secret(key: str, default: Optional[str] = None) -> Optional[str]:
    """Retrieve secret from Streamlit secrets if running in Streamlit,
    otherwise fallback to environment variables."""
    try:
        import streamlit as st
        if hasattr(st, "secrets") and key in st.secrets:
            return str(st.secrets[key])
    except Exception:
        pass
    return os.environ.get(key, default)


def get_database_url() -> Optional[str]:
    """Retrieve raw DATABASE_URL from environment or secrets."""
    return get_secret("DATABASE_URL")


def get_unpooled_database_url() -> Optional[str]:
    """Retrieve optional unpooled direct DATABASE_URL."""
    return get_secret("DATABASE_URL_UNPOOLED")


def normalize_sqlalchemy_url(url: Optional[str]) -> Optional[str]:
    """Convert standard postgres:// or postgresql:// URLs into
    SQLAlchemy-compatible postgresql+psycopg:// URLs."""
    if not url:
        return None
    url = url.strip()
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://") and not url.startswith("postgresql+"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def mask_database_url(url: Optional[str]) -> str:
    """Safely mask password in database URL for logs or UI display."""
    if not url:
        return "Not Configured"
    try:
        parsed = urlparse(url)
        netloc = parsed.hostname or "unknown"
        if parsed.port:
            netloc += f":{parsed.port}"
        user = parsed.username or "user"
        masked = f"{parsed.scheme}://{user}:****@{netloc}{parsed.path}"
        return masked
    except Exception:
        return "postgresql://***:****@***/***"


# Supported metadata constants according to specs
SUPPORTED_PLATFORMS = [
    {"name": "YouTube", "platform_type": "video", "description": "Long-form videos, Music videos, Live streams"},
    {"name": "TikTok", "platform_type": "short_video", "description": "Short-form vertical video clips"},
    {"name": "Spotify", "platform_type": "music_streaming", "description": "Audio music releases and podcast streams"},
    {"name": "Instagram", "platform_type": "short_video", "description": "Reels, posts, and creator clips"},
    {"name": "Apple Music", "platform_type": "music_streaming", "description": "Audio music releases and streams"},
]

CONTENT_TYPES = [
    "music_cover",
    "original_song",
    "short_form",
    "long_form",
    "live_stream",
    "music_release",
    "podcast",
    "other",
]

SUPPORTED_LANGUAGES = [
    {"code": "id", "name": "Indonesian"},
    {"code": "en", "name": "English"},
    {"code": "ja", "name": "Japanese"},
    {"code": "jv", "name": "Javanese"},
    {"code": "su", "name": "Sundanese"},
    {"code": "multi", "name": "Multilingual"},
    {"code": "inst", "name": "Instrumental"},
]

