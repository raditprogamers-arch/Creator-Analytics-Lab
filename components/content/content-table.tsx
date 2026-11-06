"use client";

import { useState } from "react";
import {
  ExternalLink,
  Edit2,
  Trash2,
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { ContentWithMetrics } from "@/lib/analytics/metrics";
import { formatNumber, formatPercentage } from "@/lib/utils";

interface PlatformOption {
  id: number;
  name: string;
}

interface ContentTableProps {
  initialContents: ContentWithMetrics[];
  platforms: PlatformOption[];
  onRefresh?: () => void;
}

export function ContentTable({
  initialContents,
  platforms,
  onRefresh,
}: ContentTableProps) {
  const [contentsList, setContentsList] = useState<ContentWithMetrics[]>(initialContents);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");

  // Editing state
  const [editingContent, setEditingContent] = useState<ContentWithMetrics | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Deleting state
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Filter contents
  const filteredContents = contentsList.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchExtId = c.externalId.toLowerCase().includes(q);
      if (!matchTitle && !matchExtId) return false;
    }
    if (platformFilter !== "all" && c.platformId !== Number(platformFilter)) {
      return false;
    }
    if (typeFilter !== "all" && c.contentType !== typeFilter) {
      return false;
    }
    if (languageFilter !== "all" && (c.language || "unspecified") !== languageFilter) {
      return false;
    }
    return true;
  });

  const handleSaveEdit = async () => {
    if (!editingContent) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingContent.id,
          title: editingContent.title,
          contentType: editingContent.contentType,
          language: editingContent.language,
          contentUrl: editingContent.contentUrl,
          description: editingContent.description,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update content");
      }

      // Update local state
      setContentsList((prev) =>
        prev.map((c) => (c.id === editingContent.id ? { ...c, ...editingContent } : c))
      );
      setEditingContent(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setSaveError(err.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this content item and all its metric snapshots?")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/content?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to delete");
      }
      setContentsList((prev) => prev.filter((c) => c.id !== id));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title or external ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Platforms</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Content Types</option>
              <option value="original_song" className="bg-slate-900">Original Song</option>
              <option value="music_cover" className="bg-slate-900">Music Cover</option>
              <option value="music_release" className="bg-slate-900">Music Release</option>
              <option value="short_form" className="bg-slate-900">Short Form</option>
              <option value="long_form" className="bg-slate-900">Long Form</option>
              <option value="livestream" className="bg-slate-900">Livestream</option>
            </select>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400">
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Languages</option>
              <option value="id" className="bg-slate-900">Indonesian (id)</option>
              <option value="en" className="bg-slate-900">English (en)</option>
              <option value="ja" className="bg-slate-900">Japanese (ja)</option>
              <option value="jv" className="bg-slate-900">Javanese (jv)</option>
              <option value="su" className="bg-slate-900">Sundanese (su)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="py-3 px-4">Title & Details</th>
                <th className="py-3 px-3">Platform</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Lang</th>
                <th className="py-3 px-3 text-right">Views/Streams</th>
                <th className="py-3 px-3 text-right">Interactions</th>
                <th className="py-3 px-3 text-right">Engagement</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredContents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-sm">
                    No content matches the selected search and filters.
                  </td>
                </tr>
              ) : (
                filteredContents.map((c) => {
                  const interactions =
                    (c.likes || 0) + (c.comments || 0) + (c.shares || 0);

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-100 truncate flex items-center gap-1.5">
                          <span title={c.title}>{c.title}</span>
                          {c.contentUrl && (
                            <a
                              href={c.contentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:text-indigo-400"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          ID: {c.externalId}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                          {c.platformName}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs text-slate-400 capitalize">
                          {c.contentType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs text-slate-400 font-mono uppercase">
                          {c.language || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-200">
                        {c.views !== null
                          ? formatNumber(c.views)
                          : c.streams !== null
                          ? `${formatNumber(c.streams)} (str)`
                          : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        {interactions > 0 ? formatNumber(interactions) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-indigo-400 font-medium">
                        {formatPercentage(c.engagementRate)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingContent(c)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition"
                            title="Edit metadata"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={deletingId === c.id}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition disabled:opacity-50"
                            title="Delete content"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingContent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-base">Edit Content Metadata</h3>
              <button
                onClick={() => setEditingContent(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <div className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  value={editingContent.title}
                  onChange={(e) =>
                    setEditingContent({ ...editingContent, title: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Content Type
                  </label>
                  <select
                    value={editingContent.contentType}
                    onChange={(e) =>
                      setEditingContent({ ...editingContent, contentType: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="original_song">Original Song</option>
                    <option value="music_cover">Music Cover</option>
                    <option value="music_release">Music Release</option>
                    <option value="short_form">Short Form</option>
                    <option value="long_form">Long Form</option>
                    <option value="livestream">Livestream</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Language
                  </label>
                  <input
                    type="text"
                    placeholder="id, en, ja, jv, su"
                    value={editingContent.language || ""}
                    onChange={(e) =>
                      setEditingContent({
                        ...editingContent,
                        language: e.target.value || null,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Content URL
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={editingContent.contentUrl || ""}
                  onChange={(e) =>
                    setEditingContent({
                      ...editingContent,
                      contentUrl: e.target.value || null,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editingContent.description || ""}
                  onChange={(e) =>
                    setEditingContent({
                      ...editingContent,
                      description: e.target.value || null,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingContent(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

