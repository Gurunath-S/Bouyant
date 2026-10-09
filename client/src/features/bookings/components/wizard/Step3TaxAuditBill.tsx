import React, { useState } from 'react';
import { Company, Exhibition, Stall, User } from '../../../../types';
import { Button } from '../../../../components/ui/Button';
import { OfficialContractForm } from '../OfficialContractForm';
import { TermsAndConditionsModal } from '../TermsAndConditionsModal';
import { formatDisplayDate } from '../../../../utils/date';
import type { CreateBookingPayload } from '../../../../services/bookings/bookingService';
import {
  FileText,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Tag,
  Building2,
  Calendar,
  MapPin,
  Mail,
  FileCheck,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
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
  onProceedToPayment: (payload: CreateBookingPayload) => void;
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
  const [discountMode, setDiscountMode] = useState<'AMOUNT' | 'PERCENT'>('AMOUNT');
  const [discountValue, setDiscountValue] = useState<number>(0);

  const basePrice = selectedStalls.reduce((sum, s) => sum + Number(s.price), 0);
  const isPartial = paymentType === 'PARTIAL';
  const effectivePartialPercent = Math.max(10, Math.min(99, partialPercentage));

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || user?.role === 'STAFF';

  // Calculate discount on base price
  const discountAmount = isAdmin
    ? discountMode === 'PERCENT'
      ? Math.round(basePrice * (Math.min(Math.max(discountValue, 0), 100) / 100))
      : Math.min(Math.max(discountValue, 0), basePrice)
    : 0;

  // Amount after discount (Full Taxable Base)
  const discountedAmount = basePrice - discountAmount;

  // Full Contract Values
  const fullCgst = Math.round(discountedAmount * 0.09);
  const fullSgst = Math.round(discountedAmount * 0.09);
  const fullTotalTax = fullCgst + fullSgst;
  const fullGrandTotal = discountedAmount + fullTotalTax;

  // Today's Payment breakdown values
  const todayBase = isPartial
    ? Math.round(discountedAmount * (effectivePartialPercent / 100))
    : discountedAmount;
  const todayCgst = Math.round(todayBase * 0.09);
  const todaySgst = Math.round(todayBase * 0.09);
  const todayTaxTotal = todayCgst + todaySgst;
  const payableToday = todayBase + todayTaxTotal;

  const remainingBalance = isPartial ? fullGrandTotal - payableToday : 0;

  const fallbackStartDate = React.useMemo(() => new Date(Date.now() + 30 * 86400000), []);
  const eventStartDate = exhibition ? new Date(exhibition.startDate) : fallbackStartDate;
  const deadlineDate = new Date(eventStartDate.getTime() - 15 * 24 * 60 * 60 * 1000);
  const formattedDeadline = formatDisplayDate(deadlineDate);

  const handlePaymentPayload = () => {
    const apiPaymentType: CreateBookingPayload['paymentType'] = isPartial ? 'Partial' : 'FullPayment';

    if (selectedStalls.length === 0 || !selectedCompany) return;

    const payload: CreateBookingPayload = {
      companyId: selectedCompany.id,
      stallIds: selectedStalls.map((s) => s.id),
      exhibitionId: exhibition?.id,
      ...(user &&
        isAdmin &&
        discountValue > 0 && {
          discountAmount: discountValue,
          discountType: discountMode,
        }),
      paymentType: apiPaymentType,
      percentage: isPartial ? partialPercentage : 100,
    };

    onProceedToPayment(payload);
  };

  if (!selectedCompany) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 max-w-xl mx-auto shadow-xl">
        <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/60 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
        </div>
        <h3 className="text-xl font-black text-[#012970] dark:text-slate-100">Corporate Details Required</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Please provide and confirm your registered company details to generate the Tax Invoice & Bill.
        </p>
        <Button variant="primary" onClick={onBack} className="bg-[#09539b] hover:bg-[#07427d] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md">
          Go to Step 2: Company Details
        </Button>
      </div>
    );
  }

  if (selectedStalls.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 max-w-xl mx-auto shadow-xl">
        <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/60 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
        </div>
        <h3 className="text-xl font-black text-[#012970] dark:text-slate-100">No Stalls Selected</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Please select at least one available stall from the interactive floor plan to view your tax invoice breakdown.
        </p>
        <Button variant="primary" onClick={onBack} className="bg-[#09539b] hover:bg-[#07427d] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md">
          Go to Step 1: Stall Selection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* STEP HEADER CARD */}
      <div className="bg-gradient-to-r from-white via-slate-50 to-[#f6f9ff] dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm border-t-4 border-t-[#09539b] dark:border-t-blue-500 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full bg-[#09539b]/10 dark:bg-blue-950/60 text-[#09539b] dark:text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-200 dark:border-blue-800">
              Tax Audit & Bill Confirmation
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> GST 18% Compliant
            </span>
          </div>
          <h2 className="text-2xl font-black text-[#012970] dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#09539b] dark:text-blue-400" /> Step 3: Tax Invoice Audit & Line Items
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review corporate entity particulars, reserved booth specs, and flexible payment plan options.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack} className="self-start md:self-center font-bold text-xs border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
          Back to Company Details
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: EVENT DETAILS + STALLS + PAYMENT OPTIONS */}
        <div className="lg:col-span-2 space-y-6">
          {/* OVERVIEW CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Event Overview Card */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-2.5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#09539b] dark:text-blue-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#09539b] dark:text-blue-400" /> Trade Fair Overview
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">Official Expo</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-extrabold text-[#012970] dark:text-slate-100 text-sm leading-snug">{exhibition.title}</p>
                <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0 text-slate-400" /> {exhibition.venue}, {exhibition.city}
                </p>
              </div>
            </div>

            {/* Exhibitor Corporate Entity Card */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-2.5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#09539b] dark:text-blue-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#09539b] dark:text-blue-400" /> Registered Exhibitor Entity
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#09539b] dark:text-blue-300 text-[9px] font-bold uppercase border border-blue-100 dark:border-blue-900">
                  Tax Entity
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-extrabold text-[#012970] dark:text-slate-100 text-sm truncate">{selectedCompany.name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 dark:text-slate-400">
                  <span><b className="font-semibold text-slate-700 dark:text-slate-300">GSTIN:</b> {selectedCompany.gstNumber || 'N/A'}</span>
                  <span><b className="font-semibold text-slate-700 dark:text-slate-300">Email:</b> {selectedCompany.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RESERVED BOOTH CONFIGURATION TABLE CARD */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#09539b] dark:text-blue-400" />
                <h4 className="text-xs font-black text-[#012970] dark:text-slate-100 uppercase tracking-wider">
                  Reserved Booth Allocation ({selectedStalls.length} {selectedStalls.length === 1 ? 'Stall' : 'Stalls'})
                </h4>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-extrabold">
                {selectedStalls.reduce((sum, s) => sum + s.areaSqFt, 0)} Sq.Ft Total Area
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {selectedStalls.map((stall) => (
                <div key={stall.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#09539b]/10 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#09539b] dark:text-blue-300 font-mono font-black text-xs">
                      #{stall.stallNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#012970] dark:text-slate-100">Stall {stall.stallNumber}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase">
                          {stall.category}
                        </span>
                      </div>
                      <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                        Modular Shell Scheme • {stall.areaSqFt} Sq.Ft ({Math.round(stall.areaSqFt / 10.764)} Sq.Mtr)
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-extrabold text-[#09539b] dark:text-blue-400 text-sm block">
                      ₹{Number(stall.price).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">+18% GST Applicable</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PAYMENT PLAN SELECTOR CARD */}
          <div className="p-5 bg-white dark:bg-slate-900 border-2 border-[#09539b]/30 dark:border-blue-500/30 rounded-3xl space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-black text-[#012970] dark:text-slate-100 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#09539b] dark:text-blue-400" /> Choose Payment Plan Option
              </h4>
              <span className="text-[10px] font-extrabold text-[#09539b] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-full uppercase">
                Flexible Payment Terms
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Payment Option */}
              <div
                onClick={() => setPaymentType('FULL')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  paymentType === 'FULL'
                    ? 'border-[#09539b] dark:border-blue-500 bg-[#f6f9ff] dark:bg-blue-950/30 ring-2 ring-[#09539b]/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[#012970] dark:text-slate-100 text-xs">Full Payment (100%)</span>
                  <input type="radio" checked={paymentType === 'FULL'} onChange={() => setPaymentType('FULL')} className="text-[#09539b]" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Pay complete booth rental today with zero pending balance.</p>
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs font-bold text-[#012970] dark:text-slate-200">
                  <span>Pay Today (100%):</span>
                  <span className="font-mono text-[#09539b] dark:text-blue-400 font-extrabold">₹{fullGrandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Partial Payment Option */}
              <div
                onClick={() => setPaymentType('PARTIAL')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  paymentType === 'PARTIAL'
                    ? 'border-[#09539b] dark:border-blue-500 bg-[#f6f9ff] dark:bg-blue-950/30 ring-2 ring-[#09539b]/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[#012970] dark:text-slate-100 text-xs">Partial Advance Payment</span>
                    <span className="text-[9px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-extrabold px-1.5 py-0.5 rounded">
                      &gt; 10% Required
                    </span>
                  </div>
                  <input type="radio" checked={paymentType === 'PARTIAL'} onChange={() => setPaymentType('PARTIAL')} className="text-[#09539b]" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Pay advance today to lock booth; balance due 15 days before event.</p>
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs font-bold text-[#012970] dark:text-slate-200">
                  <span>Advance Today ({effectivePartialPercent}%):</span>
                  <span className="font-mono text-[#09539b] dark:text-blue-400 font-extrabold">₹{payableToday.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Partial Payment Configuration Block */}
            {paymentType === 'PARTIAL' && (
              <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Quick Select Advance Percentage:</label>
                  <div className="flex items-center gap-2">
                    {[50, 60, 75].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setPartialPercentage(pct)}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
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

                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Custom Advance %:</span>
                  <input
                    type="number"
                    min="10"
                    max="99"
                    value={partialPercentage}
                    onChange={(e) => setPartialPercentage(Number(e.target.value))}
                    className="w-20 px-2.5 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg font-mono font-bold text-xs text-center text-slate-900 dark:text-slate-100"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    (Pay Today: <b className="font-mono text-[#09539b] dark:text-blue-400 font-extrabold">₹{payableToday.toLocaleString('en-IN')}</b> • Balance:{' '}
                    <b className="font-mono text-slate-800 dark:text-slate-200 font-extrabold">₹{remainingBalance.toLocaleString('en-IN')}</b>)
                  </span>
                </div>

                <div className="p-3 bg-amber-100/70 dark:bg-amber-950/60 border-l-4 border-amber-500 rounded-r-xl text-xs text-amber-900 dark:text-amber-200 font-medium flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-950 dark:text-amber-100 block">15-Day Balance Deadline Notice:</span>
                    The remaining balance of <b className="font-mono font-extrabold">₹{remainingBalance.toLocaleString('en-IN')} INR</b> must be cleared on or before{' '}
                    <b className="font-bold">{formattedDeadline}</b>.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* OFFICIAL CONTRACT FORM PREVIEW & TERMS AGREEMENT */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-3xl space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
              <h4 className="font-black text-[#012970] dark:text-slate-100 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#09539b] dark:text-blue-400" /> Official Exhibitor Contract Agreement
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowContractPreview(!showContractPreview)}
                className="text-xs font-bold border-slate-300 dark:border-slate-700 flex items-center gap-1"
              >
                {showContractPreview ? (
                  <>Hide Official Contract <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>Preview Official Contract Form <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </Button>
            </div>

            {showContractPreview && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-inner">
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

            <div className="flex items-start gap-3 pt-1">
              <input
                type="checkbox"
                id="termsAccepted"
                checked={isTermsAccepted}
                onChange={(e) => setIsTermsAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#09539b] rounded border-slate-300 focus:ring-[#09539b] cursor-pointer"
              />
              <label htmlFor="termsAccepted" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                I have reviewed the booking details and accept the{' '}
                <button
                  type="button"
                  onClick={() => setIsTermsModalOpen(true)}
                  className="text-[#09539b] dark:text-blue-400 font-bold underline hover:text-[#012970]"
                >
                  Exhibition Terms & Conditions
                </button>{' '}
                and booth allocation rules.
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: STICKY FINANCIAL PAYMENT SUMMARY CARD */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white p-5 rounded-3xl shadow-xl space-y-4 lg:sticky lg:top-6 border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#012970] dark:text-blue-200 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <span>Payment Summary</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full uppercase">
                GST 18% Ready
              </span>
            </h3>

            <div className="space-y-2.5 text-xs">
              {/* Full Original Base Rental */}
              <div className="flex justify-between items-baseline gap-3 text-slate-600 dark:text-slate-300">
                <span>Full Stall Base Rental:</span>
                <span className="font-mono tabular-nums text-slate-900 dark:text-white font-bold whitespace-nowrap">
                  ₹{basePrice.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Admin discount control block */}
              {isAdmin && (
                <div className="space-y-1.5 py-1.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Admin Discount</span>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">
                      <button
                        type="button"
                        onClick={() => setDiscountMode('AMOUNT')}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                          discountMode === 'AMOUNT'
                            ? 'bg-[#9cc542] text-[#012970]'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        ₹
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountMode('PERCENT')}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                          discountMode === 'PERCENT'
                            ? 'bg-[#9cc542] text-[#012970]'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                      {discountMode === 'AMOUNT' ? '₹' : '%'}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={discountMode === 'PERCENT' ? 100 : undefined}
                      value={discountValue || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setDiscountValue(isNaN(val) ? 0 : val);
                      }}
                      placeholder="0"
                      className="w-full pl-6 pr-2 py-1 text-xs text-right font-mono font-bold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9cc542]"
                    />
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400 pt-0.5">
                      <span className="flex items-center gap-1 font-semibold">
                        <Tag className="w-3 h-3" />
                        Discount Savings
                      </span>
                      <span className="font-mono tabular-nums font-bold whitespace-nowrap">
                        −₹{discountAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* If Partial Advance is selected, show Advance Base Selected */}
              {isPartial && (
                <div className="flex justify-between items-baseline gap-3 pt-1 border-t border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-100">
                  <span>Advance Selected ({effectivePartialPercent}%):</span>
                  <span className="font-mono tabular-nums text-[#09539b] dark:text-blue-400 font-extrabold">
                    ₹{todayBase.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {/* GST Breakdown on Payable Base */}
              <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <div className="flex justify-between items-baseline gap-3">
                  <span>CGST (9%):</span>
                  <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300 font-medium">₹{todayCgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-baseline gap-3">
                  <span>SGST (9%):</span>
                  <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300 font-medium">₹{todaySgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-baseline gap-3 font-semibold text-slate-700 dark:text-slate-200 pt-0.5">
                  <span>Total GST (18%):</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                    ₹{todayTaxTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Total Amount Payable Today Highlight Box */}
              <div className="p-4 bg-[#f6f9ff] dark:bg-blue-950/40 border-2 border-[#09539b] dark:border-blue-500 rounded-2xl space-y-1.5 mt-3 shadow-xs">
                <div className="flex justify-between items-center text-xs font-black text-[#012970] dark:text-slate-100">
                  <span>{isPartial ? `Total Payable Today (${effectivePartialPercent}%):` : "Total Amount Payable Today:"}</span>
                  <span className="font-mono text-lg font-black text-[#09539b] dark:text-[#9cc542]">
                    ₹{payableToday.toLocaleString('en-IN')}
                  </span>
                </div>

                {isPartial && (
                  <div className="pt-2 border-t border-blue-200 dark:border-blue-800/80 flex justify-between items-center text-[11px] font-bold text-amber-800 dark:text-amber-300">
                    <span>Remaining Balance Due:</span>
                    <span className="font-mono text-xs text-amber-900 dark:text-amber-200 font-extrabold">
                      ₹{remainingBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {isPartial && (
                <p className="text-[11px] text-amber-600 dark:text-amber-300 font-medium italic pt-0.5">
                  Remaining balance due 15 days before event ({formattedDeadline})
                </p>
              )}
            </div>

            <Button
              variant="primary"
              size="lg"
              disabled={!isTermsAccepted || payableToday === 0}
              className="w-full text-sm font-extrabold bg-[#9cc542] hover:bg-[#82aa30] text-[#012970] shadow-md border-none disabled:opacity-50 py-3 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
              onClick={handlePaymentPayload}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {payableToday <= 0 ? `No Payment Required` : `Pay ₹${payableToday.toLocaleString('en-IN')} Now & Reserve Booth`}
            </Button>
          </div>
        </div>
      </div>

      <TermsAndConditionsModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} />
    </div>
  );
};
