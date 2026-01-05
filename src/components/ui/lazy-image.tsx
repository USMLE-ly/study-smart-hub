import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  blur?: boolean;
  threshold?: number;
}

/**
 * LazyImage component with intersection observer for lazy loading
 * Automatically defers loading until the image is near the viewport
 */
export const LazyImage = ({
  src,
  alt,
  fallback = '/placeholder.svg',
  blur = true,
  threshold = 0.1,
  className,
  ...props
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: '50px' }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [threshold]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
    setIsLoaded(true);
  };

  return (
    <img
      ref={imgRef}
      src={isInView ? (error ? fallback : src) : fallback}
      alt={alt}
      onLoad={handleLoad}
      onError={handleError}
      loading="lazy"
      decoding="async"
      className={cn(
        'transition-all duration-300',
        blur && !isLoaded && 'blur-sm scale-105',
        isLoaded && 'blur-0 scale-100',
        className
      )}
      {...props}
    />
  );
};

export default LazyImage;
