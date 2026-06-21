import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
  {
    defaultVariants: { variant: "default" },
    variants: {
      variant: {
        default: "bg-[#404249] text-[#dbdee1]",
        outline: "border border-[#3f4147] text-[#80848e]",
        success: "border border-[#23a55a]/30 bg-[#23a55a]/10 text-[#23a55a]",
        warning: "border border-[#f0b132]/30 bg-[#f0b132]/10 text-[#f0b132]",
        info: "border border-[#5865f2]/30 bg-[#5865f2]/10 text-[#c9cdfb]",
        destructive: "border border-[#f23f42]/30 bg-[#f23f42]/10 text-[#f23f42]",
      },
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ className, variant }))} {...props} />;
}
