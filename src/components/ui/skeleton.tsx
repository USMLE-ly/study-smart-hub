import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'text' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
  width?: string | number;
  height?: string | number;
}

function Skeleton({ 
  className, 
  variant = 'default',
  animation = 'pulse',
  width,
  height,
  style,
  ...props 
}: SkeletonProps) {
  const variantClasses = {
    default: 'rounded-md',
    circular: 'rounded-full',
    text: 'rounded h-4 w-full',
    rectangular: 'rounded-none',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  return (
    <div 
      className={cn(
        "bg-muted",
        variantClasses[variant],
        animationClasses[animation],
        className
      )} 
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      {...props} 
    />
  );
}

// Preset skeleton components for common use cases

function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-3 p-4 border rounded-lg", className)} {...props}>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

function SkeletonQuestion({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-4 p-6", className)} {...props}>
      {/* Question text */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      {/* Options */}
      <div className="space-y-3 mt-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function SkeletonFlashcard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6 border rounded-xl", className)} {...props}>
      <Skeleton className="h-48 w-full rounded-lg mb-4" />
      <Skeleton className="h-4 w-2/3 mx-auto" />
    </div>
  );
}

function SkeletonDashboard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 border rounded-lg space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ))}
      </div>
      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 border rounded-lg">
          <Skeleton className="h-4 w-1/3 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="p-4 border rounded-lg">
          <Skeleton className="h-4 w-1/3 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

function SkeletonList({ count = 5, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { count?: number }) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-3 border rounded-lg">
          <Skeleton variant="circular" className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonTable({ rows = 5, cols = 4, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { rows?: number; cols?: number }) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {/* Header */}
      <div className="flex gap-4 p-3 border-b">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 p-3">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton key={colIdx} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

function SkeletonAvatar({ size = 40, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { size?: number }) {
  return (
    <Skeleton 
      variant="circular" 
      width={size} 
      height={size} 
      className={className} 
      {...props} 
    />
  );
}

function SkeletonButton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton className={cn("h-10 w-24 rounded-md", className)} {...props} />
  );
}

function SkeletonInput({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton className={cn("h-10 w-full rounded-md", className)} {...props} />
  );
}

function SkeletonImage({ aspectRatio = "16/9", className, ...props }: React.HTMLAttributes<HTMLDivElement> & { aspectRatio?: string }) {
  return (
    <div 
      className={cn("relative w-full overflow-hidden rounded-lg", className)} 
      style={{ aspectRatio }}
      {...props}
    >
      <Skeleton className="absolute inset-0" />
    </div>
  );
}

export { 
  Skeleton,
  SkeletonCard,
  SkeletonQuestion,
  SkeletonFlashcard,
  SkeletonDashboard,
  SkeletonList,
  SkeletonTable,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonInput,
  SkeletonImage,
};
