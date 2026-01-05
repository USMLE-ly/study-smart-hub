import { useState, useEffect, useRef, VideoHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface LazyVideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  poster?: string;
  threshold?: number;
}

/**
 * LazyVideo component with intersection observer for lazy loading
 * Only loads video when it enters the viewport
 */
export const LazyVideo = ({
  src,
  poster,
  threshold = 0.1,
  className,
  ...props
}: LazyVideoProps) => {
  const [isInView, setIsInView] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: '100px' }
    );

    observer.observe(videoRef.current);

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <video
      ref={videoRef}
      src={isInView ? src : undefined}
      poster={poster}
      className={cn('transition-opacity duration-300', className)}
      preload={isInView ? 'metadata' : 'none'}
      {...props}
    />
  );
};

export default LazyVideo;
