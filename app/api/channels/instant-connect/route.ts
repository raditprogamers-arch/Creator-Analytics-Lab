import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { connectedAccounts, platforms, contents, metricSnapshots } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

    if (!platformRecord) {
      const pType =
        platformName === "Spotify" || platformName === "Apple Music"
          ? "music_streaming"
          : platformName === "TikTok" || platformName === "Instagram"
          ? "short_video"
          : "video";

      [platformRecord] = await db
        .insert(platforms)
        .values({ name: platformName, platformType: pType })
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

    const now = new Date();
    let account;

    if (existing) {
      [account] = await db
        .update(connectedAccounts)
        .set({
          accountName: displayName,
          syncStatus: "connected",
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
          syncStatus: "connected",
          lastSyncedAt: now,
        })
        .returning();
    }

    // 3. Automatically fetch public videos for the channel (Zero API Key / Zero Google Cloud needed!)
    let videosImported = 0;
    if (platformName === "YouTube") {
      try {
        const ytRes = await fetch(`https://www.youtube.com/@${cleanHandle}`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        if (ytRes.ok) {
          const html = await ytRes.text();
          const videoMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_\-]{11})"/g)];
          const uniqueIds = [...new Set(videoMatches.map((v) => v[1]))].slice(0, 10);

          for (const videoId of uniqueIds) {
            try {
              const oeRes = await fetch(
                `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
              );
              if (oeRes.ok) {
                const oeData = await oeRes.json();
                const vTitle = oeData.title || `Video ${videoId}`;
                const contentUrl = `https://www.youtube.com/watch?v=${videoId}`;

                let cType = "long_form";
                const tLower = vTitle.toLowerCase();
                if (tLower.includes("cover") || tLower.includes("歌ってみた")) {
                  cType = "music_cover";
                } else if (tLower.includes("original") || tLower.includes("mv")) {
                  cType = "original_song";
                } else if (tLower.includes("stream") || tLower.includes("live")) {
                  cType = "livestream";
                }

                // Check or insert into contents
                const [existContent] = await db
                  .select()
                  .from(contents)
                  .where(
                    and(
                      eq(contents.platformId, platformRecord.id),
                      eq(contents.externalId, videoId)
                    )
                  );

                let contentId: number;
                if (!existContent) {
                  const [newContent] = await db
                    .insert(contents)
                    .values({
                      platformId: platformRecord.id,
                      externalId: videoId,
                      title: vTitle,
                      contentType: cType,
                      contentUrl,
                      publishedAt: now,
                    })
                    .returning();
                  contentId = newContent.id;
                  videosImported++;
                } else {
                  contentId = existContent.id;
                }
              }
            } catch (vErr) {
              // Ignore single video fetch failure
            }
          }
        }
      } catch (scrapeErr) {
        console.warn("Public channel scrape warning:", scrapeErr);
      }
    }

    const message =
      videosImported > 0
        ? `Channel ${displayName} connected and synced ${videosImported} public videos to your catalog!`
        : `Channel ${displayName} connected successfully!`;

    return NextResponse.json({
      success: true,
      message,
      account,
      videosImported,
    });
  } catch (err: any) {
    console.error("Instant connect error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to connect channel" },
      { status: 500 }
    );
  }
}

