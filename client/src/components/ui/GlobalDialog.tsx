import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useDialogStore, DialogType } from '../../stores/dialogStore';

export const GlobalDialog: React.FC = () => {
  const { isOpen, options, closeDialog } = useDialogStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeDialog(false);
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeDialog]);

  if (!isOpen || !options) return null;

  const {
    title,
    message,
    type = 'warning',
    confirmText,
    cancelText = 'Cancel',
    isAlert = false,
  } = options;

  const renderIcon = (dialogType: DialogType) => {
    switch (dialogType) {
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-2xs">
            <AlertCircle className="w-6 h-6" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-2xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case 'success':
        return (
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/80 text-[#09539b] dark:text-blue-400 flex items-center justify-center mx-auto shadow-2xs">
            <Info className="w-6 h-6" />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = (dialogType: DialogType) => {
    switch (dialogType) {
      case 'danger':
        return 'text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-xs';
      case 'warning':
        return 'text-[#012970] bg-[#9cc542] hover:bg-[#82aa30] active:bg-[#729728] shadow-xs';
      case 'success':
        return 'text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-xs';
      case 'info':
      default:
        return 'text-white bg-[#09539b] hover:bg-[#012970] active:bg-[#001d54] shadow-xs';
    }
  };

  const defaultConfirmText = isAlert ? 'Got It' : 'Confirm';

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={() => closeDialog(false)}
        aria-hidden="true"
      />

      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 z-10">
        <button
          type="button"
          onClick={() => closeDialog(false)}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {renderIcon(type)}

        <div className="text-center space-y-1.5">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {title}
          </h3>
          <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line">
            {message}
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          {!isAlert && (
            <button
              type="button"
              onClick={() => closeDialog(false)}
              className="flex-1 py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={() => closeDialog(true)}
            className={`${
              isAlert ? 'w-full' : 'flex-1'
            } py-2.5 px-3 text-xs font-bold rounded-xl transition-colors cursor-pointer ${getConfirmButtonClasses(
              type
            )}`}
          >
            {confirmText || defaultConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
