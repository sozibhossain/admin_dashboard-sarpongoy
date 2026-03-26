import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 8, columns = 7 }: TableSkeletonProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <div className="rounded-xl border border-[#d9dfcf] bg-white p-4">
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7"
            >
              {Array.from({ length: columns }).map((__, columnIndex) => (
                <Skeleton key={columnIndex} className="h-10" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

