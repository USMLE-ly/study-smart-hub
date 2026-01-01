import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning";
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
}: StatsCardProps) {
  const iconBgColors = {
    default: "bg-primary/8",
    primary: "bg-primary/8",
    success: "bg-[hsl(var(--badge-success))]/8",
    warning: "bg-[hsl(var(--badge-flashcard))]/8",
  };

  const iconColors = {
    default: "text-primary",
    primary: "text-primary",
    success: "text-[hsl(var(--badge-success))]",
    warning: "text-[hsl(var(--badge-flashcard))]",
  };

  return (
    <div className="bg-card rounded-lg border border-border/60 p-6 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <div className="space-y-1">
            <span className="text-2xl font-bold text-foreground tracking-tight block">
              {value}
            </span>
            <span className="text-sm text-muted-foreground font-medium">
              {subtitle}
            </span>
          </div>
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-lg",
            iconBgColors[variant]
          )}
        >
          <Icon className={cn("h-5 w-5", iconColors[variant])} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
