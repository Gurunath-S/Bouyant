import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

export interface SearchableComboboxProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select or type...',
  error,
  helperText,
  disabled = false,
  required = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value ?? '');
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const componentId = useId();

  // Keep internal input text in sync when external value changes (e.g. GST autofill or reset)
  useEffect(() => {
    setSearchTerm(value ?? '');
    setIsUserTyping(false);
  }, [value]);

  // Filter options based on user input:
  // If user has NOT actively typed anything new, show all options!
  const filteredOptions = React.useMemo(() => {
    if (!isUserTyping) {
      return options;
    }
    const q = searchTerm.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, searchTerm, isUserTyping]);

  // Display up to 120 items for ultra-smooth 60fps scrolling with large datasets (4,000+ cities)
  const displayedOptions = React.useMemo(() => {
    return filteredOptions.slice(0, 120);
  }, [filteredOptions]);

  // When dropdown opens with a selected value and user is not typing, highlight selected item
  useEffect(() => {
    if (isOpen && value && !isUserTyping) {
      const idx = displayedOptions.findIndex((opt) => opt.toLowerCase() === value.toLowerCase());
      if (idx >= 0) {
        setHighlightedIndex(idx);
      }
    }
  }, [isOpen, value, isUserTyping, displayedOptions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsUserTyping(false);
        setSearchTerm(value ?? '');
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const handleSelectOption = (option: string) => {
    setSearchTerm(option);
    setIsUserTyping(false);
    onChange(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsUserTyping(true);
    onChange(val);
    if (!isOpen) setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm('');
    setIsUserTyping(false);
    onChange('');
    setIsOpen(true);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsUserTyping(false);
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < displayedOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : displayedOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < displayedOptions.length) {
          handleSelectOption(displayedOptions[highlightedIndex]);
        } else if (displayedOptions.length === 1) {
          handleSelectOption(displayedOptions[0]);
        } else {
          setIsOpen(false);
          setIsUserTyping(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setIsUserTyping(false);
        setSearchTerm(value ?? '');
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setIsUserTyping(false);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const items = listboxRef.current.querySelectorAll('li[role="option"]');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div ref={containerRef} className={`w-full space-y-1.5 relative ${className}`}>
      {label && (
        <label
          htmlFor={componentId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative rounded-lg shadow-xs">
        <input
          id={componentId}
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={(e) => {
            if (!disabled) {
              setIsUserTyping(false);
              setIsOpen(true);
              e.target.select();
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`w-full bg-white dark:bg-slate-900 border rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-blue-600 transition-colors pl-3.5 pr-16 py-2 ${
            error
              ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500'
              : 'border-slate-300 dark:border-slate-700'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800' : ''}`}
        />

        {/* Action icons right */}
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
          {searchTerm && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (!disabled) {
                const nextOpen = !isOpen;
                setIsOpen(nextOpen);
                if (nextOpen) {
                  setIsUserTyping(false);
                  inputRef.current?.focus();
                  inputRef.current?.select();
                }
              }
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Dropdown Listbox */}
      {isOpen && !disabled && (
        <ul
          ref={listboxRef}
          role="listbox"
          className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none divide-y divide-slate-100 dark:divide-slate-800/60"
        >
          {displayedOptions.length === 0 ? (
            <li className="px-3.5 py-2.5 text-slate-400 dark:text-slate-500 italic flex items-center justify-between">
              <span>No direct match found</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold not-italic">
                Typing custom value
              </span>
            </li>
          ) : (
            displayedOptions.map((opt, idx) => {
              const isSelected = opt.toLowerCase() === value?.toLowerCase();
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={`${opt}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectOption(opt)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3.5 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                    isHighlighted
                      ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-200 font-semibold'
                      : isSelected
                      ? 'bg-blue-50/50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                </li>
              );
            })
          )}
          {filteredOptions.length > displayedOptions.length && (
            <li className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 italic text-center sticky bottom-0 border-t border-slate-100 dark:border-slate-700">
              Showing top {displayedOptions.length} of {filteredOptions.length} matches — keep typing to filter...
            </li>
          )}
        </ul>
      )}

      {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
    </div>
  );
};
