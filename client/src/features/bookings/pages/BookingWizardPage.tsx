import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, useBlocker } from 'react-router-dom';
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
import { BackButton } from '../../../components/ui/BackButton';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Check, AlertTriangle } from 'lucide-react';
import type { CreateBookingPayload } from '../../../services/bookings/bookingService';
import { Step1StallSelection } from '../components/wizard/Step1StallSelection';
import { Step2CompanyDetails, CompanyFormData } from '../components/wizard/Step2CompanyDetails';
import { Step3TaxAuditBill } from '../components/wizard/Step3TaxAuditBill';
import { Step5PassCredentials } from '../components/wizard/Step5PassCredentials';
import { TimerExtensionModal } from '../../../components/ui/TimerExtensionModal';
import { AccountExistsLoginModal } from '../components/wizard/AccountExistsLoginModal';
import { showAlert } from '../../../stores/dialogStore';
import { normalizeCountryName } from '../../../data/indianStatesCities';

function generateFallbackBookingRef() {
  return 'BKG-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
}

function generateTempStallId() {
  return 'ms_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

export const BookingWizardPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const location = useLocation();
  const fromReferrer = (location.state as any)?.from;
  const fromReferrerLabel = (location.state as any)?.fromLabel;
  const preselectedCompany = (location.state as any)?.preselectedCompany;
  const preselectedCompanyId = (location.state as any)?.preselectedCompanyId;

  // Admin controls (e.g. discount) are ONLY shown when an admin/staff user opens the
  // wizard intentionally from the admin dashboard (identified by navigation state).
  // This ensures CLIENT users and anonymous guests NEVER see admin-only UI, even if
  // an admin session is active in the same browser.
  const isAdminBookingContext = Boolean(
    user &&
    (user.role === 'ADMIN' || user.role === 'SUPERADMIN' || user.role === 'STAFF') &&
    (fromReferrer?.includes('/admin') || fromReferrer?.includes('/dashboard') || (location.state as any)?.adminBooking === true)
  );

  const {
    selectedStallIds,
    setHeldStallIds,
    setConflicts,
    clearConflicts,
    clearStallSelection,
    toggleStallSelection,
  } = useFloorPlanStore();

  // Wizard Stepper (1 = Stall, 2 = Company, 3 = Tax Bill, 4 = Payment, 5 = Pass & Credentials)
  const [currentStep, setCurrentStep] = useState<number>(1);

  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  // Start with clean company selection so new bookings never accidentally inherit another user's profile
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [assignedRegNo, setAssignedRegNo] = useState<string>('');

  const [paymentType, setPaymentType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [partialPercentage, setPartialPercentage] = useState<number>(50);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);

  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [_razorpayOrderInfo, setRazorpayOrderInfo] = useState<{
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
  const [isPaymentModalDismissed, setIsPaymentModalDismissed] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [stallHoldError, setStallHoldError] = useState('');
  const [layoutData, setLayoutData] = useState<FloorPlanLayoutData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 15-Minute Hold Timer & Expiration Popup State
  const [remainingSeconds, setRemainingSeconds] = useState<number>(900); // 15 minutes = 900s
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState<boolean>(false);

  // Inline Login Modal state when company registration returns HTTP 409 ACCOUNT_EXISTS
  const [accountExistsModal, setAccountExistsModal] = useState<{
    isOpen: boolean;
    email: string;
    pendingFormData: CompanyFormData | null;
  }>({
    isOpen: false,
    email: '',
    pendingFormData: null,
  });

  // Confirmation Warning Modal for leaving or changing stalls
  const [confirmLeaveModal, setConfirmLeaveModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmButtonText: string;
    targetAction: 'LEAVE_PAGE' | 'BACK_TO_STEP_1';
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmButtonText: 'Yes, Release Stall & Leave',
    targetAction: 'LEAVE_PAGE',
  });
  const [isReleasingHolds, setIsReleasingHolds] = useState(false);

  // Intercept any internal SPA navigation attempt while user has active stall holds in steps 1, 2, or 3
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !isReleasingHolds &&
      useFloorPlanStore.getState().selectedStallIds.length > 0 &&
      currentStep <= 3 &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // Sync React Router blocker state with confirmation warning modal
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setConfirmLeaveModal({
        isOpen: true,
        title: 'Leave Booking Wizard & Release Stalls?',
        description:
          'You currently have active stall reservation holds. If you leave this page, your temporary hold will be cancelled, selected stalls will immediately become available again on the floor plan for other exhibitors, and any entered booking details will be discarded.',
        confirmButtonText: 'Yes, Release Stalls & Leave',
        targetAction: 'LEAVE_PAGE',
      });
    }
  }, [blocker.state]);

  const handleCancelLeaveModal = () => {
    setConfirmLeaveModal((prev) => ({ ...prev, isOpen: false }));
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  };

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

  async function loadInitialData() {
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

      const isPrivileged = Boolean(
        user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN' || user.role === 'STAFF')
      );

      if (user && user.role === 'CLIENT') {
        const comps = await companyService.getMyCompanies();
        setCompanies(comps || []);
      } else if (isPrivileged) {
        try {
          const res = await companyService.listCompanies(1, '', undefined, undefined, 200);
          const allComps = res.data || [];
          setCompanies(allComps);

          if (preselectedCompany) {
            setSelectedCompany(preselectedCompany);
            if (preselectedCompany.regNo) setAssignedRegNo(preselectedCompany.regNo);
          } else if (preselectedCompanyId) {
            const found = allComps.find((c: any) => c.id === preselectedCompanyId);
            if (found) {
              setSelectedCompany(found);
              if (found.regNo) setAssignedRegNo(found.regNo);
            }
          }
        } catch (compErr) {
          console.error('Failed to load registered companies for privileged booking:', compErr);
          setCompanies([]);
        }
      } else {
        setCompanies([]);
        setSelectedCompany(null);
        setAssignedRegNo('');
      }
    } catch (err) {
      console.error('Failed to load booking wizard data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Initialize booking session, preserving preselected company from navigation
  useEffect(() => {
    if (preselectedCompany) {
      setSelectedCompany(preselectedCompany);
      if (preselectedCompany.regNo) setAssignedRegNo(preselectedCompany.regNo);
    } else {
      setSelectedCompany(null);
      setAssignedRegNo('');
    }
    setPendingUserAuth(null);
    setCreatedBooking(null);
  }, [slug]);

  // Warn user if closing tab / reloading page while holding stalls
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (selectedStallIds.length > 0 && currentStep <= 3) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [selectedStallIds.length, currentStep]);

  // If user logs out or switches accounts while wizard is loaded, reset company state
  useEffect(() => {
    if (!user) {
      setCompanies([]);
      setSelectedCompany(null);
      setAssignedRegNo('');
      setPendingUserAuth(null);
    }
  }, [user]);

  useEffect(() => {
    if (slug) loadInitialData();
  }, [slug, user]);

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

  const handleRestartBookingFromExpired = async () => {
    setIsExtensionModalOpen(false);
    try {
      const tokenToUse = pendingUserAuth?.tokens?.accessToken;
      if (createdBooking && createdBooking.id && !createdBooking.id.startsWith('bkg_')) {
        await bookingService.cancelBooking(createdBooking.id, {
          token: tokenToUse,
          reason: 'Hold timer expired',
        });
      }
      await stallService.cancelAllHolds({
        token: tokenToUse,
        stallIds: selectedStallIds,
      });
    } catch (e) {
      console.warn('Failed to cancel user holds on restart', e);
    }
    setCreatedBooking(null);
    setIsPaymentModalDismissed(false);
    clearStallSelection();
    setCurrentStep(1);
    setRemainingSeconds(900);
    await loadInitialData();
  };

  // Step 1 -> Step 2 (Atomic Delta Synchronization)
  const handleHoldSelectedStall = async () => {
    if (isBookingClosed) {
      setStallHoldError('Stall bookings for this exhibition are closed as the cut-off date has passed.');
      return;
    }
    if (selectedStallIds.length === 0) return;
    try {
      setStallHoldError('');
      clearConflicts();

      if (user) {
        const res = await stallService.syncHoldStalls(selectedStallIds);
        if (res && res.heldStallIds) {
          setHeldStallIds(res.heldStallIds);
        }
      }
      setCurrentStep(2);
    } catch (err: any) {
      const conflictData = err.response?.data?.data;
      if (conflictData && conflictData.code === 'STALL_CONFLICT' && conflictData.conflicts) {
        setConflicts(conflictData.conflicts);
        if (conflictData.heldStalls) {
          setHeldStallIds(conflictData.heldStalls.map((s: any) => s.id));
        }
        setStallHoldError('Some selected stalls are no longer available. Please review and remove conflicting stalls.');
      } else {
        const msg = err.response?.data?.message || 'Failed to hold stalls. Please try again.';
        setStallHoldError(msg);
      }
    }
  };

  // User initiates leaving the wizard or cancelling booking
  const handleInitiateLeave = () => {
    if (selectedStallIds.length === 0) {
      if (fromReferrer) {
        navigate(fromReferrer);
      } else {
        navigate(`/exhibitions/${slug}`);
      }
      return;
    }
    setConfirmLeaveModal({
      isOpen: true,
      title: 'Leave Booking Wizard & Release Stalls?',
      description: 'You currently have active stall reservation holds. If you leave this page, your temporary hold will be cancelled, selected stalls will immediately become available again on the floor plan for other exhibitors, and any entered booking details will be discarded.',
      confirmButtonText: 'Yes, Release Stalls & Leave',
      targetAction: 'LEAVE_PAGE',
    });
  };

  // User in Step 2 initiates going back to Step 1 (changing stalls)
  const handleInitiateBackToStep1 = () => {
    if (selectedStallIds.length === 0) {
      setCurrentStep(1);
      return;
    }
    setConfirmLeaveModal({
      isOpen: true,
      title: 'Go Back to Stall Selection?',
      description: 'Going back to the floor plan will release your temporary reservation hold on the selected stall(s). The stalls will immediately become available again for other exhibitors to select, and entered company details will be cleared.',
      confirmButtonText: 'Yes, Release Hold & Go Back',
      targetAction: 'BACK_TO_STEP_1',
    });
  };

  // Confirming the leave/back action in the modal
  const handleExecuteLeaveAction = async () => {
    try {
      setIsReleasingHolds(true);
      const tokenToUse = pendingUserAuth?.tokens?.accessToken;

      // 1. Explicitly cancel the created booking in database if it exists
      if (createdBooking && createdBooking.id && !createdBooking.id.startsWith('bkg_')) {
        try {
          await bookingService.cancelBooking(createdBooking.id, {
            token: tokenToUse,
            reason: 'User left/cancelled booking wizard',
          });
        } catch (bkgErr) {
          console.warn('Failed to cancel active booking on leave:', bkgErr);
        }
      }

      // 2. Release temporary stall holds
      try {
        await stallService.cancelAllHolds({
          token: tokenToUse,
          stallIds: selectedStallIds,
        });
      } catch (holdErr) {
        console.warn('Failed to release holds on leave/back:', holdErr);
      }
    } catch (e) {
      console.warn('Failed to release holds on leave/back:', e);
    } finally {
      setIsReleasingHolds(false);
      setCreatedBooking(null);
      setIsPaymentModalDismissed(false);
      clearStallSelection();
      setSelectedCompany(null);
      setAssignedRegNo('');
      const action = confirmLeaveModal.targetAction;
      setConfirmLeaveModal((prev) => ({ ...prev, isOpen: false }));

      if (blocker.state === 'blocked') {
        blocker.proceed();
      } else if (action === 'LEAVE_PAGE') {
        if (fromReferrer) {
          navigate(fromReferrer);
        } else {
          navigate(`/exhibitions/${slug}`);
        }
      } else {
        // Refresh stalls on floor plan so they show as available (green) immediately
        await loadInitialData();
        setCurrentStep(1);
      }
    }
  };

  // Voluntary cancellation of the current pending booking and release of stalls
  const handleCancelCurrentBooking = async () => {
    try {
      setIsReleasingHolds(true);
      const tokenToUse = pendingUserAuth?.tokens?.accessToken;
      if (createdBooking && createdBooking.id && !createdBooking.id.startsWith('bkg_')) {
        await bookingService.cancelBooking(createdBooking.id, {
          token: tokenToUse,
          reason: 'User cancelled booking voluntarily after closing payment window',
        });
      }
      await stallService.cancelAllHolds({
        token: tokenToUse,
        stallIds: selectedStallIds,
      });
      setCreatedBooking(null);
      setIsPaymentModalDismissed(false);
      clearStallSelection();
      setSelectedCompany(null);
      setCurrentStep(1);
      await loadInitialData();
      await showAlert({
        title: 'Booking Cancelled',
        message: 'Your stall booking was cancelled and the selected stalls have been released back to available.',
        type: 'info',
      });
    } catch (err: any) {
      console.warn('Error cancelling booking:', err);
      setCurrentStep(1);
      await loadInitialData();
    } finally {
      setIsReleasingHolds(false);
    }
  };

  // Step 2 -> Step 3
  const onSubmitCompanyForm = async (data: CompanyFormData) => {
    const eventYear = exhibition?.startDate ? new Date(exhibition.startDate).getFullYear().toString().slice(-2) : '26';

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
        country: normalizeCountryName(data.country || 'India'),
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
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to register company details. Please try again.';

      await showAlert({
        title: 'Registration Notice',
        message: errMsg,
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountExistsLoginSuccess = async (
    loggedInUser: User,
    tokens: { accessToken: string; refreshToken?: string }
  ) => {
    // 1. Authenticate through the existing auth store
    useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken);
    useAuthStore.getState().setUser(loggedInUser);

    // 2. Fetch existing user companies if available
    try {
      const userCompanies = await companyService.getMyCompanies();
      if (userCompanies && userCompanies.length > 0) {
        setCompanies((prev) => {
          const combined = [...prev];
          for (const uc of userCompanies) {
            if (!combined.some((c) => c.id === uc.id)) {
              combined.push(uc);
            }
          }
          return combined;
        });
      }
    } catch (compErr) {
      console.warn('Could not fetch existing companies after inline login:', compErr);
    }

    // 3. Resume the registration step using the newly authenticated session
    const dataToResume = accountExistsModal.pendingFormData;
    setAccountExistsModal({
      isOpen: false,
      email: '',
      pendingFormData: null,
    });

    if (dataToResume) {
      await onSubmitCompanyForm(dataToResume);
    }
  };

  // Step 3 -> Step 4
  const handleProceedToPayment = async (payload: CreateBookingPayload) => {
    if (selectedStallIds.length === 0 || !selectedCompany) return;

    try {
      setLoading(true);
      setIsPaymentModalDismissed(false);

      const tokenToUse = pendingUserAuth?.tokens?.accessToken || (user ? undefined : null);

      // Cancel any previous unfulfilled booking before creating an updated one
      if (createdBooking && createdBooking.id && !createdBooking.id.startsWith('bkg_')) {
        try {
          await bookingService.cancelBooking(createdBooking.id, {
            token: tokenToUse || undefined,
            reason: 'Replaced by updated payment order',
          });
        } catch (prevErr) {
          console.warn('Cancelled previous pending booking before retry', prevErr);
        }
      }

      const response = await bookingService.createBooking(
        payload,
        { token: tokenToUse }
      );

      // Handle Privileged Direct Offline Allocation (Admin / Superadmin / Staff)
      if (payload.confirmDirectly) {
        const bookingData = response?.data || response?.booking || response;
        const bookingId = bookingData.bookingId || bookingData.id;
        const bookingReference = bookingData.bookingReference || generateFallbackBookingRef();

        const selectedStallsObj = stalls.filter((s) => selectedStallIds.includes(s.id));
        const calculatedBasePrice = selectedStallsObj.reduce((sum, s) => sum + Number(s.price), 0);
        const calculatedTaxAmount = Math.round(calculatedBasePrice * 0.18);
        const calculatedGrandTotal = calculatedBasePrice + calculatedTaxAmount;

        const realBooking = {
          id: bookingId,
          bookingReference,
          userId: user?.id,
          companyId: selectedCompany.id,
          exhibitionId: exhibition?.id || 'expo_id',
          status: 'CONFIRMED',
          paymentStatus: 'PAID_FULL',
          totalAmount: calculatedBasePrice,
          taxAmount: calculatedTaxAmount,
          grandTotal: calculatedGrandTotal,
          paidAmount: calculatedGrandTotal,
          balanceAmount: 0,
          createdAt: new Date().toISOString(),
          stalls: selectedStallsObj.map((s) => ({
            id: generateTempStallId(),
            bookingId,
            stallId: s.id,
            price: s.price,
            stall: s,
          })),
          company: selectedCompany,
          exhibition: exhibition || undefined,
        };

        setCreatedBooking(realBooking as Booking);
        setPaymentStatusState('SUCCESS');
        clearStallSelection();
        setCurrentStep(5);
        return;
      }

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
        bookingReference: response.bookingReference || generateFallbackBookingRef(),
        userId: user?.id || 'guest_user_id',
        companyId: selectedCompany.id,
        exhibitionId: exhibition?.id || 'expo_id',
        status: 'HELD',
        totalAmount: calculatedBasePrice,
        taxAmount: calculatedTaxAmount,
        grandTotal: calculatedGrandTotal,
        createdAt: new Date().toISOString(),
        stalls: selectedStallsObj.map((s) => ({
          id: generateTempStallId(),
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
      await showAlert({
        title: 'Payment Order Error',
        message: errMsg,
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  // Launch Razorpay Payment Gateway directly
  const executeRazorpayGateway = async (booking: Booking, orderInfo: any) => {
    // Ensure Razorpay SDK script is loaded
    if (typeof (window as any).Razorpay === 'undefined') {
      await showAlert({
        title: 'Payment Gateway Loading',
        message: 'Razorpay SDK is loading. Please check your internet connection or try again in a moment.',
        type: 'warning',
      });
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
            await new Promise((res) => setTimeout(res, 1000));
          }

          // Preserve authenticated user session (CLIENT, STAFF, ADMIN, SUPERADMIN) after successful payment
          navigate(`/booking/success?bookingId=${booking.id}`);
        } catch (err: any) {
          setPaymentStatusState('FAILED');
          setPaymentErrorMessage(err.response?.data?.message || err.message || 'Razorpay payment verification failed.');
        }
      },
      prefill: {
        name: booking.company?.contactPerson || booking.company?.name || selectedCompany?.contactPerson || selectedCompany?.name || user?.name || 'Exhibitor',
        email: booking.company?.email || selectedCompany?.email || user?.email || 'exhibitor@buoyantmedia.com',
        contact: booking.company?.mobile || selectedCompany?.mobile || user?.phone || '9876543210',
      },
      theme: {
        color: '#012970',
      },
      modal: {
        ondismiss: function () {
          console.log('Razorpay payment modal closed by user');
          setIsPaymentModalDismissed(true);
        },
      },
    };

    try {
      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.open();
    } catch (err: any) {
      console.error('Failed to open Razorpay modal:', err);
      await showAlert({
        title: 'Payment Window Blocked',
        message: 'Unable to launch Razorpay popup: ' + err.message,
        type: 'danger',
      });
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
        <div className="flex justify-center">
          <BackButton to="/exhibitions" label="Back to Exhibition Catalog" variant="outline" />
        </div>
      </div>
    );
  }

  const selectedStallsObj = stalls.filter((s) => selectedStallIds.includes(s.id));
  const basePrice = selectedStallsObj.reduce((sum, s) => sum + Number(s.price), 0);
  const effectivePartialPercent = Math.max(50, Math.min(99, partialPercentage));
  const _payableToday = paymentType === 'PARTIAL' ? Math.round(basePrice * (effectivePartialPercent / 100)) : basePrice;

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
            <div className="flex flex-wrap items-center gap-3">
              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={handleInitiateLeave}
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
                  title={fromReferrer ? `Back to ${fromReferrerLabel || 'Previous Page'}` : 'Back to Exhibition Profile'}
                >
                  <ArrowLeft className="w-4 h-4 text-[#09539b] dark:text-blue-400 group-hover:-translate-x-0.5 transition-transform" />
                  <span>{fromReferrer ? `Back to ${fromReferrerLabel || 'Previous'}` : 'Back to Exhibition'}</span>
                </button>
              )}

              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#012970] dark:text-slate-100 leading-tight">
                  Stall Reservation — {exhibition.title}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Step {currentStep} of 3 • {currentStep === 1 ? 'Floor Plan Selection' : currentStep === 2 ? 'Exhibitor Company Details' : 'Tax Invoice & Contract Review'}
                </p>
              </div>
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
                // Only allow navigating to past completed steps or step 2 if stalls are chosen
                // Step 3 can NEVER be clicked ahead directly unless Company Details in Step 2 have already been completed
                const isClickable =
                  !isCurrent &&
                  ((step.num === 1) ||
                   (step.num === 2 && selectedStallIds.length > 0) ||
                   (step.num === 3 && Boolean(selectedCompany && selectedCompany.id && selectedCompany.name)));

                const handleTabClick = () => {
                  if (!isClickable) return;
                  if (step.num === 1) {
                    handleInitiateBackToStep1();
                  } else if (step.num === 2) {
                    setCurrentStep(2);
                  } else if (step.num === 3 && selectedCompany && selectedCompany.id) {
                    setCurrentStep(3);
                  }
                };

                return (
                  <React.Fragment key={step.num}>
                    <button
                      type="button"
                      disabled={!isClickable && !isCurrent}
                      onClick={handleTabClick}
                      className={`flex items-center gap-2 whitespace-nowrap transition-all rounded-lg px-2.5 py-1 text-left ${
                        isCurrent
                          ? 'text-[#09539b] dark:text-blue-400 cursor-default font-extrabold'
                          : isCompleted && isClickable
                          ? 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer'
                          : isClickable
                          ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                          : 'text-slate-400 dark:text-slate-500 opacity-50 cursor-not-allowed'
                      }`}
                      title={
                        !isClickable && !isCurrent
                          ? step.num === 3
                            ? 'Complete all required Company Details in Step 2 to proceed to Review & Pay'
                            : 'Select a stall first to proceed'
                          : isClickable
                          ? `Navigate to ${step.label}`
                          : undefined
                      }
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
                    </button>
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
          onBack={handleInitiateBackToStep1}
          onCancel={handleInitiateLeave}
          onContinueWithSelectedCompany={() => setCurrentStep(3)}
          onOpenLoginModal={(email) =>
            setAccountExistsModal({
              isOpen: true,
              email: email || '',
              pendingFormData: null,
            })
          }
        />
      )}

      {/* STEP 3: REVIEW & PAY */}
      {currentStep === 3 && (
        <Step3TaxAuditBill
          user={user || pendingUserAuth?.user || null}
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
          onBack={() => {
            if (createdBooking && createdBooking.id && !createdBooking.id.startsWith('bkg_')) {
              const tokenToUse = pendingUserAuth?.tokens?.accessToken;
              bookingService.cancelBooking(createdBooking.id, {
                token: tokenToUse,
                reason: 'User went back to edit company/billing details',
              }).catch((e) => console.warn('Cancel on back warning:', e));
              setCreatedBooking(null);
            }
            setIsPaymentModalDismissed(false);
            setCurrentStep(2);
          }}
          onCancel={handleInitiateLeave}
          isPaymentModalDismissed={isPaymentModalDismissed}
          onCancelBookingAndRelease={handleCancelCurrentBooking}
          showAdminControls={isAdminBookingContext}
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

      {/* Account Exists Inline Login Modal */}
      <AccountExistsLoginModal
        isOpen={accountExistsModal.isOpen}
        initialEmail={accountExistsModal.email}
        isHoldExpired={remainingSeconds <= 0}
        onClose={() =>
          setAccountExistsModal({
            isOpen: false,
            email: '',
            pendingFormData: null,
          })
        }
        onLoginSuccess={handleAccountExistsLoginSuccess}
      />

      {/* Confirmation Warning Modal for Leaving / Releasing Stalls */}
      <Modal
        isOpen={confirmLeaveModal.isOpen}
        onClose={handleCancelLeaveModal}
        title={confirmLeaveModal.title}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 rounded-xl text-amber-900 dark:text-amber-200 text-xs font-medium flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Reservation Hold Will Be Released</p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {confirmLeaveModal.description}
              </p>
            </div>
          </div>

          {selectedStallsObj.length > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">Stall(s) currently reserved:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedStallsObj.map((s) => (
                  <span
                    key={s.id}
                    className="px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-mono font-bold text-xs"
                  >
                    #{s.stallNumber}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              disabled={isReleasingHolds}
              onClick={handleCancelLeaveModal}
              className="text-xs font-bold"
            >
              Cancel & Stay
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={isReleasingHolds}
              onClick={handleExecuteLeaveAction}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md"
            >
              {confirmLeaveModal.confirmButtonText}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
