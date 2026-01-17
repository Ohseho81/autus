"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🃏 Card Components
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Card({ children, className, title, subtitle, action }: CardProps) {
  return (
    <div className={cn(
      "rounded-xl border border-slate-800 bg-slate-900/50 p-5",
      className
    )}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between">
          <div>
            {title && <div className="text-sm font-medium text-slate-400">{title}</div>}
            {subtitle && <div className="mt-1 text-xs text-slate-500">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

export function StatCard({ label, value, change, changeType = "neutral" }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {change && (
        <div className={cn(
          "mt-1 text-xs",
          changeType === "positive" && "text-green-400",
          changeType === "negative" && "text-red-400",
          changeType === "neutral" && "text-slate-400"
        )}>
          {change}
        </div>
      )}
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({ 
  children, 
  variant = "secondary", 
  size = "md",
  className,
  ...props 
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
        "disabled:opacity-50 disabled:pointer-events-none",
        {
          "bg-slate-100 text-slate-900 hover:bg-slate-200": variant === "primary",
          "border border-slate-700 text-slate-300 hover:bg-slate-800": variant === "secondary",
          "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50": variant === "ghost",
        },
        {
          "px-3 py-1.5 text-xs": size === "sm",
          "px-4 py-2 text-sm": size === "md",
          "px-6 py-3 text-base": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      {
        "bg-slate-700 text-slate-300": variant === "default",
        "bg-green-500/20 text-green-400": variant === "success",
        "bg-yellow-500/20 text-yellow-400": variant === "warning",
        "bg-red-500/20 text-red-400": variant === "error",
      }
    )}>
      {children}
    </span>
  );
}
