"""Validation rules and error tracking for creator datasets."""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime


class ValidationResult:
    """Holds status, validated rows, and rejected rows with diagnostics."""

    def __init__(self):
        self.is_valid: bool = True
        self.valid_rows: List[Dict[str, Any]] = []
        self.rejected_rows: List[Dict[str, Any]] = []
        self.errors: List[str] = []

    def add_valid(self, row: Dict[str, Any]):
        self.valid_rows.append(row)

    def add_rejected(self, row_index: int, row_data: Dict[str, Any], reason: str):
        self.is_valid = False
        self.rejected_rows.append({
            "row_index": row_index,
            "reason": reason,
            "raw_data": row_data,
        })
        self.errors.append(f"Row {row_index}: {reason}")

    @property
    def total_count(self) -> int:
        return len(self.valid_rows) + len(self.rejected_rows)

    @property
    def valid_count(self) -> int:
        return len(self.valid_rows)

    @property
    def rejected_count(self) -> int:
        return len(self.rejected_rows)


def validate_content_record(
    row_idx: int,
    record: Dict[str, Any],
    seen_external_ids: Optional[set] = None,
) -> Tuple[bool, Optional[str]]:
    """Validate core content attributes before database insertion.

    Rules:
    - external_id must not be empty.
    - title must not be empty.
    - external_id must not be duplicated within the same upload batch.
    """
    ext_id = record.get("external_id")
    if not ext_id or not str(ext_id).strip():
        return False, "Missing or blank 'external_id'"

    ext_id_str = str(ext_id).strip()
    if seen_external_ids is not None:
        if ext_id_str in seen_external_ids:
            return False, f"Duplicate external_id '{ext_id_str}' in current dataset"
        seen_external_ids.add(ext_id_str)

    title = record.get("title")
    if not title or not str(title).strip():
        return False, "Missing or blank 'title'"

    return True, None


def validate_metric_value(metric_name: str, value: Any) -> Tuple[bool, Optional[str]]:
    """Validate metric numeric constraints.
    - Values cannot be negative for standard engagement metrics (views, likes, etc.).
    """
    if value is None:
        return True, None  # Null / missing metrics are allowed (distinguished from zero)

    if not isinstance(value, (int, float)):
        return False, f"Metric '{metric_name}' value must be numeric, got {type(value).__name__}"

    non_negative_metrics = {
        "views",
        "likes",
        "comments",
        "shares",
        "impressions",
        "watch_time_hours",
        "subscribers",
        "saves",
        "streams",
    }

    if metric_name.lower() in non_negative_metrics and value < 0:
        return False, f"Metric '{metric_name}' cannot be negative (got {value})"

    return True, None

