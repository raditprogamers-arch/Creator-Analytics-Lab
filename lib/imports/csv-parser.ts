import Papa from "papaparse";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import {
  platforms,
  contents,
  importHistory,
  metricSnapshots,
  type NewContent,
} from "../db/schema";
import { cleanNumeric, cleanText, parseDate } from "./normalizer";
import { ContentRowSchema } from "./validators";

export interface MappedImportItem {
  content: {
    externalId: string;
    title: string;
    contentType: string;
    language?: string | null;
    publishedAt?: Date | null;
    contentUrl?: string | null;
  };
  metrics: Record<string, number>;
  capturedAt: Date;
}

export interface PlatformAdapter {
  platformName: string;
  detect(columns: string[]): boolean;
  mapRow(row: Record<string, unknown>, defaultCapturedAt: Date): MappedImportItem;
}

export class YouTubeAdapter implements PlatformAdapter {
  platformName = "YouTube";

  detect(columns: string[]): boolean {
    const cols = columns.map((c) => c.trim().toLowerCase());
    return cols.some((c) => c.includes("video")) && cols.some((c) => c.includes("views"));
  }

  mapRow(row: Record<string, unknown>, defaultCapturedAt: Date): MappedImportItem {
    const lookup: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      lookup[k.trim().toLowerCase()] = v;
    }

    const externalId =
      cleanText(lookup["video"]) ||
      cleanText(lookup["video id"]) ||
      cleanText(lookup["content"]) ||
      cleanText(lookup["id"]) ||
      "";

    const title =
      cleanText(lookup["video title"]) ||
      cleanText(lookup["title"]) ||
      `YouTube Video ${externalId}`;

    const publishedAtRaw =
      lookup["video publish time"] || lookup["published_at"] || lookup["publish time"];

    const metrics: Record<string, number> = {};
    const views = cleanNumeric(lookup["views"]);
    if (views !== null && views >= 0) metrics.views = views;

    const likes = cleanNumeric(lookup["likes"]);
    if (likes !== null && likes >= 0) metrics.likes = likes;

    const comments = cleanNumeric(lookup["comments"] || lookup["comments added"]);
    if (comments !== null && comments >= 0) metrics.comments = comments;

    const shares = cleanNumeric(lookup["shares"]);
    if (shares !== null && shares >= 0) metrics.shares = shares;

    const watchTime = cleanNumeric(lookup["watch time (hours)"] || lookup["watch time"]);
    if (watchTime !== null && watchTime >= 0) metrics.watch_time_hours = watchTime;

    const impressions = cleanNumeric(lookup["impressions"]);
    if (impressions !== null && impressions >= 0) metrics.impressions = impressions;

    return {
      content: {
        externalId,
        title,
        contentType: cleanText(lookup["content_type"]) || "long_form",
        language: cleanText(lookup["language"]),
        publishedAt: parseDate(publishedAtRaw),
        contentUrl: externalId ? `https://www.youtube.com/watch?v=${externalId}` : null,
      },
      metrics,
      capturedAt: defaultCapturedAt,
    };
  }
}

export class TikTokAdapter implements PlatformAdapter {
  platformName = "TikTok";

  detect(columns: string[]): boolean {
    const cols = columns.map((c) => c.trim().toLowerCase());
    return cols.some((c) => c.includes("tiktok") || c.includes("post time") || c.includes("video views"));
  }

  mapRow(row: Record<string, unknown>, defaultCapturedAt: Date): MappedImportItem {
    const lookup: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      lookup[k.trim().toLowerCase()] = v;
    }

    const externalId =
      cleanText(lookup["video id"]) ||
      cleanText(lookup["item id"]) ||
      cleanText(lookup["id"]) ||
      "";

    const title =
      cleanText(lookup["video title"]) ||
      cleanText(lookup["caption"]) ||
      cleanText(lookup["title"]) ||
      `TikTok Post ${externalId}`;

    const postTimeRaw = lookup["post time"] || lookup["create time"] || lookup["published_at"];

    const metrics: Record<string, number> = {};
    const views = cleanNumeric(lookup["video views"] || lookup["views"] || lookup["play count"]);
    if (views !== null && views >= 0) metrics.views = views;

    const likes = cleanNumeric(lookup["likes"] || lookup["like count"]);
    if (likes !== null && likes >= 0) metrics.likes = likes;

    const comments = cleanNumeric(lookup["comments"] || lookup["comment count"]);
    if (comments !== null && comments >= 0) metrics.comments = comments;

