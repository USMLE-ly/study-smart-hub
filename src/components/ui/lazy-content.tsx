import { useState, useEffect, useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LazyContentProps {
  children: ReactNode;
  fallback?: ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
  minHeight?: string;
}

/**
 * LazyContent component for deferring rendering of below-the-fold content
 * Uses intersection observer to only render children when visible
 */
export const LazyContent = ({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = '100px',
  className,
  minHeight = '100px'
}: LazyContentProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFallback = (
    <div 
      className="flex items-center justify-center bg-muted/30 rounded-lg animate-pulse"
      style={{ minHeight }}
    >
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div ref={containerRef} className={cn(className)}>
      {isVisible ? children : (fallback || defaultFallback)}
    </div>
  );
};

export default LazyContent;
