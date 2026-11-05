import pytest
import pandas as pd
from analytics.metrics import compute_engagement_rate
from analytics.statistics import compute_distribution_stats, compute_growth_rate


def test_compute_engagement_rate_standard():
    rate = compute_engagement_rate(views=10000, interactions=500)
    assert rate == 5.0


def test_compute_engagement_rate_zero_views():
    rate = compute_engagement_rate(views=0, interactions=50)
    assert rate == 0.0


def test_compute_engagement_rate_missing_data():
    assert compute_engagement_rate(views=None, interactions=50) is None
    assert compute_engagement_rate(views=1000, interactions=None) is None


def test_compute_growth_rate():
    assert compute_growth_rate(100, 150) == 50.0
    assert compute_growth_rate(200, 100) == -50.0
    assert compute_growth_rate(0, 100) is None
    assert compute_growth_rate(None, 100) is None


def test_compute_distribution_stats_valid():
    s = pd.Series([10.0, 20.0, 30.0, 40.0, 50.0])
    stats = compute_distribution_stats(s)
    assert stats["count"] == 5
    assert stats["mean"] == 30.0
    assert stats["median"] == 30.0
    assert stats["min"] == 10.0
    assert stats["max"] == 50.0


def test_compute_distribution_stats_empty():
    s = pd.Series([], dtype=float)
    stats = compute_distribution_stats(s)
    assert stats["count"] == 0
    assert stats["mean"] is None

