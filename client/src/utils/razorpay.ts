/**
 * Utility to asynchronously load the Razorpay checkout script on-demand
 * only when a payment flow is actually triggered, preventing cross-site cookie
 * warnings and script overhead on non-payment admin/workspace pages.
 */
export const loadRazorpay = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(false);
    }

    if (typeof (window as any).Razorpay !== 'undefined') {
      return resolve(true);
    }

    // Safety timeout in case network or ad-blocker hangs the load event
    const timer = setTimeout(() => {
      if (typeof (window as any).Razorpay !== 'undefined') {
        resolve(true);
      } else {
        console.warn('Razorpay SDK load timed out after 5s');
        resolve(false);
      }
    }, 5000);

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      if (typeof (window as any).Razorpay !== 'undefined') {
        clearTimeout(timer);
        return resolve(true);
      }
      // Re-bind listeners or wait briefly
      existingScript.addEventListener('load', () => {
        clearTimeout(timer);
        resolve(true);
      });
      existingScript.addEventListener('error', () => {
        clearTimeout(timer);
        resolve(false);
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    script.onerror = () => {
      clearTimeout(timer);
      console.error('Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

