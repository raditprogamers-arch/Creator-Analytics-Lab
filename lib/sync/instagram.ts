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

export function getInstagramConfig() {
  const clientId =
    process.env.INSTAGRAM_CLIENT_ID || process.env.FACEBOOK_APP_ID || "";
  const clientSecret =
    process.env.INSTAGRAM_CLIENT_SECRET || process.env.FACEBOOK_APP_SECRET || "";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const redirectUri = `${appUrl}/api/auth/callback/instagram`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: Boolean(clientId && clientSecret),
  };
}

export function getInstagramAuthUrl(state?: string): string {
  const { clientId, redirectUri } = getInstagramConfig();
  const scopes = "user_profile,user_media";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: "code",
    state: state || "instagram_auth",
  });

  return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeInstagramCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getInstagramConfig();

  // 1. Short-lived token
  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Failed to exchange Instagram code: ${err}`);
  }

  const tokenData = await tokenRes.json();
  const shortLivedToken = tokenData.access_token;
  const userId = String(tokenData.user_id);

  // 2. Exchange for Long-lived token (valid for 60 days)
  const longTokenRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${shortLivedToken}`
  );

  let finalToken = shortLivedToken;
  let expiresIn = 3600;

  if (longTokenRes.ok) {
    const longData = await longTokenRes.json();
    finalToken = longData.access_token;
    expiresIn = longData.expires_in || 5184000; // 60 days
  }

  // 3. Fetch User Profile
  const userRes = await fetch(
    `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${finalToken}`
  );
  const userData = userRes.ok ? await userRes.json() : {};
  const username = userData.username || `Instagram User ${userId}`;

  // Get or create Instagram platform in Neon
  let [platformRecord] = await db
    .select()
    .from(platforms)
    .where(eq(platforms.name, "Instagram"));

  if (!platformRecord) {
    [platformRecord] = await db
      .insert(platforms)
      .values({ name: "Instagram", platformType: "short_video" })
      .returning();
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  const [existing] = await db
    .select()
    .from(connectedAccounts)
    .where(
      and(
        eq(connectedAccounts.platformId, platformRecord.id),
        eq(connectedAccounts.accountIdentifier, userId)
      )
    );

  const metadata = JSON.stringify({
    username,
    accountType: userData.account_type,
    mediaCount: userData.media_count,
  });

  if (existing) {
    const [updated] = await db
      .update(connectedAccounts)
      .set({
        accountName: `@${username}`,
        accessToken: finalToken,
        tokenExpiresAt: expiresAt,
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
        platformName: "Instagram",
        accountIdentifier: userId,
        accountName: `@${username}`,
        accessToken: finalToken,
        tokenExpiresAt: expiresAt,
        metadata,
        syncStatus: "idle",
      })
      .returning();
    return created;
  }
}

export async function syncInstagramAccount(accountId: number): Promise<SyncResult> {
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
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&access_token=${account.accessToken}`
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Instagram API error: ${err}`);
    }

    const data = await res.json();
    const mediaItems = data.data || [];
    let newItemsCreated = 0;
    let snapshotsCreated = 0;
    const now = new Date();

    for (const item of mediaItems) {
      const externalId = item.id;
      const title = item.caption ? item.caption.slice(0, 100) : `Instagram Post ${externalId}`;
      const publishedAt = item.timestamp ? new Date(item.timestamp) : null;
      const contentUrl = item.permalink;
      const contentType = item.media_type === "VIDEO" ? "short_form" : "post";

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
            description: item.caption || null,
            contentType,
            publishedAt,
            contentUrl,
          })
          .returning();
        contentId = created.id;
        newItemsCreated++;
      }

      // Record Snapshots
      const likes = Number(item.like_count || 0);
      const comments = Number(item.comments_count || 0);

      const metrics: Record<string, number> = {
        likes,
        comments,
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
      platformName: "Instagram",
      itemsProcessed: mediaItems.length,
      newItemsCreated,
      snapshotsCreated,
      syncedAt: now.toISOString(),
    };
  } catch (err: any) {
    console.error("Instagram sync error:", err);
    await db
      .update(connectedAccounts)
      .set({
        syncStatus: "failed",
        syncError: err.message || "Failed to sync Instagram media",
        updatedAt: new Date(),
      })
      .where(eq(connectedAccounts.id, accountId));

    return {
      success: false,
      accountId,
      platformName: "Instagram",
      itemsProcessed: 0,
      newItemsCreated: 0,
      snapshotsCreated: 0,
      syncedAt: new Date().toISOString(),
      error: err.message,
    };
  }
}

