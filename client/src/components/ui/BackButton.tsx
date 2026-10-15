import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { getDashboardUrl, getEventsConsoleUrl } from '../../utils/navigation';
import { ConfirmLeaveToHomeModal } from './ConfirmLeaveToHomeModal';

export interface BackButtonProps {
  to?: string;
  fallbackTo?: string;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'pill' | 'subtle';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  iconClassName?: string;
  onClick?: (e: React.MouseEvent) => boolean | void;
  confirmLeaveToHome?: boolean;
}

export const BackButton: React.FC<BackButtonProps> = ({
  to,
  fallbackTo,
  label = 'Back',
  variant = 'default',
  size = 'sm',
  className = '',
  iconClassName = '',
  onClick,
  confirmLeaveToHome = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const [showHomeModal, setShowHomeModal] = useState(false);

  const determineTarget = (): string | null => {
    if (to) return to;
    if (fallbackTo) return fallbackTo;

    // Check if location state has a specific referrer path
    const state = location.state as any;
    if (state?.from) return state.from;

    // If history length exists, null means we can use navigate(-1)
    if (window.history.length > 1) {
      return null;
    }

    // Role-aware fallback
    if (isAuthenticated) {
      return getDashboardUrl(user?.role);
    }

    return '/exhibitions';
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      const shouldProceed = onClick(e);
      if (shouldProceed === false) return;
    }

    const target = determineTarget();

    // If destination is explicitly root '/' and the user is authenticated, prompt confirmation
    if (confirmLeaveToHome && isAuthenticated && target === '/') {
      setShowHomeModal(true);
      return;
    }

    if (target === null) {
      navigate(-1);
    } else {
      navigate(target);
    }
  };

  const variantStyles = {
    default:
      'bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs',
    outline:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700',
    ghost:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent',
    pill:
      'bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full shadow-xs',
    subtle:
      'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent',
  };

  const sizeStyles = {
    xs: 'px-2 py-1 text-[11px] gap-1 rounded-lg',
    sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-xl',
    md: 'px-4 py-2 text-sm gap-2 rounded-xl',
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`group inline-flex items-center font-bold transition-all duration-150 cursor-pointer select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        title={label}
        aria-label={label}
      >
        <ArrowLeft
          className={`shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5 ${
            size === 'xs' ? 'w-3.5 h-3.5' : size === 'sm' ? 'w-4 h-4' : 'w-4.5 h-4.5'
          } ${iconClassName || 'text-[#09539b] dark:text-blue-400'}`}
        />
        <span>{label}</span>
      </button>

      <ConfirmLeaveToHomeModal
        isOpen={showHomeModal}
        onClose={() => setShowHomeModal(false)}
        onConfirmHome={() => {
          setShowHomeModal(false);
          navigate('/');
        }}
        onGoToDashboard={() => {
          setShowHomeModal(false);
          navigate(getDashboardUrl(user?.role));
        }}
      />
    </>
  );
};