    const shares = cleanNumeric(lookup["shares"] || lookup["share count"]);
    if (shares !== null && shares >= 0) metrics.shares = shares;

    return {
      content: {
        externalId,
        title,
        contentType: cleanText(lookup["content_type"]) || "short_form",
        language: cleanText(lookup["language"]),
        publishedAt: parseDate(postTimeRaw),
        contentUrl: externalId ? `https://www.tiktok.com/@creator/video/${externalId}` : null,
      },
      metrics,
      capturedAt: defaultCapturedAt,
    };
  }
}

export class SpotifyAdapter implements PlatformAdapter {
  platformName = "Spotify";

  detect(columns: string[]): boolean {
    const cols = columns.map((c) => c.trim().toLowerCase());
    return cols.some((c) => c.includes("streams") || c.includes("listeners") || c.includes("track"));
  }

  mapRow(row: Record<string, unknown>, defaultCapturedAt: Date): MappedImportItem {
    const lookup: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      lookup[k.trim().toLowerCase()] = v;
    }

    const externalId =
      cleanText(lookup["track uri"]) ||
      cleanText(lookup["isrc"]) ||
      cleanText(lookup["track id"]) ||
      cleanText(lookup["id"]) ||
      "";

    const title =
      cleanText(lookup["track name"]) ||
      cleanText(lookup["track"]) ||
      cleanText(lookup["title"]) ||
      `Spotify Track ${externalId}`;

    const releaseDateRaw = lookup["release date"] || lookup["published_at"];

    const metrics: Record<string, number> = {};
    const streams = cleanNumeric(lookup["streams"]);
    if (streams !== null && streams >= 0) metrics.streams = streams;

    const listeners = cleanNumeric(lookup["listeners"]);
    if (listeners !== null && listeners >= 0) metrics.listeners = listeners;

    const saves = cleanNumeric(lookup["saves"]);
    if (saves !== null && saves >= 0) metrics.saves = saves;

    return {
      content: {
        externalId,
        title,
        contentType: cleanText(lookup["content_type"]) || "music_release",
        language: cleanText(lookup["language"]),
        publishedAt: parseDate(releaseDateRaw),
        contentUrl: externalId.includes("spotify:track:")
          ? `https://open.spotify.com/track/${externalId.replace("spotify:track:", "")}`
          : null,
      },
      metrics,
      capturedAt: defaultCapturedAt,
    };
  }
}

export class InstagramAdapter implements PlatformAdapter {
  platformName = "Instagram";

  detect(columns: string[]): boolean {
    const cols = columns.map((c) => c.trim().toLowerCase());
    return cols.some((c) => c.includes("instagram") || c.includes("shortcode") || c.includes("plays"));
  }

  mapRow(row: Record<string, unknown>, defaultCapturedAt: Date): MappedImportItem {
    const lookup: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      lookup[k.trim().toLowerCase()] = v;
    }

    const externalId =
      cleanText(lookup["shortcode"]) ||
      cleanText(lookup["post id"]) ||
      cleanText(lookup["id"]) ||
      "";

    const title =
      cleanText(lookup["caption"]) ||
      cleanText(lookup["title"]) ||
      `Instagram Post ${externalId}`;

    const pubTime = lookup["publish time"] || lookup["date"] || lookup["published_at"];

    const metrics: Record<string, number> = {};
    const views = cleanNumeric(lookup["plays"] || lookup["video views"] || lookup["views"]);
    if (views !== null && views >= 0) metrics.views = views;

    const likes = cleanNumeric(lookup["likes"]);
    if (likes !== null && likes >= 0) metrics.likes = likes;

    const comments = cleanNumeric(lookup["comments"]);
    if (comments !== null && comments >= 0) metrics.comments = comments;

    const shares = cleanNumeric(lookup["shares"]);
    if (shares !== null && shares >= 0) metrics.shares = shares;

    const saves = cleanNumeric(lookup["saves"]);
    if (saves !== null && saves >= 0) metrics.saves = saves;

    return {
      content: {
        externalId,
        title,
        contentType: cleanText(lookup["content_type"]) || "short_form",
        language: cleanText(lookup["language"]),
        publishedAt: parseDate(pubTime),
        contentUrl: externalId ? `https://www.instagram.com/p/${externalId}/` : null,
      },
      metrics,
      capturedAt: defaultCapturedAt,
    };
  }
}

