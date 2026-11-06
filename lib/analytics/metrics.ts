import { sql } from "drizzle-orm";
import { db } from "../db";

export interface OverviewKpis {
  totalContent: number;
  totalViews: number;
  totalStreams: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalWatchTimeHours: number;
  overallEngagementRate: number | null;
  platformsCount: number;
  importsCount: number;
}

export interface PlatformSummary {
  platformId: number;
  platformName: string;
  platformType: string;
  totalContent: number;
  totalViews: number | null;
  totalLikes: number | null;
  totalComments: number | null;
  totalShares: number | null;
  totalStreams: number | null;
  totalWatchTime: number | null;
  engagementRate: number | null;
}

export interface TimelineDataPoint {
  date: string;
  platform: string;
  totalValue: number;
  avgValue: number;
  itemsTracked: number;
}

export interface ContentWithMetrics {
  id: number;
  platformId: number;
  platformName: string;
  platformType: string;
  externalId: string;
  title: string;
  description: string | null;
  contentType: string;
  language: string | null;
  publishedAt: string | null;
  contentUrl: string | null;
  createdAt: string;
  updatedAt: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  streams: number | null;
  watchTimeHours: number | null;
  engagementRate: number | null;
}

export function computeEngagementRate(
  views: number | null | undefined,
  interactions: number | null | undefined
): number | null {
  if (views === null || views === undefined || interactions === null || interactions === undefined) {
    return null;
  }
  if (views <= 0) {
    return 0.0;
  }
  return Number(((interactions / views) * 100).toFixed(2));
}

export async function getOverviewKpis(): Promise<OverviewKpis> {
  const query = sql`
    WITH LatestSnapshots AS (
      SELECT 
        content_id, 
        metric_name, 
        metric_value,
        ROW_NUMBER() OVER (PARTITION BY content_id, metric_name ORDER BY captured_at DESC) as rn
      FROM metric_snapshots
    )
    SELECT
      (SELECT COUNT(*) FROM contents) AS total_content,
      (SELECT COUNT(*) FROM platforms) AS platforms_count,
      (SELECT COUNT(*) FROM import_history) AS imports_count,
      COALESCE(SUM(CASE WHEN metric_name = 'views' THEN metric_value ELSE 0 END), 0) AS total_views,
      COALESCE(SUM(CASE WHEN metric_name = 'streams' THEN metric_value ELSE 0 END), 0) AS total_streams,
      COALESCE(SUM(CASE WHEN metric_name = 'likes' THEN metric_value ELSE 0 END), 0) AS total_likes,
      COALESCE(SUM(CASE WHEN metric_name = 'comments' THEN metric_value ELSE 0 END), 0) AS total_comments,
      COALESCE(SUM(CASE WHEN metric_name = 'shares' THEN metric_value ELSE 0 END), 0) AS total_shares,
      COALESCE(SUM(CASE WHEN metric_name = 'watch_time_hours' THEN metric_value ELSE 0 END), 0) AS total_watch_time
    FROM LatestSnapshots
    WHERE rn = 1;
  `;

  const result = await db.execute(query);
  const row = (result.rows?.[0] || {}) as Record<string, unknown>;

  const totalViews = Number(row.total_views || 0);
  const totalLikes = Number(row.total_likes || 0);
  const totalComments = Number(row.total_comments || 0);
  const totalShares = Number(row.total_shares || 0);
  const totalInteractions = totalLikes + totalComments + totalShares;

  return {
    totalContent: Number(row.total_content || 0),
    totalViews,
    totalStreams: Number(row.total_streams || 0),
    totalLikes,
    totalComments,
    totalShares,
    totalWatchTimeHours: Number(row.total_watch_time || 0),
    overallEngagementRate: computeEngagementRate(totalViews, totalInteractions),
    platformsCount: Number(row.platforms_count || 0),
    importsCount: Number(row.imports_count || 0),
  };
}

