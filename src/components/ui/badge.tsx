import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        tutorial: "border-transparent bg-[hsl(var(--badge-tutorial))] text-[hsl(var(--badge-tutorial-foreground))]",
        practice: "border-transparent bg-[hsl(var(--badge-practice))] text-[hsl(var(--badge-practice-foreground))]",
        flashcard: "border-transparent bg-[hsl(var(--badge-flashcard))] text-[hsl(var(--badge-flashcard-foreground))]",
        success: "border-transparent bg-[hsl(var(--badge-success))] text-[hsl(var(--badge-success-foreground,0_0%_100%))]",
        muted: "border-transparent bg-muted/50 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
