import { useEffect, useCallback } from "react";

interface UsePracticeTestKeyboardProps {
  onPrevious: () => void;
  onNext: () => void;
  onSelectOption: (index: number) => void;
  onSubmit: () => void;
  optionsCount: number;
  canSubmit: boolean;
  isAnswered: boolean;
  enabled?: boolean;
}

export function usePracticeTestKeyboard({
  onPrevious,
  onNext,
  onSelectOption,
  onSubmit,
  optionsCount,
  canSubmit,
  isAnswered,
  enabled = true,
}: UsePracticeTestKeyboardProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = event.key;

      // Arrow keys for navigation
      if (key === "ArrowLeft") {
        event.preventDefault();
        onPrevious();
        return;
      }

      if (key === "ArrowRight") {
        event.preventDefault();
        onNext();
        return;
      }

      // Number keys (1-9) to select answer options
      if (!isAnswered && /^[1-9]$/.test(key)) {
        const optionIndex = parseInt(key) - 1;
        if (optionIndex < optionsCount) {
          event.preventDefault();
          onSelectOption(optionIndex);
        }
        return;
      }

      // Letter keys (A-E) to select answer options
      if (!isAnswered && /^[a-eA-E]$/.test(key)) {
        const optionIndex = key.toLowerCase().charCodeAt(0) - "a".charCodeAt(0);
        if (optionIndex < optionsCount) {
          event.preventDefault();
          onSelectOption(optionIndex);
        }
        return;
      }

      // Enter or Space to submit answer
      if ((key === "Enter" || key === " ") && canSubmit && !isAnswered) {
        event.preventDefault();
        onSubmit();
        return;
      }

      // Enter to proceed to next when answered
      if (key === "Enter" && isAnswered) {
        event.preventDefault();
        onNext();
        return;
      }
    },
    [enabled, onPrevious, onNext, onSelectOption, onSubmit, optionsCount, canSubmit, isAnswered]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