export async function getPlatformSummaries(): Promise<PlatformSummary[]> {
  const query = sql`
    SELECT 
      p.id AS platform_id,
      p.name AS platform_name,
      p.platform_type,
      COUNT(DISTINCT c.id) AS total_content,
      SUM(CASE WHEN ms.metric_name = 'views' THEN ms.metric_value ELSE NULL END) AS total_views,
      SUM(CASE WHEN ms.metric_name = 'likes' THEN ms.metric_value ELSE NULL END) AS total_likes,
      SUM(CASE WHEN ms.metric_name = 'comments' THEN ms.metric_value ELSE NULL END) AS total_comments,
      SUM(CASE WHEN ms.metric_name = 'shares' THEN ms.metric_value ELSE NULL END) AS total_shares,
      SUM(CASE WHEN ms.metric_name = 'streams' THEN ms.metric_value ELSE NULL END) AS total_streams,
      SUM(CASE WHEN ms.metric_name = 'watch_time_hours' THEN ms.metric_value ELSE NULL END) AS total_watch_time
    FROM platforms p
    LEFT JOIN contents c ON p.id = c.platform_id
    LEFT JOIN (
      SELECT content_id, metric_name, metric_value,
             ROW_NUMBER() OVER (PARTITION BY content_id, metric_name ORDER BY captured_at DESC) as rn
      FROM metric_snapshots
    ) ms ON c.id = ms.content_id AND ms.rn = 1
    GROUP BY p.id, p.name, p.platform_type
    ORDER BY total_content DESC, p.name;
  `;

  const result = await db.execute(query);
  const rows = (result.rows || []) as Record<string, unknown>[];

  return rows.map((r) => {
    const views = r.total_views !== null ? Number(r.total_views) : null;
    const likes = r.total_likes !== null ? Number(r.total_likes) : 0;
    const comments = r.total_comments !== null ? Number(r.total_comments) : 0;
    const shares = r.total_shares !== null ? Number(r.total_shares) : 0;
    const interactions = (likes ?? 0) + (comments ?? 0) + (shares ?? 0);

    return {
      platformId: Number(r.platform_id),
      platformName: String(r.platform_name),
      platformType: String(r.platform_type),
      totalContent: Number(r.total_content || 0),
      totalViews: views,
      totalLikes: r.total_likes !== null ? Number(r.total_likes) : null,
      totalComments: r.total_comments !== null ? Number(r.total_comments) : null,
      totalShares: r.total_shares !== null ? Number(r.total_shares) : null,
      totalStreams: r.total_streams !== null ? Number(r.total_streams) : null,
      totalWatchTime: r.total_watch_time !== null ? Number(r.total_watch_time) : null,
      engagementRate: views && views > 0 ? computeEngagementRate(views, interactions) : null,
    };
  });
}

export async function getTimelineMetrics(
  platformId?: number,
  metricName: string = "views"
): Promise<TimelineDataPoint[]> {
  const query = sql`
    SELECT 
      TO_CHAR(ms.captured_at, 'YYYY-MM-DD') AS date,
      p.name AS platform,
      SUM(ms.metric_value) AS total_value,
      AVG(ms.metric_value) AS avg_value,
      COUNT(DISTINCT ms.content_id) AS items_tracked
    FROM metric_snapshots ms
    JOIN contents c ON ms.content_id = c.id
    JOIN platforms p ON c.platform_id = p.id
    WHERE ms.metric_name = ${metricName}
      ${platformId ? sql`AND p.id = ${platformId}` : sql``}
    GROUP BY TO_CHAR(ms.captured_at, 'YYYY-MM-DD'), p.name
    ORDER BY date ASC, p.name;
  `;

  const result = await db.execute(query);
  const rows = (result.rows || []) as Record<string, unknown>[];

  return rows.map((r) => ({
    date: String(r.date),
    platform: String(r.platform),
    totalValue: Number(r.total_value || 0),
    avgValue: Number(Number(r.avg_value || 0).toFixed(2)),
    itemsTracked: Number(r.items_tracked || 0),
  }));
}

