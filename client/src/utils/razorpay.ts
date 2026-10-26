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

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};
