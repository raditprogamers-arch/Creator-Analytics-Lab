import { db } from "../db";
import {
  connectedAccounts,
  contents,
  metricSnapshots,
  platforms,
  type ConnectedAccount,
} from "../db/schema";
import { eq, and } from "drizzle-orm";
import { SyncResult } from "./types";

export function getYouTubeConfig() {
  const clientId = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret =
    process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const redirectUri = `${appUrl}/api/auth/callback/youtube`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: Boolean(clientId && clientSecret),
  };
}

export function getYouTubeAuthUrl(state?: string): string {
  const { clientId, redirectUri } = getYouTubeConfig();
  const scopes = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state: state || "youtube_auth",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeYouTubeCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getYouTubeConfig();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Failed to exchange YouTube authorization code: ${err}`);
  }

  const tokenData = await tokenRes.json();
  const { access_token, refresh_token, expires_in, scope } = tokenData;

  // Fetch channel info
  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
    {
      headers: { Authorization: `Bearer ${access_token}` },
    }
  );

  if (!channelRes.ok) {
    const err = await channelRes.text();
    throw new Error(`Failed to fetch YouTube channel details: ${err}`);
  }

  const channelData = await channelRes.json();
  const channel = channelData.items?.[0];

  if (!channel) {
    throw new Error("No YouTube channel found for this Google account.");
  }

  // Get or create YouTube platform in Neon
  let [platformRecord] = await db
    .select()
    .from(platforms)
    .where(eq(platforms.name, "YouTube"));

  if (!platformRecord) {
    [platformRecord] = await db
      .insert(platforms)
      .values({ name: "YouTube", platformType: "video" })
      .returning();
  }

  const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

  // Check if account already exists
  const [existing] = await db
    .select()
    .from(connectedAccounts)
    .where(
      and(
        eq(connectedAccounts.platformId, platformRecord.id),
        eq(connectedAccounts.accountIdentifier, channel.id)
      )
    );

  const metadata = JSON.stringify({
    customUrl: channel.snippet.customUrl,
    thumbnails: channel.snippet.thumbnails,
    subscriberCount: channel.statistics.subscriberCount,
    viewCount: channel.statistics.viewCount,
    videoCount: channel.statistics.videoCount,
  });

  if (existing) {
    const [updated] = await db
      .update(connectedAccounts)
      .set({
        accountName: channel.snippet.title,
        accessToken: access_token,
        refreshToken: refresh_token || existing.refreshToken,
        tokenExpiresAt: expiresAt,
        scope,
        metadata,
        syncStatus: "idle",
        syncError: null,
        updatedAt: new Date(),
      })
      .where(eq(connectedAccounts.id, existing.id))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(connectedAccounts)
      .values({
        platformId: platformRecord.id,
        platformName: "YouTube",
        accountIdentifier: channel.id,
        accountName: channel.snippet.title,
        accessToken: access_token,
        refreshToken: refresh_token || null,
        tokenExpiresAt: expiresAt,
        scope,
        metadata,
        syncStatus: "idle",
      })
      .returning();
    return created;
  }
}

export async function refreshYouTubeAccessToken(account: ConnectedAccount): Promise<string> {
  if (!account.refreshToken) {
    throw new Error("No refresh token available for YouTube account.");
  }

  const { clientId, clientSecret } = getYouTubeConfig();

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to refresh YouTube token: ${err}`);
  }

  const data = await res.json();
  const newAccessToken = data.access_token;
  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);

  await db
    .update(connectedAccounts)
    .set({
      accessToken: newAccessToken,
      tokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(connectedAccounts.id, account.id));

  return newAccessToken;
}

