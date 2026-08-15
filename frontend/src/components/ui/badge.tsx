import * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

const variantStyles: Record<string, string> = {
  default: "border-transparent bg-slate-900 text-white hover:bg-slate-800",
  secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200",
  destructive: "border-transparent bg-rose-600 text-white hover:bg-rose-500",
  outline: "text-slate-900 border-slate-200",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
        variantStyles[variant] || variantStyles.default,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
