import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Company, Exhibition, Stall, User } from '../../../../types';
import { companyService } from '../../../../services/companies/companyService';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Plus,
  Check,
  Loader2,
  Sparkles,
  AtSign,
} from 'lucide-react';
import { authService } from '../../../../services/auth/authService';

export const companySchema = z.object({
  name: z.string().min(2, 'Company Name is required'),
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_-]{3,30}$/, 'Username must be 3-30 characters (letters, numbers, underscore, hyphen only)')
    .optional()
    .or(z.literal('')),
  contactPerson: z.string().min(2, 'Contact Person Name is required'),
  designation: z.string().min(2, 'Designation is required'),
  mobile: z.string().min(10, 'Valid 10-digit mobile number is required'),
  email: z.string().email('Valid corporate email address is required'),
  address: z.string().min(5, 'Corporate address is required (min 5 characters)'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pinCode: z.string().regex(/^\d{6}$/, 'PIN code must be exactly 6 digits'),
  country: z.string().optional().default('India'),
  gstNumber: z.string().trim().refine((val) => !val || val.length === 15, { message: 'GST Registration Number must be 15 characters' }).optional().or(z.literal('')),
  panNumber: z.string().trim().refine((val) => !val || val.length === 10, { message: 'PAN Number must be 10 characters' }).optional().or(z.literal('')),
  tanNumber: z.string().trim().refine((val) => !val || val.length === 10, { message: 'TAN Number must be 10 characters' }).optional().or(z.literal('')),
  industry: z.string().min(2, 'Industry sector is required'),
  category: z.string().min(2, 'Product/Service Category is required'),
  website: z.string().optional(),
});

export type CompanyFormData = z.infer<typeof companySchema>;

interface Step2CompanyDetailsProps {
  user: User | null;
  exhibition: Exhibition;
  selectedStalls: Stall[];
  companies: Company[];
  selectedCompany: Company | null;
  assignedRegNo: string;
  onSelectCompany: (company: Company) => void;
  onSubmitCompanyForm: (data: CompanyFormData) => Promise<void>;
  onBack: () => void;
  onContinueWithSelectedCompany: () => void;
}