function parseViewCount(str: string | null | undefined): number {
  if (!str) return 0;
  const clean = str.replace(/\u00a0/g, " ").replace(/views?/i, "").trim();
  const kMatch = clean.match(/([\d\.]+)\s*(k|thousand)/i);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const mMatch = clean.match(/([\d\.]+)\s*(m|million)/i);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1000000);
  const bMatch = clean.match(/([\d\.]+)\s*(b|billion)/i);
  if (bMatch) return Math.round(parseFloat(bMatch[1]) * 1000000000);
  const num = parseInt(clean.replace(/[,\.]/g, ""), 10);
  return isNaN(num) ? 0 : num;
}

function parseRelativeDate(text: string | null | undefined): Date {
  const now = new Date();
  if (!text) return now;
  const lower = text.toLowerCase();
  const match = lower.match(
    /(\d+)\s*(second|sec|minute|min|hour|hr|day|d|week|wk|month|mo|year|yr)/
  );
  if (!match) return now;
  const num = parseInt(match[1], 10);
  const unit = match[2];
  const d = new Date(now.getTime());
  if (unit.startsWith("sec")) d.setSeconds(d.getSeconds() - num);
  else if (unit.startsWith("min")) d.setMinutes(d.getMinutes() - num);
  else if (unit.startsWith("hour") || unit === "hr") d.setHours(d.getHours() - num);
  else if (unit.startsWith("day") || unit === "d") d.setDate(d.getDate() - num);
  else if (unit.startsWith("week") || unit === "wk") d.setDate(d.getDate() - num * 7);
  else if (unit.startsWith("month") || unit === "mo") d.setMonth(d.getMonth() - num);
  else if (unit.startsWith("year") || unit === "yr") d.setFullYear(d.getFullYear() - num);
  return d;
}

