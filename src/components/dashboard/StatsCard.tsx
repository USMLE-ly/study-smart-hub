import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle: string;
  detail?: string;
  icon: LucideIcon;
}

// Animated counter for smooth value transitions
function AnimatedValue({ value }: { value: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  return (
    <span className={cn(
      "text-2xl font-bold text-foreground transition-all duration-300",
      isAnimating ? "scale-95 opacity-70" : "scale-100 opacity-100"
    )}>
      {displayValue}
    </span>
  );
}

export function StatsCard({
  title,
  value,
  subtitle,
  detail,
  icon: Icon,
}: StatsCardProps) {
  return (
    <div className="relative overflow-hidden bg-card rounded-xl border border-border p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1 group">
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground tracking-wide">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <AnimatedValue value={value} />
            {detail && (
              <span className="text-sm text-muted-foreground transition-colors duration-200 group-hover:text-foreground/70">
                {detail}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 transition-all duration-300 group-hover:from-primary/15 group-hover:to-primary/5 group-hover:scale-110 group-hover:rotate-3 shadow-sm">
          <Icon className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:scale-110" strokeWidth={1.5} />
        </div>
      </div>
      
      {/* Animated bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
    </div>
  );
}
