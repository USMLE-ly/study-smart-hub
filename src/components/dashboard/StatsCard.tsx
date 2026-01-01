import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  accentColor?: "primary" | "secondary" | "success" | "warning";
}

const accentStyles = {
  primary: "border-l-primary bg-primary/5",
  secondary: "border-l-secondary bg-secondary/5",
  success: "border-l-[hsl(var(--badge-success))] bg-[hsl(var(--badge-success))]/5",
  warning: "border-l-[hsl(var(--badge-flashcard))] bg-[hsl(var(--badge-flashcard))]/5",
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor = "primary",
}: StatsCardProps) {
  return (
    <Card className={cn("border-l-4", accentStyles[accentColor])}>
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="rounded-lg bg-card p-3 shadow-sm">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
