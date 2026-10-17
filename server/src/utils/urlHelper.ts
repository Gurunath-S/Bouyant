import { ApiError } from './apiError.js';
import { env } from '../config/env.js';

/**
 * Resolves a single, trusted frontend origin for constructing outgoing email links (e.g. password reset).
 * Supports comma-separated CORS origins, strips trailing slashes, enforces HTTP/HTTPS scheme,
 * and prohibits localhost in production environments.
 */
export function resolveClientOrigin(rawConfig?: string, isProduction?: boolean): string {
  const isProd =
    isProduction !== undefined
      ? isProduction
      : env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';

  const raw = (rawConfig !== undefined ? rawConfig : process.env.CLIENT_URL || env.CLIENT_URL || '').trim();

  if (!raw) {
    if (isProd) {
      throw ApiError.internal('CLIENT_URL must be configured with a valid HTTP/HTTPS URL in production.');
    }
    return 'http://localhost:5173';
  }

  // Handle comma-separated origins (CORS multi-origin configuration)
  const candidates = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (candidates.length === 0) {
    if (isProd) {
      throw ApiError.internal('CLIENT_URL must be configured with a valid HTTP/HTTPS URL in production.');
    }
    return 'http://localhost:5173';
  }

  const chosen = candidates[0];

  try {
    const parsed = new URL(chosen);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Unsupported protocol: ${parsed.protocol}`);
    }
    if (!parsed.hostname) {
      throw new Error('Missing hostname');
    }

    if (isProd && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      throw new Error('Localhost origin is forbidden in production environment.');
    }

    // Strip trailing slash if present
    const pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
    return `${parsed.origin}${pathname}`;
  } catch (err: any) {
    if (isProd) {
      throw ApiError.internal(`Invalid CLIENT_URL configuration: ${err?.message || 'Malformed URL'}`);
    }
    return 'http://localhost:5173';
  }
}
