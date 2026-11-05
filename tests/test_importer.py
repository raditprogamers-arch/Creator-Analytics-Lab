from datetime import datetime, timezone
import pytest
from core.cleaner import clean_text, clean_numeric, clean_integer, parse_datetime
from core.importer import YouTubeAdapter, TikTokAdapter, SpotifyAdapter


def test_cleaner_numeric_distinguishes_zero_from_null():
    assert clean_numeric(0) == 0.0
    assert clean_numeric("0") == 0.0
    assert clean_numeric("1,234.56") == 1234.56
    assert clean_numeric(" 85% ") == 85.0
    assert clean_numeric(None) is None
    assert clean_numeric("N/A") is None
    assert clean_numeric("-") is None
    assert clean_numeric("") is None


def test_cleaner_integer():
    assert clean_integer("42") == 42
    assert clean_integer("1,000") == 1000
    assert clean_integer(None) is None


def test_parse_datetime_iso():
    dt = parse_datetime("2024-05-12T14:30:00Z")
    assert dt is not None
    assert dt.year == 2024
    assert dt.month == 5
    assert dt.tzinfo == timezone.utc


def test_youtube_adapter_mapping():
    adapter = YouTubeAdapter()
    assert adapter.detect(["Video", "Video title", "Views"]) is True
    
    row = {
        "Video": "dQw4w9WgXcQ",
        "Video title": "Never Gonna Give You Up Cover",
        "Views": "15,000",
        "Likes": "1,200",
        "Video publish time": "2024-01-15",
    }
    now_utc = datetime.now(timezone.utc)
    mapped = adapter.map_row(row, now_utc)
    
    assert mapped["content"]["external_id"] == "dQw4w9WgXcQ"
    assert mapped["content"]["title"] == "Never Gonna Give You Up Cover"
    assert mapped["metrics"]["views"] == 15000.0
    assert mapped["metrics"]["likes"] == 1200.0


def test_tiktok_adapter_mapping():
    adapter = TikTokAdapter()
    assert adapter.detect(["Video ID", "Post time", "Video views"]) is True
    
    row = {
        "Video ID": "7182930491",
        "Caption": "Singing practice session #music",
        "Video views": "5,400",
        "Likes": "450",
    }
    now_utc = datetime.now(timezone.utc)
    mapped = adapter.map_row(row, now_utc)
    
    assert mapped["content"]["external_id"] == "7182930491"
    assert mapped["content"]["title"] == "Singing practice session #music"
    assert mapped["metrics"]["views"] == 5400.0
    assert mapped["metrics"]["likes"] == 450.0

