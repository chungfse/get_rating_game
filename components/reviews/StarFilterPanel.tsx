"use client";

import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  starCounts: Record<number, number>;
  selectedStars: number[];
  onStarsChange: (stars: number[]) => void;
}

const starLabels: Record<number, { emoji: string; color: string }> = {
  1: { emoji: "★", color: "text-red-500" },
  2: { emoji: "★★", color: "text-orange-500" },
  3: { emoji: "★★★", color: "text-yellow-500" },
  4: { emoji: "★★★★", color: "text-lime-500" },
  5: { emoji: "★★★★★", color: "text-green-500" },
};

export default function StarFilterPanel({
  starCounts,
  selectedStars,
  onStarsChange,
}: Props) {
  const toggle = (star: number) => {
    if (selectedStars.includes(star)) {
      onStarsChange(selectedStars.filter((s) => s !== star));
    } else {
      onStarsChange([...selectedStars, star].sort());
    }
  };

  const totalSelected = selectedStars.reduce(
    (sum, s) => sum + (starCounts[s] || 0),
    0
  );

  const totalAll = Object.values(starCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-lg border bg-card/50 p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        ⭐ Filter theo sao
      </h3>
      <div className="space-y-2.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const { emoji, color } = starLabels[star];
          const count = starCounts[star] || 0;
          const checked = selectedStars.includes(star);
          const pct = totalAll > 0 ? (count / totalAll) * 100 : 0;

          return (
            <label
              key={star}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <Checkbox
                id={`star-filter-${star}`}
                checked={checked}
                onCheckedChange={() => toggle(star)}
              />
              <span
                className={`text-sm ${color} ${!checked ? "opacity-40" : ""} transition-opacity`}
              >
                {emoji}
              </span>
              {/* Mini bar chart */}
              <div className="flex-1 h-1 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    opacity: checked ? 1 : 0.3,
                    backgroundColor: star <= 2 ? 'hsl(0, 70%, 50%)' : star === 3 ? 'hsl(45, 90%, 50%)' : 'hsl(120, 50%, 45%)',
                  }}
                />
              </div>
              <span
                className={`text-xs text-muted-foreground tabular-nums ${!checked ? "opacity-40" : ""} transition-opacity`}
              >
                ({count})
              </span>
            </label>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Total: <span className="text-foreground/80 font-medium">{totalSelected.toLocaleString()}</span> reviews
        </span>
        {selectedStars.length < 5 && (
          <button
            onClick={() => onStarsChange([1, 2, 3, 4, 5])}
            className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
          >
            Chọn tất cả
          </button>
        )}
      </div>
    </div>
  );
}
