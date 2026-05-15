import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/util";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function Card({ children, className, ...rest }: CardProps) {
  return (
    <div
      className={cn("glass rounded-xl overflow-hidden shadow-deep/30", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "px-5 py-3.5 border-b border-line flex items-center justify-between gap-3",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "text-[13px] font-semibold tracking-wide uppercase text-white/90",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardSub({ children, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "text-[11px] uppercase tracking-wider text-muted font-mono",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className, ...rest }: CardProps) {
  return (
    <div className={cn("px-5 py-4", className)} {...rest}>
      {children}
    </div>
  );
}

export default Card;
