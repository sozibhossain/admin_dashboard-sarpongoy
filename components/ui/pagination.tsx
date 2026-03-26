"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  onChange,
  className,
}: PaginationProps) {
  const safeTotal = Math.max(totalPages || 1, 1);

  return (
    <div className={cn("flex items-center justify-end gap-2", className)}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(Math.max(page - 1, 1))}
        disabled={page <= 1}
        className="h-10 w-10 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        className="h-10 min-w-10 px-3"
        onClick={() => onChange(page)}
      >
        {page}
      </Button>
      <span className="text-sm text-[#6c6c6c]">...</span>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(safeTotal)}
        className="h-10 min-w-10 px-3"
      >
        {safeTotal}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(Math.min(page + 1, safeTotal))}
        disabled={page >= safeTotal}
        className="h-10 w-10 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

