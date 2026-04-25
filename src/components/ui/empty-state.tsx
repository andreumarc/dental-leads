import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-16 px-6",
        className
      )}
    >
      {/* Icon circle */}
      <div
        className={cn(
          "rounded-full bg-neutral-100 flex items-center justify-center mb-4",
          compact ? "w-12 h-12" : "w-16 h-16"
        )}
      >
        <Icon
          className={cn(
            "text-neutral-400",
            compact ? "w-5 h-5" : "w-7 h-7"
          )}
        />
      </div>

      {/* Text */}
      <h3
        className={cn(
          "font-semibold text-neutral-900 mb-1",
          compact ? "text-sm" : "text-base"
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          "text-neutral-500 max-w-xs",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {description}
      </p>

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "mt-4 px-4 py-2 rounded-lg bg-[#0D9488] text-white font-medium",
            "hover:bg-teal-700 active:bg-teal-800 transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:ring-offset-2",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
