import React, { useState } from 'react';
import { Company, Exhibition, Stall, User } from '../../../../types';
import { Button } from '../../../../components/ui/Button';
import { TermsAndConditionsModal } from '../TermsAndConditionsModal';
import { formatDisplayDate } from '../../../../utils/date';
import type { CreateBookingPayload } from '../../../../services/bookings/bookingService';
import {
  FileText,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Tag,
  Building2,
  Calendar,
  MapPin,
  Mail,
  FileCheck,
  CheckCircle2,
  LayoutGrid,
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
  onCancel?: () => void;
  isPaymentModalDismissed?: boolean;
  onCancelBookingAndRelease?: () => void;
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
  onCancel,
  isPaymentModalDismissed,
  onCancelBookingAndRelease,
}) => {
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [discountMode, setDiscountMode] = useState<'AMOUNT' | 'PERCENT'>('AMOUNT');
  const [discountValue, setDiscountValue] = useState<number>(0);

  const basePrice = selectedStalls.reduce((sum, s) => sum + Number(s.price), 0);
  const isPartial = paymentType === 'PARTIAL';
  const effectivePartialPercent = Math.max(10, Math.min(99, partialPercentage));

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || user?.role === 'STAFF';

  // Base rental for this bill
  const billBaseAmount = isPartial
    ? Math.round(basePrice * (effectivePartialPercent / 100))
    : basePrice;

  // Calculate discount on bill base price
  const discountAmount = isAdmin
    ? discountMode === 'PERCENT'
      ? Math.round(billBaseAmount * (Math.min(Math.max(discountValue, 0), 100) / 100))
      : Math.min(Math.max(discountValue, 0), billBaseAmount)
    : 0;

  // Amount after discount (Taxable Base)
  const discountedAmount = Math.max(0, billBaseAmount - discountAmount);

  // Calculate GST (18%) AFTER discount (Split into CGST 9% + SGST 9%)
  const cgst = Math.round(discountedAmount * 0.09);
  const sgst = Math.round(discountedAmount * 0.09);
  const totalGst = cgst + sgst;
  const taxAmount = totalGst;

  // Final amount to pay today
  const billGrandTotal = discountedAmount + totalGst;
  const payableToday = billGrandTotal;

  // Remaining balance for partial payments
  const unpaidBase = isPartial ? Math.max(0, basePrice - billBaseAmount) : 0;
  const unpaidGst = Math.round(unpaidBase * 0.18);
  const remainingBalance = unpaidBase + unpaidGst;

  const fallbackStartDate = React.useMemo(() => new Date(Date.now() + 30 * 86400000), []);
  const eventStartDate = exhibition ? new Date(exhibition.startDate) : fallbackStartDate;
  const deadlineDate = new Date(eventStartDate.getTime() - 15 * 24 * 60 * 60 * 1000);
  const formattedDeadline = formatDisplayDate(deadlineDate);

  const handlePaymentPayload = () => {
    const apiPaymentType: CreateBookingPayload['paymentType'] = isPartial ? 'Partial' : 'FullPayment';

    if (selectedStalls.length === 0 || !selectedCompany) return;

    const contactPerson = user?.name || selectedCompany.contactPerson;
    const contactEmail = user?.email || selectedCompany.email;
    const contactPhone = user?.phone || selectedCompany.mobile;

    const payload: CreateBookingPayload = {
      companyId: selectedCompany.id,
      stallIds: selectedStalls.map((s) => s.id),
      exhibitionId: exhibition?.id,
      contactPerson,
      contactEmail,
      contactPhone,
      billingName: selectedCompany.name,
      billingGst: selectedCompany.gstNumber || null,
      billingPan: selectedCompany.panNumber || null,
      billingAddress: selectedCompany.address,
      billingCity: selectedCompany.city,
      billingState: selectedCompany.state,
      billingPinCode: selectedCompany.pinCode,
      billingCountry: selectedCompany.country || 'India',
      ...(user &&
        isAdmin &&
        discountValue > 0 && {
          discountAmount: discountValue,
          discountType: discountMode,
        }),
      paymentType: apiPaymentType,
      percentage: isPartial ? effectivePartialPercent : 100,
    };

    onProceedToPayment(payload);
  };

  const handlePayClick = () => {
    if (!isTermsAccepted) {
      setTermsError(true);
      return;
    }
    setTermsError(false);
    handlePaymentPayload();
  };

  const handleToggleTerms = (checked: boolean) => {
    setIsTermsAccepted(checked);
    if (checked) {
      setTermsError(false);
    }
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

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-4 h-4 text-[#09539b] dark:text-blue-400" />}
            className="text-xs font-bold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs"
          >
            Back to Company Details
          </Button>

          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="text-xs font-bold bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 shadow-2xs"
            >
              Cancel Booking
            </Button>
          )}
        </div>
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
                <LayoutGrid className="w-4 h-4 text-[#09539b] dark:text-blue-400" />
                <h4 className="text-xs font-black text-[#012970] dark:text-slate-100 uppercase tracking-wider">
                  Reserved Booth Allocation ({selectedStalls.length} {selectedStalls.length === 1 ? 'Stall' : 'Stalls'})
                </h4>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-extrabold">
                {Math.round(selectedStalls.reduce((sum, s) => sum + s.areaSqFt, 0))} Sq.Ft Total Area
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {selectedStalls.map((stall) => (
                <div key={stall.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-[68px] h-10 px-1.5 rounded-xl bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/90 dark:border-blue-800/80 flex items-center justify-center text-[#09539b] dark:text-blue-300 font-mono font-bold shrink-0 shadow-2xs text-center">
                      <span className="text-[10px] text-blue-500/70 dark:text-blue-400/60 font-semibold mr-0.5 select-none">#</span>
                      <span className={`leading-none truncate ${
                        stall.stallNumber.length > 6
                          ? 'text-[10px] tracking-tighter'
                          : stall.stallNumber.length > 4
                          ? 'text-[11px] tracking-tight'
                          : 'text-xs'
                      }`}>
                        {stall.stallNumber}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#012970] dark:text-slate-100">Stall {stall.stallNumber}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase">
                          {stall.category}
                        </span>
                      </div>
                      <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                        Modular Shell Scheme • {Math.round(stall.areaSqFt)} Sq.Ft ({Math.round(stall.areaSqFt / 10.764)} Sq.Mtr)
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
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-baseline text-xs">
                  <span className="font-bold text-[#012970] dark:text-slate-200">Full Base Amount:</span>
                  <div className="text-right">
                    <span className="font-mono text-[#09539b] dark:text-blue-400 font-extrabold text-sm block">
                      ₹{basePrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">+18% GST Applicable</span>
                  </div>
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
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-baseline text-xs">
                  <span className="font-bold text-[#012970] dark:text-slate-200">Advance Base ({effectivePartialPercent}%):</span>
                  <div className="text-right">
                    <span className="font-mono text-[#09539b] dark:text-blue-400 font-extrabold text-sm block">
                      ₹{billBaseAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">+18% GST Applicable</span>
                  </div>
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
                    (Advance Base: <b className="font-mono text-[#09539b] dark:text-blue-400 font-extrabold">₹{billBaseAmount.toLocaleString('en-IN')}</b> + 18% GST • Balance Base:{' '}
                    <b className="font-mono text-slate-800 dark:text-slate-200 font-extrabold">₹{unpaidBase.toLocaleString('en-IN')}</b> + 18% GST)
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



        </div>

        {/* RIGHT COLUMN: STICKY FINANCIAL PAYMENT SUMMARY CARD */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white p-4 sm:p-5 rounded-2xl shadow-lg space-y-4 lg:sticky lg:top-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm md:text-base font-bold uppercase tracking-wider text-[#012970] dark:text-blue-200 border-b border-slate-200 dark:border-white/10 pb-3">
              Payment Summary
            </h3>

            <div className="space-y-2.5 md:space-y-3 text-sm md:text-base lg:text-xs xl:text-sm">
              {/* 1. Full Stall Base Rental */}
              <div className="flex justify-between items-baseline gap-3 text-slate-600 dark:text-slate-300">
                <span>Full Stall Base Rental:</span>
                <span className="font-mono tabular-nums text-slate-900 dark:text-white font-bold whitespace-nowrap">
                  ₹{basePrice.toLocaleString('en-IN')}
                </span>
              </div>

              {/* 2. Now Paying Amount */}
              <div className="flex justify-between items-baseline gap-3 text-slate-700 dark:text-slate-200 font-semibold">
                <span>{isPartial ? `Now Paying Amount (${effectivePartialPercent}% Advance):` : 'Now Paying Amount:'}</span>
                <span className="font-mono tabular-nums text-[#09539b] dark:text-blue-400 font-bold whitespace-nowrap">
                  ₹{billBaseAmount.toLocaleString('en-IN')}
                </span>
              </div>

              {/* 3. Discount Option */}
              {isAdmin && (
                <div className="space-y-1.5 py-1.5 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Discount Option</span>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">
                      <button
                        type="button"
                        onClick={() => setDiscountMode('AMOUNT')}
                        className={`px-2.5 py-1 lg:px-2 lg:py-0.5 text-xs lg:text-[10px] xl:text-xs font-bold rounded transition-colors ${
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
                        className={`px-2.5 py-1 lg:px-2 lg:py-0.5 text-xs lg:text-[10px] xl:text-xs font-bold rounded transition-colors ${
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
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs lg:text-[10px] text-slate-400 font-bold">
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
                      className="w-full pl-6 pr-2 py-2 lg:py-1 text-base lg:text-xs xl:text-sm text-right font-mono font-bold rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9cc542]"
                    />
                  </div>

                  {discountAmount > 0 && (
                    <div className="space-y-1.5 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex justify-between items-center gap-3 text-xs md:text-sm lg:text-[11px] xl:text-xs text-emerald-600 dark:text-emerald-400">
                        <span className="flex items-center gap-1 font-semibold">
                          <Tag className="w-3.5 h-3.5" />
                          Discount Savings
                        </span>
                        <span className="font-mono tabular-nums font-bold whitespace-nowrap">
                          −₹{discountAmount.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* 4. Reduced Final Amount */}
                      <div className="flex justify-between items-center gap-3 px-2.5 py-2 lg:py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                        <div className="flex flex-col">
                          <span className="text-xs md:text-sm lg:text-[11px] xl:text-xs font-bold text-slate-800 dark:text-slate-100 tracking-wide">
                            Reduced Final Amount
                          </span>
                          <span className="text-[10px] md:text-xs lg:text-[9px] xl:text-[10px] text-slate-500 dark:text-slate-400">
                            (Taxable Base)
                          </span>
                        </div>
                        <span className="text-sm md:text-base lg:text-xs xl:text-sm font-mono tabular-nums font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          ₹{discountedAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. CGST (9%), SGST (9%), and Total GST (18%) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between items-baseline gap-3">
                  <span>CGST (9%):</span>
                  <span className="font-mono tabular-nums text-slate-900 dark:text-white font-medium whitespace-nowrap">
                    ₹{cgst.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-baseline gap-3">
                  <span>SGST (9%):</span>
                  <span className="font-mono tabular-nums text-slate-900 dark:text-white font-medium whitespace-nowrap">
                    ₹{sgst.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-baseline gap-3 font-semibold text-slate-800 dark:text-slate-200 pt-0.5 border-t border-slate-100 dark:border-slate-800">
                  <span>Total GST (18%):</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    ₹{totalGst.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* 6. Total Amount Payable Today */}
              <div className="flex justify-between items-baseline gap-3 border-t border-slate-200 dark:border-white/10 pt-2 font-bold text-slate-800 dark:text-slate-100">
                <span className="text-base md:text-lg lg:text-sm xl:text-base">
                  {isPartial ? `Total Payable Today (${effectivePartialPercent}%):` : 'Total Amount Payable Today:'}
                </span>
                <span className="font-mono tabular-nums text-base md:text-lg lg:text-base xl:text-lg text-[#012970] dark:text-[#9cc542] whitespace-nowrap">
                  ₹{payableToday.toLocaleString('en-IN')}
                </span>
              </div>

              {isPartial && (
                <>
                  <div className="flex justify-between items-baseline gap-3 text-xs md:text-sm lg:text-[11px] xl:text-xs text-amber-700 dark:text-amber-200 pt-1 border-t border-slate-100 dark:border-white/5">
                    <span>Remaining Balance Due:</span>
                    <span className="font-mono tabular-nums font-bold whitespace-nowrap">
                      ₹{remainingBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[11px] md:text-xs lg:text-[10px] xl:text-[11px] text-amber-600 dark:text-amber-300 font-medium italic pt-0.5">
                    Due 15 days before event ({formattedDeadline})
                  </p>
                </>
              )}
            </div>

            {/* Action Buttons & Terms Agreement */}
            <div className="space-y-3 pt-2">
              {isPaymentModalDismissed && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-1.5 text-left">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Payment window was closed or cancelled</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300/80 leading-relaxed">
                    Your stall reservation hold is temporarily maintained. You can review your details and retry payment, or cancel this booking to immediately release the stall(s).
                  </p>
                  {onCancelBookingAndRelease && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={onCancelBookingAndRelease}
                        className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 underline cursor-pointer"
                      >
                        Cancel Booking &amp; Release Stalls
                      </button>
                    </div>
                  )}
                </div>
              )}

              {termsError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>Please agree to the Terms &amp; Conditions to proceed with payment.</span>
                </div>
              )}

              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={payableToday <= 0}
                className="w-full text-sm font-extrabold bg-[#9cc542] hover:bg-[#82aa30] text-[#012970] shadow-md hover:shadow-lg border-none py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handlePayClick}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {payableToday <= 0 ? 'No Payment Required' : `Pay ₹${payableToday.toLocaleString('en-IN')} Now`}
              </Button>

              {/* Compact & Professional Terms Agreement Checkbox */}
              <div
                onClick={() => handleToggleTerms(!isTermsAccepted)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                  termsError
                    ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-400/20'
                    : isTermsAccepted
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  id="termsAccepted"
                  checked={isTermsAccepted}
                  onChange={(e) => handleToggleTerms(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 mt-0.5 rounded text-[#09539b] border-slate-300 dark:border-slate-600 focus:ring-[#09539b] cursor-pointer shrink-0"
                />
                <label htmlFor="termsAccepted" className="text-slate-600 dark:text-slate-300 text-[11.5px] leading-relaxed cursor-pointer select-none">
                  I have reviewed the booking details and accept the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTermsModalOpen(true);
                    }}
                    className="text-[#09539b] dark:text-blue-400 font-semibold underline hover:text-[#012970] cursor-pointer"
                  >
                    Exhibition Terms &amp; Conditions
                  </button>{' '}
                  and booth allocation rules.
                </label>
              </div>

              {onCancelBookingAndRelease && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={onCancelBookingAndRelease}
                    className="text-[11px] font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Cancel Booking &amp; Free Stalls
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <TermsAndConditionsModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} />
    </div>
  );
};
