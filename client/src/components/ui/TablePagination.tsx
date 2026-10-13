import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

/**
 * Calculates a compact dynamic range of pages with ellipses.
 * Guarantees a predictable, constant maximum length (7 items).
 */
export function getPaginationRange(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Case 1: Close to the beginning
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
  }

  // Case 2: Close to the end
  if (currentPage >= totalPages - 3) {
    return [
      1,
      'ellipsis',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  // Case 3: In the middle
  return [
    1,
    'ellipsis',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis',
    totalPages,
  ];
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = 'records',
  className = '',
}) => {
  if (totalItems <= 0) return null;

  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const pageRange = getPaginationRange(currentPage, totalPages);

  return (
    <div
      className={`px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 ${className}`}
    >
      {/* Record Count & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          Showing{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {startItem.toLocaleString()}
          </span>
          –
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {endItem.toLocaleString()}
          </span>{' '}
          of{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {totalItems.toLocaleString()}
          </span>{' '}
          {itemLabel}
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                if (newSize > 0) {
                  onPageSizeChange(newSize);
                }
              }}
              className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              aria-label={`Select ${itemLabel} per page`}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span>per page</span>
          </div>
        )}
      </div>

      {/* Numbered Navigation Controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1 self-center sm:self-auto">
          {/* First Button */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            title="First page"
            aria-label="First page"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors select-none text-xs font-medium"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
            <span className="hidden md:inline">First</span>
          </button>

          {/* Previous Button */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            title="Previous page"
            aria-label="Previous page"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors select-none text-xs font-medium"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Prev</span>
          </button>

          {/* Desktop/Tablet Numbered Buttons */}
          <div className="hidden sm:flex items-center gap-1">
            {pageRange.map((item, idx) => {
              if (item === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="min-w-[32px] h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold select-none text-xs"
                    aria-hidden="true"
                  >
                    …
                  </span>
                );
              }

              const isCurrent = item === currentPage;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-current={isCurrent ? 'page' : undefined}
                  aria-label={`Page ${item}`}
                  className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all select-none ${
                    isCurrent
                      ? 'bg-purple-600 text-white shadow-xs border border-purple-600 dark:bg-purple-600 dark:border-purple-600'
                      : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* Mobile Current Indicator */}
          <div className="sm:hidden px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {currentPage} / {totalPages}
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            title="Next page"
            aria-label="Next page"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors select-none text-xs font-medium"
          >
            <span className="hidden md:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last Button */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            title="Last page"
            aria-label="Last page"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors select-none text-xs font-medium"
          >
            <span className="hidden md:inline">Last</span>
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
