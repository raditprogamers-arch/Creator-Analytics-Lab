import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { connectedAccounts, platforms } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { syncConnectedAccount } from "@/lib/sync";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platformName = "YouTube", handle, channelTitle } = body;

    if (!handle || typeof handle !== "string" || handle.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid channel handle, username, or URL." },
        { status: 400 }
      );
    }

    let cleanHandle = handle.trim();
    if (cleanHandle.includes("youtube.com/") || cleanHandle.includes("youtu.be/")) {
      const match =
        cleanHandle.match(/@([a-zA-Z0-9_\-\.]+)/) ||
        cleanHandle.match(/(?:channel|c|user)\/([a-zA-Z0-9_\-\.]+)/);
      if (match) cleanHandle = match[1];
    } else if (cleanHandle.includes("tiktok.com/") || cleanHandle.includes("instagram.com/")) {
      const match = cleanHandle.match(/@?([a-zA-Z0-9_\-\.]+)\/?$/);
      if (match) cleanHandle = match[1];
    }
    cleanHandle = cleanHandle.replace(/^@/, "").replace(/\/$/, "");

    const displayName = channelTitle?.trim() || cleanHandle;

    // 1. Resolve or create platform
    let [platformRecord] = await db
      .select()
      .from(platforms)
      .where(eq(platforms.name, platformName));

    const now = new Date();

    if (!platformRecord) {
      const pType =
        platformName === "Spotify" || platformName === "Apple Music"
          ? "music_streaming"
          : platformName === "TikTok" || platformName === "Instagram"
          ? "short_video"
          : "video";

      [platformRecord] = await db
        .insert(platforms)
        .values({ name: platformName, platformType: pType, createdAt: now })
        .returning();
    }

    // 2. Check if connected account exists
    const [existing] = await db
      .select()
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.platformId, platformRecord.id),
          eq(connectedAccounts.accountIdentifier, cleanHandle)
        )
      );

    let account;

    if (existing) {
      [account] = await db
        .update(connectedAccounts)
        .set({
          accountName: displayName,
          syncStatus: "syncing",
          syncError: null,
          lastSyncedAt: now,
          updatedAt: now,
        })
        .where(eq(connectedAccounts.id, existing.id))
        .returning();
    } else {
      [account] = await db
        .insert(connectedAccounts)
        .values({
          platformId: platformRecord.id,
          platformName,
          accountIdentifier: cleanHandle,
          accountName: displayName,
          syncStatus: "syncing",
          syncError: null,
          lastSyncedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
    }

    // 3. Immediately trigger automated real-time sync into Neon
    let syncRes;
    try {
      syncRes = await syncConnectedAccount(account.id);
    } catch (syncErr: any) {
      console.warn("Immediate sync warning upon connection:", syncErr);
    }

    const itemsProcessed = syncRes?.itemsProcessed || 0;
    const snapshotsCreated = syncRes?.snapshotsCreated || 0;

    const message =
      itemsProcessed > 0
        ? `Channel "${displayName}" connected! Synced ${itemsProcessed} videos and ${snapshotsCreated} live metric snapshots to Neon PostgreSQL.`
        : `Channel "${displayName}" connected successfully!`;

    return NextResponse.json({
      success: true,
      message,
      account,
      videosImported: itemsProcessed,
      syncResult: syncRes,
    });
  } catch (err: any) {
    console.error("Instant connect error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to connect channel" },
      { status: 500 }
    );
  }
}
