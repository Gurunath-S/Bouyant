import React, { useState, useRef, useEffect, useId, useMemo, useCallback } from 'react';
import { ChevronDown, Check, X, Search, MapPin, Sparkles } from 'lucide-react';

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

// Global coordinator to ensure strictly one combobox dropdown is open at a time
let activeDropdownCloser: (() => void) | null = null;

/**
 * Highlights matching query substring within option text with purple emphasis
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) {
    return <span className="truncate">{text}</span>;
  }
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) {
    return <span className="truncate">{text}</span>;
  }

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);

  return (
    <span className="truncate">
      {before}
      <mark className="bg-purple-100 dark:bg-purple-900/70 text-purple-900 dark:text-purple-100 font-extrabold rounded-xs px-0.5 not-italic">
        {match}
      </mark>
      {after}
    </span>
  );
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select or type location...',
  error,
  helperText,
  disabled = false,
  required = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value ?? '');
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [openUpward, setOpenUpward] = useState(false);
  const [maxListHeight, setMaxListHeight] = useState(260);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const componentId = useId();

  // Keep a ref to the latest state to avoid stale closures in event listeners
  const stateRef = useRef({ searchQuery, isSearching, value, options, onChange });
  useEffect(() => {
    stateRef.current = { searchQuery, isSearching, value, options, onChange };
  });

  // Close dropdown helper
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setIsSearching(false);
    setHighlightedIndex(-1);
    if (activeDropdownCloser === closeDropdown) {
      activeDropdownCloser = null;
    }
  }, []);

  // Open dropdown helper (keeps active search if typing)
  const openDropdown = useCallback(
    (keepSearch = false) => {
      if (disabled) return;
      if (activeDropdownCloser && activeDropdownCloser !== closeDropdown) {
        activeDropdownCloser();
      }
      activeDropdownCloser = closeDropdown;
      setIsOpen(true);
      if (!keepSearch) {
        setIsSearching(false);
        setSearchQuery(value ?? '');
      }
    },
    [disabled, closeDropdown, value]
  );

  // Clean up global closer on unmount
  useEffect(() => {
    return () => {
      if (activeDropdownCloser === closeDropdown) {
        activeDropdownCloser = null;
      }
    };
  }, [closeDropdown]);

  // Sync internal display with incoming value prop ONLY when user is not actively typing
  useEffect(() => {
    if (!isSearching) {
      setSearchQuery(value ?? '');
    }
  }, [value, isSearching]);

  // Viewport collision detection: smart flip up/down with adaptive max height
  useEffect(() => {
    if (!isOpen) return;

    const calculatePlacement = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Flip upward if space below is tight (< 180px) and above has more space
      const shouldFlipUp = spaceBelow < 180 && spaceAbove > spaceBelow;
      setOpenUpward(shouldFlipUp);

      const availableSpace = shouldFlipUp ? spaceAbove : spaceBelow;
      const computedMax = Math.max(160, Math.min(280, availableSpace - 24));
      setMaxListHeight(computedMax);
    };

    calculatePlacement();
    window.addEventListener('resize', calculatePlacement);
    window.addEventListener('scroll', calculatePlacement, true);
    return () => {
      window.removeEventListener('resize', calculatePlacement);
      window.removeEventListener('scroll', calculatePlacement, true);
    };
  }, [isOpen]);

  // Filter options with two-tier ranking (starts-with first, then contains)
  const filteredOptions = useMemo(() => {
    const safeOptions = Array.isArray(options) ? options.filter(Boolean) : [];
    if (!isSearching || !searchQuery.trim()) {
      return safeOptions;
    }

    const q = searchQuery.trim().toLowerCase();
    const exactMatches: string[] = [];
    const startsWith: string[] = [];
    const contains: string[] = [];

    for (const opt of safeOptions) {
      const lower = String(opt).toLowerCase();
      if (lower === q) {
        exactMatches.push(opt);
      } else if (lower.startsWith(q)) {
        startsWith.push(opt);
      } else if (lower.includes(q)) {
        contains.push(opt);
      }
    }

    return Array.from(new Set([...exactMatches, ...startsWith, ...contains]));
  }, [options, searchQuery, isSearching]);

  // Show top 150 items for fast 60fps rendering
  const displayedOptions = useMemo(() => {
    return filteredOptions.slice(0, 150);
  }, [filteredOptions]);

  // When dropdown opens with a selected value and user is not searching, highlight selected item
  useEffect(() => {
    if (isOpen && value && !isSearching) {
      const idx = displayedOptions.findIndex(
        (opt) => String(opt).toLowerCase() === String(value).toLowerCase()
      );
      if (idx >= 0) {
        setHighlightedIndex(idx);
      }
    }
  }, [isOpen, value, isSearching, displayedOptions]);

  // Commit text or option
  const commitSelection = useCallback(
    (textToCommit: string) => {
      const trimmed = textToCommit.trim();
      if (!trimmed) {
        onChange('');
        setSearchQuery('');
        setIsSearching(false);
        return;
      }

      // Check if there is an exact case-insensitive match in options
      const canonicalMatch = options.find(
        (opt) => String(opt).toLowerCase() === trimmed.toLowerCase()
      );
      const finalVal = canonicalMatch || trimmed;

      onChange(finalVal);
      setSearchQuery(finalVal);
      setIsSearching(false);
    },
    [options, onChange]
  );

  const handleSelectOption = useCallback(
    (option: string) => {
      commitSelection(option);
      closeDropdown();
      inputRef.current?.blur();
    },
    [commitSelection, closeDropdown]
  );

  // Close dropdown on outside click with graceful commit of typed text
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const { searchQuery: currentQuery, isSearching: currentlySearching, value: currentValue } = stateRef.current;
        if (currentlySearching && currentQuery.trim() && currentQuery.trim() !== currentValue) {
          commitSelection(currentQuery);
        } else {
          setSearchQuery(currentValue ?? '');
          setIsSearching(false);
        }
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [commitSelection, closeDropdown]);

  // Handle focus leaving container completely
  const handleContainerBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const nextTarget = e.relatedTarget as Node | null;
    if (!containerRef.current?.contains(nextTarget)) {
      if (isSearching && searchQuery.trim() && searchQuery.trim() !== value) {
        commitSelection(searchQuery);
      } else {
        setSearchQuery(value ?? '');
        setIsSearching(false);
      }
      closeDropdown();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setIsSearching(true);
    if (!isOpen) {
      openDropdown(true);
    }
    setHighlightedIndex(0);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchQuery('');
    setIsSearching(false);
    onChange('');
    openDropdown(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        openDropdown(false);
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
        } else if (searchQuery.trim()) {
          commitSelection(searchQuery);
          closeDropdown();
        } else {
          closeDropdown();
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        setSearchQuery(value ?? '');
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        if (isSearching && searchQuery.trim() && searchQuery.trim() !== value) {
          commitSelection(searchQuery);
        }
        closeDropdown();
        break;
    }
  };

  // Automatically scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const items = listboxRef.current.querySelectorAll('li[role="option"]');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div
      ref={containerRef}
      onBlur={handleContainerBlur}
      className={`w-full space-y-1.5 relative ${className}`}
    >
      {label && (
        <label
          htmlFor={componentId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative rounded-xl shadow-xs group">
        {/* Left Search / Map Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors">
          <Search className="w-3.5 h-3.5" />
        </div>

        <input
          id={componentId}
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onClick={() => {
            if (!disabled && !isOpen) {
              openDropdown(isSearching);
            }
          }}
          onFocus={(e) => {
            if (!disabled) {
              e.target.select();
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`w-full bg-white dark:bg-slate-900 border rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-all pl-9 pr-16 py-2.5 ${
            error
              ? 'border-rose-500 focus:ring-rose-500/30 focus:border-rose-500'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800' : ''}`}
        />

        {/* Action icons right */}
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {searchQuery && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                if (isOpen) {
                  closeDropdown();
                } else {
                  openDropdown(false);
                  inputRef.current?.focus();
                  inputRef.current?.select();
                }
              }
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-purple-600' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Floating Dropdown Listbox with Smart Flip Up/Down, Prevented-Blur & Search Match Count */}
      {isOpen && !disabled && (
        <div
          style={{ maxHeight: `${maxListHeight}px` }}
          className={`absolute z-[9999] w-full overflow-hidden flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header count badge */}
          <div className="px-3.5 py-1.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              {isSearching && searchQuery.trim()
                ? `${filteredOptions.length} matching result${filteredOptions.length === 1 ? '' : 's'}`
                : `${options.length} available locations`}
            </span>
            {isSearching && searchQuery.trim() && (
              <span className="text-purple-600 dark:text-purple-400 font-semibold truncate max-w-[130px]">
                "{searchQuery.trim()}"
              </span>
            )}
          </div>

          {/* List items container */}
          <ul
            ref={listboxRef}
            role="listbox"
            className="overflow-y-auto flex-1 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700"
          >
            {displayedOptions.length === 0 ? (
              <li className="p-4 text-center space-y-2">
                <p className="text-xs text-slate-400 italic">No matching locations found in directory</p>
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectOption(searchQuery.trim())}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    Use custom location: "{searchQuery.trim()}"
                  </button>
                )}
              </li>
            ) : (
              displayedOptions.map((opt, idx) => {
                const isSelected = String(opt).toLowerCase() === String(value || '').toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={`${opt}-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectOption(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`mx-1.5 my-0.5 px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between transition-all select-none ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200 font-bold border border-purple-200/60 dark:border-purple-800/60'
                        : isHighlighted
                        ? 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <HighlightMatch text={opt} query={isSearching ? searchQuery : ''} />
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 ml-2" />
                    )}
                  </li>
                );
              })
            )}

            {filteredOptions.length > displayedOptions.length && (
              <li className="px-3.5 py-1.5 bg-slate-50/80 dark:bg-slate-800/80 text-[10px] text-slate-400 italic text-center sticky bottom-0 border-t border-slate-100 dark:border-slate-800">
                Showing top {displayedOptions.length} of {filteredOptions.length} — type more to narrow down
              </li>
            )}
          </ul>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
    </div>
  );
};