export class CustomMappingAdapter implements PlatformAdapter {
  platformName: string;
  private idCol: string;
  private titleCol: string;
  private dateCol?: string;
  private typeCol?: string;
  private langCol?: string;
  private urlCol?: string;
  private defaultType: string;
  private defaultLang?: string | null;
  private metricMap: Record<string, string>;

  constructor(options: {
    platformName: string;
    idCol: string;
    titleCol: string;
    dateCol?: string;
    typeCol?: string;
    langCol?: string;
    urlCol?: string;
    defaultType?: string;
    defaultLang?: string | null;
    metricMap?: Record<string, string>;
  }) {
    this.platformName = options.platformName;
    this.idCol = options.idCol;
    this.titleCol = options.titleCol;
    this.dateCol = options.dateCol;
    this.typeCol = options.typeCol;
    this.langCol = options.langCol;
    this.urlCol = options.urlCol;
    this.defaultType = options.defaultType || "other";
    this.defaultLang = options.defaultLang;
    this.metricMap = options.metricMap || {};
  }

  detect(): boolean {
    return false;
  }

  mapRow(row: Record<string, unknown>, defaultCapturedAt: Date): MappedImportItem {
    const externalId = cleanText(row[this.idCol]) || "";
    const title = cleanText(row[this.titleCol]) || `Content ${externalId}`;

    const publishedAt = this.dateCol ? parseDate(row[this.dateCol]) : null;
    const contentType =
      (this.typeCol ? cleanText(row[this.typeCol]) : null) || this.defaultType;
    const language =
      (this.langCol ? cleanText(row[this.langCol]) : null) || this.defaultLang;
    const contentUrl = this.urlCol ? cleanText(row[this.urlCol]) : null;

    const metrics: Record<string, number> = {};
    for (const [canonicalName, csvCol] of Object.entries(this.metricMap)) {
      if (csvCol && row[csvCol] !== undefined) {
        const val = cleanNumeric(row[csvCol]);
        if (val !== null && val >= 0) {
          metrics[canonicalName] = val;
        }
      }
    }

    return {
      content: {
        externalId,
        title,
        contentType,
        language,
        publishedAt,
        contentUrl,
      },
      metrics,
      capturedAt: defaultCapturedAt,
    };
  }
}

export const ADAPTERS: PlatformAdapter[] = [
  new YouTubeAdapter(),
  new TikTokAdapter(),
  new SpotifyAdapter(),
  new InstagramAdapter(),
];

export function autoDetectAdapter(columns: string[]): PlatformAdapter | null {
  for (const adapter of ADAPTERS) {
    if (adapter.detect(columns)) {
      return adapter;
    }
  }
  return null;
}

export function parseCsvString(csvContent: string): {
  headers: string[];
  data: Record<string, unknown>[];
} {
  const result = Papa.parse<Record<string, unknown>>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = result.meta.fields || [];
  return { headers, data: result.data };
}

export function parseCSV(csvContent: string): {
  headers: string[];
  rows: Record<string, unknown>[];
} {
  const { headers, data } = parseCsvString(csvContent);
  return { headers, rows: data };
}

export function validateDatasetDryRun(
  rows: Record<string, unknown>[],
  adapter: PlatformAdapter,
  capturedAt: Date
) {
  const validRows: MappedImportItem[] = [];
  const rejectedRows: { rowIndex: number; reason: string; rawData: Record<string, unknown> }[] = [];
  const seenIds = new Set<string>();

  rows.forEach((row, idx) => {
    try {
      const mapped = adapter.mapRow(row, capturedAt);
      const parsedContent = ContentRowSchema.safeParse(mapped.content);

      if (!parsedContent.success) {
        const errorIssues = (parsedContent.error as any).issues || (parsedContent.error as any).errors || [];
        const reason =
          errorIssues.map((e: any) => e.message).join(", ") || parsedContent.error.message;
        rejectedRows.push({ rowIndex: idx + 1, reason, rawData: row });
        return;
      }

      if (seenIds.has(mapped.content.externalId)) {
        rejectedRows.push({
          rowIndex: idx + 1,
          reason: `Duplicate external_id '${mapped.content.externalId}' in upload batch`,
          rawData: row,
        });
        return;
      }
      seenIds.add(mapped.content.externalId);

      validRows.push(mapped);
    } catch (err: unknown) {
      rejectedRows.push({
        rowIndex: idx + 1,
        reason: err instanceof Error ? err.message : String(err),
        rawData: row,
      });
    }
  });

  return {
    isValid: rejectedRows.length === 0,
    totalCount: rows.length,
    validCount: validRows.length,
    rejectedCount: rejectedRows.length,
    rejectedRows,
    sampleMapped: validRows.slice(0, 3),
    validRows,
  };
}

