import { cn } from "@/lib/cn";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  rightSlot?: React.ReactNode;
}

export function SectionHeader({
  title,
  subtitle,
  className,
  rightSlot,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", className)}>
      <div className="space-y-2">
        <h1 className="text-[24px] font-semibold">{title}</h1>
        {subtitle ? <p className="mt-1 text-[16px] text-[#7a7a7a]">{subtitle}</p> : null}
      </div>
      {rightSlot}
    </div>
  );
}

