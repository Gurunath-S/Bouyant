
import React from 'react';
import { CreditCard, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { PaymentExecutionMethod } from '@/types';

interface AdminPaymentModeSelectorProps {
  selectedMode: PaymentExecutionMethod;
  onSelectMode: (mode: PaymentExecutionMethod) => void;
  disabled?: boolean;
}

export const AdminPaymentModeSelector: React.FC<
  AdminPaymentModeSelectorProps
> = ({
  selectedMode,
  onSelectMode,
  disabled = false,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#09539b] dark:text-blue-400">
            <CreditCard className="w-4 h-4" />
          </div>

          <div>
            <h4 className="font-black text-[#012970] dark:text-slate-100 text-sm">
              Payment Processing Mode
            </h4>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Select how this booking payment is being collected
            </p>
          </div>
        </div>

        <span className="self-start sm:self-auto text-[10px] font-black text-[#09539b] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-[#09539b]" />
          Admin / Staff Privilege
        </span>
      </div>

      {/* Payment Mode Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* ONLINE GATEWAY */}
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-pressed={selectedMode === 'ONLINE_RAZORPAY'}
          onClick={() => {
            if (!disabled) {
              onSelectMode('ONLINE_RAZORPAY');
            }
          }}
          onKeyDown={(e) => {
            if (
              !disabled &&
              (e.key === 'Enter' || e.key === ' ')
            ) {
              e.preventDefault();
              onSelectMode('ONLINE_RAZORPAY');
            }
          }}
          className={`p-4 rounded-xl border-2 transition-all relative ${
            selectedMode === 'ONLINE_RAZORPAY'
              ? 'border-[#09539b] dark:border-blue-500 bg-[#f6f9ff] dark:bg-blue-950/30 ring-2 ring-[#09539b]/20 shadow-xs'
              : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
          } ${
            disabled
              ? 'opacity-60 cursor-not-allowed'
              : 'cursor-pointer'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">💳</span>

              <span className="font-extrabold text-xs text-[#012970] dark:text-slate-100">
                Online Gateway
              </span>
            </div>

            <input
              type="radio"
              name="paymentExecutionMode"
              checked={selectedMode === 'ONLINE_RAZORPAY'}
              onChange={() => {
                if (!disabled) {
                  onSelectMode('ONLINE_RAZORPAY');
                }
              }}
              className="text-[#09539b] focus:ring-[#09539b]"
              disabled={disabled}
              aria-label="Online Gateway"
            />
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Standard Razorpay checkout with Cards, UPI, or Netbanking.
          </p>

          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="w-3 h-3" />
            Instant automated gateway
          </div>
        </div>

        {/* CASH PAYMENT */}
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-pressed={selectedMode === 'CASH'}
          onClick={() => {
            if (!disabled) {
              onSelectMode('CASH');
            }
          }}
          onKeyDown={(e) => {
            if (
              !disabled &&
              (e.key === 'Enter' || e.key === ' ')
            ) {
              e.preventDefault();
              onSelectMode('CASH');
            }
          }}
          className={`p-4 rounded-xl border-2 transition-all relative ${
            selectedMode === 'CASH'
              ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20 shadow-xs'
              : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
          } ${
            disabled
              ? 'opacity-60 cursor-not-allowed'
              : 'cursor-pointer'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">💵</span>

              <span className="font-extrabold text-xs text-emerald-900 dark:text-emerald-300">
                Direct Cash
              </span>
            </div>

            <input
              type="radio"
              name="paymentExecutionMode"
              checked={selectedMode === 'CASH'}
              onChange={() => {
                if (!disabled) {
                  onSelectMode('CASH');
                }
              }}
              className="text-emerald-600 focus:ring-emerald-500"
              disabled={disabled}
              aria-label="Direct Cash"
            />
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Direct cash collected at office or on-site counter.
          </p>

          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Instant booking &amp; invoice
          </div>
        </div>
      </div>
    </div>
  );
};
