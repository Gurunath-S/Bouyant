import React, { useState, useMemo } from 'react';
import { Layers, ChevronDown, Search, Check } from 'lucide-react';

export interface EventOption {
  id: string;
  title: string;
  city?: string | null;
  eventCode?: string | null;
  edition?: string | number | null;
  [key: string]: any;
}

export interface EventSelectorDropdownProps {
  events: EventOption[];
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  allowAllOption?: boolean;
  allOptionLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  align?: 'left' | 'right';
  className?: string;
  buttonClassName?: string;
}

export const EventSelectorDropdown: React.FC<EventSelectorDropdownProps> = ({
  events = [],
  selectedEventId,
  onSelectEvent,
  allowAllOption = false,
  allOptionLabel = 'All Exhibitions',
  placeholder = 'Select Exhibition Event',
  searchPlaceholder = 'Search published events...',
  align = 'right',
  className = '',
  buttonClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected event title resolution
  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId),
    [events, selectedEventId]
  );

  const displayTitle = useMemo(() => {
    if (selectedEventId === 'ALL') {
      return allOptionLabel;
    }
    if (selectedEvent) {
      return selectedEvent.title;
    }
    return placeholder;
  }, [selectedEventId, selectedEvent, allOptionLabel, placeholder]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.title?.toLowerCase().includes(q) ||
        e.city?.toLowerCase().includes(q) ||
        e.eventCode?.toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/80 text-purple-900 dark:text-purple-200 rounded-xl shadow-xs hover:border-purple-300 dark:hover:border-purple-700 transition-all flex items-center justify-between gap-2 cursor-pointer ${
          buttonClassName || 'max-w-[320px] sm:max-w-[380px] md:max-w-[460px]'
        }`}
        title={displayTitle}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="truncate text-left">{displayTitle}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery('');
            }}
          />
          <div
            className={`absolute ${
              align === 'left' ? 'left-0' : 'right-0'
            } mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2.5 space-y-2 animate-in fade-in duration-150`}
          >
            {/* Search Input inside Popover */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500/30"
                autoFocus
              />
            </div>

            {/* Scrollable Event List */}
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {/* Optional 'All Events' Item */}
              {allowAllOption && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectEvent('ALL');
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-center justify-between gap-2.5 cursor-pointer ${
                    selectedEventId === 'ALL'
                      ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-bold border border-purple-200 dark:border-purple-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="block font-semibold break-words leading-snug whitespace-normal" title={allOptionLabel}>
                      {allOptionLabel}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
                      Platform-wide overview ({events.length} exhibitions)
                    </span>
                  </div>
                  {selectedEventId === 'ALL' && (
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  )}
                </button>
              )}

              {filteredEvents.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 font-medium">
                  No published exhibitions found.
                </div>
              ) : (
                filteredEvents.map((e) => {
                  const isSelected = selectedEventId === e.id;
                  const codeAndEdition = e.eventCode
                    ? e.edition && !String(e.eventCode).includes(String(e.edition))
                      ? `${e.eventCode}-${e.edition}`
                      : e.eventCode
                    : null;
                  const locationSubtitle = [e.city, codeAndEdition].filter(Boolean).join(' • ') || 'India';

                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        onSelectEvent(e.id);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-center justify-between gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-bold border border-purple-200 dark:border-purple-800'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium'
                      }`}
                      title={e.title}
                    >
                      <div className="flex-1 min-w-0">
                        <span
                          className="block font-semibold break-words leading-snug whitespace-normal text-slate-900 dark:text-slate-100"
                          title={e.title}
                        >
                          {e.title}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
                          {locationSubtitle}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
