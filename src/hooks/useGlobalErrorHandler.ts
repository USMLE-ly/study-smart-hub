import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useGlobalErrorHandler() {
  const { user } = useAuth();

  useEffect(() => {
    const logError = async (message: string, stack?: string, metadata?: Record<string, unknown>) => {
      if (!user) return;

      try {
        await supabase.from('client_error_reports').insert({
          user_id: user.id,
          route: window.location.pathname,
          message,
          stack: stack || null,
          user_agent: navigator.userAgent,
          metadata: {
            url: window.location.href,
            timestamp: new Date().toISOString(),
            ...metadata,
          },
        });
      } catch (e) {
        console.error('Failed to log error:', e);
      }
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      logError(
        event.message || 'Unknown error',
        event.error?.stack,
        { type: 'window_error', filename: event.filename, lineno: event.lineno, colno: event.colno }
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      const message = event.reason?.message || String(event.reason) || 'Unhandled promise rejection';
      const stack = event.reason?.stack;
      logError(message, stack, { type: 'unhandled_rejection' });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [user]);
}
