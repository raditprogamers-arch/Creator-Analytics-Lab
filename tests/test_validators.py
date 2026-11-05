import pytest
from core.validators import validate_content_record, validate_metric_value, ValidationResult


def test_validate_content_record_valid():
    record = {"external_id": "vid123", "title": "My Music Cover"}
    valid, err = validate_content_record(1, record)
    assert valid is True
    assert err is None


def test_validate_content_record_missing_id():
    record = {"external_id": "", "title": "Song Title"}
    valid, err = validate_content_record(1, record)
    assert valid is False
    assert "Missing or blank 'external_id'" in err


def test_validate_content_record_missing_title():
    record = {"external_id": "vid123", "title": "   "}
    valid, err = validate_content_record(1, record)
    assert valid is False
    assert "Missing or blank 'title'" in err


def test_validate_content_record_duplicate_batch():
    seen = set()
    record1 = {"external_id": "vid_dup", "title": "First Entry"}
    record2 = {"external_id": "vid_dup", "title": "Second Entry"}
    
    valid1, _ = validate_content_record(1, record1, seen)
    valid2, err2 = validate_content_record(2, record2, seen)
    
    assert valid1 is True
    assert valid2 is False
    assert "Duplicate external_id" in err2


def test_validate_metric_value_allowed():
    valid, err = validate_metric_value("views", 1500)
    assert valid is True
    assert err is None

    # Null / missing metrics are permitted (distinguished from zero)
    valid_null, err_null = validate_metric_value("likes", None)
    assert valid_null is True
    assert err_null is None


def test_validate_metric_value_negative_rejected():
    valid, err = validate_metric_value("views", -10)
    assert valid is False
    assert "cannot be negative" in err


def test_validation_result_tracking():
    vr = ValidationResult()
    vr.add_valid({"title": "Sample 1"})
    vr.add_rejected(2, {"title": "Bad"}, "Invalid metric")
    
    assert vr.total_count == 2
    assert vr.valid_count == 1
    assert vr.rejected_count == 1
    assert vr.is_valid is False

