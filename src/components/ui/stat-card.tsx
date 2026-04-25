import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: { value: number; label: string };
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
  description?: string;
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = "text-[#0D9488]",
  iconBg = "bg-teal-50",
  trend,
  className,
  description,
}: StatCardProps) {
  const TrendIcon =
    trend === "up"
      ? TrendingUp
      : trend === "down"
        ? TrendingDown
        : Minus;

  const trendColorClass =
    trend === "up"
      ? "text-emerald-600"
      : trend === "down"
        ? "text-red-500"
        : "text-neutral-400";

  const formattedValue =
    typeof value === "number"
      ? new Intl.NumberFormat("es-ES").format(value)
      : value;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-neutral-200 shadow-sm p-5 relative overflow-hidden",
        "hover:shadow-md transition-shadow duration-200",
        className
      )}
    >
      {/* Top row: title + icon */}
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-neutral-500 leading-tight">
          {title}
        </p>
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            iconBg
          )}
        >
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
      </div>

      {/* Value */}
      <p className="text-3xl font-bold text-neutral-900 mb-1 leading-none">
        {formattedValue}
      </p>

      {/* Description / change */}
      {description && !change && (
        <p className="text-xs text-neutral-400 mt-1">{description}</p>
      )}

      {change && (
        <div className="flex items-center gap-1.5 mt-1">
          <TrendIcon className={cn("w-3.5 h-3.5", trendColorClass)} />
          <span
            className={cn("text-xs font-medium", trendColorClass)}
          >
            {change.value > 0 ? "+" : ""}
            {change.value}%
          </span>
          <span className="text-xs text-neutral-400">{change.label}</span>
        </div>
      )}

      {/* Subtle background accent */}
      <div
        className={cn(
          "absolute -bottom-3 -right-3 w-16 h-16 rounded-full opacity-[0.06]",
          iconBg
        )}
      />
    </div>
  );
}
