import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle: string;
  detail?: string;
  icon: LucideIcon;
}

export function StatsCard({
  title,
  value,
  subtitle,
  detail,
  icon: Icon,
}: StatsCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {value}
            </span>
            {detail && (
              <span className="text-sm text-muted-foreground">
                {detail}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
          <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
