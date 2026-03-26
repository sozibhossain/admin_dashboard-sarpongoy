import Link from "next/link";
import { GraduationCap, LineChart } from "lucide-react";
import { cn } from "@/lib/cn";

interface BrandLogoProps {
  compact?: boolean;
  className?: string;
}

export function BrandLogo({ compact, className }: BrandLogoProps) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        "flex items-center gap-3 text-[#0a2e6f] transition-opacity hover:opacity-90",
        className,
      )}
    >
      <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-[#d7dfcb] bg-white">
        <GraduationCap className="absolute top-1 h-5 w-5 text-[#0c4f9d]" />
        <LineChart className="mt-2 h-6 w-6 text-[#0fa83f]" />
      </div>
      {!compact ? (
        <div className="leading-none">
          <p className="text-[26px] font-semibold text-[#0a4184]">iLearn</p>
          <p className="-mt-1 text-[26px] font-semibold text-[#10a842]">Ready</p>
        </div>
      ) : null}
    </Link>
  );
}

