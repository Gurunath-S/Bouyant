import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { stallService } from '../../../services/stalls/stallService';
import { bookingService } from '../../../services/bookings/bookingService';
import { paymentService } from '../../../services/payments/paymentService';
import { companyService } from '../../../services/companies/companyService';
import { useAuthStore } from '../../../stores/authStore';
import { Stall, Company } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { CountdownTimer } from '../../../components/ui/CountdownTimer';
import { ShieldCheck, Building2, CheckCircle2, CreditCard, ArrowRight, Lock, AlertCircle, FileText } from 'lucide-react';

export const BookingCheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  const stallId = searchParams.get('stallId');
  const [stall, setStall] = useState<Stall | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(user?.companyId || '');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form fields for new company inline setup
  const [newCompany, setNewCompany] = useState({
    name: user?.company?.name || '',
    contactPerson: user?.name || '',
    designation: 'Exhibitor Lead',
    mobile: user?.phone || '+1 (555) 019-2834',
    email: user?.email || '',
    address: '100 Corporate Blvd',
    city: 'San Francisco',
    state: 'CA',
    gstNumber: '27AAACT29381Z6',
    industry: 'Technology & SaaS',
    category: 'Exhibitor',
  });

  useEffect(() => {
    if (stallId) {
      loadCheckoutData();
    }
  }, [stallId]);

  const loadCheckoutData = async () => {
    try {
      setLoading(true);
      const stallsRes = await stallService.getStallsByFloorPlan('');
      const matched = stallsRes.find((s) => s.id === stallId);
      if (matched) setStall(matched);

      if (user) {
        const comps = await companyService.getMyCompanies();
        setCompanies(comps);
        if (comps.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(comps[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load checkout details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompanyInline = async () => {
    try {
      const created = await companyService.createCompany(newCompany);
      setCompanies([...companies, created]);
      setSelectedCompanyId(created.id);
      if (user) setUser({ ...user, companyId: created.id, company: created });
      return created.id;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to register corporate company.');
    }
  };

  const handleConfirmAndPay = async () => {
    if (!stall) return;
    try {
      setProcessing(true);
      setErrorMsg('');

      let activeCompanyId = selectedCompanyId;
      if (!activeCompanyId) {
        activeCompanyId = await handleCreateCompanyInline();
      }

      // Step 1: Create atomic server booking
      const booking = await bookingService.createBooking({
        stallId: stall.id,
        companyId: activeCompanyId,
      });

      // Step 2: Simulate Payment processing
      const paymentRes = await paymentService.processPayment({
        bookingId: booking.id,
        amount: Number(booking.grandTotal),
        paymentMethod: 'CORPORATE_CARD',
      });

      // Step 3: Navigate to confirmation page
      navigate(`/payment-success?bookingId=${booking.id}&paymentId=${paymentRes.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || err.response?.data?.message || 'Payment processing failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Initializing Secure Checkout...</div>;
  }

  if (!stall) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-3">
        <h3 className="text-lg font-bold text-slate-900">Stall Hold Expired or Invalid</h3>
        <Button variant="outline" onClick={() => navigate('/exhibitions')}>
          Return to Floor Plan
        </Button>
      </div>
    );
  }

  const basePrice = Number(stall.price);
  const taxAmount = Math.round(basePrice * 0.18);
  const grandTotal = basePrice + taxAmount;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Progress Stepper */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            Exhibition Stall Checkout & Checkout
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review event details, select corporate billing entity, and verify payment.
          </p>
        </div>

        {/* Hold Countdown Timer */}
        {stall.heldUntil && (
          <div>
            <CountdownTimer targetDate={stall.heldUntil} />
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between text-xs font-semibold text-slate-600 shadow-xs">
        <div className="flex items-center gap-2 text-blue-700">
          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
          Stall Selection
        </div>
        <div className="h-px bg-slate-200 flex-1 mx-3" />
        <div className="flex items-center gap-2 text-blue-700">
          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
          Company Billing
        </div>
        <div className="h-px bg-slate-200 flex-1 mx-3" />
        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">3</span>
          Payment & Tax Invoice
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stall & Corporate Details (2 Spans) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reserved Stall Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider text-blue-600">
              1. Reserved Stall Summary
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                <p className="text-slate-400 font-medium">Stall Number</p>
                <p className="text-base font-extrabold text-slate-900 font-mono mt-0.5">Stall {stall.stallNumber}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                <p className="text-slate-400 font-medium">Category</p>
                <p className="text-sm font-bold text-blue-700 mt-0.5 uppercase">{stall.category}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                <p className="text-slate-400 font-medium">Physical Dimensions</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{stall.areaSqFt} Sq.Ft</p>
              </div>
            </div>
          </div>

          {/* Corporate Entity Selection */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider text-blue-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> 2. Exhibitor Corporate Entity
            </h3>

            {companies.length > 0 ? (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-700">Select Registered Corporate Profile:</label>
                <div className="space-y-2">
                  {companies.map((c) => (
                    <label
                      key={c.id}
                      className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition-all ${
                        selectedCompanyId === c.id
                          ? 'bg-blue-50/60 border-blue-600 ring-1 ring-blue-600'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="company"
                          value={c.id}
                          checked={selectedCompanyId === c.id}
                          onChange={() => setSelectedCompanyId(c.id)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{c.name}</p>
                          <p className="text-[11px] text-slate-500">
                            GST: {c.gstNumber || 'N/A'} • Code: {c.companyCode}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-blue-700">{c.industry}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Please provide corporate tax info for invoice generation:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Company Name"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  />
                  <Input
                    label="GST Registration Number"
                    value={newCompany.gstNumber}
                    onChange={(e) => setNewCompany({ ...newCompany, gstNumber: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Financial Order Summary (1 Span) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md space-y-4 sticky top-20">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider text-blue-600">
              Line Item Summary
            </h3>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Stall Rental Fee ({stall.stallNumber})</span>
                <span className="font-mono text-slate-900 font-semibold">${basePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Goods & Service Tax / GST (18%)</span>
                <span className="font-mono text-slate-900 font-semibold">${taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-3 text-base font-extrabold text-slate-900 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="font-mono text-blue-700">${grandTotal.toLocaleString()} USD</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-[11px] text-blue-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Server Security Assurance
              </p>
              <p>Stall price locked via PostgreSQL atomic transaction block.</p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full shadow-md"
              onClick={handleConfirmAndPay}
              isLoading={processing}
              leftIcon={<CreditCard className="w-4 h-4" />}
            >
              Pay ${grandTotal.toLocaleString()} & Generate Invoice
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
