import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

const companySchema = z.object({
  name: z.string().min(2, 'Company Name is required'),
  contactPerson: z.string().min(2, 'Contact Person is required'),
  designation: z.string().min(2, 'Designation is required'),
  mobile: z.string().min(10, 'Valid mobile number is required'),
  email: z.string().email('Valid email address is required'),
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

  // Booking Flow Steps: 1 = Company, 2 = Stall, 3 = Review, 4 = Payment, 5 = Confirmation/Failure
  const [currentStep, setCurrentStep] = useState<number>(1);

  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(user?.company || null);
  const [isAddingNewCompany, setIsAddingNewCompany] = useState(false);

  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [paymentStatusState, setPaymentStatusState] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [stallHoldError, setStallHoldError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: user?.company?.name || '',
      contactPerson: user?.name || '',
      designation: 'Managing Director / Exhibitor',
      mobile: user?.phone || '+91 98200 12345',
      email: user?.email || '',
      address: '101 World Trade Center, Tower B',
      city: 'Mumbai',
      state: 'Maharashtra',
      gstNumber: '27AAACT29381Z6',
      panNumber: 'AAACT29381Z',
      industry: 'Technology & SaaS Solutions',
      category: 'Software & Cloud Automation',
      website: 'https://techcorp.com',
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
        setStalls(stallsData);
      }

      if (user) {
        const comps = await companyService.getMyCompanies();
        setCompanies(comps);
        if (comps.length > 0 && !selectedCompany) {
          setSelectedCompany(comps[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load booking wizard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Submit Company Form
  const onSubmitCompanyForm = async (data: CompanyFormData) => {
    try {
      const created = await companyService.createCompany(data as any);
      setCompanies([...companies, created]);
      setSelectedCompany(created);
      if (user) setUser({ ...user, companyId: created.id, company: created });
      setIsAddingNewCompany(false);
      setCurrentStep(2); // Proceed to Stall Selection
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save company profile.');
    }
  };

  const handleSelectExistingCompany = (comp: Company) => {
    setSelectedCompany(comp);
  };

  // Step 2: Confirm Stall & Hold
  const handleHoldSelectedStall = async () => {
    if (!selectedStallId) return;
    try {
      setStallHoldError('');
      await stallService.holdStall(selectedStallId);
      
      // Refresh stalls list
      if (exhibition?.floorPlans?.[0]) {
        const updated = await stallService.getStallsByFloorPlan(exhibition.floorPlans[0].id);
        setStalls(updated);
      }
      setCurrentStep(3); // Proceed to Review/Bill
    } catch (err: any) {
      const msg = err.response?.data?.message || 'This stall is no longer available. Please select another stall.';
      setStallHoldError(msg);
      // Refresh stalls list to show conflict
      if (exhibition?.floorPlans?.[0]) {
        const updated = await stallService.getStallsByFloorPlan(exhibition.floorPlans[0].id);
        setStalls(updated);
      }
    }
  };

  // Step 3: Create Booking & Proceed to Payment
  const handleProceedToPayment = async () => {
    if (!selectedStallId || !selectedCompany) return;
    try {
      setLoading(true);
      const booking = await bookingService.createBooking({
        stallId: selectedStallId,
        companyId: selectedCompany.id,
      });
      setCreatedBooking(booking);
      setCurrentStep(4); // Proceed to Payment UI
    } catch (err: any) {
      alert(err.response?.data?.message || 'Booking creation failed.');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Razorpay Payment Trigger
  const handleExecuteRazorpayPayment = async (shouldFail = false) => {
    if (!createdBooking) return;
    try {
      setCurrentStep(5);
      setPaymentStatusState('PROCESSING');

      // Simulate network latency for payment processing
      await new Promise((res) => setTimeout(res, 2000));

      if (shouldFail) {
        setPaymentStatusState('FAILED');
        setPaymentErrorMessage('Razorpay Transaction Declined: Bank Authorization Failure (Code: RZP_PAY_DECLINED).');
        return;
      }

      await paymentService.processPayment({
        bookingId: createdBooking.id,
        amount: Number(createdBooking.grandTotal),
        paymentMethod: 'RAZORPAY_UPI',
      });

      setPaymentStatusState('SUCCESS');
    } catch (err: any) {
      setPaymentStatusState('FAILED');
      setPaymentErrorMessage(err.message || 'Razorpay processing error.');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Initializing Exhibition Booking Wizard...</div>;
  }

  if (!exhibition) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-3">
        <h3 className="text-lg font-bold text-slate-900">Exhibition Event Not Found</h3>
        <Button variant="outline" onClick={() => navigate('/exhibitions')}>
          Back to Exhibitions
        </Button>
      </div>
    );
  }

  const selectedStallObj = stalls.find((s) => s.id === selectedStallId);
  const basePrice = selectedStallObj ? Number(selectedStallObj.price) : 0;
  const taxAmount = Math.round(basePrice * 0.18);
  const grandTotal = basePrice + taxAmount;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header & Stepper */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <button
              onClick={() => navigate(`/exhibitions/${slug}`)}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Exhibition Profile
            </button>
            <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
              Stall Reservation Stepper — {exhibition.title}
            </h1>
          </div>
        </div>

        {/* Mandatory Stepper Tabs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between text-xs font-bold text-slate-600 shadow-xs overflow-x-auto">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-700' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
            Company Details
          </div>
          <div className="h-px bg-slate-200 min-w-[20px] flex-1 mx-2" />

          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-700' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
            Stall Selection
          </div>
          <div className="h-px bg-slate-200 min-w-[20px] flex-1 mx-2" />

          <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-blue-700' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
            Review / Bill
          </div>
          <div className="h-px bg-slate-200 min-w-[20px] flex-1 mx-2" />

          <div className={`flex items-center gap-2 ${currentStep >= 4 ? 'text-blue-700' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep >= 4 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>4</span>
            Payment
          </div>
          <div className="h-px bg-slate-200 min-w-[20px] flex-1 mx-2" />

          <div className={`flex items-center gap-2 ${currentStep === 5 ? 'text-blue-700' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep === 5 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>5</span>
            Confirmation
          </div>
        </div>
      </div>

      {/* STEP 1: COMPANY DETAILS */}
      {currentStep === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" /> Step 1: Corporate Exhibitor Information
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select an existing registered company or provide new corporate tax credentials for invoice generation.
            </p>
          </div>

          {/* Option A: Existing Company Cards */}
          {companies.length > 0 && !isAddingNewCompany && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Select Corporate Profile:</label>
                <button
                  onClick={() => setIsAddingNewCompany(true)}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Register New Company
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companies.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectExistingCompany(c)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                      selectedCompany?.id === c.id
                        ? 'bg-blue-50/60 border-blue-600 ring-2 ring-blue-600'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-extrabold text-slate-900">{c.name}</h4>
                        {selectedCompany?.id === c.id && (
                          <span className="p-1 bg-blue-600 text-white rounded-full">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Code: {c.companyCode}</p>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <p><span className="font-semibold text-slate-500">GST:</span> {c.gstNumber || 'N/A'}</p>
                      <p><span className="font-semibold text-slate-500">Contact:</span> {c.contactPerson} ({c.email})</p>
                      <p><span className="font-semibold text-slate-500">Industry:</span> {c.industry}</p>
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
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continue to Stall Selection
                </Button>
              </div>
            </div>
          )}

          {/* Option B: New Company Form */}
          {(companies.length === 0 || isAddingNewCompany) && (
            <form onSubmit={handleSubmit(onSubmitCompanyForm)} className="space-y-4">
              {companies.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAddingNewCompany(false)}
                  className="text-xs font-semibold text-blue-600 hover:underline mb-2 block"
                >
                  ← Select Existing Registered Company
                </button>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Company Name" error={errors.name?.message} {...register('name')} />
                <Input label="Contact Person Name" error={errors.contactPerson?.message} {...register('contactPerson')} />
                <Input label="Designation" error={errors.designation?.message} {...register('designation')} />
                <Input label="Mobile Number" error={errors.mobile?.message} {...register('mobile')} />
                <Input label="Corporate Email Address" type="email" error={errors.email?.message} {...register('email')} />
                <Input label="Industry Sector" error={errors.industry?.message} {...register('industry')} />
                <Input label="GST Registration Number" error={errors.gstNumber?.message} {...register('gstNumber')} />
                <Input label="PAN Number" error={errors.panNumber?.message} {...register('panNumber')} />
                <Input label="Product / Service Category" error={errors.category?.message} {...register('category')} />
                <Input label="Official Website" placeholder="https://" error={errors.website?.message} {...register('website')} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Corporate Address" error={errors.address?.message} {...register('address')} />
                <Input label="City" error={errors.city?.message} {...register('city')} />
                <Input label="State" error={errors.state?.message} {...register('state')} />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Save Company & Continue to Stall Selection
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* STEP 2: STALL SELECTION */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" /> Step 2: Interactive Hall Floor Plan Stall Selection
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Company: <span className="font-bold text-slate-900">{selectedCompany?.name}</span> • Click any available green stall to view details.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
              Change Company
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
            <div className="flex-1 w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs p-4">
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

      {/* STEP 3: BOOKING SUMMARY / BILL */}
      {currentStep === 3 && selectedStallObj && selectedCompany && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> Step 3: Booking Summary & Tax Bill Review
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Please verify all stall line items and company tax details before proceeding to payment.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)}>
              Back to Stall Map
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Exhibition & Company Details (2 Spans) */}
            <div className="md:col-span-2 space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-1.5 uppercase tracking-wider text-blue-700">
                  Exhibition Overview
                </h4>
                <p><span className="font-semibold text-slate-500">Event:</span> {exhibition.title}</p>
                <p><span className="font-semibold text-slate-500">Venue:</span> {exhibition.venue}, {exhibition.city}</p>
                <p>
                  <span className="font-semibold text-slate-500">Dates:</span> {new Date(exhibition.startDate).toLocaleDateString()} -{' '}
                  {new Date(exhibition.endDate).toLocaleDateString()}
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-1.5 uppercase tracking-wider text-blue-700">
                  Exhibitor Corporate Tax Entity
                </h4>
                <p><span className="font-semibold text-slate-500">Company:</span> {selectedCompany.name}</p>
                <p><span className="font-semibold text-slate-500">GST Registration:</span> {selectedCompany.gstNumber || 'N/A'}</p>
                <p><span className="font-semibold text-slate-500">PAN Number:</span> {selectedCompany.panNumber || 'N/A'}</p>
                <p><span className="font-semibold text-slate-500">Address:</span> {selectedCompany.address}, {selectedCompany.city}, {selectedCompany.state}</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-1.5 uppercase tracking-wider text-blue-700">
                  Stall Configuration
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-400 block font-semibold text-[10px]">Stall Number</span>
                    <span className="font-bold text-slate-900 text-sm font-mono">Stall {selectedStallObj.stallNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold text-[10px]">Category</span>
                    <span className="font-bold text-blue-700 text-sm uppercase">{selectedStallObj.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold text-[10px]">Area</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedStallObj.areaSqFt} Sq.Ft</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary Card (1 Span) */}
            <div className="p-6 bg-slate-900 text-white rounded-xl space-y-4 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-sm font-bold border-b border-slate-800 pb-2 uppercase tracking-wider text-blue-400">
                  Financial Invoice Line Items
                </h4>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Base Stall Rental</span>
                    <span className="font-mono font-bold text-white">${basePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Goods & Services Tax (18% GST)</span>
                    <span className="font-mono font-bold text-white">${taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-base font-extrabold text-white">
                    <span>Grand Total:</span>
                    <span className="font-mono text-blue-400 text-lg">${grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full font-bold shadow-md"
                onClick={handleProceedToPayment}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Proceed to Payment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: RAZORPAY PAYMENT GATEWAY INTERFACE */}
      {currentStep === 4 && createdBooking && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-2 border-b border-slate-100 pb-4">
            <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-[10px] rounded-full uppercase">
              Razorpay Secure Checkout
            </span>
            <h2 className="text-xl font-extrabold text-slate-900">Select Payment Method</h2>
            <p className="text-xs text-slate-500">Booking Reference: <span className="font-mono font-bold text-slate-800">{createdBooking.bookingReference}</span></p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-sm font-bold">
            <span className="text-slate-600">Total Amount Payable:</span>
            <span className="text-xl font-extrabold text-blue-700 font-mono">${Number(createdBooking.grandTotal).toLocaleString()} USD</span>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 border border-blue-600 bg-blue-50/50 rounded-xl flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <input type="radio" checked readOnly className="text-blue-600" />
                <span className="text-xs font-bold text-slate-900">Razorpay Unified Payments Interface (UPI / QR)</span>
              </div>
              <span className="text-[10px] font-bold text-blue-700 uppercase">Instant</span>
            </div>

            <div className="p-3.5 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-between cursor-pointer opacity-75">
              <div className="flex items-center gap-3">
                <input type="radio" disabled className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">Corporate Credit / Debit Card</span>
              </div>
            </div>

            <div className="p-3.5 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-between cursor-pointer opacity-75">
              <div className="flex items-center gap-3">
                <input type="radio" disabled className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">Net Banking (HDFC, ICICI, SBI, Axis)</span>
              </div>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <Button
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-md"
              onClick={() => handleExecuteRazorpayPayment(false)}
              leftIcon={<CreditCard className="w-4 h-4" />}
            >
              Pay ${Number(createdBooking.grandTotal).toLocaleString()} via Razorpay (Simulate Success)
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

      {/* STEP 5: PAYMENT STATES (PROCESSING / SUCCESS / FAILURE) */}
      {currentStep === 5 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-6 shadow-xs">
          {/* State 1: Processing */}
          {paymentStatusState === 'PROCESSING' && (
            <div className="space-y-4 py-8">
              <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
              <h2 className="text-xl font-bold text-slate-900">Processing your payment...</h2>
              <p className="text-xs text-slate-500">
                Please wait while we verify transaction authorization with Razorpay gateway.
              </p>
            </div>
          )}

          {/* State 2: Payment Success */}
          {paymentStatusState === 'SUCCESS' && createdBooking && (
            <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-900">Payment Successful!</h2>
                <p className="text-xs text-slate-500">Your stall reservation is confirmed and verified on the server.</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-medium">Booking Reference:</span>
                  <span className="font-mono font-bold text-slate-900">{createdBooking.bookingReference}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-medium">Exhibition:</span>
                  <span className="font-bold text-slate-900">{exhibition.title}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-medium">Reserved Stall:</span>
                  <span className="font-bold text-blue-700 font-mono">Stall {selectedStallObj?.stallNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Amount Paid:</span>
                  <span className="font-mono font-extrabold text-emerald-700">${Number(createdBooking.grandTotal).toLocaleString()} USD</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="primary" onClick={() => navigate('/my-bookings')}>
                  View My Bookings
                </Button>
                <Button variant="outline" onClick={() => navigate('/invoices')} leftIcon={<Download className="w-4 h-4" />}>
                  Download Invoice & Receipt
                </Button>
              </div>
            </div>
          )}

          {/* State 3: Payment Failed */}
          {paymentStatusState === 'FAILED' && (
            <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <XCircle className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-900">Payment Failed</h2>
                <p className="text-xs text-rose-600 font-semibold">{paymentErrorMessage || 'Your payment was not completed or was declined.'}</p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="primary" onClick={() => setCurrentStep(4)}>
                  Retry Payment
                </Button>
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back to Stall Selection
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
