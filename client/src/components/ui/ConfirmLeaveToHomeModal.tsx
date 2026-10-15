import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle, LayoutDashboard, ArrowRight, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { getDashboardUrl, getRoleDisplayName } from '../../utils/navigation';
import { Button } from './Button';

export interface ConfirmLeaveToHomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmHome?: () => void;
  onGoToDashboard?: () => void;
  title?: string;
  description?: string;
}

export const ConfirmLeaveToHomeModal: React.FC<ConfirmLeaveToHomeModalProps> = ({
  isOpen,
  onClose,
  onConfirmHome,
  onGoToDashboard,
  title = 'Return to Public Home Page?',
  description,
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const dashboardUrl = getDashboardUrl(user?.role);
  const roleName = getRoleDisplayName(user?.role);

  const handleDashboard = () => {
    onClose();
    if (onGoToDashboard) {
      onGoToDashboard();
    } else {
      navigate(dashboardUrl);
    }
  };

  const handleProceedHome = () => {
    onClose();
    if (onConfirmHome) {
      onConfirmHome();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 p-6 space-y-5">
        {/* Close icon */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon + Title */}
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1 pr-6">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Logged in as: {user?.name || user?.email} • {roleName}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {description ||
            'You are currently signed in. Navigating to the public home page will exit your authenticated workspace. If you wish to stay within your portal, you can return to your dashboard instead.'}
        </p>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {/* Primary Recommended: Go to Dashboard */}
          <Button
            variant="primary"
            size="md"
            onClick={handleDashboard}
            leftIcon={<LayoutDashboard className="w-4 h-4 text-emerald-300" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full bg-[#09539b] hover:bg-[#012970] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-xs justify-between"
          >
            <span>Return to {roleName} Dashboard</span>
          </Button>

          {/* Secondary: Continue to Home Page */}
          <Button
            variant="outline"
            size="md"
            onClick={handleProceedHome}
            leftIcon={<Home className="w-4 h-4 text-slate-500" />}
            className="w-full font-semibold text-xs py-2 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Proceed to Public Home Page
          </Button>

          {/* Cancel */}
          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 pt-1 transition-colors cursor-pointer"
          >
            Stay on Current Page
          </button>
        </div>
      </div>
    </div>
  );
};
