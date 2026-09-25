import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Component that automatically resets window & layout scroll positions to top (0, 0)
 * whenever the user navigates to a new page or route.
 */
export const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Disable browser automatic scroll restoration on SPA route changes
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const resetScroll = () => {
      // Reset window, html, and body scroll offsets
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;

      // Reset any inner layout scroll containers
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTop = 0;

      const appEl = document.getElementById('root');
      if (appEl) appEl.scrollTop = 0;
    };

    // Execute scroll reset immediately
    resetScroll();

    // Trigger on next animation frames & microtask timeout to override async component render shifts
    const rafId = requestAnimationFrame(resetScroll);
    const timerId = setTimeout(resetScroll, 50);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, [pathname, search]);

  return null;
};
