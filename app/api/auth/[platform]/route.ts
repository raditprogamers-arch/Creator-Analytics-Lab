import { NextRequest, NextResponse } from "next/server";
import { getYouTubeAuthUrl, getYouTubeConfig } from "@/lib/sync/youtube";
import { getTikTokAuthUrl, getTikTokConfig } from "@/lib/sync/tiktok";
import { getInstagramAuthUrl, getInstagramConfig } from "@/lib/sync/instagram";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const p = platform.toLowerCase();

  try {
    if (p === "youtube") {
      const cfg = getYouTubeConfig();
      if (!cfg.isConfigured) {
        return NextResponse.redirect(
          new URL("/integrations?error=missing_credentials&platform=youtube", request.url)
        );
      }
      return NextResponse.redirect(getYouTubeAuthUrl());
    }

    if (p === "tiktok") {
      const cfg = getTikTokConfig();
      if (!cfg.isConfigured) {
        return NextResponse.redirect(
          new URL("/integrations?error=missing_credentials&platform=tiktok", request.url)
        );
      }
      return NextResponse.redirect(getTikTokAuthUrl());
    }

    if (p === "instagram") {
      const cfg = getInstagramConfig();
      if (!cfg.isConfigured) {
        return NextResponse.redirect(
          new URL("/integrations?error=missing_credentials&platform=instagram", request.url)
        );
      }
      return NextResponse.redirect(getInstagramAuthUrl());
    }

    return NextResponse.json(
      { success: false, error: `Unsupported platform '${platform}'` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error(`Auth redirect error for ${platform}:`, err);
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(err.message)}`, request.url)
    );
  }
}

