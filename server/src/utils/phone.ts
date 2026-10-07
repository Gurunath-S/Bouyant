/**
 * Normalizes phone numbers to WhatsApp Meta API compatible E.164 string format.
 * Format expected by Meta Cloud API: digits only with country code, e.g. "919876543210".
 */
export function normalizePhoneNumber(phone: string | null | undefined, defaultCountryCode = '91'): string | null {
  if (!phone) return null;

  // Remove non-digit characters except leading plus
  let cleaned = phone.trim().replace(/[^\d+]/g, '');

  if (!cleaned) return null;

  // Remove leading plus if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // If 10 digits (e.g. Indian local mobile number), prepend default country code
  if (cleaned.length === 10) {
    cleaned = `${defaultCountryCode}${cleaned}`;
  }

  // E.164 digits check (between 10 and 15 digits)
  if (cleaned.length < 10 || cleaned.length > 15) {
    return null;
  }

  return cleaned;
}
