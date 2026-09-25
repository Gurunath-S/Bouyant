import React, { useState } from 'react';
import { Company, Exhibition, Stall, User } from '../../../../types';
import { Button } from '../../../../components/ui/Button';
import { OfficialContractForm } from '../OfficialContractForm';
import { TermsAndConditionsModal } from '../TermsAndConditionsModal';
import { formatDisplayDate } from '../../../../utils/date';
import {
  FileText,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface Step3TaxAuditBillProps {
  user: User | null;
  exhibition: Exhibition;
  selectedStalls: Stall[];
  selectedCompany: Company | null;
  paymentType: 'FULL' | 'PARTIAL';
  setPaymentType: (type: 'FULL' | 'PARTIAL') => void;
  partialPercentage: number;
  setPartialPercentage: (pct: number) => void;
  isTermsAccepted: boolean;
  setIsTermsAccepted: (val: boolean) => void;
  onProceedToPayment: () => void;
  onBack: () => void;
}

export const Step3TaxAuditBill: React.FC<Step3TaxAuditBillProps> = ({
  user,
  exhibition,
  selectedStalls,
  selectedCompany,
  paymentType,
  setPaymentType,
  partialPercentage,
  setPartialPercentage,
  isTermsAccepted,
  setIsTermsAccepted,
  onProceedToPayment,
  onBack,
}) => {
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [showContractPreview, setShowContractPreview] = useState(false);

  const basePrice = selectedStalls.reduce((sum, s) => sum + Number(s.price), 0);

  const isPartial = paymentType === 'PARTIAL';
  const effectivePartialPercent = Math.max(50, Math.min(99, partialPercentage));
  const payableToday = Math.round(basePrice * (effectivePartialPercent / 100));
  const taxAmount = isPartial ? Math.round(payableToday * 0.18) : Math.round(basePrice * 0.18);

  const billBaseAmount = isPartial ? payableToday : basePrice;
  const billGrandTotal = billBaseAmount + taxAmount;
  const remainingBalance = isPartial ? basePrice - payableToday : 0;

  const eventStartDate = exhibition ? new Date(exhibition.startDate) : new Date(Date.now() + 30 * 86400000);
  const deadlineDate = new Date(eventStartDate.getTime() - 15 * 24 * 60 * 60 * 1000);
  const formattedDeadline = formatDisplayDate(deadlineDate);

  if (!selectedCompany) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto shadow-xs">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-[#012970] dark:text-slate-100">Corporate Details Required</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Please provide and confirm your company details to generate the Tax Invoice & Bill.</p>
        <Button variant="primary" onClick={onBack} className="bg-[#09539b]">
          Go to Step 2: Company Details
        </Button>
      </div>
    );
  }

  if (selectedStalls.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto shadow-xs">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-[#012970] dark:text-slate-100">No Stalls Selected</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Please select at least one available stall from the floor plan to view the Tax Bill.</p>
        <Button variant="primary" onClick={onBack} className="bg-[#09539b]">
          Go to Step 1: Stall Selection
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-[#012970] dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#09539b] dark:text-blue-400" /> Step 3: Tax Invoice Audit & Line Items
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review your corporate tax entity details and financial breakdown before payment.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          Back to Company Details
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 2 Cols: Event & Corporate Details + Stalls + Payment Mode Option */}
        <div className="md:col-span-2 space-y-4">
          <div className="p-4 bg-[#f6f9ff] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-2 text-xs">
            <h4 className="font-extrabold text-[#09539b] dark:text-blue-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-1.5">
              Trade Fair Overview
            </h4>
            <p className="text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-500 dark:text-slate-400">Event:</span> {exhibition.title}</p>
            <p className="text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-500 dark:text-slate-400">Venue:</span> {exhibition.venue}, {exhibition.city}</p>
          </div>

          <div className="p-4 bg-[#f6f9ff] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-2 text-xs">
            <h4 className="font-extrabold text-[#09539b] dark:text-blue-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center justify-between">
              <span>Exhibitor Entity</span>
            </h4>
            <p className="text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-500 dark:text-slate-400">Company Name:</span> {selectedCompany.name}</p>
            <p className="text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-500 dark:text-slate-400">GSTIN:</span> {selectedCompany.gstNumber || 'N/A'}</p>
            <p className="text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-500 dark:text-slate-400">Contact Email:</span> {selectedCompany.email}</p>
          </div>

          {/* Reserved Booths Configuration */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#f7faff] dark:bg-slate-800/40 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-[#012970] dark:text-slate-100 uppercase tracking-wider">
                Reserved Booth Configuration ({selectedStalls.length} Stalls)
              </h4>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold">
                {selectedStalls.reduce((sum, s) => sum + s.areaSqFt, 0)} Sq.Ft Total
              </span>
            </div>

            <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {selectedStalls.map((stall) => (
                <div key={stall.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#012970] dark:text-slate-100 font-mono mr-2">#{stall.stallNumber}</span>
                    <span className="text-slate-500 dark:text-slate-400 uppercase">{stall.category}</span>
                    <span className="text-slate-400 dark:text-slate-500 ml-2">({stall.areaSqFt} Sq.Ft)</span>
                  </div>
                  <span className="font-mono font-bold text-[#09539b] dark:text-blue-400">₹{Number(stall.price).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PAYMENT OPTION SELECTOR (FULL vs PARTIAL > 50%) */}
          <div className="p-5 bg-white dark:bg-slate-900 border-2 border-[#09539b]/30 dark:border-blue-500/30 rounded-xl space-y-4 shadow-xs">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
              <h4 className="font-extrabold text-[#012970] dark:text-slate-100 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#09539b] dark:text-blue-400" /> Select Payment Plan Option
              </h4>
              <span className="text-[10px] font-bold text-[#09539b] dark:text-blue-300 bg-[#EEF4FC] dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-full uppercase">
                Flexible Terms
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Full Payment Option */}
              <div
                onClick={() => setPaymentType('FULL')}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  paymentType === 'FULL'
                    ? 'border-[#09539b] dark:border-blue-500 bg-[#f6f9ff] dark:bg-blue-950/30 ring-2 ring-[#09539b]/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#012970] dark:text-slate-100 text-xs">Full Payment (100%)</span>
                  <input type="radio" checked={paymentType === 'FULL'} onChange={() => setPaymentType('FULL')} />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Pay complete booth rental today with zero pending balance.</p>
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-[#012970] dark:text-slate-200">
                  <span>Amount Today:</span>
                  <span className="font-mono text-[#09539b] dark:text-blue-400">₹{basePrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Partial Payment Option */}
              <div
                onClick={() => setPaymentType('PARTIAL')}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  paymentType === 'PARTIAL'
                    ? 'border-[#09539b] dark:border-blue-500 bg-[#f6f9ff] dark:bg-blue-950/30 ring-2 ring-[#09539b]/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#012970] dark:text-slate-100 text-xs">Partial Advance Payment</span>
                    <span className="text-[9px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-extrabold px-1.5 py-0.5 rounded">
                      &gt; 50% Required
                    </span>
                  </div>
                  <input type="radio" checked={paymentType === 'PARTIAL'} onChange={() => setPaymentType('PARTIAL')} />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Pay advance today to lock booth; balance due 15 days before event.</p>
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-[#012970] dark:text-slate-200">
                  <span>Advance Today ({effectivePartialPercent}%):</span>
                  <span className="font-mono text-[#09539b] dark:text-blue-400">₹{payableToday.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Partial Payment Configuration */}
            {paymentType === 'PARTIAL' && (
              <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Advance Percentage (Must be &gt; 50%):</label>
                  <div className="flex items-center gap-2">
                    {[60, 70, 80].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setPartialPercentage(pct)}
                        className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                          partialPercentage === pct
                            ? 'bg-[#09539b] text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Custom Advance %:</span>
                  <input
                    type="number"
                    min="50"
                    max="99"
                    value={partialPercentage}
                    onChange={(e) => setPartialPercentage(Number(e.target.value))}
                    className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-mono font-bold text-xs text-center text-slate-900 dark:text-slate-100"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    (Payable Today: <b className="font-mono text-[#09539b] dark:text-blue-400">₹{payableToday.toLocaleString()}</b> • Balance:{' '}
                    <b className="font-mono text-slate-800 dark:text-slate-200">₹{remainingBalance.toLocaleString()}</b>)
                  </span>
                </div>

                <div className="p-3 bg-amber-100/70 dark:bg-amber-950/60 border-l-4 border-amber-500 rounded-r-lg text-xs text-amber-900 dark:text-amber-200 font-medium flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-950 dark:text-amber-100 block">15-Day Balance Deadline Notice:</span>
                    The remaining balance of <b className="font-mono font-extrabold">₹{remainingBalance.toLocaleString()} INR</b> must be paid on or before{' '}
                    <b className="font-bold">{formattedDeadline}</b>.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* OFFICIAL CONTRACT FORM & TERMS AGREEMENT */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700/80 rounded-xl space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <h4 className="font-extrabold text-[#012970] dark:text-slate-100 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#09539b] dark:text-blue-400" /> Official Exhibitor Agreement
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowContractPreview(!showContractPreview)}
                className="text-xs font-bold"
              >
                {showContractPreview ? 'Hide Contract Form' : 'Preview Official Contract Form'}
              </Button>
            </div>

            {showContractPreview && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-300 dark:border-slate-700">
                <OfficialContractForm
                  exhibition={exhibition}
                  company={selectedCompany}
                  stalls={selectedStalls}
                  paymentType={paymentType}
                  effectivePartialPercent={effectivePartialPercent}
                  payableToday={payableToday}
                  remainingBalance={remainingBalance}
                  formattedDeadline={formattedDeadline}
                />
              </div>
            )}

            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="termsAccepted"
                checked={isTermsAccepted}
                onChange={(e) => setIsTermsAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#09539b] rounded border-slate-300 focus:ring-[#09539b]"
              />
              <label htmlFor="termsAccepted" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                I have reviewed the booking details and accept the{' '}
                <button
                  type="button"
                  onClick={() => setIsTermsModalOpen(true)}
                  className="text-[#09539b] dark:text-blue-400 font-bold underline hover:text-[#012970]"
                >
                  Exhibition Terms & Conditions
                </button>{' '}
                and booth allocation guidelines.
              </label>
            </div>
          </div>
        </div>

        {/* 1 Col: Financial Summary Card */}
        <div className="space-y-4">
          <div className="bg-[#012970] dark:bg-slate-800 text-white p-5 rounded-2xl shadow-lg space-y-4 sticky top-4 border border-blue-900 dark:border-slate-700">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-200 border-b border-white/10 pb-3">
              Tax Invoice Breakdown
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Base Rental:</span>
                <span className="font-mono text-white font-bold">₹{basePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>GST (18%):</span>
                <span className="font-mono text-white font-bold">₹{taxAmount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-slate-100">
                <span>Grand Total:</span>
                <span className="font-mono text-[#9cc542]">₹{billGrandTotal.toLocaleString()}</span>
              </div>

              {paymentType === 'PARTIAL' && (
                <>
                  <div className="flex justify-between text-xs font-bold text-[#9cc542] pt-2 border-t border-white/20">
                    <span>Advance Payable Today ({effectivePartialPercent}%):</span>
                    <span className="font-mono text-base">₹{payableToday.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-amber-200 pt-1">
                    <span>Remaining Balance Due:</span>
                    <span className="font-mono">₹{remainingBalance.toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-amber-300 font-medium italic pt-1">
                    Due 15 days before event ({formattedDeadline})
                  </p>
                </>
              )}
            </div>

            <Button
              variant="primary"
              size="lg"
              disabled={!isTermsAccepted || billGrandTotal === 0}
              className="w-full font-extrabold bg-[#9cc542] hover:bg-[#82aa30] text-[#012970] shadow-md border-none disabled:opacity-50"
              onClick={onProceedToPayment}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Pay ₹{paymentType === 'PARTIAL' ? payableToday.toLocaleString() : billGrandTotal.toLocaleString()} Now
            </Button>
          </div>
        </div>
      </div>

      <TermsAndConditionsModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} />
    </div>
  );
};
