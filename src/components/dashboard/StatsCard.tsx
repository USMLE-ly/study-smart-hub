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
    default: "bg-primary/10",
    primary: "bg-primary/10",
    success: "bg-[hsl(var(--badge-success))]/10",
    warning: "bg-[hsl(var(--badge-flashcard))]/10",
  };

  const iconColors = {
    default: "text-primary",
    primary: "text-primary",
    success: "text-[hsl(var(--badge-success))]",
    warning: "text-[hsl(var(--badge-flashcard))]",
  };

  return (
    <div className="bg-card rounded-lg border border-border p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground tracking-wide">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground tracking-tight">
              {value}
            </span>
            <span className="text-sm text-muted-foreground">
              {subtitle}
            </span>
          </div>
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            iconBgColors[variant]
          )}
        >
          <Icon className={cn("h-6 w-6", iconColors[variant])} />
        </div>
      </div>
    </div>
  );
}