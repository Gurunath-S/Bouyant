import crypto from 'crypto';

/**
 * Generates a unique, collision-resistant reference code.
 * Example formats:
 * - BKG-2026-A8F3K9
 * - INV-2026-X7M2P4
 * - PAY-9B4K7W1E
 */
export function generateReference(prefix: string, length = 6, includeYear = true): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32 excluding ambiguous chars (0, O, 1, I)
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }

  const yearStr = includeYear ? `-${new Date().getFullYear()}` : '';
  return `${prefix}${yearStr}-${code}`;
}
