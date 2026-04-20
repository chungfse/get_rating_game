"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X, GitBranch, CheckSquare, Square, Download } from "lucide-react";

export interface VersionStat {
  version: string;
  count: number;
  earliestReviewDate: string; // ISO date — earliest review ≈ release time
}

/** Format ISO date to a concise release label, e.g. "Tháng 04/2025" */
function formatReleaseDate(iso: string): string {
  try {
    const d = new Date(iso);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `Tháng ${String(month).padStart(2, '0')}/${year}`;
  } catch {
    return "";
  }
}

interface Props {
  gameId: string;
  onClose: () => void;
  onFetch: (versions: string[], limit: number) => Promise<void>;
}

export default function VersionPickerModal({ gameId, onClose, onFetch }: Props) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [versions, setVersions] = useState<VersionStat[]>([]);
  const [totalSampled, setTotalSampled] = useState(0);
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(500);
  const [loaded, setLoaded] = useState(false);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reviews/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, sampleSize: 500 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVersions(data.versions || []);
      setTotalSampled(data.totalSampled || 0);
      setLoaded(true);
      // Auto-select top version
      if (data.versions?.length > 0) {
        setSelectedVersions(new Set([data.versions[0].version]));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi tải danh sách version");
    } finally {
      setLoading(false);
    }
  };

  const toggleVersion = (version: string) => {
    setSelectedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedVersions.size === versions.length) {
      setSelectedVersions(new Set());
    } else {
      setSelectedVersions(new Set(versions.map((v) => v.version)));
    }
  };

  const handleFetch = async () => {
    if (selectedVersions.size === 0) return;
    setFetching(true);
    try {
      await onFetch(Array.from(selectedVersions), limit);
      onClose();
    } finally {
      setFetching(false);
    }
  };

  const maxCount = versions.length > 0 ? Math.max(...versions.map((v) => v.count)) : 1;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl shadow-black/60 animate-in zoom-in-95 slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 ring-1 ring-purple-500/30">
              <GitBranch className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Fetch Reviews theo Version</h2>
              <p className="text-xs text-white/40">Chọn version để lấy reviews tập trung</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {!loaded ? (
            /* Step 1: Load versions */
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/20">
                <GitBranch className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-white/70">
                  Hệ thống sẽ scan <span className="text-white font-medium">500 reviews mới nhất</span> để phát hiện các version hiện có và số lượng reviews của từng version.
                </p>
                <p className="text-xs text-white/35 mt-1.5">Thường mất 5–15 giây</p>
              </div>
              <Button
                onClick={loadVersions}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Đang scan versions...</>
                ) : (
                  "Scan Versions"
                )}
              </Button>
            </div>
          ) : (
            /* Step 2: Show version list */
            <>
              {/* Stats header */}
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>Phát hiện <span className="text-white/70 font-medium">{versions.length}</span> versions từ {totalSampled} reviews</span>
                <button
                  onClick={toggleAll}
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {selectedVersions.size === versions.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </button>
              </div>

              {/* Version list */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {versions.map((v) => {
                  const isSelected = selectedVersions.has(v.version);
                  const barWidth = Math.max(4, Math.round((v.count / maxCount) * 100));
                  return (
                    <button
                      key={v.version}
                      onClick={() => toggleVersion(v.version)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                        isSelected
                          ? "border-purple-500/50 bg-purple-500/10"
                          : "border-white/6 bg-white/3 hover:bg-white/6 hover:border-white/10"
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`shrink-0 ${isSelected ? "text-purple-400" : "text-white/25"}`}>
                        {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </div>

                      {/* Version name + date */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs font-mono font-medium truncate ${isSelected ? "text-white" : "text-white/70"}`}>
                            v{v.version}
                          </span>
                          <span className={`text-xs ml-2 shrink-0 ${isSelected ? "text-purple-300" : "text-white/40"}`}>
                            {v.count} reviews
                          </span>
                        </div>
                        {/* Release date approx */}
                        {v.earliestReviewDate && (
                          <div className={`text-[10px] mb-1 ${isSelected ? "text-purple-400/70" : "text-white/25"}`}>
                            ~{formatReleaseDate(v.earliestReviewDate)}
                          </div>
                        )}
                        {/* Bar chart */}
                        <div className="h-1 rounded-full bg-white/6 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isSelected ? "bg-purple-500" : "bg-white/20"}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Limit selector */}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs text-white/50 shrink-0">Số reviews cần fetch:</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="flex-1 h-8 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white focus:ring-2 focus:ring-purple-500/30 focus:outline-none"
                >
                  <option value={100}>100 reviews</option>
                  <option value={200}>200 reviews</option>
                  <option value={500}>500 reviews</option>
                  <option value={1000}>1000 reviews</option>
                </select>
              </div>

              {/* Selected info */}
              {selectedVersions.size > 0 && (
                <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-xs text-purple-300">
                  ✓ Đã chọn{" "}
                  <strong>{selectedVersions.size}</strong> version:{" "}
                  <span className="font-mono">
                    {Array.from(selectedVersions)
                      .map((v) => `v${v}`)
                      .join(", ")}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {loaded && (
          <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white/50">
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleFetch}
              disabled={fetching || selectedVersions.size === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
            >
              {fetching ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Đang fetch...</>
              ) : (
                <><Download className="h-4 w-4 mr-1.5" />Fetch {selectedVersions.size > 0 ? `${selectedVersions.size} version` : ""}</>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
