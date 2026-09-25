import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { stallService } from '../../../services/stalls/stallService';
import { companyService } from '../../../services/companies/companyService';
import { bookingService } from '../../../services/bookings/bookingService';
import { paymentService } from '../../../services/payments/paymentService';
import { useAuthStore } from '../../../stores/authStore';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { Exhibition, Stall, Company, Booking } from '../../../types';
import { FloorPlanLayoutData } from '../../../types/floorPlanStudio';
import { Button } from '../../../components/ui/Button';
import { formatDisplayDate } from '../../../utils/date';
import { ArrowLeft, Check } from 'lucide-react';

import { Step1StallSelection } from '../components/wizard/Step1StallSelection';
import { Step2CompanyDetails, CompanyFormData } from '../components/wizard/Step2CompanyDetails';
import { Step3TaxAuditBill } from '../components/wizard/Step3TaxAuditBill';
import { Step4PaymentCheckout } from '../components/wizard/Step4PaymentCheckout';
import { Step5PassCredentials } from '../components/wizard/Step5PassCredentials';
import { TimerExtensionModal } from '../../../components/ui/TimerExtensionModal';
import { Clock, RefreshCw } from 'lucide-react';

export const BookingWizardPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const { selectedStallIds, clearStallSelection, toggleStallSelection } = useFloorPlanStore();

  // Wizard Stepper (1 = Stall, 2 = Company, 3 = Tax Bill, 4 = Payment, 5 = Pass & Credentials)
  const [currentStep, setCurrentStep] = useState<number>(1);

  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(user?.company || null);
  const [assignedRegNo, setAssignedRegNo] = useState<string>('');

  const [paymentType, setPaymentType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [partialPercentage, setPartialPercentage] = useState<number>(50);
  const [isTermsAccepted, setIsTermsAccepted] = useState(true);

  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [paymentStatusState, setPaymentStatusState] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [stallHoldError, setStallHoldError] = useState('');
  const [layoutData, setLayoutData] = useState<FloorPlanLayoutData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 10-Minute Hold Timer & Extension Popup State
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600); // 10 minutes = 600s
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState<boolean>(false);
  const [timerModalType, setTimerModalType] = useState<'EXTENSION_PROMPT' | 'EXPIRED_TIMEOUT'>('EXTENSION_PROMPT');
  const [hasExtendedOnce, setHasExtendedOnce] = useState<boolean>(false);

  const isBookingClosed = React.useMemo(() => {
    if (!exhibition) return false;
    if (exhibition.status === 'COMPLETED' || exhibition.status === 'CANCELLED' || exhibition.status === 'DRAFT') {
      return true;
    }
    const now = new Date();
    if (exhibition.bookingEndDate && now > new Date(exhibition.bookingEndDate)) {
      return true;
    }
    if (!exhibition.bookingEndDate && exhibition.startDate) {
      const defaultDeadline = new Date(new Date(exhibition.startDate).getTime() - 15 * 24 * 60 * 60 * 1000);
      if (now > defaultDeadline) return true;
    }
    if (exhibition.endDate && now > new Date(exhibition.endDate)) {
      return true;
    }
    return false;
  }, [exhibition]);

  useEffect(() => {
    if (slug) loadInitialData();
  }, [slug]);

  useEffect(() => {
    const stallIdsParam = searchParams.get('stallIds');
    if (stallIdsParam) {
      clearStallSelection();
      stallIdsParam.split(',').forEach((id) => {
        const stallObj = stalls.find((s) => s.id === id);
        if (stallObj) toggleStallSelection(stallObj);
      });
    }
  }, [searchParams, stalls, clearStallSelection, toggleStallSelection]);

  // Start Hold Countdown Timer when user advances to Step 2, 3, or 4
  useEffect(() => {
    if (selectedStallIds.length > 0 && (currentStep === 2 || currentStep === 3 || currentStep === 4)) {
      if (!isTimerActive && remainingSeconds > 0) {
        setIsTimerActive(true);
      }
    } else if (currentStep === 1 || currentStep === 5) {
      setIsTimerActive(false);
    }
  }, [currentStep, selectedStallIds.length, isTimerActive, remainingSeconds]);

  // Timer Tick Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerActive(false);
            setTimerModalType('EXPIRED_TIMEOUT');
            setIsExtensionModalOpen(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, remainingSeconds]);

  // Trigger 60-Second Prompt Warning Popup if not extended yet
  useEffect(() => {
    if (remainingSeconds === 60 && isTimerActive && !hasExtendedOnce) {
      setTimerModalType('EXTENSION_PROMPT');
      setIsExtensionModalOpen(true);
    }
  }, [remainingSeconds, isTimerActive, hasExtendedOnce]);

  const handleExtendHoldTimer = () => {
    setRemainingSeconds(300); // Add +5 minutes (300s)
    setHasExtendedOnce(true);
    setIsExtensionModalOpen(false);
    setIsTimerActive(true);
  };

  const handleCancelBookingFromTimer = () => {
    setIsTimerActive(false);
    setIsExtensionModalOpen(false);
    clearStallSelection();
    setCurrentStep(1);
    setRemainingSeconds(600);
    setHasExtendedOnce(false);
  };

  const handleRestartBookingFromExpired = () => {
    setIsExtensionModalOpen(false);
    clearStallSelection();
    setCurrentStep(1);
    setRemainingSeconds(600);
    setHasExtendedOnce(false);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const expo = await exhibitionService.getExhibitionBySlug(slug!);
      setExhibition(expo);

      if (expo.floorPlans && expo.floorPlans.length > 0) {
        const fp = expo.floorPlans[0];
        if (fp.backgroundUrl) {
          try {
            setLayoutData(JSON.parse(fp.backgroundUrl));
          } catch (e) {
            console.warn('Failed to parse floor plan layout in booking wizard', e);
          }
        }
        const stallsData = fp.stalls && fp.stalls.length > 0 ? fp.stalls : await stallService.getStallsByFloorPlan(fp.id);
        setStalls(stallsData || []);
      } else {
        setStalls([]);
      }

      if (user) {
        const comps = await companyService.getMyCompanies();
        setCompanies(comps || []);
        if (comps && comps.length > 0 && !selectedCompany) {
          setSelectedCompany(comps[0]);
          if (comps[0].regNo) setAssignedRegNo(comps[0].regNo);
        }
      }
    } catch (err) {
      console.error('Failed to load booking wizard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Step 1 -> Step 2
  const handleHoldSelectedStall = async () => {
    if (isBookingClosed) {
      setStallHoldError('Stall bookings for this exhibition are closed as the cut-off date has passed.');
      return;
    }
    if (selectedStallIds.length === 0) return;
    try {
      setStallHoldError('');
      if (user) {
        await Promise.all(selectedStallIds.map((id) => stallService.holdStall(id)));
      }
      setCurrentStep(2);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'This stall is temporarily held. Please select another available green stall.';
      setStallHoldError(msg);
    }
  };

  // Step 2 -> Step 3
  const onSubmitCompanyForm = async (data: CompanyFormData) => {
    const eventYear = exhibition?.startDate ? new Date(exhibition.startDate).getFullYear().toString().slice(-2) : '26';

    if (user && selectedCompany && selectedCompany.gstNumber === data.gstNumber) {
      if (selectedCompany.regNo) setAssignedRegNo(selectedCompany.regNo);
      setCurrentStep(3);
      return;
    }

    try {
      setLoading(true);
      const res = await companyService.createCompany({
        ...data,
        regNo: assignedRegNo || undefined,
        edition: exhibition?.edition,
        eventCode: exhibition?.eventCode,
        spcode: exhibition?.spcode,
        year: eventYear,
        pinCode: data.pinCode,
        country: data.country || 'India',
      } as any);

      const createdComp = res.company || res;
      const createdUser = res.user;
      const tempPass = res.temporaryPassword;

      if (createdComp && createdComp.id) {
        if (createdComp.regNo) setAssignedRegNo(createdComp.regNo);
        setCompanies((prev) => [...prev.filter((c) => c.id !== createdComp.id), createdComp]);
        setSelectedCompany(createdComp);

        if (createdUser) {
          setUser({
            id: createdUser.id,
            email: createdUser.email,
            username: createdUser.username,
            name: createdUser.name,
            phone: createdUser.phone,
            role: createdUser.role,
            companyId: createdComp.id,
            company: createdComp,
            createdAt: createdUser.createdAt || new Date().toISOString(),
          });
        }
        if (tempPass) {
          setGeneratedOTP(tempPass);
        }
      }
    } catch (err: any) {
      console.warn('Backend company save note:', err.response?.data?.message || err);
      const regToUse = assignedRegNo || `${exhibition?.edition || '01'}/${eventYear}/${exhibition?.eventCode || 'EX'}/01`;
      const mockGuestComp: Company = {
        id: 'guest_comp_' + Date.now(),
        companyCode: 'CMP-GUEST-' + Math.floor(1000 + Math.random() * 9000),
        regNo: regToUse,
        name: data.name,
        contactPerson: data.contactPerson,
        designation: data.designation,
        mobile: data.mobile,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        pinCode: data.pinCode,
        country: data.country || 'India',
        gstNumber: data.gstNumber,
        panNumber: data.panNumber,
        tanNumber: data.tanNumber,
        industry: data.industry,
        category: data.category,
        website: data.website,
        createdAt: new Date().toISOString(),
      };
      setAssignedRegNo(regToUse);
      setSelectedCompany(mockGuestComp);
    } finally {
      setLoading(false);
    }

    setCurrentStep(3);
  };

  // Step 3 -> Step 4
  const handleProceedToPayment = async () => {
    if (selectedStallIds.length === 0 || !selectedCompany) return;
    try {
      setLoading(true);
      let realBooking: Booking | null = null;
      if (user && user.id && !user.id.startsWith('guest_')) {
        try {
          realBooking = await bookingService.createBooking({
            exhibitionId: exhibition?.id,
            stallIds: selectedStallIds,
            companyId: selectedCompany.id,
          });
        } catch (e) {
          console.warn('Backend booking creation note:', e);
        }
      }

      if (!realBooking) {
        const selectedStallsObj = stalls.filter((s) => selectedStallIds.includes(s.id));
        const calculatedBasePrice = selectedStallsObj.reduce((sum, s) => sum + Number(s.price), 0);
        const calculatedTaxAmount = Math.round(calculatedBasePrice * 0.18);
        const calculatedGrandTotal = calculatedBasePrice + calculatedTaxAmount;

        realBooking = {
          id: 'bkg_' + Date.now(),
          bookingReference: 'BKG-2026-' + Math.floor(1000 + Math.random() * 9000),
          userId: user?.id || 'guest_user_id',
          companyId: selectedCompany.id,
          exhibitionId: exhibition?.id || 'expo_id',
          status: 'HELD',
          totalAmount: calculatedBasePrice,
          taxAmount: calculatedTaxAmount,
          grandTotal: calculatedGrandTotal,
          createdAt: new Date().toISOString(),
          stalls: selectedStallsObj.map((s) => ({
            id: 'ms_' + Math.random(),
            bookingId: 'bkg_mock',
            stallId: s.id,
            price: s.price,
            stall: s,
          })),
          company: selectedCompany,
          exhibition: exhibition || undefined,
        };
      }

      setCreatedBooking(realBooking);
      setCurrentStep(4);
    } catch (err: any) {
      alert('Booking initialization failed.');
    } finally {
      setLoading(false);
    }
  };

  // Step 4 -> Step 5
  const handleExecuteRazorpayPayment = async (shouldFail = false) => {
    if (!createdBooking) return;
    try {
      setCurrentStep(5);
      setPaymentStatusState('PROCESSING');

      if (createdBooking.id && !createdBooking.id.startsWith('bkg_')) {
        try {
          await paymentService.verifyPayment({
            bookingId: createdBooking.id,
            action: shouldFail ? 'FAILED' : 'SUCCESS',
            paymentMethod: 'RAZORPAY_CARD',
          });
        } catch (err: any) {
          console.warn('Backend payment verification note:', err);
        }
      } else {
        await new Promise((res) => setTimeout(res, 1500));
      }

      if (shouldFail) {
        setPaymentStatusState('FAILED');
        setPaymentErrorMessage('Razorpay Transaction Declined: Card Authorization Failure (Code: RZP_PAY_DECLINED).');
        return;
      }

      if (!generatedOTP) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOTP(otp);
      }
      setPaymentStatusState('SUCCESS');
    } catch (err: any) {
      setPaymentStatusState('FAILED');
      setPaymentErrorMessage(err.message || 'Razorpay processing error.');
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 dark:text-slate-400 font-medium animate-pulse space-y-3">
        <div className="w-12 h-12 border-4 border-[#09539b] dark:border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold uppercase tracking-wider text-[#012970] dark:text-slate-200">Initializing Exhibition Booking Wizard...</p>
      </div>
    );
  }

  if (!exhibition) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 max-w-xl mx-auto my-12 shadow-xs">
        <h3 className="text-lg font-bold text-[#012970] dark:text-slate-100">Exhibition Event Not Found</h3>
        <Button variant="outline" onClick={() => navigate('/exhibitions')}>
          Back to Exhibition Catalog
        </Button>
      </div>
    );
  }

  const selectedStallsObj = stalls.filter((s) => selectedStallIds.includes(s.id));
  const basePrice = selectedStallsObj.reduce((sum, s) => sum + Number(s.price), 0);
  const effectivePartialPercent = Math.max(50, Math.min(99, partialPercentage));
  const payableToday = paymentType === 'PARTIAL' ? Math.round(basePrice * (effectivePartialPercent / 100)) : basePrice;
  const remainingBalance = paymentType === 'PARTIAL' ? basePrice - payableToday : 0;
  const eventStartDate = new Date(exhibition.startDate);
  const deadlineDate = new Date(eventStartDate.getTime() - 15 * 24 * 60 * 60 * 1000);
  const formattedDeadline = formatDisplayDate(deadlineDate);

  return (
    <div
      className={`mx-auto font-sans transition-all duration-300 ${
        currentStep === 1
          ? isFullscreen
            ? 'fixed inset-0 z-50 bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 flex flex-col m-0 w-screen h-screen'
            : 'w-full max-w-[1200px] mx-auto px-2 sm:px-4 pb-6 space-y-3'
          : 'max-w-5xl mx-auto px-4 pb-16 space-y-8'
      }`}
    >
      {/* Header & Stepper */}
      {!isFullscreen && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 gap-3">
            <div>
              <button
                onClick={() => navigate(`/exhibitions/${slug}`)}
                className="text-xs font-bold text-[#09539b] dark:text-blue-400 hover:underline flex items-center gap-1 mb-0.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Exhibition Profile
              </button>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#012970] dark:text-slate-100 leading-tight">
                Stall Reservation — {exhibition.title}
              </h1>
            </div>

            {/* Right-Aligned Theme-Matched Stall Hold Timer Widget (Shown during steps 2, 3, & 4) */}
            {selectedStallIds.length > 0 && (currentStep === 2 || currentStep === 3 || currentStep === 4) && (
              <div className="bg-white dark:bg-slate-900 border border-[#0E8074]/30 dark:border-slate-700 rounded-xl p-2 px-3.5 flex items-center gap-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E4F5F2] dark:bg-emerald-950/80 border border-[#0E8074]/30 text-[#0E8074] dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold text-[#0E8074] dark:text-emerald-400 uppercase tracking-wider block leading-none">
                      Hold Lock
                    </span>
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 font-bold leading-tight">
                      Stall {selectedStallsObj.map((s) => s.stallNumber).join(', ')}
                    </span>
                  </div>
                </div>

                <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5" />

                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <span className="text-[8px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-bold leading-none">Time Left</span>
                    <span className={`text-base font-black font-mono tracking-tight leading-tight ${remainingSeconds <= 120 ? 'text-red-600 dark:text-red-400 animate-bounce' : 'text-[#012970] dark:text-blue-400'}`}>
                      {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  {/* Dev / Test Fast-Forward Button to test timeout popup */}
                  <button
                    onClick={() => {
                      setRemainingSeconds(5); // Fast forward to 5 seconds remaining to test run out!
                    }}
                    title="DEV TEST: Fast Forward Timer to 5s"
                    className="text-[10px] bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold py-1 px-2 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    ⚡ Fast 5s
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Tabs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs font-extrabold text-slate-600 dark:text-slate-300 shadow-2xs overflow-x-auto gap-2">
            {[
              { num: 1, label: 'Stall Selection' },
              { num: 2, label: 'Company Details' },
              { num: 3, label: 'Tax Audit & Bill' },
              { num: 4, label: 'Razorpay Payment' },
              { num: 5, label: 'Pass & Credentials' },
            ].map((step, idx, arr) => {
              const isCompleted = currentStep > step.num;
              const isCurrent = currentStep === step.num;
              return (
                <React.Fragment key={step.num}>
                  <div
                    className={`flex items-center gap-2 whitespace-nowrap transition-colors ${
                      isCurrent
                        ? 'text-[#09539b] dark:text-blue-400'
                        : isCompleted
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all ${
                        isCompleted
                          ? 'bg-[#9cc542] text-[#012970] shadow-2xs'
                          : isCurrent
                          ? 'bg-[#09539b] text-white shadow-2xs ring-2 ring-[#09539b]/20 dark:ring-blue-400/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.num}
                    </span>
                    <span>{step.label}</span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div
                      className={`h-0.5 min-w-[16px] sm:min-w-[28px] flex-1 mx-1.5 transition-colors ${
                        currentStep > step.num
                          ? 'bg-[#9cc542]'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 1: STALL SELECTION */}
      {currentStep === 1 && (
        <Step1StallSelection
          exhibition={exhibition}
          stalls={stalls}
          layoutData={layoutData}
          selectedStallIds={selectedStallIds}
          toggleStallSelection={toggleStallSelection}
          clearStallSelection={clearStallSelection}
          stallHoldError={stallHoldError}
          isBookingClosed={isBookingClosed}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
          onProceed={handleHoldSelectedStall}
        />
      )}

      {/* STEP 2: COMPANY DETAILS */}
      {currentStep === 2 && (
        <Step2CompanyDetails
          user={user}
          exhibition={exhibition}
          selectedStalls={selectedStallsObj}
          companies={companies}
          selectedCompany={selectedCompany}
          assignedRegNo={assignedRegNo}
          onSelectCompany={(c) => {
            setSelectedCompany(c);
            if (c.regNo) setAssignedRegNo(c.regNo);
          }}
          onSubmitCompanyForm={onSubmitCompanyForm}
          onBack={() => setCurrentStep(1)}
          onContinueWithSelectedCompany={() => setCurrentStep(3)}
        />
      )}

      {/* STEP 3: TAX AUDIT & BILL */}
      {currentStep === 3 && (
        <Step3TaxAuditBill
          user={user}
          exhibition={exhibition}
          selectedStalls={selectedStallsObj}
          selectedCompany={selectedCompany}
          paymentType={paymentType}
          setPaymentType={setPaymentType}
          partialPercentage={partialPercentage}
          setPartialPercentage={setPartialPercentage}
          isTermsAccepted={isTermsAccepted}
          setIsTermsAccepted={setIsTermsAccepted}
          onProceedToPayment={handleProceedToPayment}
          onBack={() => setCurrentStep(2)}
        />
      )}

      {/* STEP 4: PAYMENT CHECKOUT */}
      {currentStep === 4 && createdBooking && (
        <Step4PaymentCheckout
          booking={createdBooking}
          paymentType={paymentType}
          payableToday={payableToday}
          remainingBalance={remainingBalance}
          effectivePartialPercent={effectivePartialPercent}
          formattedDeadline={formattedDeadline}
          onExecutePayment={handleExecuteRazorpayPayment}
          onBack={() => setCurrentStep(3)}
        />
      )}

      {/* STEP 5: PASS & CREDENTIALS */}
      {currentStep === 5 && (
        <Step5PassCredentials
          paymentStatus={paymentStatusState}
          paymentErrorMessage={paymentErrorMessage}
          createdBooking={createdBooking}
          selectedCompany={selectedCompany}
          selectedStalls={selectedStallsObj}
          exhibition={exhibition}
          user={user}
          generatedOTP={generatedOTP}
          onRetryPayment={() => setCurrentStep(4)}
        />
      )}

      {/* Timer Extension & Timeout Popup Modal */}
      <TimerExtensionModal
        isOpen={isExtensionModalOpen}
        type={timerModalType}
        remainingSeconds={remainingSeconds}
        onExtendHold={handleExtendHoldTimer}
        onCancelBooking={handleCancelBookingFromTimer}
        onRestartBooking={handleRestartBookingFromExpired}
      />
    </div>
  );
};
