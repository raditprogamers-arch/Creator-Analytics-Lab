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

export function getTikTokConfig() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY || "";
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET || "";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const redirectUri = `${appUrl}/api/auth/callback/tiktok`;

  return {
    clientKey,
    clientSecret,
    redirectUri,
    isConfigured: Boolean(clientKey && clientSecret),
  };
}

export function getTikTokAuthUrl(state?: string): string {
  const { clientKey, redirectUri } = getTikTokConfig();
  const scopes = "user.info.basic,video.list";

  const params = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    state: state || "tiktok_auth",
  });

  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

export async function exchangeTikTokCode(code: string) {
  const { clientKey, clientSecret, redirectUri } = getTikTokConfig();

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Failed to exchange TikTok authorization code: ${err}`);
  }

  const tokenData = await tokenRes.json();
  const { access_token, refresh_token, expires_in, open_id, scope } = tokenData.data || {};

  // Fetch creator profile info
  const userRes = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
    {
      headers: { Authorization: `Bearer ${access_token}` },
    }
  );
  const userData = await userRes.json();
  const user = userData.data?.user || {};
  const displayName = user.display_name || `TikTok Creator ${open_id?.slice(0, 6)}`;

  // Get or create TikTok platform in Neon
  let [platformRecord] = await db
    .select()
    .from(platforms)
    .where(eq(platforms.name, "TikTok"));

  if (!platformRecord) {
    [platformRecord] = await db
      .insert(platforms)
      .values({ name: "TikTok", platformType: "short_video" })
      .returning();
  }

  const expiresAt = new Date(Date.now() + (expires_in || 86400) * 1000);

  const [existing] = await db
    .select()
    .from(connectedAccounts)
    .where(
      and(
        eq(connectedAccounts.platformId, platformRecord.id),
        eq(connectedAccounts.accountIdentifier, open_id)
      )
    );

  const metadata = JSON.stringify({
    avatarUrl: user.avatar_url,
    openId: open_id,
  });

  if (existing) {
    const [updated] = await db
      .update(connectedAccounts)
      .set({
        accountName: displayName,
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
        platformName: "TikTok",
        accountIdentifier: open_id,
        accountName: displayName,
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

export async function syncTikTokAccount(accountId: number): Promise<SyncResult> {
  const [account] = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.id, accountId));

  if (!account) {
    throw new Error(`Connected account #${accountId} not found.`);
  }

  await db
    .update(connectedAccounts)
    .set({ syncStatus: "syncing", syncError: null })
    .where(eq(connectedAccounts.id, accountId));

  try {
    const res = await fetch(
      "https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,share_url,view_count,like_count,comment_count,share_count",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_count: 20 }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`TikTok API error: ${err}`);
    }

    const data = await res.json();
    const videos = data.data?.videos || [];
    let newItemsCreated = 0;
    let snapshotsCreated = 0;
    const now = new Date();

    for (const v of videos) {
      const externalId = v.id;
      const title = v.title || v.video_description || `TikTok Video ${externalId}`;
      const publishedAt = v.create_time ? new Date(v.create_time * 1000) : null;
      const contentUrl = v.share_url;

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
          .set({ title, updatedAt: now })
          .where(eq(contents.id, contentId));
      } else {
        const [created] = await db
          .insert(contents)
          .values({
            platformId: account.platformId,
            externalId,
            title,
            description: v.video_description || null,
            contentType: "short_form",
            publishedAt,
            contentUrl,
          })
          .returning();
        contentId = created.id;
        newItemsCreated++;
      }

      // Record Snapshots
      const metrics: Record<string, number> = {
        views: Number(v.view_count || 0),
        likes: Number(v.like_count || 0),
        comments: Number(v.comment_count || 0),
        shares: Number(v.share_count || 0),
      };

      for (const [mName, mVal] of Object.entries(metrics)) {
        await db.insert(metricSnapshots).values({
          contentId,
          metricName: mName,
          metricValue: String(mVal),
          capturedAt: now,
        });
        snapshotsCreated++;
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
      .where(eq(connectedAccounts.id, accountId));

    return {
      success: true,
      accountId,
      platformName: "TikTok",
      itemsProcessed: videos.length,
      newItemsCreated,
      snapshotsCreated,
      syncedAt: now.toISOString(),
    };
  } catch (err: any) {
    console.error("TikTok sync error:", err);
    await db
      .update(connectedAccounts)
      .set({
        syncStatus: "failed",
        syncError: err.message || "Failed to sync TikTok videos",
        updatedAt: new Date(),
      })
      .where(eq(connectedAccounts.id, accountId));

    return {
      success: false,
      accountId,
      platformName: "TikTok",
      itemsProcessed: 0,
      newItemsCreated: 0,
      snapshotsCreated: 0,
      syncedAt: new Date().toISOString(),
      error: err.message,
    };
  }
}

