import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook for performance optimization utilities
 * Provides debouncing, throttling, and performance monitoring
 */
export const usePerformanceOptimization = () => {
  // Debounce function
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }, []);

  // Throttle function
  const throttle = useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle = false;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }, []);

  // Request idle callback wrapper for non-critical work
  const runWhenIdle = useCallback((callback: () => void, timeout = 2000) => {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(callback, { timeout });
    } else {
      setTimeout(callback, 1);
    }
  }, []);

  // Prefetch a route or resource
  const prefetch = useCallback((url: string) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }, []);

  // Preload critical resources
  const preload = useCallback((url: string, as: 'script' | 'style' | 'image' | 'font') => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;
    if (as === 'font') {
      link.crossOrigin = 'anonymous';
    }
    document.head.appendChild(link);
  }, []);

  // Memory-efficient image optimization for display
  const getOptimizedImageUrl = useCallback((url: string, width?: number) => {
    // If using a CDN that supports image optimization, transform URL here
    // For now, return original URL - can be extended for services like Cloudinary, imgix, etc.
    return url;
  }, []);

  return {
    debounce,
    throttle,
    runWhenIdle,
    prefetch,
    preload,
    getOptimizedImageUrl
  };
};

/**
 * Hook to detect if user prefers reduced motion
 */
export const usePrefersReducedMotion = () => {
  const mediaQuery = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)') 
    : null;
  
  return mediaQuery?.matches ?? false;
};

/**
 * Hook to detect if user is on a slow connection
 */
export const useSlowConnection = () => {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as any).connection;
    const slowConnections = ['slow-2g', '2g', '3g'];
    return slowConnections.includes(connection?.effectiveType);
  }
  return false;
};

/**
 * Hook to track component render performance
 */
export const useRenderPerformance = (componentName: string, enabled = false) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;
    
    renderCount.current++;
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    if (timeSinceLastRender < 16) {
      console.warn(
        `[Performance] ${componentName} re-rendered ${renderCount.current} times. ` +
        `Time since last render: ${timeSinceLastRender.toFixed(2)}ms`
      );
    }
  });
};

export default usePerformanceOptimization;
