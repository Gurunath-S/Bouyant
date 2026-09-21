import React, { useEffect, useState, useMemo } from 'react';
import { Exhibition, Stall, Company, Booking } from '../../../types';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { companyService } from '../../../services/companies/companyService';
import { bookingService } from '../../../services/bookings/bookingService';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { formatDisplayDate } from '../../../utils/date';
import {
  Building2,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Layers,
  ShieldCheck,
  CreditCard,
  UserPlus,
  Tag,
  Check,
  Info,
} from 'lucide-react';

interface AdminRegisterExhibitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  exhibition: Exhibition | null;
  onSuccess: (booking: Booking) => void;
}

export const AdminRegisterExhibitorModal: React.FC<AdminRegisterExhibitorModalProps> = ({
  isOpen,
  onClose,
  exhibition,
  onSuccess,
}) => {
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [fullExhibition, setFullExhibition] = useState<Exhibition | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Form State
  const [companyMode, setCompanyMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [companySearch, setCompanySearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  // New Company Fields
  const [newCompany, setNewCompany] = useState({
    name: '',
    contactPerson: '',
    designation: 'Director',
    mobile: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    gstNumber: '',
    industry: 'Technology',
  });

  // Stall Selection
  const [selectedStallIds, setSelectedStallIds] = useState<string[]>([]);
  const [stallSearch, setStallSearch] = useState('');

  // Allocation Mode
  const [confirmDirectly, setConfirmDirectly] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('OFFLINE_ADMIN_DIRECT');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step state (1: Select Company, 2: Select Stalls, 3: Confirm & Pay)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Load exhibition stalls & companies on open
  useEffect(() => {
    if (isOpen && exhibition) {
      setErrorMsg(null);
      setCurrentStep(1);
      setSelectedStallIds([]);
      setSelectedCompanyId('');
      setCompanySearch('');
      loadExhibitionDetails(exhibition.id);
      loadCompanies();
    }
  }, [isOpen, exhibition]);

  const loadExhibitionDetails = async (id: string) => {
    try {
      setLoadingDetails(true);
      const data = await exhibitionService.getExhibitionBySlug(id);
      setFullExhibition(data);
    } catch (err: any) {
      console.error('Failed to load exhibition details:', err);
      setErrorMsg('Could not load exhibition details and floor plan stalls.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const res = await companyService.listCompanies(1, '', undefined, undefined, 100);
      setCompanies(res.data || []);
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Flatten available stalls
  const allStalls = useMemo(() => {
    if (!fullExhibition?.floorPlans) return [];
    const list: Stall[] = [];
    for (const fp of fullExhibition.floorPlans) {
      if (fp.stalls) {
        list.push(...fp.stalls);
      }
    }
    return list;
  }, [fullExhibition]);

  const availableStalls = useMemo(() => {
    return allStalls.filter(
      (s) => s.status === 'AVAILABLE' || selectedStallIds.includes(s.id)
    );
  }, [allStalls, selectedStallIds]);

  const filteredStalls = useMemo(() => {
    if (!stallSearch.trim()) return availableStalls;
    const q = stallSearch.toLowerCase();
    return availableStalls.filter(
      (s) =>
        s.stallNumber.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q))
    );
  }, [availableStalls, stallSearch]);

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies;
    const q = companySearch.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.companyCode && c.companyCode.toLowerCase().includes(q)) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.mobile && c.mobile.includes(q))
    );
  }, [companies, companySearch]);

  // Pricing calculations
  const selectedStallObjects = useMemo(() => {
    return allStalls.filter((s) => selectedStallIds.includes(s.id));
  }, [allStalls, selectedStallIds]);

  const subtotal = useMemo(() => {
    return selectedStallObjects.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
  }, [selectedStallObjects]);

  const taxAmount = Math.round(subtotal * 0.18);
  const grandTotal = subtotal + taxAmount;

  const handleToggleStall = (stallId: string) => {
    setSelectedStallIds((prev) =>
      prev.includes(stallId) ? prev.filter((id) => id !== stallId) : [...prev, stallId]
    );
  };

  const handleNextFromStep1 = () => {
    setErrorMsg(null);
    if (companyMode === 'EXISTING' && !selectedCompanyId) {
      setErrorMsg('Please select an existing company or switch to Quick Register New.');
      return;
    }
    if (companyMode === 'NEW') {
      if (!newCompany.name.trim() || !newCompany.contactPerson.trim() || !newCompany.mobile.trim()) {
        setErrorMsg('Company Name, Contact Person, and Mobile number are required.');
        return;
      }
    }
    setCurrentStep(2);
  };

  const handleNextFromStep2 = () => {
    setErrorMsg(null);
    if (selectedStallIds.length === 0) {
      setErrorMsg('Please select at least one stall to proceed.');
      return;
    }
    setCurrentStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exhibition) return;

    if (selectedStallIds.length === 0) {
      setErrorMsg('Please select at least one available stall for registration.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      let targetCompanyId = selectedCompanyId;

      // Create new company if needed
      if (companyMode === 'NEW') {
        const createdComp = await companyService.createCompany({
          ...newCompany,
          edition: exhibition.edition,
          eventCode: exhibition.eventCode,
        });
        targetCompanyId = createdComp.id;
      }

      if (!targetCompanyId) {
        setErrorMsg('Please select or create an exhibitor company.');
        setSubmitting(false);
        return;
      }

      // Submit booking
      const booking = await bookingService.createBooking({
        exhibitionId: exhibition.id,
        stallIds: selectedStallIds,
        companyId: targetCompanyId,
        confirmDirectly,
        paymentMethod: confirmDirectly ? paymentMethod : undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess(booking);
      onClose();
    } catch (err: any) {
      console.error('Admin event registration failed:', err);
      setErrorMsg(
        err.response?.data?.message || err.message || 'Failed to complete registration.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !exhibition) return null;

  const selectedCompanyName =
    companyMode === 'NEW'
      ? newCompany.name
      : companies.find((c) => c.id === selectedCompanyId)?.name || 'Selected Company';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl" title="">
      <div className="space-y-6">
        {/* Exhibition Header Banner */}
        <div className="bg-slate-900 text-white -m-6 mb-6 p-6 rounded-t-2xl relative overflow-hidden border-b border-slate-800">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-[11px] font-bold">
                  {exhibition.eventCode || 'EX'}-{exhibition.edition || '01'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                  {exhibition.status}
                </span>
                {exhibition.category && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px]">
                    {exhibition.category}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black tracking-tight">{exhibition.title}</h2>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  {exhibition.venue}, {exhibition.city}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  {formatDisplayDate(exhibition.startDate)} – {formatDisplayDate(exhibition.endDate)}
                </span>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Available Stalls
              </span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {availableStalls.length}
              </span>
              <span className="text-xs text-slate-400 block">
                of {allStalls.length || exhibition.totalStalls} stalls
              </span>
            </div>
          </div>
        </div>

        {/* Step Progress Tracker */}
        <div className="grid grid-cols-3 gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div
            onClick={() => currentStep > 1 && setCurrentStep(1)}
            className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
              currentStep === 1
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-600 text-purple-900 dark:text-purple-300 font-bold'
                : currentStep > 1
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 text-emerald-800 dark:text-emerald-300 cursor-pointer'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                currentStep === 1
                  ? 'bg-purple-600 text-white'
                  : currentStep > 1
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
            </div>
            <div className="truncate">
              <span className="text-[10px] uppercase tracking-wider block opacity-75">Step 1</span>
              <span className="text-xs truncate block">Select Company</span>
            </div>
          </div>

          <div
            onClick={() => currentStep > 2 && setCurrentStep(2)}
            className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
              currentStep === 2
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-600 text-purple-900 dark:text-purple-300 font-bold'
                : currentStep > 2
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 text-emerald-800 dark:text-emerald-300 cursor-pointer'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                currentStep === 2
                  ? 'bg-purple-600 text-white'
                  : currentStep > 2
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
            </div>
            <div className="truncate">
              <span className="text-[10px] uppercase tracking-wider block opacity-75">Step 2</span>
              <span className="text-xs truncate block">Allocate Stalls</span>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
              currentStep === 3
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-600 text-purple-900 dark:text-purple-300 font-bold'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                currentStep === 3
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              3
            </div>
            <div className="truncate">
              <span className="text-[10px] uppercase tracking-wider block opacity-75">Step 3</span>
              <span className="text-xs truncate block">Confirm & Book</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1 CONTENT: SELECT COMPANY */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-600" /> Step 1: Select Exhibitor Company
                </h3>
                <p className="text-xs text-slate-500">
                  Choose an existing company from directory or quick-register a new exhibitor profile.
                </p>
              </div>

              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setCompanyMode('EXISTING')}
                  className={`px-3 py-1 rounded-md font-bold transition-all ${
                    companyMode === 'EXISTING'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Existing Directory
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyMode('NEW')}
                  className={`px-3 py-1 rounded-md font-bold transition-all ${
                    companyMode === 'NEW'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  + Quick Register New
                </button>
              </div>
            </div>

            {companyMode === 'EXISTING' ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search companies by legal name, registration code, contact person or email..."
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-purple-500/30 outline-none"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {loadingCompanies ? (
                    <div className="p-6 text-center text-xs text-slate-400">Loading company catalog...</div>
                  ) : filteredCompanies.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No matching companies found. Switch to "+ Quick Register New" to create one.
                    </div>
                  ) : (
                    filteredCompanies.map((c) => {
                      const isSelected = selectedCompanyId === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCompanyId(c.id)}
                          className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{c.name}</span>
                              {c.companyCode && (
                                <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded font-semibold">
                                  {c.companyCode}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Contact: {c.contactPerson} • Mobile: {c.mobile} • City: {c.city || 'N/A'}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 rounded-xl">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Company Legal Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Apex Industrial Technologies Ltd"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GST Number (15 chars)
                  </label>
                  <Input
                    maxLength={15}
                    placeholder="27AAAAA0000A1Z5"
                    value={newCompany.gstNumber}
                    onChange={(e) => setNewCompany({ ...newCompany, gstNumber: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Contact Person *
                  </label>
                  <Input
                    required
                    placeholder="Full Name"
                    value={newCompany.contactPerson}
                    onChange={(e) => setNewCompany({ ...newCompany, contactPerson: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number *
                  </label>
                  <Input
                    required
                    type="tel"
                    placeholder="10-digit mobile"
                    value={newCompany.mobile}
                    onChange={(e) => setNewCompany({ ...newCompany, mobile: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Corporate Email
                  </label>
                  <Input
                    type="email"
                    placeholder="sales@company.com"
                    value={newCompany.email}
                    onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Corporate Address
                  </label>
                  <Input
                    placeholder="Street / Industrial Zone"
                    value={newCompany.address}
                    onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    City
                  </label>
                  <Input
                    placeholder="City"
                    value={newCompany.city}
                    onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2 CONTENT: ALLOCATE STALLS */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" /> Step 2: Allocate Stalls
                </h3>
                <p className="text-xs text-slate-500">
                  Select one or more available floor plan stalls for <strong className="text-purple-600">{selectedCompanyName}</strong>.
                </p>
              </div>

              <div className="w-48">
                <input
                  type="text"
                  placeholder="Filter stall #..."
                  value={stallSearch}
                  onChange={(e) => setStallSearch(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>
            </div>

            {loadingDetails ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading floor plan stalls...</div>
            ) : filteredStalls.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                No available stalls found for this exhibition.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-64 overflow-y-auto p-1">
                {filteredStalls.map((s) => {
                  const isSelected = selectedStallIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleToggleStall(s.id)}
                      className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/60 shadow-xs ring-2 ring-purple-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-xs text-slate-900 dark:text-slate-100">
                          {s.stallNumber}
                        </span>
                        {isSelected ? (
                          <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">{s.areaSqFt || 9} m²</span>
                        )}
                      </div>
                      <div className="mt-2">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block truncate">
                          {s.category || 'Standard'}
                        </span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          ₹{Number(s.price).toLocaleString()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="p-3 bg-purple-50/50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800 flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-300">
                Selected Stalls: <strong className="text-purple-700 dark:text-purple-300">{selectedStallIds.length}</strong>
              </span>
              <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                Subtotal: ₹{subtotal.toLocaleString()} (+ 18% GST)
              </span>
            </div>
          </div>
        )}

        {/* STEP 3 CONTENT: CONFIRMATION & PAYMENT MODE */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" /> Step 3: Registration Confirmation & Mode
              </h3>
              <p className="text-xs text-slate-500">
                Review registration overview and choose confirmation authorization.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setConfirmDirectly(true)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  confirmDirectly
                    ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 ring-2 ring-purple-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    Immediate Confirmation
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                    Direct Allocation
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Marks stalls as <strong>BOOKED_CONFIRMED</strong> immediately. Generates tax invoice and attributes registration to your admin SP Code.
                </p>

                {confirmDirectly && (
                  <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full text-xs p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                    >
                      <option value="OFFLINE_ADMIN_DIRECT">Direct Admin Allocation (Authorized)</option>
                      <option value="OFFLINE_BANK_NEFT">Bank Transfer (NEFT / RTGS)</option>
                      <option value="OFFLINE_CHEQUE">Corporate Cheque</option>
                      <option value="OFFLINE_CASH">Cash Deposit</option>
                    </select>
                  </div>
                )}
              </div>

              <div
                onClick={() => setConfirmDirectly(false)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  !confirmDirectly
                    ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 ring-2 ring-purple-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    Provisional Reservation
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">
                    Hold Mode
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Creates an <strong>INITIATED</strong> reservation with 15-minute provisional lock for payment link delivery to exhibitor.
                </p>
              </div>
            </div>

            {/* Final Pricing Summary Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs space-y-1">
                <div className="text-slate-500">
                  Company: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedCompanyName}</span>
                </div>
                <div className="text-slate-500">
                  Allocated Stalls: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStallIds.length}</span>
                </div>
                <div className="text-slate-500">
                  Base Subtotal: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="text-slate-500">
                  GST (18%): <span className="font-mono font-bold text-slate-800 dark:text-slate-200">₹{taxAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-slate-200 sm:dark:border-slate-700 sm:pl-6">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                  Total Payable Amount
                </span>
                <span className="text-2xl font-black text-purple-700 dark:text-purple-400 font-mono">
                  ₹{grandTotal.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block">INR including 18% GST</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Step Controls */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => {
              if (currentStep > 1) {
                setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
              } else {
                onClose();
              }
            }}
            disabled={submitting}
          >
            {currentStep > 1 ? 'Back' : 'Cancel'}
          </Button>

          {currentStep === 1 && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleNextFromStep1}
              className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-6"
            >
              Next: Select Stalls →
            </Button>
          )}

          {currentStep === 2 && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleNextFromStep2}
              className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-6"
            >
              Next: Confirmation Mode →
            </Button>
          )}

          {currentStep === 3 && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleSubmit}
              isLoading={submitting}
              className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-6"
            >
              Confirm & Finalize Registration
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
