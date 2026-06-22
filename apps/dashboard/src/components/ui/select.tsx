import * as React from "react";
import { cn } from "../../lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => (
    <select
      className={cn(
        "flex h-8 w-full rounded-md border border-[#3f4147] bg-[#1e1f22] px-3 py-1.5 text-sm text-[#dbdee1] outline-none transition-colors focus:border-[#5865f2]/60 focus:ring-1 focus:ring-[#5865f2]/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Select.displayName = "Select";
