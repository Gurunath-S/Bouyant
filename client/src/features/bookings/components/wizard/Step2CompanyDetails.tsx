import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Company, Exhibition, Stall, User } from '../../../../types';
import { companyService } from '../../../../services/companies/companyService';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { Button } from '../../../../components/ui/Button';
import { SearchableCombobox } from '../../../../components/ui/SearchableCombobox';
import { ALL_COUNTRIES, getStatesForCountry, getCitiesForLocation, getStateForCity, normalizeCountryName } from '../../../../data/indianStatesCities';
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
  RotateCw,
  AtSign,
  Lock,
} from 'lucide-react';
import { authService } from '../../../../services/auth/authService';
import { useAuthStore } from '../../../../stores/authStore';

export const companySchema = z.object({
  name: z.string().min(2, 'Company Name is required'),
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_-]{3,30}$/, 'Username must be 3-30 characters (letters, numbers, underscore, hyphen only)')
    .optional()
    .or(z.literal('')),
  contactPerson: z.string().min(2, 'Contact Person Name is required'),
  designation: z.string().optional().or(z.literal('')),
  mobile: z.string().min(10, 'Valid 10-digit mobile number is required'),
  email: z.string().email('Valid corporate email address is required'),
  address: z.string().min(5, 'Corporate address is required (min 5 characters)'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pinCode: z
    .string()
    .trim()
    .refine((val) => !val || /^\d{6}$/.test(val), { message: 'PIN code must be exactly 6 digits' })
    .optional()
    .or(z.literal('')),
  country: z.string().min(2, 'Country is required').default('India'),
  gstNumber: z.string().trim().refine((val) => !val || val.length === 15, { message: 'GST Registration Number must be 15 characters' }).optional().or(z.literal('')),
  panNumber: z.string().trim().refine((val) => !val || val.length === 10, { message: 'PAN Number must be 10 characters' }).optional().or(z.literal('')),
  tanNumber: z.string().trim().refine((val) => !val || val.length === 10, { message: 'TAN Number must be 10 characters' }).optional().or(z.literal('')),
  industry: z.string().optional().or(z.literal('')),
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
  onCancel?: () => void;
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
  onCancel,
  onContinueWithSelectedCompany,
}) => {
  const [isAddingNewCompany, setIsAddingNewCompany] = useState(true);
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
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      username: '',
      contactPerson: '',
      designation: 'Exhibitor Representative',
      mobile: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pinCode: '',
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
  const watchedCategory = watch('category');
  const watchedAddress = watch('address');
  const watchedMobile = watch('mobile');
  const watchedEmail = watch('email');
  const watchedUsername = watch('username');
  const watchedGstNumber = watch('gstNumber');
  const watchedState = watch('state');
  const watchedCity = watch('city');
  const watchedCountry = watch('country');

  // Compute remaining missing fields to gate page advancement and provide visual guidance
  const missingFields = React.useMemo(() => {
    const list: string[] = [];
    if (!watchedName?.trim() || watchedName.trim().length < 2) list.push('Legal / Trade Name');
    if (!watchedCategory?.trim() || watchedCategory.trim().length < 2) list.push('Product / Service Category');
    if (!watchedContactPerson?.trim() || watchedContactPerson.trim().length < 2) list.push('Contact Person');
    if (!watchedEmail?.trim() || !watchedEmail.trim().includes('@')) list.push('Corporate Email');
    if (!watchedMobile?.trim() || watchedMobile.trim().replace(/\D/g, '').length !== 10) list.push('10-digit Mobile');
    if (!watchedAddress?.trim() || watchedAddress.trim().length < 5) list.push('Corporate Address');
    if (!watchedCountry?.trim()) list.push('Country');
    if (!watchedState?.trim()) list.push('State');
    if (!watchedCity?.trim()) list.push('City');
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') list.push('Valid Portal Username');
    return list;
  }, [
    watchedName,
    watchedCategory,
    watchedContactPerson,
    watchedEmail,
    watchedMobile,
    watchedAddress,
    watchedCountry,
    watchedState,
    watchedCity,
    usernameStatus,
  ]);

  const isFormComplete = missingFields.length === 0 && Object.keys(errors).length === 0;

  const availableStates = React.useMemo(() => {
    return getStatesForCountry(watchedCountry);
  }, [watchedCountry]);

  const availableCities = React.useMemo(() => {
    return getCitiesForLocation(watchedCountry, watchedState);
  }, [watchedCountry, watchedState]);

  const verifiedGstRef = React.useRef<string>('');

  // Determine if username belongs to an already registered/logged-in user account (Only lock for exhibitors logged into their own CLIENT account)
  const isClientUser = Boolean(user && user.role === 'CLIENT' && user.username);
  const isUsernameLocked = isClientUser;

  // Update form fields dynamically whenever `user` state changes or resets
  React.useEffect(() => {
    if (selectedCompany) {
      setValue('name', selectedCompany.name || '');
      if (isClientUser && user?.username) {
        setValue('username', user.username);
      }
      setValue('contactPerson', selectedCompany.contactPerson || user?.name || '');
      setValue('mobile', selectedCompany.mobile || user?.phone || '');
      setValue('email', selectedCompany.email || user?.email || '');
      setValue('pinCode', selectedCompany.pinCode || '');
      setValue('address', selectedCompany.address || '');
      setValue('city', selectedCompany.city || '');
      setValue('state', selectedCompany.state || '');
      setValue('country', normalizeCountryName(selectedCompany.country || 'India'));
      setValue('gstNumber', selectedCompany.gstNumber || '');
      setValue('panNumber', selectedCompany.panNumber || '');
      setValue('tanNumber', selectedCompany.tanNumber || '');
      if (selectedCompany.website) setValue('website', selectedCompany.website);
    } else if (user && user.role === 'CLIENT') {
      if (user.username) setValue('username', user.username);
      if (user.name) setValue('contactPerson', user.name);
      if (user.phone) setValue('mobile', user.phone);
      if (user.email) setValue('email', user.email);
    } else if (!selectedCompany) {
      // Clean slate with no stale data from any previous user session
      setValue('name', '');
      setValue('category', '');
      setValue('designation', '');
      setValue('username', '');
      setValue('contactPerson', '');
      setValue('mobile', '');
      setValue('email', '');
      setValue('pinCode', '');
      setValue('address', '');
      setValue('city', '');
      setValue('state', '');
      setValue('country', 'India');
      setValue('gstNumber', '');
      setValue('panNumber', '');
      setValue('tanNumber', '');
      setValue('website', '');
    }
  }, [user, selectedCompany, setValue]);

  // Automatically reset GST verified status if user modifies the GST number input
  React.useEffect(() => {
    const currentGst = (watchedGstNumber || '').trim().toUpperCase();
    if (gstVerificationSuccess && verifiedGstRef.current && currentGst !== verifiedGstRef.current) {
      setGstVerificationSuccess(false);
      setGstVerifiedDetails(null);
      setGstNotice('');
      setGstError('');
    }
  }, [watchedGstNumber, gstVerificationSuccess]);

  // Debounced check for username availability
  React.useEffect(() => {
    const rawUser = watchedUsername?.trim() || '';
    if (!rawUser) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    // If the username is locked to the logged-in client user, it is already valid and theirs
    if (isUsernameLocked || (isClientUser && user?.username && rawUser.toLowerCase() === user.username.toLowerCase())) {
      setUsernameStatus('available');
      setUsernameMessage('Current account username');
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
          if (!isUsernameManuallyEdited) {
            const clean = rawUser.replace(/_\d+$/, '').slice(0, 12);
            const fresh = `${clean}_${Math.floor(100 + Math.random() * 900)}`;
            setValue('username', fresh, { shouldValidate: true, shouldDirty: false });
          } else {
            setUsernameStatus('taken');
            setUsernameMessage(res.message || 'Username is already taken. Please choose another.');
          }
        }
      } catch (_err: any) {
        setUsernameStatus('idle');
        setUsernameMessage('');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [watchedUsername, isUsernameLocked, isClientUser, user?.username]);

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
      candidate = 'exhibitor';
    }
    const clean = candidate.slice(0, 14);
    const suffix = Math.floor(100 + Math.random() * 900);
    return `${clean}_${suffix}`.slice(0, 20);
  };

  // Auto-fill username as user types contact person or company name if not manually edited and not logged in as a Client
  React.useEffect(() => {
    if (!isUsernameManuallyEdited && !isClientUser) {
      if (watchedContactPerson || watchedName) {
        const suggested = generateSuggestedUsername(watchedContactPerson || '', watchedName || '');
        if (suggested && suggested.length >= 3) {
          setValue('username', suggested, { shouldValidate: true, shouldDirty: false });
        }
      }
    }
  }, [watchedContactPerson, watchedName, isUsernameManuallyEdited, isClientUser, setValue]);

  const handleRegenerateUsername = () => {
    const p = watchedContactPerson || watchedName || 'exhibitor';
    const clean = (p || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'exhibitor';
    const suffix = Math.floor(100 + Math.random() * 900);
    const newSuggested = `${clean}_${suffix}`;
    setIsUsernameManuallyEdited(true);
    setValue('username', newSuggested, { shouldValidate: true, shouldDirty: true });
  };


  const handleVerifyGst = async (overrideGst?: string) => {
    const rawGst = overrideGst || getValues('gstNumber') || '';
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
        verifiedGstRef.current = cleanGst;

        if (res.companyExists && res.existingCompany) {
          const comp = res.existingCompany;
          setValue('name', comp.name, { shouldValidate: true, shouldDirty: true });
          if (comp.panNumber) setValue('panNumber', comp.panNumber, { shouldValidate: true, shouldDirty: true });
          if (comp.address) setValue('address', comp.address, { shouldValidate: true, shouldDirty: true });
          if (comp.city) setValue('city', comp.city, { shouldValidate: true, shouldDirty: true });
          if (comp.state) setValue('state', comp.state, { shouldValidate: true, shouldDirty: true });
          if (comp.pinCode) setValue('pinCode', comp.pinCode, { shouldValidate: true, shouldDirty: true });
          if (comp.country) setValue('country', normalizeCountryName(comp.country || 'India'), { shouldValidate: true, shouldDirty: true });
          // Only fill contact details if user has NOT already entered them in the form
          if (!getValues('contactPerson') && comp.contactPerson) setValue('contactPerson', comp.contactPerson, { shouldValidate: true, shouldDirty: true });
          if (!getValues('mobile') && comp.mobile) setValue('mobile', comp.mobile, { shouldValidate: true, shouldDirty: true });
          if (!getValues('email') && comp.email) setValue('email', comp.email, { shouldValidate: true, shouldDirty: true });
          if (comp.website) setValue('website', comp.website || '', { shouldValidate: true, shouldDirty: true });

          onSelectCompany(comp);
          setGstNotice('GST details verified successfully.');
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#012970] dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#09539b] dark:text-blue-400" /> Corporate Exhibitor Information
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {selectedStalls.length > 0 ? (
              <>
                Selected: <b className="text-[#09539b] dark:text-blue-400 font-mono">Stall {selectedStalls.map((s) => '#' + s.stallNumber).join(', ')}</b> ({Math.round(selectedStalls.reduce((sum, s) => sum + s.areaSqFt, 0))} Sq.Ft, ₹{selectedStalls.reduce((sum, s) => sum + Number(s.price), 0).toLocaleString()}) •{' '}
              </>
            ) : null}
            Fill in your corporate details below. Login is optional — an account with password will be auto-generated upon payment.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back to Stall Selection
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="text-xs font-bold bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
            >
              Cancel Booking
            </Button>
          )}
        </div>
      </div>

      {/* Existing Registered Company Cards (If Logged In) */}
      {companies.length > 0 && !isAddingNewCompany && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Select Saved Corporate Profile:</label>
            <button
              onClick={() => setIsAddingNewCompany(true)}
              className="text-xs font-bold text-[#09539b] dark:text-blue-400 hover:underline flex items-center gap-1"
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
                    ? 'bg-[#f6f9ff] dark:bg-blue-950/40 border-[#09539b] dark:border-blue-500 ring-2 ring-[#09539b] dark:ring-blue-500'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-extrabold text-[#012970] dark:text-slate-100">{c.name}</h4>
                    {selectedCompany?.id === c.id && (
                      <span className="p-1 bg-[#09539b] text-white rounded-full">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Code: {c.companyCode}</p>
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p>
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Reg No:</span>{' '}
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded text-[11px]">
                      {c.regNo || assignedRegNo || 'Pending'}
                    </span>
                  </p>
                  <p><span className="font-semibold text-slate-500 dark:text-slate-400">GSTIN:</span> {c.gstNumber || 'N/A'}</p>
                  <p><span className="font-semibold text-slate-500 dark:text-slate-400">Contact:</span> {c.contactPerson} ({c.email})</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
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
              className="text-xs font-semibold text-[#09539b] dark:text-blue-400 hover:underline mb-2 block"
            >
              ← Select Existing Saved Company
            </button>
          )}

          {/* GSTIN Verification Header Card */}
          <div className="bg-[#f6f9ff] dark:bg-slate-800/60 border-2 border-blue-200 dark:border-blue-900/60 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#09539b] dark:text-blue-400" />
                  <h4 className="text-sm font-bold text-[#012970] dark:text-slate-100">GSTIN Verification & Auto-Fill</h4>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Official Tax Entity
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter your 15-character GSTIN to auto-fetch legal company name, PAN, and tax address.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. 27AAACT1029F1Z5"
                  maxLength={15}
                  {...register('gstNumber', {
                    onChange: (e) => {
                      const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
                      e.target.value = upper;
                      setValue('gstNumber', upper, { shouldValidate: true, shouldDirty: true });
                    },
                  })}
                  className="w-48 sm:w-56 px-3 py-2 text-xs font-mono font-bold tracking-wider uppercase border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#09539b] focus:border-[#09539b] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleVerifyGst()}
                  isLoading={isVerifyingGst}
                  leftIcon={gstVerificationSuccess ? <CheckCircle2 className="w-4 h-4 text-white" /> : <ShieldCheck className="w-4 h-4 text-white" />}
                  className={
                    gstVerificationSuccess
                      ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs shrink-0 h-9 px-3.5 shadow-sm border border-emerald-600 transition-colors"
                      : "bg-[#09539b] hover:bg-[#012970] text-white font-semibold text-xs shrink-0 h-9 px-3.5 shadow-sm transition-colors"
                  }
                >
                  {gstVerificationSuccess ? 'GST Verified' : 'Verify GST'}
                </Button>
              </div>
            </div>

            {errors.gstNumber && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{errors.gstNumber.message}</p>}

            {/* Verified Details Card */}
            {gstVerificationSuccess && gstVerifiedDetails && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Verified Entity: {gstVerifiedDetails.legalName || gstVerifiedDetails.tradeName}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-700">
                    Status: {gstVerifiedDetails.status || 'Active'}
                  </span>
                </div>
                {assignedRegNo && (
                  <div className="flex items-center gap-2 pl-6 py-1">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200">Assigned Reg No:</span>
                    <span className="font-mono font-extrabold bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-700 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded text-[11px] shadow-xs">
                      {assignedRegNo}
                    </span>
                  </div>
                )}
                <p className="text-emerald-800 dark:text-emerald-300 text-[11px] pl-6">
                  <span className="font-semibold">Registered Location:</span> {gstVerifiedDetails.address}, {gstVerifiedDetails.city}, {gstVerifiedDetails.state} - {gstVerifiedDetails.pincode}
                </p>
              </div>
            )}

            {gstNotice && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-300 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <span className="font-medium">{gstNotice}</span>
              </div>
            )}

            {gstError && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span className="font-medium">{gstError}</span>
              </div>
            )}
          </div>

          {/* Form Fields Grid — Clean 2-Column Grid with No Empty Gaps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Row 1: Full-width Company Legal / Trade Name */}
            <div className="sm:col-span-2">
              <Input label="Official Legal / Trade Name *" placeholder="Enter complete registered company name" error={errors.name?.message} {...register('name')} />
            </div>

            {/* Row 2: Product / Service Category & Authorized Contact Person */}
            <Input label="Product / Service Category *" placeholder="e.g. Industrial Automation / Water Tech" error={errors.category?.message} {...register('category')} />
            <Input label="Authorized Contact Person *" placeholder="e.g. Rajesh Sharma" error={errors.contactPerson?.message} {...register('contactPerson')} />

            {/* Row 3: Corporate Email & Mobile Number */}
            <Input label="Corporate Email Address *" type="email" placeholder="contact@company.com" error={errors.email?.message} {...register('email')} />
            <Input
              label="Mobile Number (10 digits) *"
              placeholder="9876543210"
              maxLength={10}
              type="tel"
              error={errors.mobile?.message}
              {...register('mobile', {
                onChange: (e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  e.target.value = digits;
                  setValue('mobile', digits, { shouldValidate: true, shouldDirty: true });
                },
              })}
            />

            {/* Row 4: Portal Username & Corporate Website */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-[#09539b] dark:text-blue-400" />
                  Portal Username
                  {isUsernameLocked ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      <Lock className="w-2.5 h-2.5 text-slate-500" /> Existing Account
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  )}
                </label>
                {!isUsernameLocked && (
                  <button
                    type="button"
                    onClick={handleRegenerateUsername}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#09539b] dark:text-blue-400 hover:underline cursor-pointer"
                    title="Generate another unique username suggestion"
                  >
                    <RotateCw className="w-3 h-3 text-[#09539b] dark:text-blue-400" /> Suggest
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. john_acme26"
                  maxLength={30}
                  readOnly={isUsernameLocked}
                  {...register('username', {
                    onChange: () => {
                      if (!isUsernameLocked) setIsUsernameManuallyEdited(true);
                    },
                  })}
                  className={`w-full px-3.5 py-2 text-xs font-mono font-medium rounded-lg border transition-colors pr-20 ${
                    isUsernameLocked
                      ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed select-none'
                      : errors.username || usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : usernameStatus === 'available'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                      : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:border-[#09539b] focus:ring-1 focus:ring-[#09539b]'
                  }`}
                />

                {/* Right Status Badge */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] pointer-events-none">
                  {isUsernameLocked ? (
                    <span className="text-slate-500 dark:text-slate-400 font-bold bg-slate-200 dark:bg-slate-700/80 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  ) : usernameStatus === 'checking' ? (
                    <span className="flex items-center gap-0.5 text-slate-400 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin text-[#09539b]" />
                    </span>
                  ) : usernameStatus === 'available' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      ✓ Available
                    </span>
                  ) : usernameStatus === 'taken' ? (
                    <span className="text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/60 px-1 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                      Taken
                    </span>
                  ) : null}
                </div>
              </div>

              {!isUsernameLocked && errors.username ? (
                <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{errors.username.message}</p>
              ) : !isUsernameLocked && usernameMessage && (usernameStatus === 'taken' || usernameStatus === 'invalid') ? (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">{usernameMessage}</p>
              ) : null}
            </div>
            <Input label="Official Corporate Website (Optional)" placeholder="https://example.com" error={errors.website?.message} {...register('website')} />

            {/* Row 5: Tax Identifiers (PAN & TAN) Paired Side-by-Side */}
            <Input
              label="Permanent Account Number (PAN) (Optional)"
              placeholder="e.g. AAACT1029F"
              maxLength={10}
              className="font-mono uppercase tracking-wider"
              error={errors.panNumber?.message}
              {...register('panNumber', {
                onChange: (e) => {
                  const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                  e.target.value = upper;
                  setValue('panNumber', upper, { shouldValidate: true, shouldDirty: true });
                },
              })}
            />
            <Input
              label="Tax Deduction Account Number (TAN) (Optional)"
              placeholder="e.g. DELT12345E"
              maxLength={10}
              className="font-mono uppercase tracking-wider"
              error={errors.tanNumber?.message}
              {...register('tanNumber', {
                onChange: (e) => {
                  const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                  e.target.value = upper;
                  setValue('tanNumber', upper, { shouldValidate: true, shouldDirty: true });
                },
              })}
            />
          </div>

          <div>
            <Textarea
              label="Registered Corporate Address *"
              rows={3}
              placeholder="Enter complete building name, street address, and area..."
              error={errors.address?.message}
              {...register('address')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SearchableCombobox
              label="Country"
              required
              value={normalizeCountryName(watchedCountry || 'India')}
              onChange={(val) => {
                const normVal = normalizeCountryName(val);
                setValue('country', normVal, { shouldValidate: true, shouldDirty: true });
                const newStates = getStatesForCountry(normVal);
                if (watchedState && !newStates.some((s) => s.toLowerCase() === (watchedState || '').toLowerCase())) {
                  setValue('state', '', { shouldValidate: true, shouldDirty: true });
                  setValue('city', '', { shouldValidate: true, shouldDirty: true });
                }
              }}
              options={ALL_COUNTRIES}
              placeholder="Select or type Country..."
              error={errors.country?.message}
            />
            <SearchableCombobox
              label="State / Province"
              required
              value={watchedState ?? ''}
              onChange={(val) => {
                setValue('state', val, { shouldValidate: true, shouldDirty: true });
              }}
              options={availableStates}
              placeholder="Select or type State..."
              error={errors.state?.message}
            />
            <SearchableCombobox
              label="City"
              required
              value={watchedCity ?? ''}
              onChange={(val) => {
                setValue('city', val, { shouldValidate: true, shouldDirty: true });
                // If state is not selected yet, auto-detect the state from city
                if (!watchedState && val) {
                  const detectedState = getStateForCity(val, watchedCountry);
                  if (detectedState) {
                    setValue('state', detectedState, { shouldValidate: true, shouldDirty: true });
                  }
                }
              }}
              options={availableCities}
              placeholder="Select or type City..."
              error={errors.city?.message}
            />
            <Input
              label="PIN Code (6 digits) (Optional)"
              maxLength={6}
              type="tel"
              placeholder="e.g. 400051"
              error={errors.pinCode?.message}
              {...register('pinCode', {
                onChange: (e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                  e.target.value = digits;
                  setValue('pinCode', digits, { shouldValidate: true, shouldDirty: true });
                },
              })}
            />
          </div>


          {/* Required Fields Completion Status Notice */}
          {missingFields.length > 0 && (
            <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200 text-xs font-semibold rounded-xl flex items-start gap-2.5 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Required fields to proceed:</span>{' '}
                <span className="font-medium text-amber-800 dark:text-amber-300">
                  {missingFields.join(' • ')}
                </span>
              </div>
            </div>
          )}

          {/* Missing Fields Error Alert */}
          {Object.keys(errors).length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Please fill all required fields ({Object.values(errors).map((e) => e.message).filter(Boolean).join(', ')}) before continuing.
              </span>
            </div>
          )}

          <div className="pt-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onBack}
              className="border-2 border-slate-300 dark:border-slate-700 font-bold px-6 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Stall Selection
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!isFormComplete || isSubmitting}
              isLoading={isSubmitting}
              className={`font-bold transition-all shadow-sm ${
                !isFormComplete
                  ? 'opacity-50 cursor-not-allowed bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                  : 'bg-[#09539b] hover:bg-[#012970] text-white cursor-pointer'
              }`}
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
