import { useEffect, useCallback } from 'react';

/**
 * Hook that listens for season changes and triggers a callback
 * Use this in pages that need to reload data when the active season changes
 * 
 * @param {Function} onSeasonChange - Callback to execute when season changes
 */
export const useSeasonChange = (onSeasonChange) => {
  const handleSeasonChanged = useCallback(() => {
    if (onSeasonChange) {
      onSeasonChange();
    }
  }, [onSeasonChange]);

  useEffect(() => {
    window.addEventListener('seasonChanged', handleSeasonChanged);
    return () => window.removeEventListener('seasonChanged', handleSeasonChanged);
  }, [handleSeasonChanged]);
};

export default useSeasonChange;
