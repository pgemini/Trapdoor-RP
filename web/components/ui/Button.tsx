"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/util";

export type ButtonVariant = "primary" | "ghost" | "outline";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-grad text-white shadow-glow hover:shadow-[0_14px_40px_rgba(0,164,239,0.35)] hover:-translate-y-0.5 active:translate-y-0 border border-white/10",
  ghost:
    "bg-white/5 text-white border border-line-strong hover:bg-white/10 hover:border-white/20",
  outline:
    "bg-transparent text-white border border-line-strong hover:bg-white/5 hover:border-white/25",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, variant = "primary", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
        "transition-all duration-200 ease-out select-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Button;
