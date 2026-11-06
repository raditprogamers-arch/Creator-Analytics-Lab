"""Content, language, and music release comparisons for Creator Analytics Lab."""

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
        ROUND(AVG(CASE WHEN ms.metric_name = 'views' THEN ms.metric_value ELSE NULL END), 2) AS avg_views,
        ROUND(AVG(CASE WHEN ms.metric_name = 'likes' THEN ms.metric_value ELSE NULL END), 2) AS avg_likes,
        SUM(CASE WHEN ms.metric_name = 'views' THEN ms.metric_value ELSE NULL END) AS total_views,
        SUM(CASE WHEN ms.metric_name = 'streams' THEN ms.metric_value ELSE NULL END) AS total_streams
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
        ROUND(AVG(CASE WHEN ms.metric_name = 'views' THEN ms.metric_value ELSE NULL END), 2) AS avg_views,
        ROUND(AVG(CASE WHEN ms.metric_name = 'likes' THEN ms.metric_value ELSE NULL END), 2) AS avg_likes,
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


def compare_original_vs_covers() -> pd.DataFrame:
    """Specialized music analysis comparing Original Songs versus Music Covers."""
    query = """
    SELECT 
        CASE 
            WHEN c.content_type = 'original_song' THEN 'Original Song'
            WHEN c.content_type = 'music_cover' THEN 'Music Cover'
            ELSE 'Other Content'
        END AS release_category,
        COUNT(DISTINCT c.id) AS release_count,
        ROUND(AVG(CASE WHEN ms.metric_name = 'views' THEN ms.metric_value ELSE NULL END), 2) AS avg_views,
        ROUND(AVG(CASE WHEN ms.metric_name = 'likes' THEN ms.metric_value ELSE NULL END), 2) AS avg_likes,
        SUM(CASE WHEN ms.metric_name = 'views' THEN ms.metric_value ELSE NULL END) AS total_views,
        SUM(CASE WHEN ms.metric_name = 'streams' THEN ms.metric_value ELSE NULL END) AS total_streams
    FROM contents c
    LEFT JOIN (
        SELECT content_id, metric_name, metric_value,
               ROW_NUMBER() OVER (PARTITION BY content_id, metric_name ORDER BY captured_at DESC) as rn
        FROM metric_snapshots
    ) ms ON c.id = ms.content_id AND ms.rn = 1
    WHERE c.content_type IN ('original_song', 'music_cover', 'music_release')
    GROUP BY release_category
    ORDER BY total_views DESC NULLS LAST;
    """

    with get_db_session() as session:
        result = session.execute(text(query))
        rows = result.fetchall()
        if not rows:
            return pd.DataFrame()
        return pd.DataFrame(rows, columns=result.keys())
