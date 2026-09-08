const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Format any ISO date, date string, or Date object into "DD Mon YYYY" (e.g. "15 Aug 2026")
 */
export function formatDisplayDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Format date range into "DD Mon YYYY – DD Mon YYYY" (e.g. "15 Aug 2026 – 18 Aug 2026")
 */
export function formatDisplayDateRange(
  startInput: string | Date | null | undefined,
  endInput: string | Date | null | undefined
): string {
  const startStr = formatDisplayDate(startInput);
  const endStr = formatDisplayDate(endInput);

  if (startStr && endStr) {
    return `${startStr} – ${endStr}`;
  }
  return startStr || endStr || '';
}

/**
 * Format date and time into "DD Mon YYYY, hh:mm AM/PM" (e.g. "15 Aug 2026, 03:30 PM")
 */
export function formatDisplayDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // hour 0 becomes 12
  const strHours = String(hours).padStart(2, '0');

  return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
}

/**
 * Convert an ISO date string (YYYY-MM-DD or full ISO) to "DD/MM/YYYY" for form entry
 */
export function isoToDisplayInputDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoDate)) return isoDate;

  // If already in YYYY-MM-DD format, parse parts directly to avoid UTC timezone shifts
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  }

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Convert a user-entered "DD/MM/YYYY" date string to "YYYY-MM-DD" (ISO format) for backend APIs
 */
export function displayInputDateToIso(displayDate: string | null | undefined): string {
  if (!displayDate) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) return displayDate;

  const parts = displayDate.split('/');
  if (parts.length === 3) {
    const day = parts[0].trim().padStart(2, '0');
    const month = parts[1].trim().padStart(2, '0');
    const year = parts[2].trim();
    if (year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }

  return displayDate;
}

/**
 * Validate whether a string is a valid DD/MM/YYYY date
 */
export function isValidInputDate(input: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(input)) return false;
  const [dStr, mStr, yStr] = input.split('/');
  const day = parseInt(dStr, 10);
  const month = parseInt(mStr, 10);
  const year = parseInt(yStr, 10);

  if (month < 1 || month > 12) return false;
  if (year < 1900 || year > 2100) return false;

  const daysInMonth = new Date(year, month, 0).getDate();
  return day >= 1 && day <= daysInMonth;
}
