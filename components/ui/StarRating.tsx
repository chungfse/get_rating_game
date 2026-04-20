import { cn } from "@/lib/utils";

interface StarRatingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
}

const starColors: Record<number, string> = {
  1: "text-red-500",
  2: "text-orange-500",
  3: "text-yellow-500",
  4: "text-lime-500",
  5: "text-green-500",
};

export default function StarRating({
  score,
  size = "md",
  showNumber = false,
}: StarRatingProps) {
  const rounded = Math.round(score * 10) / 10;
  const fullStars = Math.floor(score);
  const color = starColors[Math.round(score)] || starColors[3];

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <span
      className={cn("inline-flex items-center gap-0.5 font-medium", sizeClasses[size], color)}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < fullStars ? "" : "opacity-30"}>
          ★
        </span>
      ))}
      {showNumber && (
        <span className="ml-1 text-foreground/70">{rounded}</span>
      )}
    </span>
  );
}
