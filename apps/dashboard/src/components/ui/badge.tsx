import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
  {
    defaultVariants: { variant: "default" },
    variants: {
      variant: {
        default: "bg-zinc-700 text-zinc-200",
        outline: "border border-zinc-700 text-zinc-400",
        success: "border border-green-500/30 bg-green-500/10 text-green-400"
      }
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ className, variant }))} {...props} />;
}
