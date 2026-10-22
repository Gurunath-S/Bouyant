import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, Search, Check, X, ChevronDown } from 'lucide-react';

export interface CityFilterDropdownProps {
  label?: string;
  value: string; // 'ALL' or a specific city name
  onChange: (city: string) => void;
  cities: string[];
  placeholder?: string;
  className?: string;
}

export const CityFilterDropdown: React.FC<CityFilterDropdownProps> = ({
  label = 'City',
  value,
  onChange,
  cities = [],
  placeholder = 'All Cities',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Clean distinct cities list
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    for (const c of cities) {
      if (c && c.trim()) set.add(c.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cities]);

  // Filtered cities based on search
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return uniqueCities;
    const q = searchQuery.trim().toLowerCase();
    return uniqueCities.filter((c) => c.toLowerCase().includes(q));
  }, [uniqueCities, searchQuery]);

  const isFiltered = value && value !== 'ALL';

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-9 px-3 rounded-xl text-xs font-bold inline-flex items-center gap-2 border transition-all cursor-pointer shadow-2xs select-none ${
          isFiltered
            ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
        }`}
      >
        <MapPin
          className={`w-3.5 h-3.5 shrink-0 ${
            isFiltered ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'
          }`}
        />
        <span className="font-normal text-slate-500 dark:text-slate-400">{label}:</span>
        <span className="truncate max-w-[130px] font-bold text-slate-900 dark:text-slate-100">
          {isFiltered ? value : placeholder}
        </span>

        {isFiltered ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange('ALL');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onChange('ALL');
              }
            }}
            title="Clear city filter"
            className="p-0.5 hover:bg-purple-200 dark:hover:bg-purple-900 rounded-full text-purple-600 dark:text-purple-400 ml-0.5 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-purple-600' : ''
            }`}
          />
        )}
      </button>

      {/* Floating Filter Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[9999] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Popover Search Bar */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredCities.length > 0) {
                      onChange(filteredCities[0]);
                      setIsOpen(false);
                    }
                  }
                }}
                placeholder="Search cities..."
                className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            {/* "All Cities" Option */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onChange('ALL');
                setIsOpen(false);
              }}
              onClick={() => {
                onChange('ALL');
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between cursor-pointer select-none transition-colors ${
                !isFiltered
                  ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>All Cities</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {uniqueCities.length}
                </span>
                {!isFiltered && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
              </div>
            </button>

            {filteredCities.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                No matching cities found
              </div>
            ) : (
              filteredCities.map((city) => {
                const isSelected = value.toLowerCase() === city.toLowerCase();
                return (
                  <button
                    key={city}
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      onChange(city);
                      setIsOpen(false);
                    }}
                    onClick={() => {
                      onChange(city);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between cursor-pointer select-none transition-colors ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="truncate">{city}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
