"""Metric calculation utilities, engagement scoring, and aggregate metrics."""

from typing import Dict, Any, List, Optional
import pandas as pd
from sqlalchemy import text
from core.database import get_db_session


def compute_engagement_rate(views: Optional[float], interactions: Optional[float]) -> Optional[float]:
    """Calculate engagement rate percentage.
    Strict Rule: Only calculate when views > 0 and interactions is not None.
    Distinguish missing data from zero."""
    if views is None or interactions is None:
        return None
    if views <= 0:
        return 0.0
    return round((interactions / views) * 100, 2)


def get_latest_metrics_dataframe(
    platform_id: Optional[int] = None,
    content_type: Optional[str] = None,
    language: Optional[str] = None,
) -> pd.DataFrame:
    """Fetch the latest metric snapshot for every content item with filters."""
    query = """
    WITH RankedSnapshots AS (
        SELECT 
            c.id AS content_id,
            c.title,
            c.content_type,
            c.language,
            c.published_at,
            c.content_url,
            p.id AS platform_id,
            p.name AS platform_name,
            ms.metric_name,
            ms.metric_value,
            ms.captured_at,
            ROW_NUMBER() OVER (
                PARTITION BY c.id, ms.metric_name 
                ORDER BY ms.captured_at DESC
            ) as rn
        FROM contents c
        JOIN platforms p ON c.platform_id = p.id
        LEFT JOIN metric_snapshots ms ON c.id = ms.content_id
        WHERE 1=1
    """
    params: Dict[str, Any] = {}

    if platform_id:
        query += " AND p.id = :platform_id"
        params["platform_id"] = platform_id
    if content_type:
        query += " AND c.content_type = :content_type"
        params["content_type"] = content_type
    if language:
        query += " AND c.language = :language"
        params["language"] = language

    query += """
    )
    SELECT * FROM RankedSnapshots WHERE rn = 1 OR rn IS NULL;
    """

    with get_db_session() as session:
        result = session.execute(text(query), params)
        rows = result.fetchall()
        if not rows:
            return pd.DataFrame()
        return pd.DataFrame(rows, columns=result.keys())


def get_platform_summaries() -> List[Dict[str, Any]]:
    """Compute verified aggregate metrics broken down by platform."""
    query = """
    SELECT 
        p.id AS platform_id,
        p.name AS platform_name,
        p.platform_type,
        COUNT(DISTINCT c.id) AS total_content,
        SUM(CASE WHEN ms.metric_name = 'views' THEN ms.metric_value ELSE NULL END) AS total_views,
        SUM(CASE WHEN ms.metric_name = 'likes' THEN ms.metric_value ELSE NULL END) AS total_likes,
        SUM(CASE WHEN ms.metric_name = 'comments' THEN ms.metric_value ELSE NULL END) AS total_comments,
        SUM(CASE WHEN ms.metric_name = 'streams' THEN ms.metric_value ELSE NULL END) AS total_streams
    FROM platforms p
    LEFT JOIN contents c ON p.id = c.platform_id
    LEFT JOIN (
        SELECT content_id, metric_name, metric_value,
               ROW_NUMBER() OVER (PARTITION BY content_id, metric_name ORDER BY captured_at DESC) as rn
        FROM metric_snapshots
    ) ms ON c.id = ms.content_id AND ms.rn = 1
    GROUP BY p.id, p.name, p.platform_type
    ORDER BY total_content DESC, p.name;
    """

    with get_db_session() as session:
        result = session.execute(text(query))
        rows = result.fetchall()
        summaries = []
        for r in rows:
            summaries.append({
                "platform_id": r.platform_id,
                "platform_name": r.platform_name,
                "platform_type": r.platform_type,
                "total_content": r.total_content or 0,
                "total_views": float(r.total_views) if r.total_views is not None else None,
                "total_likes": float(r.total_likes) if r.total_likes is not None else None,
                "total_comments": float(r.total_comments) if r.total_comments is not None else None,
                "total_streams": float(r.total_streams) if r.total_streams is not None else None,
            })
        return summaries

