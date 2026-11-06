"use client";

import { useState } from "react";
import { Sparkles, CheckCircle2, ArrowRight, Radio, AlertCircle } from "lucide-react";

interface InstantConnectProps {
  onSuccess?: () => void;
}

export function InstantConnect({ onSuccess }: InstantConnectProps) {
  const [platform, setPlatform] = useState("YouTube");
  const [handle, setHandle] = useState("");
  const [channelTitle, setChannelTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;

    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/channels/instant-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformName: platform,
          handle: handle.trim(),
          channelTitle: channelTitle.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to connect channel");
      }

      setSuccessMessage(data.message || `Channel ${handle} connected!`);
      setHandle("");
      setChannelTitle("");
      if (onSuccess) onSuccess();
      // Force reload to show in connected cards
      window.location.reload();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Direct Instant Connect
          </span>
          <h3 className="text-lg font-bold text-slate-100">
            Connect Your Channel with Zero Developer Setup
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            No need to create Google Cloud, Meta Developer, or TikTok Developer accounts. Just enter your channel handle or username, and link it directly to your workspace.
          </p>
        </div>

        <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          No API Keys Required
        </span>
      </div>

      <form onSubmit={handleConnect} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="YouTube">YouTube</option>
              <option value="TikTok">TikTok</option>
              <option value="Instagram">Instagram</option>
              <option value="Spotify">Spotify</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Channel Handle / Username
            </label>
            <input
              type="text"
              placeholder={
                platform === "YouTube"
                  ? "@MyYouTubeChannel"
                  : platform === "TikTok"
                  ? "@MyTikTok"
                  : platform === "Instagram"
                  ? "@MyInstagram"
                  : "Artist Name"
              }
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 placeholder-slate-600 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Display Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Radit Music Official"
              value={channelTitle}
              onChange={(e) => setChannelTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <p className="text-[11px] text-slate-500">
            Linking your channel assigns all current and future telemetry to this identity in Neon PostgreSQL.
          </p>

          <button
            type="submit"
            disabled={!handle.trim() || loading}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50 shrink-0"
          >
            {loading ? "Connecting..." : "Connect Channel Now"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {successMessage && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </form>
    </div>
  );
}