export async function syncYouTubePublicChannel(account: ConnectedAccount): Promise<SyncResult> {
  let cleanHandle = account.accountIdentifier.trim();
  if (cleanHandle.includes("youtube.com/") || cleanHandle.includes("youtu.be/")) {
    const m =
      cleanHandle.match(/@([a-zA-Z0-9_\-\.]+)/) ||
      cleanHandle.match(/(?:channel|c|user)\/([a-zA-Z0-9_\-\.]+)/);
    if (m) cleanHandle = m[1];
  }
  cleanHandle = cleanHandle.replace(/^@/, "").replace(/\/$/, "").replace(/\/videos$/, "");
  const now = new Date();

  // Determine target URL: handles vs channel IDs
  let targetUrl = `https://www.youtube.com/@${cleanHandle}/videos`;
  if (cleanHandle.startsWith("UC") && cleanHandle.length === 24) {
    targetUrl = `https://www.youtube.com/channel/${cleanHandle}/videos`;
  }

  let ytRes = await fetch(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  // Fallback to channel root if /videos returns non-200
  if (!ytRes.ok) {
    targetUrl =
      cleanHandle.startsWith("UC") && cleanHandle.length === 24
        ? `https://www.youtube.com/channel/${cleanHandle}`
        : `https://www.youtube.com/@${cleanHandle}`;
    ytRes = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  }

  if (!ytRes.ok) {
    throw new Error(`Could not access public YouTube channel for @${cleanHandle}`);
  }

  const html = await ytRes.text();
  const jsonMatch =
    html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
    html.match(/ytInitialData\s*=\s*({.*?});/s);

  interface ExtractedVideo {
    videoId: string;
    title: string;
    views: number;
    publishedAt: Date;
    timeText?: string;
  }

  const videoList: ExtractedVideo[] = [];
  const seenIds = new Set<string>();

  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      function walk(obj: any) {
        if (!obj || typeof obj !== "object") return;
        if (obj.lockupViewModel) {
          const vm = obj.lockupViewModel;
          const videoId = vm.contentId;
          const title = vm.metadata?.lockupMetadataViewModel?.title?.content || "";
          let viewCount = 0;
          let timeText = "";

          const metadataRows =
            vm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows ||
            [];
          for (const row of metadataRows) {
            for (const part of row.metadataParts || []) {
              const label = part.accessibilityLabel || "";
              const content = part.text?.content || "";
              if (
                label.toLowerCase().includes("view") ||
                part.leadingIcon?.name?.includes("PLAY")
              ) {
                viewCount = parseViewCount(label || content);
              } else if (
                label.toLowerCase().includes("ago") ||
                content.toLowerCase().includes("ago")
              ) {
                timeText = label || content;
              }
            }
          }

          if (videoId && title && !seenIds.has(videoId)) {
            seenIds.add(videoId);
            videoList.push({
              videoId,
              title,
              views: viewCount,
              publishedAt: parseRelativeDate(timeText),
              timeText,
            });
          }
        }
        for (const k of Object.keys(obj)) walk(obj[k]);
      }
      walk(data);
    } catch (e) {
      console.warn("ytInitialData parsing warning:", e);
    }
  }

  // Fallback: regex search for videoId if tree walk returned 0
  if (videoList.length === 0) {
    const videoMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_\-]{11})"/g)];
    const uniqueIds = [...new Set(videoMatches.map((v) => v[1]))].slice(0, 20);
    for (const vId of uniqueIds) {
      if (!seenIds.has(vId)) {
        seenIds.add(vId);
        videoList.push({
          videoId: vId,
          title: `YouTube Video ${vId}`,
          views: 0,
          publishedAt: now,
        });
      }
    }
  }

  if (videoList.length === 0) {
    await db
      .update(connectedAccounts)
      .set({ syncStatus: "success", lastSyncedAt: now, syncError: null, updatedAt: now })
      .where(eq(connectedAccounts.id, account.id));

    return {
      success: true,
      accountId: account.id,
      platformName: "YouTube",
      itemsProcessed: 0,
      newItemsCreated: 0,
      snapshotsCreated: 0,
      syncedAt: now.toISOString(),
    };
  }

  let newItemsCreated = 0;
  let snapshotsCreated = 0;

  // For the top 8 videos, fetch watch page to get exact likes and ISO date
  const topSlice = videoList.slice(0, 8);
  for (const item of topSlice) {
    try {
      const watchRes = await fetch(`https://www.youtube.com/watch?v=${item.videoId}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (watchRes.ok) {
        const watchHtml = await watchRes.text();
        const viewMatch =
          watchHtml.match(/"viewCount":"(\d+)"/) ||
          watchHtml.match(/"views":{"simpleText":"([^"]+)"/);
        if (viewMatch) {
          const num = parseInt(viewMatch[1].replace(/,/g, ""), 10);
          if (!isNaN(num) && num > 0) item.views = num;
        }

        const likeMatch =
          watchHtml.match(
            /"defaultText":{"accessibility":{"accessibilityData":{"label":"([0-9,]+) likes"/
          ) || watchHtml.match(/"likeCount":"(\d+)"/);
        if (likeMatch) {
          const num = parseInt(likeMatch[1].replace(/,/g, ""), 10);
          if (!isNaN(num)) (item as any).likes = num;
        }

        const dateMatch =
          watchHtml.match(/"publishDate":"([^"]+)"/) ||
          watchHtml.match(/"dateText":{"simpleText":"([^"]+)"/);
        if (dateMatch) {
          const d = new Date(dateMatch[1]);
          if (!isNaN(d.getTime())) item.publishedAt = d;
        }
      }
    } catch {}
  }

  // Insert or update all extracted videos into contents & metric_snapshots
  for (const item of videoList) {
    try {
      let contentType = "long_form";
      const tLower = item.title.toLowerCase();
      if (
        tLower.includes("cover") ||
        tLower.includes("歌ってみた") ||
        tLower.includes("nyanyi")
      ) {
        contentType = "music_cover";
      } else if (tLower.includes("original") || tLower.includes("mv")) {
        contentType = "original_song";
      } else if (
        tLower.includes("stream") ||
        tLower.includes("live") ||
        tLower.includes("karaoke")
      ) {
        contentType = "livestream";
      }

      const [existingContent] = await db
        .select()
        .from(contents)
        .where(
          and(
            eq(contents.platformId, account.platformId),
            eq(contents.externalId, item.videoId)
          )
        );

      let contentId: number;
      if (existingContent) {
        contentId = existingContent.id;
        await db
          .update(contents)
          .set({
            title: item.title,
            contentType: existingContent.contentType || contentType,
            publishedAt: item.publishedAt,
            updatedAt: now,
          })
          .where(eq(contents.id, contentId));
      } else {
        const [created] = await db
          .insert(contents)
          .values({
            platformId: account.platformId,
            externalId: item.videoId,
            title: item.title,
            contentType,
            publishedAt: item.publishedAt,
            contentUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        contentId = created.id;
        newItemsCreated++;
      }

      // Record point-in-time metric snapshots
      await db.insert(metricSnapshots).values({
        contentId,
        metricName: "views",
        metricValue: String(item.views),
        capturedAt: now,
        createdAt: now,
      });
      snapshotsCreated++;

      const likes = (item as any).likes;
      if (typeof likes === "number" && likes > 0) {
        await db.insert(metricSnapshots).values({
          contentId,
          metricName: "likes",
          metricValue: String(likes),
          capturedAt: now,
          createdAt: now,
        });
        snapshotsCreated++;
      }
    } catch (vErr) {
      console.warn(`Error storing video ${item.videoId}:`, vErr);
    }
  }

  await db
    .update(connectedAccounts)
    .set({
      syncStatus: "success",
      lastSyncedAt: now,
      syncError: null,
      updatedAt: now,
    })
    .where(eq(connectedAccounts.id, account.id));

  return {
    success: true,
    accountId: account.id,
    platformName: "YouTube",
    itemsProcessed: videoList.length,
    newItemsCreated,
    snapshotsCreated,
    syncedAt: now.toISOString(),
  };
}

export async function syncYouTubeAccount(accountId: number): Promise<SyncResult> {
  const [account] = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.id, accountId));

  if (!account) {
    throw new Error(`Connected account #${accountId} not found.`);
  }

  // Zero-setup Instant Connect mode without Google OAuth:
  if (!account.refreshToken) {
    try {
      return await syncYouTubePublicChannel(account);
    } catch (err: any) {
      console.error("Public YouTube sync error:", err);
      await db
        .update(connectedAccounts)
        .set({
          syncStatus: "failed",
          syncError: err.message || "Failed to sync YouTube public channel",
          updatedAt: new Date(),
        })
        .where(eq(connectedAccounts.id, accountId));

      return {
        success: false,
        accountId,
        platformName: "YouTube",
        itemsProcessed: 0,
        newItemsCreated: 0,
        snapshotsCreated: 0,
        syncedAt: new Date().toISOString(),
        error: err.message,
      };
    }
  }

  // Update status to syncing
  await db
    .update(connectedAccounts)
    .set({ syncStatus: "syncing", syncError: null })
    .where(eq(connectedAccounts.id, accountId));

  try {
    let token = account.accessToken;
    // Check if expired
    if (!token || (account.tokenExpiresAt && new Date(account.tokenExpiresAt) <= new Date())) {
      try {
        token = await refreshYouTubeAccessToken(account);
      } catch (err) {
        console.warn("OAuth refresh failed, falling back to public sync:", err);
        return syncYouTubePublicChannel(account);
      }
    }

    // 1. Get uploads playlist
    const chRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const chData = await chRes.json();
    const uploadsPlaylistId =
      chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      throw new Error("Could not find uploads playlist for YouTube channel.");
    }

    // 2. Fetch latest videos from playlist (up to 50)
    const plRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const plData = await plRes.json();
    const playlistItems = plData.items || [];

    if (playlistItems.length === 0) {
      await db
        .update(connectedAccounts)
        .set({ syncStatus: "success", lastSyncedAt: new Date() })
        .where(eq(connectedAccounts.id, accountId));
      return {
        success: true,
        accountId,
        platformName: "YouTube",
        itemsProcessed: 0,
        newItemsCreated: 0,
        snapshotsCreated: 0,
        syncedAt: new Date().toISOString(),
      };
    }

    const videoIds = playlistItems
      .map((item: any) => item.contentDetails?.videoId)
      .filter(Boolean)
      .join(",");

    // 3. Fetch full statistics for videos
    const vidRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const vidData = await vidRes.json();
    const videos = vidData.items || [];

    let newItemsCreated = 0;
    let snapshotsCreated = 0;
    const now = new Date();

    for (const v of videos) {
      const externalId = v.id;
      const title = v.snippet.title;
      const publishedAt = v.snippet.publishedAt ? new Date(v.snippet.publishedAt) : null;
      const contentUrl = `https://www.youtube.com/watch?v=${externalId}`;

      // Detect format
      let contentType = "long_form";
      const duration = v.contentDetails?.duration || "";
      if (duration.includes("PT") && !duration.includes("M") && !duration.includes("H")) {
        // Less than a minute -> likely Short
        contentType = "short_form";
      }
      const titleLower = title.toLowerCase();
      if (titleLower.includes("cover")) contentType = "music_cover";
      else if (titleLower.includes("original") || titleLower.includes("mv"))
        contentType = "original_song";
      else if (titleLower.includes("stream") || titleLower.includes("live"))
        contentType = "livestream";

      // Check or create content
      const [existingContent] = await db
        .select()
        .from(contents)
        .where(
          and(
            eq(contents.platformId, account.platformId),
            eq(contents.externalId, externalId)
          )
        );

      let contentId: number;
      if (existingContent) {
        contentId = existingContent.id;
        await db
          .update(contents)
          .set({
            title,
            contentType: existingContent.contentType || contentType,
            updatedAt: now,
          })
          .where(eq(contents.id, contentId));
      } else {
        const [created] = await db
          .insert(contents)
          .values({
            platformId: account.platformId,
            externalId,
            title,
            description: v.snippet.description || null,
            contentType,
            publishedAt,
            contentUrl,
          })
          .returning();
        contentId = created.id;
        newItemsCreated++;
      }

      // Record Metric Snapshots
      const stats = v.statistics || {};
      const views = Number(stats.viewCount || 0);
      const likes = Number(stats.likeCount || 0);
      const comments = Number(stats.commentCount || 0);

      const metricsToRecord: Record<string, number> = {
        views,
        likes,
        comments,
      };

      for (const [mName, mVal] of Object.entries(metricsToRecord)) {
        await db.insert(metricSnapshots).values({
          contentId,
          metricName: mName,
          metricValue: String(mVal),
          capturedAt: now,
        });
        snapshotsCreated++;
      }
    }

    // Mark account success
    await db
      .update(connectedAccounts)
      .set({
        syncStatus: "success",
        lastSyncedAt: now,
        syncError: null,
        updatedAt: now,
      })
      .where(eq(connectedAccounts.id, accountId));

    return {
      success: true,
      accountId,
      platformName: "YouTube",
      itemsProcessed: videos.length,
      newItemsCreated,
      snapshotsCreated,
      syncedAt: now.toISOString(),
    };
  } catch (err: any) {
    console.error("YouTube sync error:", err);
    await db
      .update(connectedAccounts)
      .set({
        syncStatus: "failed",
        syncError: err.message || "Failed to sync YouTube metrics",
        updatedAt: new Date(),
      })
      .where(eq(connectedAccounts.id, accountId));

    return {
      success: false,
      accountId,
      platformName: "YouTube",
      itemsProcessed: 0,
      newItemsCreated: 0,
      snapshotsCreated: 0,
      syncedAt: new Date().toISOString(),
      error: err.message,
    };
  }
}

