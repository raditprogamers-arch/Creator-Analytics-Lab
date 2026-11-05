"""Data cleaning and type normalization utilities for Creator Analytics Lab."""

import re
from datetime import datetime, timezone
from typing import Optional, Any, Union
import pandas as pd


def clean_text(val: Any) -> Optional[str]:
    """Clean and trim string value. Returns None if empty or NaN."""
    if val is None or pd.isna(val):
        return None
    s = str(val).strip()
    return s if s else None


def clean_numeric(val: Any) -> Optional[float]:
    """Convert raw input to clean float.
    Crucial Rule: Distinguish missing/null values from 0.0.
    Returns None if missing/unparseable; returns float if valid number."""
    if val is None or pd.isna(val):
        return None
    if isinstance(val, (int, float)):
        return float(val)

    s = str(val).strip()
    if not s or s.lower() in ("nan", "none", "null", "-", "n/a", "na", ""):
        return None

    # Remove commas, spaces, currency symbols, and percentage signs
    s = s.replace(",", "").replace(" ", "").replace("%", "").replace("$", "")
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def clean_integer(val: Any) -> Optional[int]:
    """Convert to integer. Returns None if missing/unparseable."""
    num = clean_numeric(val)
    if num is None:
        return None
    return int(round(num))


def parse_datetime(val: Any) -> Optional[datetime]:
    """Parse date/datetime strings into UTC datetime objects.
    Preserves timezone information when available, converting to UTC."""
    if val is None or pd.isna(val):
        return None
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val.astimezone(timezone.utc)

    s = str(val).strip()
    if not s:
        return None

    # Common platform date formats
    date_formats = [
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y",
        "%b %d, %Y",
    ]

    for fmt in date_formats:
        try:
            dt = datetime.strptime(s, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            else:
                dt = dt.astimezone(timezone.utc)
            return dt
        except (ValueError, TypeError):
            continue

    # Fallback to dateutil / pandas parser if standard formats fail
    try:
        parsed = pd.to_datetime(s, utc=True)
        if pd.isna(parsed):
            return None
        return parsed.to_pydatetime()
    except Exception:
        return None

