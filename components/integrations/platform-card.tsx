"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Unlink,
  Check,
  Copy,
} from "lucide-react";

export interface ConnectedAccountData {
  id: number;
  platformId: number;
  platformName: string;
  accountIdentifier: string;
  accountName: string;
  metadata?: string | null;
  lastSyncedAt?: string | null;
  syncStatus: string;
  syncError?: string | null;
}

interface PlatformCardProps {
  platformKey: "youtube" | "tiktok" | "instagram";
  title: string;
  description: string;
  icon: React.ReactNode;
  brandColor: string;
  isConfigured: boolean;
  requiredEnvVars: string[];
  redirectUri: string;
  setupSteps: string[];
  connectedAccount?: ConnectedAccountData | null;
  onRefresh?: () => void;
}

export function PlatformCard({
  platformKey,
  title,
  description,
  icon,
  brandColor,
  isConfigured,
  requiredEnvVars,
  redirectUri,
  setupSteps,
  connectedAccount,
  onRefresh,
}: PlatformCardProps) {
  const [showSetup, setShowSetup] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleCopyUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncNow = async () => {
    if (!connectedAccount) return;
    setSyncing(true);
    setSyncMessage(null);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: connectedAccount.id }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Sync failed");
      }
      setSyncMessage(
        `Synced! Processed ${data.itemsProcessed} items (${data.snapshotsCreated} metric snapshots updated).`
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setSyncMessage(`Error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connectedAccount) return;
    if (!confirm(`Are you sure you want to disconnect ${connectedAccount.accountName}?`)) {
      return;
    }

    setDisconnecting(true);
    try {
      const res = await fetch(`/api/sync?id=${connectedAccount.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to disconnect");
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  // Parse metadata if available
  let meta: any = {};
  if (connectedAccount?.metadata) {
    try {
      meta = JSON.parse(connectedAccount.metadata);
    } catch {}
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${brandColor} text-white shadow-lg`}>
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </div>
          </div>

          <div>
            {connectedAccount ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            ) : isConfigured ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Ready to Connect
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <KeyRound className="w-3 h-3" /> Setup Needed
              </span>
            )}
          </div>
        </div>

        {/* Connection State Info */}
        {connectedAccount ? (
          <div className="mt-5 p-4 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Connected Channel / Handle:</span>
              <span className="font-semibold text-slate-200">{connectedAccount.accountName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Account ID:</span>
              <span className="font-mono text-slate-400 text-[11px]">{connectedAccount.accountIdentifier}</span>
            </div>
            {meta.subscriberCount && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Audience:</span>
                <span className="font-mono text-indigo-400">{Number(meta.subscriberCount).toLocaleString()} Subscribers</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="text-slate-500">Last Synced:</span>
              <span className="text-slate-300 font-mono text-[11px]">
                {connectedAccount.lastSyncedAt
                  ? new Date(connectedAccount.lastSyncedAt).toLocaleString()
                  : "Never"}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-5 p-4 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400">
            {isConfigured ? (
              <p>Your API keys are configured. Click the button below to authorize your account via official OAuth 2.0.</p>
            ) : (
              <div>
                <p className="text-amber-300/90 font-medium mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> API Keys Required in .env.local / Vercel:
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1 font-mono text-[11px] text-slate-300">
                  {requiredEnvVars.map((v) => (
                    <span key={v} className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {syncMessage && (
          <div className="mt-3 p-2.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
            {syncMessage}
          </div>
        )}
      </div>

      {/* Action Buttons & Accordion */}
      <div className="p-6 pt-0 space-y-3">
        <div className="flex items-center gap-3">
          {connectedAccount ? (
            <>
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing Telemetry..." : "Sync Now"}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition flex items-center gap-1.5 disabled:opacity-50"
                title="Disconnect account"
              >
                <Unlink className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <a
              href={`/api/auth/${platformKey}`}
              className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold text-center transition flex items-center justify-center gap-2 ${
                isConfigured
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-slate-800 text-slate-400 cursor-not-allowed pointer-events-none"
              }`}
            >
              Connect with {title} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Setup Guide Toggle */}
        <button
          onClick={() => setShowSetup(!showSetup)}
          className="w-full text-[11px] text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 pt-1 transition"
        >
          {showSetup ? (
            <>
              Hide Developer Setup Guide <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              View API Setup Guide <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>

        {showSetup && (
          <div className="mt-3 p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-3">
            <div>
              <span className="text-slate-400 font-semibold block mb-1">Authorized Redirect URI:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={redirectUri}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 font-mono text-[11px]"
                />
                <button
                  onClick={handleCopyUri}
                  className="p-1 text-slate-400 hover:text-slate-200 bg-slate-800 rounded border border-slate-700"
                  title="Copy Redirect URI"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block mb-1">Setup Instructions:</span>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                {setupSteps.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

