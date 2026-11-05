"""Content and language comparison analytical calculations."""

from typing import Dict, Any, List, Optional
import pandas as pd
from sqlalchemy import text
from core.database import get_db_session


def compare_content_types() -> pd.DataFrame:
    """Compare content performance aggregated by content type."""
    query = """
    SELECT 
        c.content_type,
        COUNT(DISTINCT c.id) AS content_count,
        AVG(CASE WHEN ms.metric_name = 'views' THEN ms.metric_value ELSE NULL END) AS avg_views,
        AVG(CASE WHEN ms.metric_name = 'likes' THEN ms.metric_value ELSE NULL END) AS avg_likes,
        SUM(CASE WHEN ms.metric_name = 'views' THEN ms.metric_value ELSE NULL END) AS total_views
    FROM contents c
    LEFT JOIN (
        SELECT content_id, metric_name, metric_value,
               ROW_NUMBER() OVER (PARTITION BY content_id, metric_name ORDER BY captured_at DESC) as rn
        FROM metric_snapshots
    ) ms ON c.id = ms.content_id AND ms.rn = 1
    GROUP BY c.content_type
    ORDER BY total_views DESC NULLS LAST, content_count DESC;
    """

    with get_db_session() as session:
        result = session.execute(text(query))
        rows = result.fetchall()
        if not rows:
            return pd.DataFrame()
        return pd.DataFrame(rows, columns=result.keys())


def compare_languages() -> pd.DataFrame:
    """Compare content performance aggregated by language."""
    query = """
    SELECT 
        COALESCE(c.language, 'Unspecified') AS language,
        COUNT(DISTINCT c.id) AS content_count,
        AVG(CASE WHEN ms.metric_name = 'views' THEN ms.metric_value ELSE NULL END) AS avg_views,
        SUM(CASE WHEN ms.metric_name = 'views' THEN ms.metric_value ELSE NULL END) AS total_views
    FROM contents c
    LEFT JOIN (
        SELECT content_id, metric_name, metric_value,
               ROW_NUMBER() OVER (PARTITION BY content_id, metric_name ORDER BY captured_at DESC) as rn
        FROM metric_snapshots
    ) ms ON c.id = ms.content_id AND ms.rn = 1
    GROUP BY c.language
    ORDER BY total_views DESC NULLS LAST;
    """

    with get_db_session() as session:
        result = session.execute(text(query))
        rows = result.fetchall()
        if not rows:
            return pd.DataFrame()
        return pd.DataFrame(rows, columns=result.keys())

