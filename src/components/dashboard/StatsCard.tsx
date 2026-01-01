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
    <div className="bg-card rounded-xl border border-border/50 p-5 shadow-xs hover:shadow-sm transition-all duration-300 group">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2.5 min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            {title}
          </p>
          <div className="space-y-0.5">
            <span className="text-[28px] font-bold text-foreground tracking-tight block leading-none">
              {value}
            </span>
            <span className="text-[13px] text-muted-foreground/80 font-medium">
              {subtitle}
            </span>
          </div>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-105",
            iconBgColors[variant]
          )}
        >
          <Icon className={cn("h-[18px] w-[18px]", iconColors[variant])} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
