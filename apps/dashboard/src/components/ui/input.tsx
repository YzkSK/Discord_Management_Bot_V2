import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      className={cn(
        "flex h-8 w-full rounded-md border border-[#1e1f22] bg-[#1e1f22] px-3 py-2 text-sm text-[#dbdee1] outline-none transition-colors placeholder:text-[#4e5058] focus:border-[#5865f2]/60 focus:ring-1 focus:ring-[#5865f2]/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      type={type}
      {...props}
    />
  )
);
Input.displayName = "Input";
