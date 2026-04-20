"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Flame, AlertCircle, Info, ChevronDown, ChevronRight, Lightbulb } from "lucide-react";
import { useState } from "react";
import type { Issue, IssueSeverity } from "@/types";

interface Props {
  issues: Issue[];
  selectedIssueId: string | null;
  onIssueSelect: (issueId: string | null) => void;
}

const severityConfig: Record<
  IssueSeverity,
  { label: string; icon: typeof Flame; color: string; bgColor: string; textColor: string }
> = {
  critical: {
    label: "Critical",
    icon: Flame,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    textColor: "text-red-400",
  },
  high: {
    label: "High",
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-400",
  },
  medium: {
    label: "Medium",
    icon: AlertCircle,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    textColor: "text-yellow-400",
  },
  low: {
    label: "Low",
    icon: Info,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-400",
  },
};

const categoryLabels: Record<string, string> = {
  crash_bug: "Crash/Bug",
  performance: "Performance",
  monetization: "Monetization",
  ads: "Ads",
  game_design: "Game Design",
  ux_ui: "UX/UI",
  content: "Content",
  multiplayer: "Multiplayer",
  account: "Account",
  update: "Update",
};

export default function IssuesPanel({
  issues,
  selectedIssueId,
  onIssueSelect,
}: Props) {
  const [expandedSeverity, setExpandedSeverity] = useState<Record<string, boolean>>({
    critical: true,
    high: true,
    medium: false,
    low: false,
  });
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  // Group issues by severity
  const grouped: Record<IssueSeverity, Issue[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  for (const issue of issues) {
    const sev = issue.severity as IssueSeverity;
    if (grouped[sev]) {
      grouped[sev].push(issue);
    } else {
      grouped.medium.push(issue);
    }
  }

  const maxFreq = Math.max(...issues.map((i) => i.frequency), 1);
  const totalReviews = issues.reduce((sum, i) => sum + i.frequency, 0);

  const toggleSeverity = (sev: string) => {
    setExpandedSeverity((prev) => ({ ...prev, [sev]: !prev[sev] }));
  };

  return (
    <div className="rounded-lg border bg-card/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-red-500" />
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Issues Found ({issues.length})
          </h3>
        </div>
        {selectedIssueId && (
          <button
            onClick={() => onIssueSelect(null)}
            className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
          >
            Xem tất cả
          </button>
        )}
      </div>

      {/* Severity sections */}
      <div className="space-y-2">
        {(["critical", "high", "medium", "low"] as IssueSeverity[]).map((sev) => {
          const items = grouped[sev];
          if (items.length === 0) return null;

          const config = severityConfig[sev];
          const SevIcon = config.icon;
          const isOpen = expandedSeverity[sev];

          return (
            <div key={sev} className="rounded-md border border-border/50 overflow-hidden">
              {/* Severity header */}
              <button
                onClick={() => toggleSeverity(sev)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors",
                  config.bgColor
                )}
              >
                <SevIcon className={cn("h-3.5 w-3.5", config.color)} />
                <span className={config.textColor}>
                  {config.label}
                </span>
                <span className="text-muted-foreground">
                  ({items.length} issues)
                </span>
                <div className="flex-1" />
                {isOpen ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </button>

              {/* Issues list */}
              {isOpen && (
                <div className="divide-y divide-border/30">
                  {items.map((issue) => {
                    const pct = (issue.frequency / maxFreq) * 100;
                    const reviewPct = totalReviews > 0
                      ? Math.round((issue.frequency / totalReviews) * 100)
                      : 0;
                    const isSelected = selectedIssueId === issue.id;
                    const isInsightOpen = expandedInsight === issue.id;

                    return (
                      <div key={issue.id} className="group/issue">
                        {/* Issue row */}
                        <button
                          onClick={() =>
                            onIssueSelect(isSelected ? null : issue.id)
                          }
                          className={cn(
                            "w-full text-left px-3 py-2.5 transition-all",
                            isSelected
                              ? "bg-purple-500/10"
                              : "hover:bg-accent/50"
                          )}
                        >
                          <div className="flex items-start gap-2 mb-1">
                            <span className="flex-1 text-sm font-medium leading-tight">
                              {isSelected && (
                                <span className="text-purple-400">● </span>
                              )}
                              {issue.label}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums shrink-0 flex items-baseline gap-1">
                              <span className={cn(
                                "font-semibold text-sm",
                                isSelected ? "text-purple-400" : "text-foreground/70"
                              )}>
                                {issue.frequency}
                              </span>
                              <span className="text-[10px] opacity-60">
                                ({reviewPct}%)
                              </span>
                            </span>
                          </div>

                          {/* Category + progress bar */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground shrink-0">
                              {categoryLabels[issue.category] || issue.category}
                            </span>
                            <div className="flex-1 h-1 rounded-full bg-muted/50 overflow-hidden">
                              <div
                                className="h-full rounded-full animate-progress"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: sev === "critical"
                                    ? "hsl(0, 70%, 50%)"
                                    : sev === "high"
                                    ? "hsl(25, 80%, 50%)"
                                    : sev === "medium"
                                    ? "hsl(45, 90%, 50%)"
                                    : "hsl(210, 70%, 55%)",
                                }}
                              />
                            </div>
                          </div>
                        </button>

                        {/* Expandable insight */}
                        <div className="px-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedInsight(isInsightOpen ? null : issue.id);
                            }}
                            className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors py-1"
                          >
                            <Lightbulb className="h-3 w-3" />
                            {isInsightOpen ? "Ẩn insight" : "Xem insight"}
                          </button>

                          {isInsightOpen && (
                            <div className="pb-2.5 text-xs space-y-1.5 animate-in fade-in slide-in-from-top-1">
                              {/* Actionable insight */}
                              <p className="text-foreground/80 leading-relaxed">
                                💡 {issue.actionableInsight}
                              </p>

                              {/* Sample quotes */}
                              {issue.sampleQuotes && issue.sampleQuotes.length > 0 && (
                                <div className="space-y-1">
                                  {issue.sampleQuotes.map((q, qi) => (
                                    <p
                                      key={qi}
                                      className="text-muted-foreground italic border-l-2 border-muted pl-2 text-[11px]"
                                    >
                                      &quot;{q}&quot;
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
