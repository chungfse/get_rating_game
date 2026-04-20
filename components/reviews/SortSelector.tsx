"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

type SortOption = "newest" | "oldest" | "rating_asc" | "rating_desc";

interface Props {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "rating_asc", label: "Rating ↑" },
  { value: "rating_desc", label: "Rating ↓" },
];

export default function SortSelector({ value, onChange }: Props) {
  return (
    <div className="rounded-lg border bg-card/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Sắp xếp
        </h3>
      </div>
      <Select value={value} onValueChange={(v) => onChange(v as SortOption)}>
        <SelectTrigger id="sort-selector" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