export async function getContentList(filters?: {
  platformId?: number;
  contentType?: string;
  language?: string;
  search?: string;
}): Promise<ContentWithMetrics[]> {
  const query = sql`
    WITH LatestSnapshots AS (
      SELECT 
        content_id, 
        metric_name, 
        metric_value,
        ROW_NUMBER() OVER (PARTITION BY content_id, metric_name ORDER BY captured_at DESC) as rn
      FROM metric_snapshots
    )
    SELECT 
      c.id,
      c.platform_id,
      p.name AS platform_name,
      p.platform_type,
      c.external_id,
      c.title,
      c.description,
      c.content_type,
      c.language,
      c.published_at,
      c.content_url,
      c.created_at,
      c.updated_at,
      MAX(CASE WHEN ls.metric_name = 'views' THEN ls.metric_value ELSE NULL END) AS views,
      MAX(CASE WHEN ls.metric_name = 'likes' THEN ls.metric_value ELSE NULL END) AS likes,
      MAX(CASE WHEN ls.metric_name = 'comments' THEN ls.metric_value ELSE NULL END) AS comments,
      MAX(CASE WHEN ls.metric_name = 'shares' THEN ls.metric_value ELSE NULL END) AS shares,
      MAX(CASE WHEN ls.metric_name = 'streams' THEN ls.metric_value ELSE NULL END) AS streams,
      MAX(CASE WHEN ls.metric_name = 'watch_time_hours' THEN ls.metric_value ELSE NULL END) AS watch_time_hours
    FROM contents c
    JOIN platforms p ON c.platform_id = p.id
    LEFT JOIN LatestSnapshots ls ON c.id = ls.content_id AND ls.rn = 1
    WHERE 1=1
      ${filters?.platformId ? sql`AND c.platform_id = ${filters.platformId}` : sql``}
      ${filters?.contentType ? sql`AND c.content_type = ${filters.contentType}` : sql``}
      ${filters?.language ? sql`AND c.language = ${filters.language}` : sql``}
      ${
        filters?.search
          ? sql`AND (c.title ILIKE ${`%${filters.search}%`} OR c.external_id ILIKE ${`%${filters.search}%`})`
          : sql``
      }
    GROUP BY c.id, c.platform_id, p.name, p.platform_type, c.external_id, c.title, c.description, c.content_type, c.language, c.published_at, c.content_url, c.created_at, c.updated_at
    ORDER BY c.published_at DESC NULLS LAST, c.id DESC;
  `;

  const result = await db.execute(query);
  const rows = (result.rows || []) as Record<string, unknown>[];

  return rows.map((r) => {
    const views = r.views !== null && r.views !== undefined ? Number(r.views) : null;
    const likes = r.likes !== null && r.likes !== undefined ? Number(r.likes) : null;
    const comments = r.comments !== null && r.comments !== undefined ? Number(r.comments) : null;
    const shares = r.shares !== null && r.shares !== undefined ? Number(r.shares) : null;
    const interactions = (likes ?? 0) + (comments ?? 0) + (shares ?? 0);

    return {
      id: Number(r.id),
      platformId: Number(r.platform_id),
      platformName: String(r.platform_name),
      platformType: String(r.platform_type),
      externalId: String(r.external_id),
      title: String(r.title),
      description: r.description ? String(r.description) : null,
      contentType: String(r.content_type),
      language: r.language ? String(r.language) : null,
      publishedAt: r.published_at ? new Date(String(r.published_at)).toISOString() : null,
      contentUrl: r.content_url ? String(r.content_url) : null,
      createdAt: new Date(String(r.created_at)).toISOString(),
      updatedAt: new Date(String(r.updated_at)).toISOString(),
      views,
      likes,
      comments,
      shares,
      streams: r.streams !== null && r.streams !== undefined ? Number(r.streams) : null,
      watchTimeHours:
        r.watch_time_hours !== null && r.watch_time_hours !== undefined
          ? Number(r.watch_time_hours)
          : null,
      engagementRate: views && views > 0 ? computeEngagementRate(views, interactions) : null,
    };
  });
}

