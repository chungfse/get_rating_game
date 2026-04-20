import type { Issue } from "@/types";

interface Props {
  shown: number;
  total: number;
  selectedStars: number[];
  selectedIssueId: string | null;
  issues: Issue[];
}

export default function ReviewStats({
  shown,
  total,
  selectedStars,
  selectedIssueId,
  issues,
}: Props) {
  const issueLabel = selectedIssueId
    ? issues.find((i) => i.id === selectedIssueId)?.label
    : null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
      <span>
        Hiển thị <strong className="text-foreground">{shown}</strong> /{" "}
        <strong className="text-foreground">{total.toLocaleString()}</strong>{" "}
        reviews
      </span>
      {selectedStars.length < 5 && (
        <span className="text-purple-400">
          • {selectedStars.map((s) => `${s}★`).join(", ")}
        </span>
      )}
      {issueLabel && (
        <span className="text-orange-400">
          • 🔍 {issueLabel}
        </span>
      )}
    </div>
  );
}
