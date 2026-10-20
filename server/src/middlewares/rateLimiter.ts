import rateLimit, { Options } from 'express-rate-limit';

export const createRateLimiter = (options?: Partial<Options>) => {
  return rateLimit({
    windowMs: options?.windowMs ?? 15 * 60 * 1000, // 15 minutes default
    max: options?.max ?? 30, // Limit each IP to 30 requests per window
    standardHeaders: true, // Return standard RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    message: options?.message ?? {
      success: false,
      message: 'Too many invoice PDF download requests, please try again later.',
    },
    ...options,
  });
};

export const pdfDownloadLimiter = createRateLimiter();

export const forgotPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many password recovery requests from this IP, please try again after 15 minutes.',
  },
});

export const resetPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many password reset attempts from this IP, please try again after 15 minutes.',
  },
});

export const accountLookupLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: 'Too many account lookup requests from this IP, please try again after 15 minutes.',
  },
});

