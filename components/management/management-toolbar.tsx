"use client";

import { Filter, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface ManagementToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onOpenFilter?: () => void;
  onOpenCreate?: () => void;
  addLabel?: string;
  className?: string;
}

export function ManagementToolbar({
  search,
  onSearchChange,
  onOpenFilter,
  onOpenCreate,
  addLabel = "Add New",
  className,
}: ManagementToolbarProps) {
  return (
    <div className={cn("flex flex-col gap-3 md:flex-row", className)}>
      <div className="flex flex-1">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search"
          className="h-12 rounded-r-none border-r-0 border-[#b7b7b7] text-base"
        />
        <Button
          size="icon"
          className="h-12 w-12 rounded-l-none rounded-r-lg"
          type="button"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      {onOpenFilter ? (
        <Button
          type="button"
          variant="secondary"
          onClick={onOpenFilter}
          className="h-12 w-12 px-0"
        >
          <Filter className="h-5 w-5" />
        </Button>
      ) : null}
      {onOpenCreate ? (
        <Button type="button" onClick={onOpenCreate} className="h-12 gap-2 text-[20px]">
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}

