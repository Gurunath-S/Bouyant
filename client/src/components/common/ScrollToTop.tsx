import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Component that automatically resets window scroll position to top (0, 0)
 * whenever the user navigates to a new page/route.
 */
export const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Instant scroll to top on route navigation
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    });
  }, [pathname, search]);

  return null;
};
