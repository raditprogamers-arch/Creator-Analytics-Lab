import { NextRequest, NextResponse } from "next/server";
import { exchangeYouTubeCode, syncYouTubeAccount } from "@/lib/sync/youtube";
import { exchangeTikTokCode, syncTikTokAccount } from "@/lib/sync/tiktok";
import { exchangeInstagramCode, syncInstagramAccount } from "@/lib/sync/instagram";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const p = platform.toLowerCase();

  if (error) {
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(error)}&platform=${p}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/integrations?error=no_code_provided&platform=${p}`, request.url)
    );
  }

  try {
    let account: any;

    if (p === "youtube") {
      account = await exchangeYouTubeCode(code);
      // Run initial sync in background
      syncYouTubeAccount(account.id).catch(console.error);
    } else if (p === "tiktok") {
      account = await exchangeTikTokCode(code);
      syncTikTokAccount(account.id).catch(console.error);
    } else if (p === "instagram") {
      account = await exchangeInstagramCode(code);
      syncInstagramAccount(account.id).catch(console.error);
    } else {
      return NextResponse.redirect(
        new URL(`/integrations?error=unsupported_platform&platform=${p}`, request.url)
      );
    }

    return NextResponse.redirect(
      new URL(
        `/integrations?success=connected&platform=${p}&name=${encodeURIComponent(account.accountName)}`,
        request.url
      )
    );
  } catch (err: any) {
    console.error(`Error in OAuth callback for ${platform}:`, err);
    return NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent(err.message || "Failed to exchange authorization code")}&platform=${p}`,
        request.url
      )
    );
  }
}

