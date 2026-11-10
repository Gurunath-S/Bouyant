import React from 'react';
import { CreditCard, Banknote, Landmark, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { PaymentExecutionMethod,ChequeDetails } from '@/types';



interface AdminPaymentModeSelectorProps {
  selectedMode: PaymentExecutionMethod;
  onSelectMode: (mode: PaymentExecutionMethod) => void;
  chequeDetails: ChequeDetails;
  onChangeChequeDetails: (details: ChequeDetails) => void;
  disabled?: boolean;
}

export const AdminPaymentModeSelector: React.FC<AdminPaymentModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
  chequeDetails,
  onChangeChequeDetails,
  // cashDetails,
  // onChangeCashDetails,
  disabled = false,
}) => {
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

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

      {/* 3 Main Mode Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. ONLINE GATEWAY */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => !disabled && onSelectMode('ONLINE_RAZORPAY')}
          onKeyDown={(e) => {
            if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onSelectMode('ONLINE_RAZORPAY');
            }
          }}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
            selectedMode === 'ONLINE_RAZORPAY'
              ? 'border-[#09539b] dark:border-blue-500 bg-[#f6f9ff] dark:bg-blue-950/30 ring-2 ring-[#09539b]/20 shadow-xs'
              : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
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
              onChange={() => !disabled && onSelectMode('ONLINE_RAZORPAY')}
              className="text-[#09539b] focus:ring-[#09539b]"
              disabled={disabled}
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

        {/* 2. CASH PAYMENT */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => !disabled && onSelectMode('CASH')}
          onKeyDown={(e) => {
            if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onSelectMode('CASH');
            }
          }}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
            selectedMode === 'CASH'
              ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20 shadow-xs'
              : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
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
              onChange={() => !disabled && onSelectMode('CASH')}
              className="text-emerald-600 focus:ring-emerald-500"
              disabled={disabled}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Direct cash collected at office or on-site counter.
          </p>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Instant booking & invoice
          </div>
        </div>

        {/* 3. CHEQUE PAYMENT */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => !disabled && onSelectMode('CHEQUE')}
          onKeyDown={(e) => {
            if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onSelectMode('CHEQUE');
            }
          }}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
            selectedMode === 'CHEQUE'
              ? 'border-purple-500 dark:border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 ring-2 ring-purple-500/20 shadow-xs'
              : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📑</span>
              <span className="font-extrabold text-xs text-purple-900 dark:text-purple-300">
                Cheque
              </span>
            </div>
            <input
              type="radio"
              name="paymentExecutionMode"
              checked={selectedMode === 'CHEQUE'}
              onChange={() => !disabled && onSelectMode('CHEQUE')}
              className="text-purple-600 focus:ring-purple-500"
              disabled={disabled}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Bank Cheque  deposit. Requires clearance verification.
          </p>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400">
            <AlertCircle className="w-3 h-3" />
            SuperAdmin approval required
          </div>
        </div>
      </div>

      {/* Sub-form: Direct Cash Additional Information */}
      

      {/* Sub-form: Cheque Details Entry */}
      {selectedMode === 'CHEQUE' && (
        <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h5 className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-purple-600" />
              Cheque Verification Details <span className="text-red-500">*</span>
            </h5>
            <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-900/50 px-2 py-0.5 rounded-full self-start sm:self-auto">
              Approval Workflow Triggered
            </span>
          </div>

                   {/* Inputs Grid: 2 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Cheque Number */}
            <div>
              <label htmlFor="chequeNumber" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Cheque Number <span className="text-red-500">*</span>
              </label>
              <input
                id="chequeNumber"
                type="text"
                placeholder="e.g. 004812"
                value={chequeDetails.chequeNumber}
                onChange={(e) =>
                  onChangeChequeDetails({ ...chequeDetails, chequeNumber: e.target.value })
                }
                required
                className="w-full mt-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 2. Cheque Issue Date */}
            <div>
              <label htmlFor="chequeDate" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Cheque Issue Date <span className="text-red-500">*</span>
              </label>
              <input
                id="chequeDate"
                type="date"
                min={minDate}
                value={chequeDetails.chequeDate}
                onChange={(e) =>
                  onChangeChequeDetails({ ...chequeDetails, chequeDate: e.target.value })
                }
                required
                className="w-full mt-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 👇 3. Bank & Branch Name (Span Full 2 Columns - Big & Spacious!) */}
            <div className="sm:col-span-2">
              <label htmlFor="bankName" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Bank & Branch Name <span className="text-red-500">*</span>
              </label>
              <input
                id="bankName"
                type="text"
                placeholder="e.g. Canara Bank, Gandhipuram Branch, Coimbatore"
                value={chequeDetails.bankName}
                onChange={(e) =>
                  onChangeChequeDetails({ ...chequeDetails, bankName: e.target.value })
                }
                required
                className="w-full mt-1 px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="referenceNote" className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Reference / Depositor Note (Optional)
            </label>
            <input
              id="referenceNote"
              type="text"
              placeholder="e.g. Cheque handed over by Managing Director at registration"
              value={chequeDetails.referenceNote || ''}
              onChange={(e) =>
                onChangeChequeDetails({ ...chequeDetails, referenceNote: e.target.value })
              }
              className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">SuperAdmin Approval Process:</span> This stall will be held
              under <span className="font-semibold underline">Pending Cheque Approval</span>. Once SuperAdmin approves
              the cheque clearance in the dashboard, the booking will be confirmed and the official tax invoice will be generated.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

