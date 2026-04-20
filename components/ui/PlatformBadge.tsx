import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Platform } from "@/types";

interface PlatformBadgeProps {
  platform: Platform;
  className?: string;
}

export default function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs",
        platform === "android"
          ? "border-green-500/30 text-green-400"
          : "border-blue-500/30 text-blue-400",
        className
      )}
    >
      {platform === "android" ? "Google Play" : "App Store"}
    </Badge>
  );
}
