import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import {
  isoToDisplayInputDate,
  displayInputDateToIso,
  isValidInputDate,
} from '../../utils/date';

export interface DateInputProps {
  label?: string;
  value: string; // Accepts either YYYY-MM-DD or DD/MM/YYYY
  onChange: (isoValue: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  id,
}) => {
  const [displayText, setDisplayText] = useState('');
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  // Sync external value to displayText (DD/MM/YYYY)
  useEffect(() => {
    if (!value) {
      setDisplayText('');
    } else {
      setDisplayText(isoToDisplayInputDate(value));
    }
  }, [value]);

  // Handle manual typing with smart mask (auto-inserts /)
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^\d/]/g, '');

    // Auto-insert slash after day and month if user is typing numbers
    if (raw.length === 2 && !raw.includes('/') && e.target.value.length > displayText.length) {
      raw = raw + '/';
    } else if (
      raw.length === 5 &&
      raw.indexOf('/') === 2 &&
      raw.lastIndexOf('/') === 2 &&
      e.target.value.length > displayText.length
    ) {
      raw = raw + '/';
    }

    // Limit to max 10 characters (DD/MM/YYYY)
    if (raw.length > 10) {
      raw = raw.slice(0, 10);
    }

    setDisplayText(raw);

    if (raw.length === 10) {
      if (isValidInputDate(raw)) {
        const iso = displayInputDateToIso(raw);
        onChange(iso);
      }
    } else if (raw.length === 0) {
      onChange('');
    }
  };

  // Handle date selection from hidden native calendar picker
  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoVal = e.target.value; // YYYY-MM-DD
    if (isoVal) {
      const displayVal = isoToDisplayInputDate(isoVal);
      setDisplayText(displayVal);
      onChange(isoVal);
    }
  };

  const openNativePicker = () => {
    if (disabled) return;
    if (hiddenDateInputRef.current) {
      try {
        if ('showPicker' in HTMLInputElement.prototype) {
          hiddenDateInputRef.current.showPicker();
        } else {
          hiddenDateInputRef.current.focus();
        }
      } catch {
        hiddenDateInputRef.current.focus();
      }
    }
  };

  const currentIso = displayInputDateToIso(displayText);

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative rounded-lg shadow-xs">
        <input
          id={inputId}
          type="text"
          value={displayText}
          onChange={handleTextChange}
          placeholder="DD/MM/YYYY"
          disabled={disabled}
          required={required}
          maxLength={10}
          className={`w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-blue-600 pl-3 pr-10 py-2 transition-colors font-mono ${
            error ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : ''
          }`}
        />

        {/* Calendar Trigger Button */}
        <button
          type="button"
          tabIndex={-1}
          onClick={openNativePicker}
          disabled={disabled}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-purple-600 dark:text-slate-500 dark:hover:text-purple-400 transition-colors"
          title="Pick date from calendar"
        >
          <Calendar className="w-4 h-4" />
        </button>

        {/* Hidden native date input for calendar popup */}
        <input
          ref={hiddenDateInputRef}
          type="date"
          tabIndex={-1}
          value={currentIso && /^\d{4}-\d{2}-\d{2}$/.test(currentIso) ? currentIso : ''}
          onChange={handleNativePickerChange}
          className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
        />
      </div>

      {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
};
