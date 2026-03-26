import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium leading-none",
  {
    variants: {
      variant: {
        active: "border-[#43ce73] bg-[#effff2] text-[#16983f]",
        inactive: "border-[#f1be63] bg-[#fff8ec] text-[#c07800]",
        locked: "border-[#ff8e8e] bg-[#fff1f1] text-[#d22c2c]",
      },
    },
    defaultVariants: {
      variant: "active",
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

