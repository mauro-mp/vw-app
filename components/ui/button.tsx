import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "destructive" | "ghost";
type Size = "sm" | "md";

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" && "px-2.5 py-1 text-xs",
        size === "md" && "px-3 py-1.5 text-sm",
        variant === "primary" &&
          "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] hover:opacity-90",
        variant === "secondary" &&
          "border border-[color:var(--border)] hover:bg-[color:var(--border)]",
        variant === "destructive" &&
          "bg-[color:var(--destructive)] text-white hover:opacity-90",
        variant === "ghost" && "hover:bg-[color:var(--border)]",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
