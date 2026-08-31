import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { stallService } from '../../../services/stalls/stallService';
import { companyService } from '../../../services/companies/companyService';
import { bookingService } from '../../../services/bookings/bookingService';
import { paymentService } from '../../../services/payments/paymentService';
import { useAuthStore } from '../../../stores/authStore';
import { useFloorPlanStore } from '../../../stores/floorPlanStore';
import { Exhibition, Stall, Company, Booking } from '../../../types';
import { FloorPlanCanvas } from '../../floor-plan/components/FloorPlanCanvas';
import { StallFilterBar } from '../../floor-plan/components/StallFilterBar';
import { StallHoverCard } from '../../floor-plan/components/StallHoverCard';
import { OfficialContractForm } from '../components/OfficialContractForm';
import { TermsAndConditionsModal } from '../components/TermsAndConditionsModal';
import { MEDICCON_188_STALLS } from '../../../data/medicconFloorPlanData';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import {
  Building,
  Layers,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Plus,
  RefreshCw,
  Download,
  Check,
  XCircle,
  Mail,
  Key,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const companySchema = z.object({
  name: z.string().min(2, 'Company Name is required'),
  contactPerson: z.string().min(2, 'Contact Person Name is required'),
  designation: z.string().min(2, 'Designation is required'),
  mobile: z.string().min(10, 'Valid 10-digit mobile number is required'),
  email: z.string().email('Valid corporate email address is required'),
  address: z.string().min(5, 'Corporate address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  gstNumber: z.string().min(5, 'GST Registration Number is required'),
  panNumber: z.string().min(5, 'PAN Number is required'),
  industry: z.string().min(2, 'Industry sector is required'),
  category: z.string().min(2, 'Product/Service Category is required'),
  website: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

export const BookingWizardPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const { selectedStallId, setSelectedStallId, zoomLevel, setZoomLevel } = useFloorPlanStore();

  // Booking Flow Steps: 1 = Company/Exhibitor Details, 2 = Stall Map Selection, 3 = Tax Bill Review, 4 = Razorpay Payment, 5 = Confirmation & OTP Credentials
  const [currentStep, setCurrentStep] = useState<number>(1);

  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(user?.company || null);
  const [guestFormData, setGuestFormData] = useState<CompanyFormData | null>(null);
  const [isAddingNewCompany, setIsAddingNewCompany] = useState(false);

  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [paymentStatusState, setPaymentStatusState] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [stallHoldError, setStallHoldError] = useState('');

  // Payment Plan Selection: Full (100%) or Partial (> 50%)
  const [paymentType, setPaymentType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [partialPercentage, setPartialPercentage] = useState<number>(60);
  const [isTermsAccepted, setIsTermsAccepted] = useState(true);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [showContractPreview, setShowContractPreview] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: user?.company?.name || 'Apex MedTech Solutions',
      contactPerson: user?.name || 'Dr. Rajesh Kumar',
      designation: 'Managing Director / Exhibitor',
      mobile: user?.phone || '+91 98421 88900',
      email: user?.email || 'contact@apexmedtech.demo',
      address: '45 Industrial Estate, Hopes College',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      gstNumber: '33AAACA9810J1Z4',
      panNumber: 'AAACA9810J',
      industry: 'Medical Devices & Healthcare',
      category: 'Diagnostic & ICU Equipment',
      website: 'https://apexmedtech.demo',
    },
  });

  useEffect(() => {
    if (slug) loadInitialData();
  }, [slug]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const expo = await exhibitionService.getExhibitionBySlug(slug!);
      setExhibition(expo);

      if (expo.floorPlans && expo.floorPlans.length > 0) {
        const stallsData = await stallService.getStallsByFloorPlan(expo.floorPlans[0].id);
        if (stallsData && stallsData.length > 0) {
          setStalls(stallsData);
        } else {
          setStalls(MEDICCON_188_STALLS);
        }
      } else {
        setStalls(MEDICCON_188_STALLS);
      }

      if (user) {
        const comps = await companyService.getMyCompanies();
        setCompanies(comps || []);
        if (comps && comps.length > 0 && !selectedCompany) {
          setSelectedCompany(comps[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load booking wizard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Submit Company Details (Supports Guest & Authenticated Users)
  const onSubmitCompanyForm = async (data: CompanyFormData) => {
    setGuestFormData(data);
    if (user) {
      try {
        const created = await companyService.createCompany(data as any);
        setCompanies([...companies, created]);
        setSelectedCompany(created);
        setUser({ ...user, companyId: created.id, company: created });
      } catch (err) {
        console.warn('Backend company save deferred to checkout for guest session');
      }
    } else {
      // For Guest Users: Create temporary mock company object for wizard progression
      const mockGuestComp: Company = {
        id: 'guest_comp_' + Date.now(),
        companyCode: 'CMP-GUEST-' + Math.floor(1000 + Math.random() * 9000),
        name: data.name,
        contactPerson: data.contactPerson,
        designation: data.designation,
        mobile: data.mobile,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        gstNumber: data.gstNumber,
        panNumber: data.panNumber,
        industry: data.industry,
        category: data.category,
        website: data.website,
        createdAt: new Date().toISOString(),
      };
      setSelectedCompany(mockGuestComp);
    }
    setCurrentStep(2); // Proceed to Stall Map Selection
  };

  const handleSelectExistingCompany = (comp: Company) => {
    setSelectedCompany(comp);
  };

  // Step 2: Confirm Stall Selection
  const handleHoldSelectedStall = async () => {
    if (!selectedStallId) return;
    try {
      setStallHoldError('');
      if (user) {
        await stallService.holdStall(selectedStallId);
      }
      setCurrentStep(3); // Proceed to Review/Bill
    } catch (err: any) {
      const msg = err.response?.data?.message || 'This stall is temporarily held. Please select another available green stall.';
      setStallHoldError(msg);
    }
  };

  // Step 3: Proceed to Payment
  const handleProceedToPayment = async () => {
    if (!selectedStallId || !selectedCompany) return;
    try {
      setLoading(true);
      // For guest/demo flow, construct a valid booking object
      const mockBooking: Booking = {
        id: 'bkg_' + Date.now(),
        bookingReference: 'BKG-2026-' + Math.floor(1000 + Math.random() * 9000),
        userId: user?.id || 'guest_user_id',
        companyId: selectedCompany.id,
        exhibitionId: exhibition?.id || 'expo_id',
        stallId: selectedStallId,
        status: 'HELD',
        totalAmount: basePrice,
        taxAmount: taxAmount,
        grandTotal: grandTotal,
        createdAt: new Date().toISOString(),
        stall: selectedStallObj,
        company: selectedCompany,
        exhibition: exhibition || undefined,
      };
      setCreatedBooking(mockBooking);
      setCurrentStep(4); // Proceed to Payment UI
    } catch (err: any) {
      alert('Booking initialization failed.');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Razorpay Payment Execution
  const handleExecuteRazorpayPayment = async (shouldFail = false) => {
    if (!createdBooking) return;
    try {
      setCurrentStep(5);
      setPaymentStatusState('PROCESSING');

      // Simulate network latency for payment processing
      await new Promise((res) => setTimeout(res, 2000));

      if (shouldFail) {
        setPaymentStatusState('FAILED');
        setPaymentErrorMessage('Razorpay Transaction Declined: Card Authorization Failure (Code: RZP_PAY_DECLINED).');
        return;
      }

      // Generate One-Time Password for newly created account
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOTP(otp);
      setPaymentStatusState('SUCCESS');
    } catch (err: any) {
      setPaymentStatusState('FAILED');
      setPaymentErrorMessage(err.message || 'Razorpay processing error.');
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 font-medium animate-pulse space-y-3">
        <div className="w-12 h-12 border-4 border-[#09539b] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold uppercase tracking-wider text-[#012970]">Initializing Exhibition Booking Wizard...</p>
      </div>
    );
  }

  if (!exhibition) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 max-w-xl mx-auto my-12">
        <h3 className="text-lg font-bold text-[#012970]">Exhibition Event Not Found</h3>
        <Button variant="outline" onClick={() => navigate('/exhibitions')}>
          Back to Exhibition Catalog
        </Button>
      </div>
    );
  }

  const selectedStallObj = stalls.find((s) => s.id === selectedStallId);
  const basePrice = selectedStallObj ? Number(selectedStallObj.price) : 100000;
  const taxAmount = Math.round(basePrice * 0.18);
  const grandTotal = basePrice + taxAmount;

  // Payment Option Calculations (> 50% for Partial)
  const isPartial = paymentType === 'PARTIAL';
  const effectivePartialPercent = Math.max(51, Math.min(99, partialPercentage));
  const payableToday = isPartial
    ? Math.round(grandTotal * (effectivePartialPercent / 100))
    : grandTotal;
  const remainingBalance = isPartial ? grandTotal - payableToday : 0;

  // Calculate 15 days before event date
  const eventStartDate = exhibition ? new Date(exhibition.startDate) : new Date(Date.now() + 30 * 86400000);
  const deadlineDate = new Date(eventStartDate.getTime() - 15 * 24 * 60 * 60 * 1000);
  const formattedDeadline = deadlineDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans pb-16">
      {/* Header & Stepper */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <button
              onClick={() => navigate(`/exhibitions/${slug}`)}
              className="text-xs font-bold text-[#09539b] hover:underline flex items-center gap-1 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Exhibition Profile
            </button>
            <h1 className="text-2xl font-extrabold text-[#012970] leading-tight">
              Stall Reservation — {exhibition.title}
            </h1>
          </div>
          <span className="px-3 py-1 bg-[#9cc542]/20 text-[#012970] font-black text-xs uppercase rounded-md border border-[#9cc542]/40">
            Frictionless Guest Booking Enabled
          </span>
        </div>

        {/* Stepper Tabs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-xs font-extrabold text-slate-600 shadow-2xs overflow-x-auto">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-[#09539b]' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep >= 1 ? 'bg-[#09539b] text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
            1. Company Details
          </div>
          <div className="h-px bg-slate-200 min-w-[20px] flex-1 mx-2" />

          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-[#09539b]' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep >= 2 ? 'bg-[#09539b] text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
            2. Stall Floor Plan
          </div>
          <div className="h-px bg-slate-200 min-w-[20px] flex-1 mx-2" />

          <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-[#09539b]' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep >= 3 ? 'bg-[#09539b] text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
            3. Tax Audit & Bill
          </div>
          <div className="h-px bg-slate-200 min-w-[20px] flex-1 mx-2" />

          <div className={`flex items-center gap-2 ${currentStep >= 4 ? 'text-[#09539b]' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep >= 4 ? 'bg-[#09539b] text-white' : 'bg-slate-200 text-slate-600'}`}>4</span>
            4. Razorpay Payment
          </div>
          <div className="h-px bg-slate-200 min-w-[20px] flex-1 mx-2" />

          <div className={`flex items-center gap-2 ${currentStep === 5 ? 'text-[#09539b]' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep === 5 ? 'bg-[#9cc542] text-[#012970]' : 'bg-slate-200 text-slate-600'}`}>5</span>
            5. Pass & OTP Credentials
          </div>
        </div>
      </div>

      {/* STEP 1: COMPANY / EXHIBITOR DETAILS */}
      {currentStep === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-[#012970] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#09539b]" /> Step 1: Corporate Exhibitor Information
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Fill in your corporate details below. Login is optional — an account with password will be auto-generated upon payment.
            </p>
          </div>

          {/* Existing Registered Company Cards (If Logged In) */}
          {companies.length > 0 && !isAddingNewCompany && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Select Saved Corporate Profile:</label>
                <button
                  onClick={() => setIsAddingNewCompany(true)}
                  className="text-xs font-bold text-[#09539b] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Fill New Corporate Details
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companies.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectExistingCompany(c)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                      selectedCompany?.id === c.id
                        ? 'bg-[#f6f9ff] border-[#09539b] ring-2 ring-[#09539b]'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-extrabold text-[#012970]">{c.name}</h4>
                        {selectedCompany?.id === c.id && (
                          <span className="p-1 bg-[#09539b] text-white rounded-full">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Code: {c.companyCode}</p>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <p><span className="font-semibold text-slate-500">GSTIN:</span> {c.gstNumber || 'N/A'}</p>
                      <p><span className="font-semibold text-slate-500">Contact:</span> {c.contactPerson} ({c.email})</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={!selectedCompany}
                  onClick={() => setCurrentStep(2)}
                  className="bg-[#09539b] hover:bg-[#012970] font-bold"
                  rightIcon={<ArrowRight className="w-4 h-4 text-[#9cc542]" />}
                >
                  Continue to Stall Floor Plan
                </Button>
              </div>
            </div>
          )}

          {/* Guest / New Company Details Form */}
          {(companies.length === 0 || isAddingNewCompany) && (
            <form onSubmit={handleSubmit(onSubmitCompanyForm)} className="space-y-4">
              {companies.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAddingNewCompany(false)}
                  className="text-xs font-semibold text-[#09539b] hover:underline mb-2 block"
                >
                  ← Select Existing Saved Company
                </button>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Official Company Name *" error={errors.name?.message} {...register('name')} />
                <Input label="Contact Person Name *" error={errors.contactPerson?.message} {...register('contactPerson')} />
                <Input label="Designation *" error={errors.designation?.message} {...register('designation')} />
                <Input label="Mobile Number *" error={errors.mobile?.message} {...register('mobile')} />
                <Input label="Corporate Email Address *" type="email" error={errors.email?.message} {...register('email')} />
                <Input label="Industry Sector *" error={errors.industry?.message} {...register('industry')} />
                <Input label="GST Registration Number (GSTIN) *" error={errors.gstNumber?.message} {...register('gstNumber')} />
                <Input label="PAN Number *" error={errors.panNumber?.message} {...register('panNumber')} />
                <Input label="Product / Service Category *" error={errors.category?.message} {...register('category')} />
                <Input label="Official Website" placeholder="https://" error={errors.website?.message} {...register('website')} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Corporate Address *" error={errors.address?.message} {...register('address')} />
                <Input label="City *" error={errors.city?.message} {...register('city')} />
                <Input label="State *" error={errors.state?.message} {...register('state')} />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <Button type="submit" variant="primary" size="lg" className="bg-[#09539b] hover:bg-[#012970] font-bold" rightIcon={<ArrowRight className="w-4 h-4 text-[#9cc542]" />}>
                  Save & Continue to Interactive Floor Map
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* STEP 2: STALL FLOOR PLAN SELECTION */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#012970] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#09539b]" /> Step 2: Select Stall on Interactive Hall Floor Plan
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Company: <span className="font-bold text-[#012970]">{selectedCompany?.name || 'Guest Exhibitor'}</span> • Click any available green stall to select position.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
              Edit Exhibitor Details
            </Button>
          </div>

          {stallHoldError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              {stallHoldError}
            </div>
          )}

          <StallFilterBar stalls={stalls} onZoomChange={(z) => setZoomLevel(z)} currentZoom={zoomLevel} />

          <div className="relative flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs p-4">
              <FloorPlanCanvas stalls={stalls} onStallSelect={(s) => setSelectedStallId(s.id)} />
            </div>

            {selectedStallObj && (
              <StallHoverCard
                stall={selectedStallObj}
                onClose={() => setSelectedStallId(null)}
                onHold={handleHoldSelectedStall}
              />
            )}
          </div>
        </div>
      )}

      {/* STEP 3: TAX BILL & SUMMARY */}
      {currentStep === 3 && selectedStallObj && selectedCompany && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-[#012970] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#09539b]" /> Step 3: Tax Invoice Audit & Line Items
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Review your corporate tax entity details and financial breakdown before payment.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)}>
              Back to Floor Plan
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 2 Spans: Event & Corporate Details + Payment Mode Option */}
            <div className="md:col-span-2 space-y-4">
              <div className="p-4 bg-[#f6f9ff] border border-slate-200 rounded-xl space-y-2 text-xs">
                <h4 className="font-extrabold text-[#09539b] text-xs uppercase tracking-wider border-b border-slate-200 pb-1.5">
                  Trade Fair Overview
                </h4>
                <p><span className="font-semibold text-slate-500">Event:</span> {exhibition.title}</p>
                <p><span className="font-semibold text-slate-500">Venue:</span> {exhibition.venue}, {exhibition.city}</p>
              </div>

              <div className="p-4 bg-[#f6f9ff] border border-slate-200 rounded-xl space-y-2 text-xs">
                <h4 className="font-extrabold text-[#09539b] text-xs uppercase tracking-wider border-b border-slate-200 pb-1.5">
                  Exhibitor GSTIN Entity
                </h4>
                <p><span className="font-semibold text-slate-500">Company Name:</span> {selectedCompany.name}</p>
                <p><span className="font-semibold text-slate-500">GSTIN:</span> {selectedCompany.gstNumber || 'N/A'}</p>
                <p><span className="font-semibold text-slate-500">Contact Email:</span> {selectedCompany.email}</p>
              </div>

              <div className="p-4 bg-[#f6f9ff] border border-slate-200 rounded-xl space-y-2 text-xs">
                <h4 className="font-extrabold text-[#09539b] text-xs uppercase tracking-wider border-b border-slate-200 pb-1.5">
                  Reserved Booth Configuration
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-400 block font-semibold text-[10px]">Stall Number</span>
                    <span className="font-bold text-[#012970] text-sm font-mono">Stall {selectedStallObj.stallNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold text-[10px]">Category</span>
                    <span className="font-bold text-[#09539b] text-sm uppercase">{selectedStallObj.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold text-[10px]">Area</span>
                    <span className="font-bold text-[#012970] text-sm">{selectedStallObj.areaSqFt} Sq.Ft</span>
                  </div>
                </div>
              </div>

              {/* PAYMENT OPTION SELECTOR (FULL vs PARTIAL > 50%) */}
              <div className="p-5 bg-white border-2 border-[#09539b]/30 rounded-xl space-y-4 shadow-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <h4 className="font-extrabold text-[#012970] text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#09539b]" /> Select Payment Plan Option
                  </h4>
                  <span className="text-[10px] font-bold text-[#09539b] bg-[#EEF4FC] px-2.5 py-0.5 rounded-full uppercase">
                    Flexible Terms
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Full Payment Option */}
                  <div
                    onClick={() => setPaymentType('FULL')}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentType === 'FULL'
                        ? 'border-[#09539b] bg-[#f6f9ff] ring-2 ring-[#09539b]/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#012970] text-xs">Full Payment (100%)</span>
                      <input type="radio" checked={paymentType === 'FULL'} onChange={() => setPaymentType('FULL')} />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Pay complete booth rental today with zero pending balance.
                    </p>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-[#012970]">
                      <span>Amount Today:</span>
                      <span className="font-mono text-[#09539b]">₹{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Partial Payment Option */}
                  <div
                    onClick={() => setPaymentType('PARTIAL')}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentType === 'PARTIAL'
                        ? 'border-[#09539b] bg-[#f6f9ff] ring-2 ring-[#09539b]/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#012970] text-xs">Partial Advance Payment</span>
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded">
                          &gt; 50% Required
                        </span>
                      </div>
                      <input type="radio" checked={paymentType === 'PARTIAL'} onChange={() => setPaymentType('PARTIAL')} />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Pay advance today to lock booth; remaining balance due 15 days before event.
                    </p>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-[#012970]">
                      <span>Advance Today ({effectivePartialPercent}%):</span>
                      <span className="font-mono text-[#09539b]">₹{payableToday.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Partial Payment Configuration & 15-Day Deadline Notice */}
                {paymentType === 'PARTIAL' && (
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <label className="text-xs font-bold text-slate-700">
                        Select Advance Percentage (Must be &gt; 50%):
                      </label>
                      <div className="flex items-center gap-2">
                        {[60, 70, 80].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setPartialPercentage(pct)}
                            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                              partialPercentage === pct
                                ? 'bg-[#09539b] text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-amber-200">
                      <span className="text-xs font-bold text-slate-600">Custom Advance %:</span>
                      <input
                        type="number"
                        min="51"
                        max="99"
                        value={partialPercentage}
                        onChange={(e) => setPartialPercentage(Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-slate-300 rounded font-mono font-bold text-xs text-center"
                      />
                      <span className="text-xs text-slate-500 font-medium">
                        (Payable Today: <b className="font-mono text-[#09539b]">₹{payableToday.toLocaleString()}</b> • Balance: <b className="font-mono text-slate-800">₹{remainingBalance.toLocaleString()}</b>)
                      </span>
                    </div>

                    {/* Deadline Notice Banner */}
                    <div className="p-3 bg-amber-100/70 border-l-4 border-amber-500 rounded-r-lg text-xs text-amber-900 font-medium flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-950 block">15-Day Balance Deadline Notice:</span>
                        The remaining balance of <b className="font-mono font-extrabold">₹{remainingBalance.toLocaleString()} INR</b> must be paid at least <b className="underline">15 days before the event</b> (on or before <b className="font-bold">{formattedDeadline}</b>).
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* OFFICIAL CONTRACT FORM & TERMS AGREEMENT SECTION */}
              <div className="p-5 bg-slate-50 border-2 border-slate-200 rounded-xl space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div>
                    <h4 className="font-extrabold text-[#012970] text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#09539b]" /> Official Registration Contract Form & Terms
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Mediccon Expo 2026 CODISSIA Trade Centre Hall-A & Hall-B Contract Form
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowContractPreview(!showContractPreview)}
                    className="px-3 py-1.5 bg-[#09539b]/10 hover:bg-[#09539b]/20 text-[#09539b] text-xs font-bold rounded-lg transition-colors border border-[#09539b]/20 flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {showContractPreview ? 'Hide Official Form Preview' : 'View Official Form Preview'}
                  </button>
                </div>

                {/* Contract Form Live Expandable Preview */}
                {showContractPreview && selectedCompany && selectedStallObj && exhibition && (
                  <div className="animate-in fade-in duration-200">
                    <OfficialContractForm
                      company={selectedCompany}
                      exhibition={exhibition}
                      stall={selectedStallObj}
                      paymentType={paymentType}
                      effectivePartialPercent={effectivePartialPercent}
                      payableToday={payableToday}
                      remainingBalance={remainingBalance}
                      formattedDeadline={formattedDeadline}
                      onPrint={() => window.print()}
                    />
                  </div>
                )}

                {/* Rules & Regulations Overleaf Agreement Checkbox */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="terms-check"
                      checked={isTermsAccepted}
                      onChange={(e) => setIsTermsAccepted(e.target.checked)}
                      className="mt-1 w-4 h-4 text-[#09539b] rounded border-slate-300 focus:ring-[#09539b]"
                    />
                    <label htmlFor="terms-check" className="text-xs text-slate-700 font-medium leading-relaxed cursor-pointer">
                      We acknowledge explicitly that we have read and accepted in full the <button type="button" onClick={() => setIsTermsModalOpen(true)} className="text-[#09539b] font-bold underline hover:text-[#012970]">Rules and Regulations of the Exhibition printed overleaf</button> and by submitting this application, we undertake to comply with the same.
                    </label>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Organizer Bank: <b>THE FEDERAL BANK LTD</b> (A/C: 18020200001046)</span>
                    <button
                      type="button"
                      onClick={() => setIsTermsModalOpen(true)}
                      className="text-[#09539b] font-bold hover:underline flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> View All 5 Contract Clauses
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 1 Span: Financial Card */}
            <div className="p-6 bg-[#012970] text-white rounded-2xl space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold border-b border-white/20 pb-2 uppercase tracking-wider text-[#9cc542]">
                  Payment Summary
                </h4>

                <div className="space-y-2 text-xs text-slate-200">
                  <div className="flex justify-between">
                    <span>Base Rental</span>
                    <span className="font-mono font-bold text-white">₹{basePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>18% GST Tax</span>
                    <span className="font-mono font-bold text-white">₹{taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-slate-100">
                    <span>Grand Total:</span>
                    <span className="font-mono text-[#9cc542]">₹{grandTotal.toLocaleString()}</span>
                  </div>

                  {paymentType === 'PARTIAL' ? (
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
                  ) : (
                    <div className="pt-3 border-t border-white/20 flex justify-between items-center text-base font-black text-white">
                      <span>Total Payable Today:</span>
                      <span className="font-mono text-[#9cc542] text-lg">₹{payableToday.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                disabled={!isTermsAccepted}
                className="w-full font-extrabold bg-[#9cc542] hover:bg-[#82aa30] text-[#012970] shadow-md border-none disabled:opacity-50"
                onClick={handleProceedToPayment}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Proceed to Pay ₹{payableToday.toLocaleString()}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: RAZORPAY PAYMENT SIMULATOR */}
      {currentStep === 4 && createdBooking && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-md max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-2 border-b border-slate-100 pb-4">
            <span className="px-3 py-1 bg-[#09539b]/10 text-[#09539b] font-extrabold text-[10px] rounded-full uppercase">
              Razorpay Payment Gateway
            </span>
            <h2 className="text-xl font-black text-[#012970]">Secure Payment Checkout</h2>
            <p className="text-xs text-slate-500">Booking Ref: <span className="font-mono font-bold text-slate-800">{createdBooking.bookingReference}</span></p>
          </div>

          <div className="p-4 bg-[#f6f9ff] border border-slate-200 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-sm font-bold">
              <span className="text-slate-600">
                {paymentType === 'PARTIAL' ? `Advance Payment Today (${effectivePartialPercent}%):` : 'Total Amount Payable:'}
              </span>
              <span className="text-xl font-extrabold text-[#09539b] font-mono">₹{payableToday.toLocaleString()} INR</span>
            </div>
            {paymentType === 'PARTIAL' && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium">
                <span className="font-bold">Partial Advance Selected:</span> Remaining balance of <b className="font-mono font-bold">₹{remainingBalance.toLocaleString()} INR</b> must be cleared at least 15 days before the event (on or before <b>{formattedDeadline}</b>).
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="p-3.5 border-2 border-[#09539b] bg-[#f6f9ff] rounded-xl flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <input type="radio" checked readOnly className="text-[#09539b]" />
                <span className="text-xs font-bold text-[#012970]">Razorpay UPI / QR / NetBanking</span>
              </div>
              <span className="text-[10px] font-black text-[#9cc542] bg-[#012970] px-2 py-0.5 rounded uppercase">Instant</span>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100">
            <Button
              variant="primary"
              size="lg"
              className="w-full font-extrabold bg-[#09539b] hover:bg-[#012970] text-white shadow-md py-3"
              onClick={() => handleExecuteRazorpayPayment(false)}
              leftIcon={<CreditCard className="w-4 h-4 text-[#9cc542]" />}
            >
              Pay ₹{payableToday.toLocaleString()} via Razorpay (Simulate Success)
            </Button>
            <button
              type="button"
              onClick={() => handleExecuteRazorpayPayment(true)}
              className="w-full py-2 text-xs font-semibold text-rose-600 hover:underline text-center"
            >
              Simulate Razorpay Payment Failure
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: SUCCESS & ONE-TIME PASSWORD CREDENTIALS */}
      {currentStep === 5 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-2xl mx-auto space-y-6 shadow-xl">
          {paymentStatusState === 'PROCESSING' && (
            <div className="space-y-4 py-8">
              <RefreshCw className="w-12 h-12 text-[#09539b] animate-spin mx-auto" />
              <h2 className="text-xl font-bold text-[#012970]">Authorizing payment with Razorpay...</h2>
              <p className="text-xs text-slate-500">Please do not refresh or close the browser window.</p>
            </div>
          )}

          {paymentStatusState === 'SUCCESS' && selectedCompany && selectedStallObj && exhibition && (
            <div className="space-y-6 py-2 animate-in fade-in zoom-in-95 duration-200 text-left">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-[#012970]">Stall Reservation Confirmed!</h2>
                <p className="text-xs text-slate-600">
                  Your payment has been successfully processed and stall position allocated.
                </p>
              </div>

              {/* OTP Credentials Dispatch Notification Box */}
              <div className="p-5 bg-[#012970] text-white rounded-2xl text-left space-y-3 shadow-md border border-[#09539b]">
                <div className="flex items-center gap-2 border-b border-white/20 pb-2">
                  <Mail className="w-5 h-5 text-[#9cc542]" />
                  <h3 className="text-xs font-black text-[#9cc542] uppercase tracking-wider">
                    Exhibitor Dashboard Credentials Dispatched
                  </h3>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  We have automatically created your Exhibitor Account. Your login credentials and One-Time Password (OTP) have been sent to <span className="font-bold text-white underline">{selectedCompany.email}</span>.
                </p>

                <div className="p-3 bg-white/10 rounded-xl flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#9cc542]" />
                    <span className="text-slate-300">Generated Account OTP:</span>
                  </div>
                  <span className="text-base font-black text-[#9cc542] tracking-widest">{generatedOTP || '892401'}</span>
                </div>
              </div>

              {/* Render Official Contract Form Component */}
              <OfficialContractForm
                company={selectedCompany}
                exhibition={exhibition}
                stall={selectedStallObj}
                paymentType={paymentType}
                effectivePartialPercent={effectivePartialPercent}
                payableToday={payableToday}
                remainingBalance={remainingBalance}
                formattedDeadline={formattedDeadline}
                onPrint={() => window.print()}
              />

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/login">
                  <Button variant="primary" className="w-full font-bold bg-[#09539b] hover:bg-[#012970]">
                    Sign In to Exhibitor Dashboard
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="outline" className="w-full font-bold border-[#012970] text-[#012970]">
                    Back to Homepage
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {paymentStatusState === 'FAILED' && (
            <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-200 text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <XCircle className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-black text-[#012970]">Payment Processing Declined</h2>
                <p className="text-xs text-rose-600 font-semibold">{paymentErrorMessage}</p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="primary" className="bg-[#09539b]" onClick={() => setCurrentStep(4)}>
                  Retry Razorpay Payment
                </Button>
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back to Stall Selection
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TERMS & CONDITIONS OVERLEAF MODAL */}
      <TermsAndConditionsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        isAccepted={isTermsAccepted}
        onAccept={() => setIsTermsAccepted(true)}
      />
    </div>
  );
};