export const Step2CompanyDetails: React.FC<Step2CompanyDetailsProps> = ({
  user,
  exhibition,
  selectedStalls,
  companies,
  selectedCompany,
  assignedRegNo,
  onSelectCompany,
  onSubmitCompanyForm,
  onBack,
  onContinueWithSelectedCompany,
}) => {
  const [isAddingNewCompany, setIsAddingNewCompany] = useState(false);
  const [isVerifyingGst, setIsVerifyingGst] = useState(false);
  const [gstVerificationSuccess, setGstVerificationSuccess] = useState(false);
  const [gstVerifiedDetails, setGstVerifiedDetails] = useState<any>(null);
  const [gstError, setGstError] = useState('');
  const [gstNotice, setGstNotice] = useState('');

  // Username auto-suggestion & real-time uniqueness validation state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [isUsernameManuallyEdited, setIsUsernameManuallyEdited] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: user?.company?.name || '',
      username: user?.username || '',
      contactPerson: user?.name || '',
      designation: 'Exhibitor Representative',
      mobile: user?.phone || '',
      email: user?.email || '',
      address: '',
      city: '',
      state: '',
      pinCode: user?.company?.pinCode || '',
      country: 'India',
      gstNumber: '',
      panNumber: '',
      tanNumber: '',
      industry: 'Technology & Manufacturing',
      category: 'Exhibitor / Booth',
      website: '',
    },
  });

  const watchedContactPerson = watch('contactPerson');
  const watchedName = watch('name');
  const watchedUsername = watch('username');

  // Debounced check for username availability
  React.useEffect(() => {
    const rawUser = watchedUsername?.trim() || '';
    if (!rawUser) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(rawUser)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Username must be 3-30 characters (letters, numbers, _ or - only).');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    const timer = setTimeout(async () => {
      try {
        const res = await authService.checkUsernameAvailability(rawUser);
        if (res.available) {
          setUsernameStatus('available');
          setUsernameMessage('Username is available!');
        } else {
          setUsernameStatus('taken');
          setUsernameMessage(res.message || 'Username is already taken. Please choose another.');
        }
      } catch (err: any) {
        setUsernameStatus('idle');
        setUsernameMessage('');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [watchedUsername]);

  // Helper to generate a clean username suggestion
  const generateSuggestedUsername = (person: string, companyName: string) => {
    const pPart = (person || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cPart = (companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
    let candidate = '';
    if (pPart && cPart) {
      candidate = `${pPart}_${cPart}`;
    } else if (pPart) {
      candidate = pPart;
    } else if (cPart) {
      candidate = `user_${cPart}`;
    } else {
      candidate = `exhibitor_${Math.floor(100 + Math.random() * 900)}`;
    }
    return candidate.slice(0, 20);
  };

  // Auto-fill username as user types contact person or company name if not manually edited
  React.useEffect(() => {
    if (!isUsernameManuallyEdited && !user?.username) {
      if (watchedContactPerson || watchedName) {
        const suggested = generateSuggestedUsername(watchedContactPerson || '', watchedName || '');
        if (suggested && suggested.length >= 3) {
          setValue('username', suggested, { shouldValidate: true, shouldDirty: false });
        }
      }
    }
  }, [watchedContactPerson, watchedName, isUsernameManuallyEdited, user?.username, setValue]);

  const handleRegenerateUsername = () => {
    const p = watchedContactPerson || 'user';
    const clean = (p || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'user';
    const suffix = Math.floor(100 + Math.random() * 900);
    const newSuggested = `${clean}_${suffix}`;
    setIsUsernameManuallyEdited(true);
    setValue('username', newSuggested, { shouldValidate: true, shouldDirty: true });
  };


  const handleVerifyGst = async (overrideGst?: string) => {
    const rawGst = overrideGst || watch('gstNumber') || '';
    const cleanGst = rawGst.trim().toUpperCase();

    if (!cleanGst || cleanGst.length !== 15) {
      setGstError('Please enter a full 15-character GSTIN (e.g. 27AAACT1029F1Z5).');
      setGstNotice('');
      return;
    }

    try {
      setIsVerifyingGst(true);
      setGstError('');
      setGstNotice('');
      setGstVerificationSuccess(false);

      const edition = exhibition?.edition;
      const eventCode = exhibition?.eventCode;
      const spcode = exhibition?.spcode;
      const year = exhibition?.startDate ? new Date(exhibition.startDate).getFullYear().toString().slice(-2) : undefined;
      const res = await companyService.verifyGst(cleanGst, edition || undefined, eventCode || undefined, spcode || undefined, year);

      if (res && res.gstVerified) {
        setGstVerificationSuccess(true);
        setGstVerifiedDetails(res.gstDetails);

        if (res.companyExists && res.existingCompany) {
          const comp = res.existingCompany;
          setValue('name', comp.name, { shouldValidate: true, shouldDirty: true });
          if (comp.panNumber) setValue('panNumber', comp.panNumber, { shouldValidate: true, shouldDirty: true });
          if (comp.contactPerson) setValue('contactPerson', comp.contactPerson, { shouldValidate: true, shouldDirty: true });
          if (comp.mobile) setValue('mobile', comp.mobile, { shouldValidate: true, shouldDirty: true });
          if (comp.email) setValue('email', comp.email, { shouldValidate: true, shouldDirty: true });
          if (comp.address) setValue('address', comp.address, { shouldValidate: true, shouldDirty: true });
          if (comp.city) setValue('city', comp.city, { shouldValidate: true, shouldDirty: true });
          if (comp.state) setValue('state', comp.state, { shouldValidate: true, shouldDirty: true });
          if (comp.pinCode) setValue('pinCode', comp.pinCode, { shouldValidate: true, shouldDirty: true });
          if (comp.country) setValue('country', comp.country || 'India', { shouldValidate: true, shouldDirty: true });
          if (comp.industry) setValue('industry', comp.industry, { shouldValidate: true, shouldDirty: true });
          if (comp.website) setValue('website', comp.website || '', { shouldValidate: true, shouldDirty: true });

          onSelectCompany(comp);
          setGstNotice('Existing Registered Profile: Company details verified and loaded from database.');
        } else if (res.gstDetails) {
          const officialName = res.gstDetails.legalName || res.gstDetails.tradeName;
          if (officialName) setValue('name', officialName, { shouldValidate: true, shouldDirty: true });
          if (res.gstDetails.pan) setValue('panNumber', res.gstDetails.pan, { shouldValidate: true, shouldDirty: true });
          if (res.gstDetails.address) setValue('address', res.gstDetails.address, { shouldValidate: true, shouldDirty: true });
          if (res.gstDetails.city) setValue('city', res.gstDetails.city, { shouldValidate: true, shouldDirty: true });
          if (res.gstDetails.state) setValue('state', res.gstDetails.state, { shouldValidate: true, shouldDirty: true });
          if (res.gstDetails.pincode) setValue('pinCode', res.gstDetails.pincode, { shouldValidate: true, shouldDirty: true });
          setValue('country', 'India', { shouldValidate: true, shouldDirty: true });
          setGstNotice('');
        }
      } else {
        setGstError('GST verification failed. Please check the 15-character GST number.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'GST verification request failed.';
      setGstError(msg);
      setGstVerificationSuccess(false);
    } finally {
      setIsVerifyingGst(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#012970] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#09539b]" /> Corporate Exhibitor Information
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {selectedStalls.length > 0 ? (
              <>
                Selected: <b className="text-[#09539b] font-mono">Stall {selectedStalls.map((s) => '#' + s.stallNumber).join(', ')}</b> ({selectedStalls.reduce((sum, s) => sum + s.areaSqFt, 0)} Sq.Ft, ₹{selectedStalls.reduce((sum, s) => sum + Number(s.price), 0).toLocaleString()}) •{' '}
              </>
            ) : null}
            Fill in your corporate details below. Login is optional — an account with password will be auto-generated upon payment.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
          Change Stall
        </Button>
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
                onClick={() => onSelectCompany(c)}
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
                  <p>
                    <span className="font-semibold text-slate-500">Reg No:</span>{' '}
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[11px]">
                      {c.regNo || assignedRegNo || 'Pending'}
                    </span>
                  </p>
                  <p><span className="font-semibold text-slate-500">GSTIN:</span> {c.gstNumber || 'N/A'}</p>
                  <p><span className="font-semibold text-slate-500">Contact:</span> {c.contactPerson} ({c.email})</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-between items-center border-t border-slate-100">
            <Button variant="outline" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Stall Selection
            </Button>
            <Button
              variant="primary"
              size="lg"
              disabled={!selectedCompany}
              onClick={onContinueWithSelectedCompany}
              className="bg-[#09539b] hover:bg-[#012970] font-bold"
              rightIcon={<ArrowRight className="w-4 h-4 text-[#9cc542]" />}
            >
              Continue to Tax Review & Contract
            </Button>
          </div>
        </div>
      )}

      {/* Guest / New Company Details Form */}
      {(companies.length === 0 || isAddingNewCompany) && (
        <form onSubmit={handleSubmit(onSubmitCompanyForm)} className="space-y-5">
          {companies.length > 0 && (
            <button
              type="button"
              onClick={() => setIsAddingNewCompany(false)}
              className="text-xs font-semibold text-[#09539b] hover:underline mb-2 block"
            >
              ← Select Existing Saved Company
            </button>
          )}

          {/* GSTIN Verification Header Card */}
          <div className="bg-[#f6f9ff] border-2 border-blue-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#09539b]" />
                  <h4 className="text-sm font-bold text-[#012970]">GSTIN Verification & Auto-Fill</h4>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Official Tax Entity
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Enter your 15-character GSTIN to auto-fetch legal company name, PAN, and tax address.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. 27AAACT1029F1Z5"
                  maxLength={15}
                  {...register('gstNumber')}
                  className="w-48 sm:w-56 px-3 py-2 text-xs font-mono font-bold tracking-wider uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#09539b] focus:border-[#09539b] bg-white shadow-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleVerifyGst()}
                  isLoading={isVerifyingGst}
                  className="bg-[#09539b] hover:bg-[#012970] text-white font-semibold text-xs shrink-0"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Verify GST
                </Button>
              </div>
            </div>

            {errors.gstNumber && <p className="text-xs text-red-600 font-medium">{errors.gstNumber.message}</p>}

            {/* Verified Details Card */}
            {gstVerificationSuccess && gstVerifiedDetails && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Verified Entity: {gstVerifiedDetails.legalName || gstVerifiedDetails.tradeName}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-200 text-emerald-900 border border-emerald-300">
                    Status: {gstVerifiedDetails.status || 'Active'}
                  </span>
                </div>
                {assignedRegNo && (
                  <div className="flex items-center gap-2 pl-6 py-1">
                    <span className="font-bold text-emerald-900">Assigned Reg No:</span>
                    <span className="font-mono font-extrabold bg-white border border-emerald-400 text-indigo-800 px-2 py-0.5 rounded text-[11px] shadow-xs">
                      {assignedRegNo}
                    </span>
                  </div>
                )}
                <p className="text-emerald-800 text-[11px] pl-6">
                  <span className="font-semibold">Registered Location:</span> {gstVerifiedDetails.address}, {gstVerifiedDetails.city}, {gstVerifiedDetails.state} - {gstVerifiedDetails.pincode}
                </p>
              </div>
            )}

            {gstNotice && (
              <div className="p-3 bg-blue-50 border border-blue-300 text-blue-900 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span className="font-medium">{gstNotice}</span>
              </div>
            )}

            {gstError && (
              <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-medium">{gstError}</span>
              </div>
            )}
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Official Legal / Trade Name *" error={errors.name?.message} {...register('name')} />
            <Input label="Permanent Account Number (PAN) *" placeholder="e.g. AAACT1029F" maxLength={10} error={errors.panNumber?.message} {...register('panNumber')} />
            <Input label="Authorized Contact Person *" error={errors.contactPerson?.message} {...register('contactPerson')} />
            <Input label="Designation / Role *" error={errors.designation?.message} {...register('designation')} />
            <Input label="Mobile Number (10 digits) *" placeholder="9876543210" error={errors.mobile?.message} {...register('mobile')} />
            <Input label="Corporate Email Address *" type="email" error={errors.email?.message} {...register('email')} />

            {/* Portal Username Field with Real-Time Uniqueness Verification & Auto-Generation */}
            <div className="sm:col-span-2 bg-[#f8faff] border border-blue-100 rounded-xl p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-[#012970] flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5 text-[#09539b]" />
                    Exhibitor Portal Username <span className="text-slate-400 font-normal">(Auto-generated & Customizable)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Unique handle for logging in, downloading badges & tax receipts. You can also sign in with your email.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateUsername}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#09539b] hover:text-[#012970] bg-white border border-blue-200 hover:border-blue-400 px-2.5 py-1 rounded-lg shadow-2xs transition-colors shrink-0"
                  title="Generate another unique username suggestion"
                >
                  <Sparkles className="w-3 h-3 text-[#9cc542]" /> Suggest New
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. john_acme26"
                  maxLength={30}
                  {...register('username', {
                    onChange: () => setIsUsernameManuallyEdited(true),
                  })}
                  className={`w-full px-3.5 py-2 text-xs font-mono font-medium rounded-lg border bg-white shadow-2xs transition-colors pr-24 ${
                    errors.username || usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : usernameStatus === 'available'
                      ? 'border-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                      : 'border-slate-300 focus:border-[#09539b] focus:ring-1 focus:ring-[#09539b]'
                  }`}
                />

                {/* Right Status Badge */}
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] pointer-events-none">
                  {usernameStatus === 'checking' && (
                    <span className="flex items-center gap-1 text-slate-400 font-medium animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#09539b]" /> Checking
                    </span>
                  )}
                  {usernameStatus === 'available' && (
                    <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Available
                    </span>
                  )}
                  {usernameStatus === 'taken' && (
                    <span className="flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Taken
                    </span>
                  )}
                </div>
              </div>

              {/* Status or Validation message */}
              {errors.username ? (
                <p className="text-[11px] text-red-600 font-medium">{errors.username.message}</p>
              ) : usernameMessage && usernameStatus !== 'idle' ? (
                <p
                  className={`text-[11px] font-medium flex items-center gap-1 ${
                    usernameStatus === 'available'
                      ? 'text-emerald-700'
                      : usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? 'text-rose-600'
                      : 'text-slate-500'
                  }`}
                >
                  {usernameMessage}
                </p>
              ) : null}
            </div>

            <Input label="Tax Deduction Account Number (TAN) (Optional)" placeholder="e.g. DELT12345E" maxLength={10} error={errors.tanNumber?.message} {...register('tanNumber')} />
            <Input label="Industry Sector *" error={errors.industry?.message} {...register('industry')} />
            <Input label="Product / Service Category *" error={errors.category?.message} {...register('category')} />
            <Input label="Official Corporate Website" placeholder="https://" error={errors.website?.message} {...register('website')} />
            <Input label="PIN Code (6 digits) *" maxLength={6} placeholder="e.g. 400051" error={errors.pinCode?.message} {...register('pinCode')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Registered Corporate Address *" error={errors.address?.message} {...register('address')} />
            <Input label="City *" error={errors.city?.message} {...register('city')} />
            <Input label="State / Province *" error={errors.state?.message} {...register('state')} />
          </div>


          {/* Missing Fields Error Alert */}
          {Object.keys(errors).length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Please fill all required fields ({Object.values(errors).map((e) => e.message).filter(Boolean).join(', ')}) before continuing.
              </span>
            </div>
          )}

          <div className="pt-4 flex justify-between items-center border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Stall Selection
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="bg-[#09539b] hover:bg-[#012970] font-bold"
              rightIcon={<ArrowRight className="w-4 h-4 text-[#9cc542]" />}
            >
              Save & Continue to Tax Review & Contract
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
