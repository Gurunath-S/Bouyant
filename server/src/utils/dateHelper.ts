/**
 * Formats any Date object, ISO string, or timestamp into DD/MM/YYYY (e.g. 16/11/2026)
 * Handles null/undefined safely and prevents timezone-offset date shifts.
 */
export function formatDateDMY(
  dateInput?: Date | string | number | null,
  fallback = ''
): string {
  if (!dateInput) return fallback;

  try {
    // 1. If it's a string starting with YYYY-MM-DD:
    if (typeof dateInput === 'string') {
      const match = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, year, month, day] = match;
        return `${day}/${month}/${year}`;
      }
    }

    // 2. If it's a Date object or timestamp:
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return fallback;

    const [year, month, day] = d.toISOString().slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return fallback;
  }
}