import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  className?: string;
}

export function StatCard({ label, value, trend, className }: StatCardProps) {
  return (
    <Card className={cn("dashboard-card", className)}>
      <CardContent className="p-4">
        <p className="text-lg font-medium text-[#33a13b]">{label}</p>
        <div className="mt-1 flex items-end justify-between">
          <p className="text-[24px] font-semibold leading-none text-[#1d9a2a]">
            {value}
          </p>
          {trend ? (
            <p className="text-[18px] font-medium text-[#e9a141]">{trend} ↑</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
