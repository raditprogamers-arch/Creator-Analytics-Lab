"""Descriptive statistics, distribution metrics, and performance analysis."""

from typing import Dict, Any, Optional
import pandas as pd
import numpy as np


def compute_distribution_stats(series: pd.Series) -> Dict[str, Optional[float]]:
    """Compute verified descriptive statistics from a numeric Pandas Series.
    Ignores NaN values cleanly without introducing false zeros."""
    clean = series.dropna()
    if clean.empty:
        return {
            "count": 0,
            "mean": None,
            "median": None,
            "std": None,
            "min": None,
            "max": None,
            "q25": None,
            "q75": None,
        }

    return {
        "count": int(clean.count()),
        "mean": round(float(clean.mean()), 2),
        "median": round(float(clean.median()), 2),
        "std": round(float(clean.std()), 2) if len(clean) > 1 else 0.0,
        "min": round(float(clean.min()), 2),
        "max": round(float(clean.max()), 2),
        "q25": round(float(clean.quantile(0.25)), 2),
        "q75": round(float(clean.quantile(0.75)), 2),
    }


def compute_growth_rate(old_val: Optional[float], new_val: Optional[float]) -> Optional[float]:
    """Calculate percentage growth between two observations."""
    if old_val is None or new_val is None or old_val == 0:
        return None
    return round(((new_val - old_val) / abs(old_val)) * 100, 2)

