from datetime import datetime, timezone
import pytest
import pandas as pd
from core.cleaner import clean_text, clean_numeric, clean_integer, parse_datetime
from core.importer import (
    YouTubeAdapter,
    TikTokAdapter,
    SpotifyAdapter,
    InstagramAdapter,
    CustomMappingAdapter,
    validate_dataset_dry_run,
    process_dataset_import,
    rollback_import,
)


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


def test_spotify_adapter_mapping():
    adapter = SpotifyAdapter()
    assert adapter.detect(["Track URI", "Track name", "Streams"]) is True

    row = {
        "Track URI": "spotify:track:4cOdK2wGLETKBW3PvgPWqT",
        "Track name": "Senja di Pelataran",
        "Release date": "2024-02-14",
        "Streams": "48,200",
        "Listeners": "14,300",
        "Saves": "3,200",
    }
    now_utc = datetime.now(timezone.utc)
    mapped = adapter.map_row(row, now_utc)

    assert mapped["content"]["external_id"] == "spotify:track:4cOdK2wGLETKBW3PvgPWqT"
    assert mapped["content"]["title"] == "Senja di Pelataran"
    assert mapped["metrics"]["streams"] == 48200.0
    assert mapped["metrics"]["listeners"] == 14300.0
    assert mapped["metrics"]["saves"] == 3200.0


def test_instagram_adapter_mapping():
    adapter = InstagramAdapter()
    assert adapter.detect(["Shortcode", "Caption", "Plays"]) is True

    row = {
        "Shortcode": "C5p91_zOqLa",
        "Caption": "Studio live session #vocals",
        "Publish time": "2024-04-05",
        "Plays": "22,400",
        "Likes": "2,850",
        "Comments": "142",
    }
    now_utc = datetime.now(timezone.utc)
    mapped = adapter.map_row(row, now_utc)

    assert mapped["content"]["external_id"] == "C5p91_zOqLa"
    assert mapped["content"]["title"] == "Studio live session #vocals"
    assert mapped["metrics"]["views"] == 22400.0
    assert mapped["metrics"]["likes"] == 2850.0
    assert mapped["metrics"]["comments"] == 142.0


def test_custom_mapping_adapter():
    adapter = CustomMappingAdapter(
        platform_name="Bandcamp",
        id_col="Track_Code",
        title_col="Song_Name",
        published_at_col="Date_Released",
        default_content_type="music_release",
        default_language="English",
        metric_mappings={"streams": "Total_Plays", "likes": "Supporters"},
    )

    row = {
        "Track_Code": "BC-001",
        "Song_Name": "Echoes in the Rain",
        "Date_Released": "2024-03-01",
        "Total_Plays": "1,200",
        "Supporters": "85",
    }
    now_utc = datetime.now(timezone.utc)
    mapped = adapter.map_row(row, now_utc)

    assert mapped["content"]["external_id"] == "BC-001"
    assert mapped["content"]["title"] == "Echoes in the Rain"
    assert mapped["content"]["content_type"] == "music_release"
    assert mapped["content"]["language"] == "English"
    assert mapped["metrics"]["streams"] == 1200.0
    assert mapped["metrics"]["likes"] == 85.0


def test_dry_run_validation():
    df = pd.DataFrame([
        {"Video": "v1", "Video title": "Good Video", "Views": "1000"},
        {"Video": "", "Video title": "Bad Video Missing ID", "Views": "500"},
        {"Video": "v1", "Video title": "Duplicate ID", "Views": "200"},
        {"Video": "v3", "Video title": "Bad Views", "Views": "-50"},
    ])

    adapter = YouTubeAdapter()
    result = validate_dataset_dry_run(df, adapter, datetime.now(timezone.utc))

    assert result["total_count"] == 4
    assert result["valid_count"] == 2  # v1 is valid, v3 is valid (negative metric ignored from valid metrics)
    assert result["rejected_count"] == 2  # missing id, duplicate id
    assert result["is_valid"] is False


def test_process_import_and_rollback():
    df = pd.DataFrame([
        {"Video": "test_rb_1", "Video title": "Rollback Test Song", "Views": "500"},
        {"Video": "test_rb_2", "Video title": "Rollback Test Cover", "Views": "800"},
    ])

    res = process_dataset_import(
        df=df,
        filename="test_rollback.csv",
        platform_name="YouTube",
    )

    assert res["success"] is True
    import_id = res["import_id"]
    assert import_id is not None
    assert res["successful_rows"] == 2

    # Now test rollback
    rb_res = rollback_import(import_id)
    assert rb_res["success"] is True
    assert rb_res["deleted_snapshots"] >= 2
