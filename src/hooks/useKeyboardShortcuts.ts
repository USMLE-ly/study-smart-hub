import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

interface UseKeyboardShortcutsProps {
  onAddTask?: () => void;
  onStartFocus?: () => void;
  onTogglePanel?: () => void;
}

export function useKeyboardShortcuts({
  onAddTask,
  onStartFocus,
  onTogglePanel,
}: UseKeyboardShortcutsProps = {}) {
  const navigate = useNavigate();

  const showShortcutsHelp = useCallback(() => {
    toast.info('Keyboard Shortcuts: Ctrl+N (Add task), Ctrl+F (Focus), Ctrl+P (Panel), Ctrl+Shift+D/S/R (Navigate)', {
      duration: 5000,
    });
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const key = event.key.toLowerCase();

      // Ctrl+N - Add task
      if (ctrl && !shift && key === 'n') {
        event.preventDefault();
        onAddTask?.();
        return;
      }

      // Ctrl+F - Focus mode
      if (ctrl && !shift && key === 'f') {
        event.preventDefault();
        onStartFocus?.();
        return;
      }

      // Ctrl+P - Toggle panel
      if (ctrl && !shift && key === 'p') {
        event.preventDefault();
        onTogglePanel?.();
        return;
      }

      // Ctrl+/ - Show help
      if (ctrl && !shift && key === '/') {
        event.preventDefault();
        showShortcutsHelp();
        return;
      }

      // Navigation shortcuts (Ctrl+Shift+Key)
      if (ctrl && shift) {
        if (key === 'd') {
          event.preventDefault();
          navigate('/dashboard');
          return;
        }
        if (key === 's') {
          event.preventDefault();
          navigate('/study-planner');
          return;
        }
        if (key === 'r') {
          event.preventDefault();
          navigate('/weekly-report');
          return;
        }
      }
    },
    [navigate, onAddTask, onStartFocus, onTogglePanel, showShortcutsHelp]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { showShortcutsHelp };
}
