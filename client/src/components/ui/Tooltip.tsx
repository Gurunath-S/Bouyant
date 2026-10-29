import React, { useState, useRef, useEffect, useCallback, cloneElement } from 'react';
import { createPortal } from 'react-dom';

export interface TooltipProps {
  content: React.ReactNode;
  description?: React.ReactNode;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
  className?: string;
  maxWidth?: string;
  children: React.ReactElement;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  description,
  shortcut,
  position = 'top',
  delay = 120,
  disabled = false,
  className = '',
  maxWidth,
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number; actualPos: string }>({
    x: 0,
    y: 0,
    actualPos: position,
  });

  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;

    const tipW = tooltipEl ? tooltipEl.offsetWidth : 120;
    const tipH = tooltipEl ? tooltipEl.offsetHeight : 32;
    const gap = 7;

    let x = 0;
    let y = 0;
    let actualPos = position;

    // Viewport dimensions
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    if (position === 'top') {
      x = rect.left + rect.width / 2 - tipW / 2;
      y = rect.top - tipH - gap;
      if (y < 8) {
        // Flip to bottom if clipping top
        y = rect.bottom + gap;
        actualPos = 'bottom';
      }
    } else if (position === 'bottom') {
      x = rect.left + rect.width / 2 - tipW / 2;
      y = rect.bottom + gap;
      if (y + tipH > vpH - 8) {
        // Flip to top if clipping bottom
        y = rect.top - tipH - gap;
        actualPos = 'top';
      }
    } else if (position === 'left') {
      x = rect.left - tipW - gap;
      y = rect.top + rect.height / 2 - tipH / 2;
      if (x < 8) {
        // Flip to right if clipping left
        x = rect.right + gap;
        actualPos = 'right';
      }
    } else if (position === 'right') {
      x = rect.right + gap;
      y = rect.top + rect.height / 2 - tipH / 2;
      if (x + tipW > vpW - 8) {
        // Flip to left if clipping right
        x = rect.left - tipW - gap;
        actualPos = 'left';
      }
    }

    // Clamp inside viewport
    x = Math.max(8, Math.min(vpW - tipW - 8, x));
    y = Math.max(8, Math.min(vpH - tipH - 8, y));

    setCoords({ x, y, actualPos });
  }, [position]);

  const showTooltip = useCallback(() => {
    if (disabled || !content) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      calculateCoords();
      setIsVisible(true);
    }, delay);
  }, [disabled, content, delay, calculateCoords]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  }, []);

  // Update position if window resizes or scrolls while visible
  useEffect(() => {
    if (!isVisible) return;
    const handleUpdate = () => calculateCoords();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isVisible, calculateCoords]);

  // Recalculate once DOM tooltip element is rendered to adjust size
  useEffect(() => {
    if (isVisible) {
      calculateCoords();
    }
  }, [isVisible, calculateCoords]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Clone child to attach handlers and ref
  const triggerElement = cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      // Preserve original ref if exists
      const originalRef = (children as any).ref;
      if (typeof originalRef === 'function') {
        originalRef(node);
      } else if (originalRef && typeof originalRef === 'object') {
        originalRef.current = node;
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      showTooltip();
      if (children.props.onMouseEnter) children.props.onMouseEnter(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hideTooltip();
      if (children.props.onMouseLeave) children.props.onMouseLeave(e);
    },
    onFocus: (e: React.FocusEvent) => {
      showTooltip();
      if (children.props.onFocus) children.props.onFocus(e);
    },
    onBlur: (e: React.FocusEvent) => {
      hideTooltip();
      if (children.props.onBlur) children.props.onBlur(e);
    },
    onClick: (e: React.MouseEvent) => {
      hideTooltip();
      if (children.props.onClick) children.props.onClick(e);
    },
    'aria-label': typeof content === 'string' ? content : children.props['aria-label'],
  });

  if (typeof document === 'undefined') {
    return triggerElement;
  }

  return (
    <>
      {triggerElement}
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              left: `${coords.x}px`,
              top: `${coords.y}px`,
            }}
            className={`z-[99999] pointer-events-none select-none max-w-xs animate-in fade-in zoom-in-95 duration-100 ${className}`}
          >
            <div
              className={`bg-slate-900/95 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700/80 flex flex-col gap-1 ${
                description ? 'whitespace-normal min-w-[180px] max-w-[280px]' : 'whitespace-nowrap'
              }`}
              style={maxWidth ? { maxWidth } : undefined}
            >
              <div className="flex items-center gap-1.5 justify-between">
                <span className="font-bold text-slate-100 leading-tight">{content}</span>
                {shortcut && (
                  <kbd className="inline-flex items-center px-1.5 py-0.2 bg-slate-800 text-slate-300 border border-slate-600 rounded text-[9px] font-mono font-bold tracking-tight shadow-2xs">
                    {shortcut}
                  </kbd>
                )}
              </div>
              {description && (
                <div className="text-[11px] text-slate-300 font-normal leading-relaxed whitespace-normal">
                  {description}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
