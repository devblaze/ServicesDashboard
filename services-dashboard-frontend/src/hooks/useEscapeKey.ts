import { useEffect } from 'react';

/**
 * Hook to handle ESC key press
 * @param onEscape - Callback function to execute when ESC is pressed
 * @param isEnabled - Whether the hook is enabled (default: true)
 */
export const useEscapeKey = (onEscape: () => void, isEnabled: boolean = true) => {
  useEffect(() => {
    if (!isEnabled) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onEscape, isEnabled]);
};
