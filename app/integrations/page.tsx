import { db } from "@/lib/db";
import { connectedAccounts } from "@/lib/db/schema";
import { Header } from "@/components/layout/header";
import { PlatformCard, ConnectedAccountData } from "@/components/integrations/platform-card";
import { getYouTubeConfig } from "@/lib/sync/youtube";
import { getTikTokConfig } from "@/lib/sync/tiktok";
import { getInstagramConfig } from "@/lib/sync/instagram";
import { Radio, CheckCircle2, AlertTriangle, Video } from "lucide-react";

function YouTubeIcon() {
  return (
    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      className="w-6 h-6 fill-none stroke-current stroke-2"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export const dynamic = "force-dynamic";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const success = resolvedParams.success as string | undefined;
  const platformParam = resolvedParams.platform as string | undefined;
  const accountName = resolvedParams.name as string | undefined;
  const error = resolvedParams.error as string | undefined;

  // Fetch all connected accounts
  const accounts = await db
    .select({
      id: connectedAccounts.id,
      platformId: connectedAccounts.platformId,
      platformName: connectedAccounts.platformName,
      accountIdentifier: connectedAccounts.accountIdentifier,
      accountName: connectedAccounts.accountName,
      metadata: connectedAccounts.metadata,
      lastSyncedAt: connectedAccounts.lastSyncedAt,
      syncStatus: connectedAccounts.syncStatus,
      syncError: connectedAccounts.syncError,
    })
    .from(connectedAccounts)
    .catch(() => []);

  const formattedAccounts: ConnectedAccountData[] = accounts.map((a) => ({
    ...a,
    lastSyncedAt: a.lastSyncedAt ? new Date(a.lastSyncedAt).toISOString() : null,
  }));

  const youtubeAccount = formattedAccounts.find((a) =>
    a.platformName.toLowerCase().includes("youtube")
  );
  const tiktokAccount = formattedAccounts.find((a) =>
    a.platformName.toLowerCase().includes("tiktok")
  );
  const instagramAccount = formattedAccounts.find((a) =>
    a.platformName.toLowerCase().includes("instagram")
  );

  const ytConfig = getYouTubeConfig();
  const ttConfig = getTikTokConfig();
  const igConfig = getInstagramConfig();

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Live API Connections & Automated Sync"
        description="Direct OAuth 2.0 channel integrations to automatically sync views, likes, comments, and engagement directly into Neon PostgreSQL."
      />

      <div className="p-8 space-y-6 flex-1">
        {/* Success Alert */}
        {success === "connected" && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold">Successfully connected {platformParam?.toUpperCase()}!</p>
              <p className="text-xs text-emerald-400/80 mt-0.5">
                Channel {accountName ? `"${accountName}"` : ""} has been authorized. An initial background sync has been triggered.
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-semibold">Connection or Authentication Error</p>
              <p className="text-xs text-rose-300/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              Automated Telemetry Sync Engine
            </h3>
            <p className="text-xs text-slate-400">
              When connected, the sync engine queries platform APIs, extracts published video/music items, and appends timestamped metric snapshots to your Neon database.
            </p>
          </div>
        </div>

        {/* Platform Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* YouTube */}
          <PlatformCard
            platformKey="youtube"
            title="YouTube Channel"
            description="Sync videos, Shorts, streams, views, and watch hours."
            icon={<YouTubeIcon />}
            brandColor="bg-rose-600"
            isConfigured={ytConfig.isConfigured}
            requiredEnvVars={["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]}
            redirectUri={ytConfig.redirectUri}
            connectedAccount={youtubeAccount}
            setupSteps={[
              "Open Google Cloud Console (console.cloud.google.com) and create a project.",
              "Enable both 'YouTube Data API v3' and 'YouTube Analytics API'.",
              "Go to APIs & Services → Credentials → Create Credentials → OAuth Client ID.",
              "Select 'Web application', and add the Authorized Redirect URI shown above.",
              "Copy Client ID and Client Secret into your .env.local or Vercel Environment Variables.",
            ]}
          />

          {/* TikTok */}
          <PlatformCard
            platformKey="tiktok"
            title="TikTok Creator"
            description="Sync short-form videos, likes, shares, and comments."
            icon={<span className="font-bold text-lg font-mono">TT</span>}
            brandColor="bg-slate-800 border border-cyan-500/30 text-cyan-400"
            isConfigured={ttConfig.isConfigured}
            requiredEnvVars={["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"]}
            redirectUri={ttConfig.redirectUri}
            connectedAccount={tiktokAccount}
            setupSteps={[
              "Go to TikTok for Developers (developers.tiktok.com) and create an app.",
              "Enable 'Login Kit' and 'Video List' permissions under Product permissions.",
              "Set the Redirect URI to the URL shown above in your app settings.",
              "Submit app details and copy Client Key and Client Secret into .env.local / Vercel.",
            ]}
          />

          {/* Instagram */}
          <PlatformCard
            platformKey="instagram"
            title="Instagram Creator"
            description="Sync Reels, posts, comments, and engagement."
            icon={<InstagramIcon />}
            brandColor="bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600"
            isConfigured={igConfig.isConfigured}
            requiredEnvVars={["INSTAGRAM_CLIENT_ID", "INSTAGRAM_CLIENT_SECRET"]}
            redirectUri={igConfig.redirectUri}
            connectedAccount={instagramAccount}
            setupSteps={[
              "Ensure your Instagram account is set to Professional / Creator and linked to a Facebook Page.",
              "Go to Meta for Developers (developers.facebook.com) and create an app.",
              "Add Instagram Graph API product.",
              "Add the Authorized Redirect URI shown above under Instagram settings.",
              "Copy App ID and App Secret to your .env.local / Vercel environment variables.",
            ]}
          />
        </div>
      </div>
    </div>
  );
}

