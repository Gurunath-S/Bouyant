import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { stallService } from '../../../services/stalls/stallService';
import { companyService } from '../../../services/companies/companyService';
import { bookingService } from '../../../services/bookings/bookingService';
import { paymentService } from '../../../services/payments/paymentService';
import { useAuthStore } from '../../../stores/authStore';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { Exhibition, Stall, Company, Booking, User } from '../../../types';
import { FloorPlanLayoutData } from '../../../types/floorPlanStudio';
import { Button } from '../../../components/ui/Button';
import { formatDisplayDate } from '../../../utils/date';
import { ArrowLeft, Check } from 'lucide-react';
import type { CreateBookingPayload } from '../../../services/bookings/bookingService';
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
  const { user, setUser, setTokens } = useAuthStore();
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
  const [razorpayOrderInfo, setRazorpayOrderInfo] = useState<{
    razorpayOrderId: string;
    razorpayKeyId: string;
    amount: number;
    currency: string;
  } | null>(null);
  const [pendingUserAuth, setPendingUserAuth] = useState<{
    user: User;
    tokens?: { accessToken: string; refreshToken?: string };
  } | null>(null);
  const [paymentStatusState, setPaymentStatusState] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [stallHoldError, setStallHoldError] = useState('');
  const [layoutData, setLayoutData] = useState<FloorPlanLayoutData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 15-Minute Hold Timer & Expiration Popup State
  const [remainingSeconds, setRemainingSeconds] = useState<number>(900); // 15 minutes = 900s
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState<boolean>(false);

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
      defaultDeadline.setHours(23, 59, 59, 999);
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

  // Reset scroll & body overflow lock when changing wizard steps
  useEffect(() => {
    setIsFullscreen(false);
    document.body.style.overflow = 'unset';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

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

  // Start Silent Hold Timer when user advances to Step 2, 3, or 4
  useEffect(() => {
    if (selectedStallIds.length > 0 && (currentStep === 2 || currentStep === 3 || currentStep === 4)) {
      if (!isTimerActive && remainingSeconds > 0) {
        setIsTimerActive(true);
      }
    } else if (currentStep === 1 || currentStep === 5) {
      setIsTimerActive(false);
    }
  }, [currentStep, selectedStallIds.length, isTimerActive, remainingSeconds]);

  // Timer Tick Interval (Silent 15-minute expiration trigger)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerActive(false);
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

  const handleRestartBookingFromExpired = () => {
    setIsExtensionModalOpen(false);
    clearStallSelection();
    setCurrentStep(1);
    setRemainingSeconds(900);
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
      const tokens = res.tokens;
      const tempPass = res.temporaryPassword;

      if (createdComp && createdComp.id) {
        if (createdComp.regNo) setAssignedRegNo(createdComp.regNo);
        setCompanies((prev) => [...prev.filter((c) => c.id !== createdComp.id), createdComp]);
        setSelectedCompany(createdComp);

	        if (createdUser) {
            const authenticatedUser = {
              id: createdUser.id,
              email: createdUser.email,
              username: createdUser.username,
              name: createdUser.name,
              phone: createdUser.phone,
              role: createdUser.role,
              companyId: createdComp.id,
              company: createdComp,
              createdAt: createdUser.createdAt || new Date().toISOString(),
            };

	          setPendingUserAuth({
	            user: authenticatedUser,
	            tokens: tokens,
	          });
	        }
        if (tempPass) {
          setGeneratedOTP(tempPass);
        }
      }
      setCurrentStep(3);
    } catch (err: any) {
      console.error('Backend company creation error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to register company details. Please try again.';
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 3 -> Step 4
  const handleProceedToPayment = async (payload: CreateBookingPayload) => {
    if (selectedStallIds.length === 0 || !selectedCompany) return;

    try {
      setLoading(true);

      const tokenToUse = pendingUserAuth?.tokens?.accessToken;
      const response = await bookingService.createBooking(
        payload,
        tokenToUse ? { token: tokenToUse } : undefined
      );
      if (!response || !response.razorpayOrderId) {
        throw new Error('Failed to generate Razorpay payment order from backend.');
      }

	      const keyId = response.razorpayKeyId;
	      if (!keyId) {
	        throw new Error('Payment gateway key is missing from backend response.');
	      }
      setRazorpayOrderInfo({
        razorpayOrderId: response.razorpayOrderId,
        razorpayKeyId: keyId,
        amount: response.amount,
        currency: response.currency || 'INR',
      });

      const selectedStallsObj = stalls.filter((s) => selectedStallIds.includes(s.id));
      const calculatedBasePrice = selectedStallsObj.reduce((sum, s) => sum + Number(s.price), 0);
      const calculatedTaxAmount = Math.round(calculatedBasePrice * 0.18);
      const calculatedGrandTotal = calculatedBasePrice + calculatedTaxAmount;

      const realBooking = response.booking || {
        id: response.bookingId,
        bookingReference: response.bookingReference || ('BKG-2026-' + Math.floor(1000 + Math.random() * 9000)),
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
          bookingId: response.bookingId,
          stallId: s.id,
          price: s.price,
          stall: s,
        })),
        company: selectedCompany,
        exhibition: exhibition || undefined,
      };

	      setCreatedBooking(realBooking as Booking);

      // Directly launch Razorpay Gateway Modal from Step 3
      await executeRazorpayGateway(realBooking as Booking, {
        razorpayOrderId: response.razorpayOrderId,
        razorpayKeyId: keyId,
        amount: response.amount,
        currency: response.currency || 'INR',
      });
    } catch (err: any) {
      console.error('Booking order creation error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Booking order initialization failed.';
      alert('Payment Order Error: ' + errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Launch Razorpay Payment Gateway directly
  const executeRazorpayGateway = async (booking: Booking, orderInfo: any) => {
    // Ensure Razorpay SDK script is loaded
    if (typeof (window as any).Razorpay === 'undefined') {
      alert('Razorpay SDK is loading. Please check your internet connection or try again in a moment.');
      return;
    }

    const options: any = {
	      key: orderInfo.razorpayKeyId,
      amount: orderInfo.amount,
      currency: orderInfo.currency || 'INR',
      name: 'Buoyant Media',
      description: `Stall Reservation Booking — Ref: ${booking.bookingReference}`,
      order_id: orderInfo.razorpayOrderId,
      handler: async function (paymentResponse: any) {
        setPaymentStatusState('PROCESSING');
        setCurrentStep(4); // Move to Confirmation & Pass view

        try {
          if (booking.id && !booking.id.startsWith('bkg_') && paymentResponse.razorpay_signature) {
            await paymentService.verifyPayment({
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            });
          } else {
            await new Promise((res) => setTimeout(res, 1200));
          }

          if (!generatedOTP) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            setGeneratedOTP(otp);
          }

          // Activate user login session AFTER successful payment verification
          if (pendingUserAuth) {
            if (pendingUserAuth.tokens?.accessToken) {
              setTokens(pendingUserAuth.tokens.accessToken, pendingUserAuth.tokens.refreshToken);
            }
            setUser(pendingUserAuth.user);
          }

          setPaymentStatusState('SUCCESS');
        } catch (err: any) {
          setPaymentStatusState('FAILED');
          setPaymentErrorMessage(err.response?.data?.message || err.message || 'Razorpay payment verification failed.');
        }
      },
      prefill: {
        name: selectedCompany?.contactPerson || user?.name || 'Exhibitor',
        email: selectedCompany?.email || user?.email || 'exhibitor@buoyantmedia.com',
        contact: selectedCompany?.mobile || user?.phone || '9876543210',
      },
      theme: {
        color: '#012970',
      },
      modal: {
        ondismiss: function () {
          console.log('Razorpay payment modal closed by user');
        },
      },
    };

    try {
      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.open();
    } catch (err: any) {
      console.error('Failed to open Razorpay modal:', err);
      alert('Unable to launch Razorpay popup: ' + err.message);
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

          </div>

          {/* Stepper Tabs (Active during wizard steps 1, 2, & 3) */}
          {currentStep <= 3 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs font-extrabold text-slate-600 dark:text-slate-300 shadow-2xs overflow-x-auto gap-2">
              {[
                { num: 1, label: 'Stall Selection' },
                { num: 2, label: 'Company Details' },
                { num: 3, label: 'Review & Pay' },
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
          )}
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

      {/* STEP 3: REVIEW & PAY */}
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

      {/* STEP 4: BOOKING CONFIRMATION & PASS RECEIPT */}
      {currentStep === 4 && (
        <Step5PassCredentials
          paymentStatus={paymentStatusState}
          paymentErrorMessage={paymentErrorMessage}
          createdBooking={createdBooking}
          selectedCompany={selectedCompany}
          selectedStalls={selectedStallsObj}
          exhibition={exhibition}
          user={user}
          generatedOTP={generatedOTP}
          onRetryPayment={() => setCurrentStep(3)}
        />
      )}

      {/* Timer Timeout Popup Modal */}
      <TimerExtensionModal
        isOpen={isExtensionModalOpen}
        onRestartBooking={handleRestartBookingFromExpired}
      />
    </div>
  );
};
