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
          buttonClassName || 'max-w-[280px] sm:max-w-[320px]'
        }`}
        title="Click to search and switch active exhibition event"
      >
        <div className="flex items-center gap-2 truncate">
          <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="truncate">{displayTitle}</span>
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
            } mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2.5 space-y-2 animate-in fade-in duration-150`}
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
            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              {/* Optional 'All Events' Item */}
              {allowAllOption && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectEvent('ALL');
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full text-left p-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                    selectedEventId === 'ALL'
                      ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-bold border border-purple-200 dark:border-purple-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium'
                  }`}
                >
                  <div className="truncate">
                    <span className="block truncate font-semibold">{allOptionLabel}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                      Platform-wide overview ({events.length} exhibitions)
                    </span>
                  </div>
                  {selectedEventId === 'ALL' && (
                    <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
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
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        onSelectEvent(e.id);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-bold border border-purple-200 dark:border-purple-800'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-medium'
                      }`}
                    >
                      <div className="truncate">
                        <span className="block truncate font-semibold">{e.title}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                          {e.city || 'India'} {e.eventCode ? `• ${e.eventCode}` : ''}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
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
