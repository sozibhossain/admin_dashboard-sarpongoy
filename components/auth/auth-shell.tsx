import { cn } from "@/lib/cn";
import Image from "next/image";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function AuthShell({
  title,
  subtitle,
  children,
  className,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f3f3] px-4 py-8">
      <div className={cn("w-full max-w-[620px]", className)}>
        <div className="mb-6 flex justify-center">
          <Image
            src="/logo.png"
            alt="iLearnReady Logo"
            width={1000} // Set the actual width you want on screen
            height={1000} // Set the actual height you want on screen
            priority // Ensures the logo loads immediately without a blur effect
            className="w-[180px] h-[120] object-contain"
          />
        </div>
        <div className="mb-8 text-center">
          <h1 className="text-[24px] font-semibold">{title}</h1>
          {subtitle ? (
            <p className="mx-auto mt-2 max-w-[460px] text-[16px] text-[#a1a1a1]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
