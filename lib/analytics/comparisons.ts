import { sql } from "drizzle-orm";
import { db } from "../db";

export interface ContentTypeComparison {
  contentType: string;
  contentCount: number;
  avgViews: number | null;
  avgLikes: number | null;
  totalViews: number | null;
  totalStreams: number | null;
}

export interface LanguageComparison {
  language: string;
  contentCount: number;
  avgViews: number | null;
  avgLikes: number | null;
  totalViews: number | null;
}

export interface MusicReleaseComparison {
  releaseCategory: string;
  releaseCount: number;
  avgViews: number | null;
  avgLikes: number | null;
  totalViews: number | null;
  totalStreams: number | null;
}

export async function compareContentTypes(): Promise<ContentTypeComparison[]> {
  const query = sql`
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
  `;

  const result = await db.execute(query);
  const rows = (result.rows || []) as Record<string, unknown>[];

  return rows.map((r) => ({
    contentType: String(r.content_type),
    contentCount: Number(r.content_count || 0),
    avgViews: r.avg_views !== null && r.avg_views !== undefined ? Number(r.avg_views) : null,
    avgLikes: r.avg_likes !== null && r.avg_likes !== undefined ? Number(r.avg_likes) : null,
    totalViews: r.total_views !== null && r.total_views !== undefined ? Number(r.total_views) : null,
    totalStreams:
      r.total_streams !== null && r.total_streams !== undefined ? Number(r.total_streams) : null,
  }));
}

export async function compareLanguages(): Promise<LanguageComparison[]> {
  const query = sql`
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
  `;

  const result = await db.execute(query);
  const rows = (result.rows || []) as Record<string, unknown>[];

  return rows.map((r) => ({
    language: String(r.language),
    contentCount: Number(r.content_count || 0),
    avgViews: r.avg_views !== null && r.avg_views !== undefined ? Number(r.avg_views) : null,
    avgLikes: r.avg_likes !== null && r.avg_likes !== undefined ? Number(r.avg_likes) : null,
    totalViews: r.total_views !== null && r.total_views !== undefined ? Number(r.total_views) : null,
  }));
}

export async function compareOriginalVsCovers(): Promise<MusicReleaseComparison[]> {
  const query = sql`
    SELECT 
      CASE 
        WHEN c.content_type = 'original_song' THEN 'Original Song'
        WHEN c.content_type = 'music_cover' THEN 'Music Cover'
        ELSE 'Other Music Release'
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
  `;

  const result = await db.execute(query);
  const rows = (result.rows || []) as Record<string, unknown>[];

  return rows.map((r) => ({
    releaseCategory: String(r.release_category),
    releaseCount: Number(r.release_count || 0),
    avgViews: r.avg_views !== null && r.avg_views !== undefined ? Number(r.avg_views) : null,
    avgLikes: r.avg_likes !== null && r.avg_likes !== undefined ? Number(r.avg_likes) : null,
    totalViews: r.total_views !== null && r.total_views !== undefined ? Number(r.total_views) : null,
    totalStreams:
      r.total_streams !== null && r.total_streams !== undefined ? Number(r.total_streams) : null,
  }));
}

