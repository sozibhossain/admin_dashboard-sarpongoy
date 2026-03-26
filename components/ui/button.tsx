"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#079938] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(180deg,#00B023_0%,#077A1E_91.46%)] text-white shadow-sm hover:brightness-95",
        secondary:
          "border border-[#34b56a] bg-white text-[#079938] hover:bg-[#eaf9ee]",
        ghost: "bg-transparent text-[#6c6c6c] hover:bg-[#f2f2f2]",
        danger: "border border-[#ff7676] bg-white text-[#ff2f52] hover:bg-[#fff1f4]",
        destructive: "bg-[#ff2f52] text-white hover:bg-[#e92548]",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-10 px-4 text-xs",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

