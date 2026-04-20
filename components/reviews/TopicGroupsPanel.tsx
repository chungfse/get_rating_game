"use client";

import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import type { TopicGroup } from "@/types";

interface Props {
  groups: TopicGroup[];
  selectedGroupId: string | null;
  onGroupSelect: (groupId: string | null) => void;
}

// 20 distinct hue-based colors for group badges
const groupColors = [
  "bg-red-500/15 text-red-400 border-red-500/30",
  "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "bg-lime-500/15 text-lime-400 border-lime-500/30",
  "bg-green-500/15 text-green-400 border-green-500/30",
  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "bg-teal-500/15 text-teal-400 border-teal-500/30",
  "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "bg-sky-500/15 text-sky-400 border-sky-500/30",
  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  "bg-violet-500/15 text-violet-400 border-violet-500/30",
  "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
  "bg-pink-500/15 text-pink-400 border-pink-500/30",
  "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "bg-red-600/15 text-red-300 border-red-600/30",
  "bg-teal-600/15 text-teal-300 border-teal-600/30",
  "bg-indigo-600/15 text-indigo-300 border-indigo-600/30",
];

// HSL color values for progress bars and dots
const groupHslColors = [
  "0, 70%, 50%",
  "18, 80%, 55%",
  "36, 90%, 55%",
  "54, 85%, 50%",
  "80, 60%, 50%",
  "120, 50%, 45%",
  "150, 60%, 45%",
  "175, 70%, 45%",
  "195, 80%, 50%",
  "210, 70%, 55%",
  "230, 65%, 60%",
  "250, 60%, 60%",
  "270, 55%, 55%",
  "290, 55%, 55%",
  "310, 60%, 55%",
  "330, 65%, 55%",
  "345, 70%, 55%",
  "10, 75%, 50%",
  "190, 75%, 47%",
  "260, 60%, 53%",
];

export function getGroupColor(index: number): string {
  return groupColors[index % groupColors.length];
}

export function getGroupHslColor(index: number): string {
  return groupHslColors[index % groupHslColors.length];
}

export default function TopicGroupsPanel({
  groups,
  selectedGroupId,
  onGroupSelect,
}: Props) {
  const maxCount = groups.length > 0 ? groups[0].count : 1;
  const totalReviews = groups.reduce((sum, g) => sum + g.count, 0);

  return (
    <div className="rounded-lg border bg-card/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-purple-500" />
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          AI Clusters ({groups.length} nhóm)
        </h3>
      </div>

      {/* Quick filter buttons */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => onGroupSelect(null)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-all",
            selectedGroupId === null
              ? "border-purple-500 bg-purple-500/20 text-purple-300 animate-pulse-ring"
              : "border-border text-muted-foreground hover:border-purple-500/50 hover:bg-purple-500/5"
          )}
        >
          Tất cả
        </button>
        {groups.slice(0, 8).map((group, i) => (
          <button
            key={group.id}
            onClick={() =>
              onGroupSelect(selectedGroupId === group.id ? null : group.id)
            }
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-all truncate max-w-[180px]",
              selectedGroupId === group.id
                ? getGroupColor(i)
                : "border-border text-muted-foreground hover:border-foreground/30 hover:bg-accent/30"
            )}
          >
            {group.label} ({group.count})
          </button>
        ))}
      </div>

      {/* Full list with progress bars */}
      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
        {groups.map((group, i) => {
          const pct = maxCount > 0 ? (group.count / maxCount) * 100 : 0;
          const reviewPct = totalReviews > 0 ? Math.round((group.count / totalReviews) * 100) : 0;
          const isSelected = selectedGroupId === group.id;
          const hslColor = getGroupHslColor(i);

          return (
            <button
              key={group.id}
              onClick={() =>
                onGroupSelect(isSelected ? null : group.id)
              }
              className={cn(
                "w-full text-left rounded-md p-2.5 transition-all group/item",
                isSelected
                  ? "bg-accent"
                  : "hover:bg-accent/50"
              )}
            >
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span
                  className={cn(
                    "truncate font-medium flex items-center gap-2",
                    isSelected && "text-purple-400"
                  )}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: `hsl(${hslColor})`,
                      boxShadow: `0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(${hslColor} / 0.3)`,
                    }}
                  />
                  {group.label}
                </span>
                <span className="text-xs text-muted-foreground ml-2 tabular-nums shrink-0 flex items-baseline gap-1">
                  <span className={cn(
                    "font-semibold text-sm",
                    isSelected ? "text-purple-400" : "text-foreground/70"
                  )}>
                    {group.count}
                  </span>
                  <span className="text-[10px] opacity-60">
                    ({reviewPct}%)
                  </span>
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-muted/80 overflow-hidden">
                <div
                  className="h-full rounded-full animate-progress"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, hsl(${hslColor}), hsl(${hslColor} / 0.6))`,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
