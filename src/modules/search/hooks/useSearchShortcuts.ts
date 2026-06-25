import { useEffect } from 'react';
import { useSearchStore } from '../store/useSearchStore';

export function useSearchShortcuts() {
  const toggleOpen = useSearchStore((state) => state.toggleOpen);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleOpen();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [toggleOpen]);
}
