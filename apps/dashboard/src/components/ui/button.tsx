import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865f2]/50 disabled:pointer-events-none disabled:opacity-40",
  {
    defaultVariants: { size: "default", variant: "default" },
    variants: {
      size: {
        default: "h-8 px-4 py-2",
        icon: "h-8 w-8",
        sm: "h-7 px-3 text-xs",
      },
      variant: {
        default: "bg-[#5865f2] text-white hover:bg-[#4752c4]",
        destructive: "bg-[#f23f42]/15 text-[#f23f42] border border-[#f23f42]/30 hover:bg-[#f23f42]/25",
        ghost: "text-[#b5bac1] hover:bg-[#383a40] hover:text-[#dbdee1]",
        outline: "border border-[#3f4147] bg-transparent text-[#dbdee1] hover:bg-[#383a40]",
        secondary: "bg-[#383a40] text-[#dbdee1] hover:bg-[#404249]",
      },
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, size, variant, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ className, size, variant }))}
      {...props}
    />
  );
}

export { buttonVariants };