export async function processDatasetImport(
  rows: Record<string, unknown>[],
  filename: string,
  platformName: string,
  capturedAt: Date,
  customAdapter?: PlatformAdapter
) {
  const adapter =
    customAdapter ||
    ADAPTERS.find((a) => a.platformName.toLowerCase() === platformName.toLowerCase()) ||
    new YouTubeAdapter();

  const dryRun = validateDatasetDryRun(rows, adapter, capturedAt);

  if (dryRun.validCount === 0) {
    return {
      success: false,
      importId: null,
      status: "failed",
      totalRows: dryRun.totalCount,
      successfulRows: 0,
      rejectedRows: dryRun.rejectedCount,
      rejectedDetails: dryRun.rejectedRows,
    };
  }

  // 1. Resolve Platform
  let [platformRecord] = await db
    .select()
    .from(platforms)
    .where(eq(platforms.name, platformName));

  if (!platformRecord) {
    [platformRecord] = await db
      .insert(platforms)
      .values({
        name: platformName,
        platformType: "creator_platform",
      })
      .returning();
  }

  // 2. Insert Import History
  const importStatus = dryRun.rejectedCount === 0 ? "completed" : "partial";
  const [historyRecord] = await db
    .insert(importHistory)
    .values({
      filename,
      platformId: platformRecord.id,
      importedAt: new Date(),
      totalRows: dryRun.totalCount,
      successfulRows: dryRun.validCount,
      rejectedRows: dryRun.rejectedCount,
      importStatus,
      errorSummary:
        dryRun.rejectedRows.length > 0
          ? JSON.stringify(dryRun.rejectedRows.slice(0, 100))
          : null,
    })
    .returning();

  let newContentsCreated = 0;
  let snapshotsRecorded = 0;

  // 3. Process Valid Rows
  for (const item of dryRun.validRows) {
    const cData = item.content;

    // Check if content already exists
    const [existing] = await db
      .select()
      .from(contents)
      .where(
        and(
          eq(contents.platformId, platformRecord.id),
          eq(contents.externalId, cData.externalId)
        )
      );

    let contentId: number;

    if (existing) {
      contentId = existing.id;
      // Update metadata
      await db
        .update(contents)
        .set({
          title: cData.title,
          contentType: cData.contentType,
          language: cData.language || existing.language,
          updatedAt: new Date(),
        })
        .where(eq(contents.id, existing.id));
    } else {
      const newContent: NewContent = {
        platformId: platformRecord.id,
        externalId: cData.externalId,
        title: cData.title,
        contentType: cData.contentType,
        language: cData.language,
        publishedAt: cData.publishedAt,
        contentUrl: cData.contentUrl,
      };
      const [created] = await db.insert(contents).values(newContent).returning();
      contentId = created.id;
      newContentsCreated++;
    }

    // Insert metric snapshots
    for (const [mName, mVal] of Object.entries(item.metrics)) {
      const [existingSnapshot] = await db
        .select()
        .from(metricSnapshots)
        .where(
          and(
            eq(metricSnapshots.contentId, contentId),
            eq(metricSnapshots.metricName, mName),
            eq(metricSnapshots.capturedAt, capturedAt)
          )
        );

      if (!existingSnapshot) {
        await db.insert(metricSnapshots).values({
          contentId,
          importId: historyRecord.id,
          metricName: mName,
          metricValue: String(mVal),
          capturedAt,
        });
        snapshotsRecorded++;
      }
    }
  }

  return {
    success: true,
    importId: historyRecord.id,
    status: importStatus,
    totalRows: dryRun.totalCount,
    successfulRows: dryRun.validCount,
    rejectedRows: dryRun.rejectedCount,
    newContentsCreated,
    snapshotsRecorded,
    rejectedDetails: dryRun.rejectedRows,
  };
}

export async function rollbackImport(importId: number) {
  // Delete snapshots linked to this import
  await db
    .delete(metricSnapshots)
    .where(eq(metricSnapshots.importId, importId));

  // Delete import record
  await db.delete(importHistory).where(eq(importHistory.id, importId));

  return { success: true };
}
