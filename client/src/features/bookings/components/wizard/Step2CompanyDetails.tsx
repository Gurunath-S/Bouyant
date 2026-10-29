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
import {
  ALL_COUNTRIES,
  getStatesForCountry,
  getCitiesForLocation,
  getStateForCity,
  normalizeCountryName,
  extractCleanCityAndAddress,
} from '../../../../data/indianStatesCities';
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
  LogIn,
  Search,
  Edit3,
} from 'lucide-react';
import { authService } from '../../../../services/auth/authService';

export interface RecognizedExhibitorAccount {
  username: string;
  email: string;
  phone: string;
  gstNumber: string;
  name?: string;
}

const RESERVED_ADMIN_USERNAMES = new Set(['superadmin', 'admin', 'staff', 'operations', 'staffops']);

export function isExhibitorUsernameValid(username?: string | null): boolean {
  if (!username) return false;
  return !RESERVED_ADMIN_USERNAMES.has(username.trim().toLowerCase());
}

export const generateSuggestedUsername = (person: string, companyName: string): string => {
  const raw = (person || companyName || '').trim().toLowerCase();
  const tokens = raw.replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const filteredTokens =
    tokens.length > 2 && ['dr', 'mr', 'ms', 'mrs', 'prof'].includes(tokens[0])
      ? tokens.slice(1)
      : tokens;

  if (filteredTokens.length >= 2) {
    const first = filteredTokens[0].slice(0, 14);
    const last = filteredTokens[filteredTokens.length - 1].slice(0, 14);
    return `${first}.${last}`.slice(0, 25);
  }
  if (filteredTokens.length === 1) {
    const single = filteredTokens[0].slice(0, 25);
    return single.length >= 3 ? single : `${single}.user`;
  }
  return 'exhibitor';
};

export const companySchema = z.object({
  name: z.string().min(2, 'Company Name is required'),
  username: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true;
        const clean = val.toLowerCase();
        return (
          clean.length >= 3 &&
          clean.length <= 30 &&
          /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(clean) &&
          !/\.{2,}/.test(clean)
        );
      },
      {
        message:
          'Username must be 3-30 characters (letters, numbers, hyphens, underscores, dots without leading/trailing symbols or consecutive dots)',
      }
    )
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
  onSelectCompany: (company: Company | null) => void;
  onSubmitCompanyForm: (data: CompanyFormData) => Promise<void>;
  onBack: () => void;
  onCancel?: () => void;
  onContinueWithSelectedCompany: () => void;
  onOpenLoginModal?: (email?: string) => void;
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
  onOpenLoginModal,
}) => {
  const isPrivilegedUser = Boolean(
    user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN' || user.role === 'STAFF')
  );
  const [isAddingNewCompany, setIsAddingNewCompany] = useState(companies.length === 0 && !selectedCompany);
  const [privilegedCompanySearch, setPrivilegedCompanySearch] = useState('');
  const [isChangingCompany, setIsChangingCompany] = useState(false);
  const [isEditingExistingCompany, setIsEditingExistingCompany] = useState(false);

  const filteredPrivilegedCompanies = React.useMemo(() => {
    if (!privilegedCompanySearch.trim()) return companies;
    const q = privilegedCompanySearch.toLowerCase().trim();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.companyCode && c.companyCode.toLowerCase().includes(q)) ||
        (c.gstNumber && c.gstNumber.toLowerCase().includes(q)) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.regNo && c.regNo.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
    );
  }, [companies, privilegedCompanySearch]);

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
    reset,
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
    if (usernameStatus === 'invalid') list.push('Valid Portal Username');
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
  const existingAccountUsernameRef = React.useRef<string | null>(null);

  // Recognized existing exhibitor account state and tracking refs
  const [recognizedAccount, setRecognizedAccount] = useState<RecognizedExhibitorAccount | null>(null);
  const recognizedAccountRef = React.useRef<RecognizedExhibitorAccount | null>(null);
  const lookupSeqRef = React.useRef<number>(0);
  const previousGstRef = React.useRef<string>('');
  const wasRecognizedRef = React.useRef<boolean>(false);

  // Determine if username belongs to an already registered/logged-in user account
  const isClientUser = Boolean(user && user.role === 'CLIENT' && user.username);

  const cleanWatchedEmail = (watchedEmail || '').trim().toLowerCase();
  const cleanWatchedPhone = (watchedMobile || '').replace(/\D/g, '').slice(-10);
  const cleanWatchedGst = (watchedGstNumber || '').trim().toUpperCase();

  // Evaluates whether current contact inputs match the recognized exhibitor account under the verified company
  const isExistingExhibitorMatch = Boolean(
    recognizedAccount &&
    cleanWatchedGst &&
    recognizedAccount.gstNumber === cleanWatchedGst &&
    cleanWatchedEmail &&
    cleanWatchedEmail.includes('@') &&
    recognizedAccount.email === cleanWatchedEmail &&
    cleanWatchedPhone &&
    cleanWatchedPhone.length === 10 &&
    recognizedAccount.phone === cleanWatchedPhone
  );

  const isUsernameLocked = isClientUser || isExistingExhibitorMatch;

  // Update form fields dynamically whenever `user` state changes or resets
  React.useEffect(() => {
    // If registering a brand new company, do not populate from previously selected company
    if (isAddingNewCompany && !isEditingExistingCompany) {
      return;
    }
    if (selectedCompany) {
      setValue('name', selectedCompany.name || '');
      if (isClientUser && user?.username) {
        setValue('username', user.username);
      } else if ((selectedCompany as any).username) {
        const compUser = (selectedCompany as any).username;
        const compEmail = (selectedCompany.email || '').trim().toLowerCase();
        const compPhone = (selectedCompany.mobile || '').replace(/\D/g, '').slice(-10);
        const compGst = (selectedCompany.gstNumber || '').trim().toUpperCase();

        if (compUser && isExhibitorUsernameValid(compUser) && compEmail && compPhone) {
          const rec: RecognizedExhibitorAccount = {
            username: compUser,
            email: compEmail,
            phone: compPhone,
            gstNumber: compGst,
            name: selectedCompany.contactPerson,
          };
          setRecognizedAccount(rec);
          recognizedAccountRef.current = rec;
          existingAccountUsernameRef.current = compUser;
        }

        const currentContactPerson = getValues('contactPerson');
        const currentMobile = getValues('mobile');
        const currentEmail = getValues('email');
        const normEmail = (currentEmail || selectedCompany.email || '').trim().toLowerCase();
        const normPhone = (currentMobile || selectedCompany.mobile || '').replace(/\D/g, '').slice(-10);

        if (normEmail === compEmail && normPhone === compPhone) {
          setValue('username', compUser, { shouldValidate: true });
          setUsernameStatus('available');
          setUsernameMessage(`Existing exhibitor account recognized (${compUser}). You can continue directly as a guest.`);
          wasRecognizedRef.current = true;
        } else {
          const suggested = generateSuggestedUsername(currentContactPerson || '', selectedCompany.name || '');
          if (suggested && suggested.length >= 3) {
            setValue('username', suggested, { shouldValidate: true });
          }
        }
      }

      // Preserve current user's or manually entered guest contact details!
      // Do NOT overwrite current employee's contact person, mobile, or email with company master data
      if (user && user.role === 'CLIENT') {
        setValue('contactPerson', user.name || getValues('contactPerson') || selectedCompany.contactPerson || '');
        setValue('mobile', user.phone || getValues('mobile') || selectedCompany.mobile || '');
        setValue('email', user.email || getValues('email') || selectedCompany.email || '');
      } else {
        const currentContactPerson = getValues('contactPerson');
        const currentMobile = getValues('mobile');
        const currentEmail = getValues('email');
        setValue('contactPerson', currentContactPerson || selectedCompany.contactPerson || '');
        setValue('mobile', currentMobile || selectedCompany.mobile || '');
        setValue('email', currentEmail || selectedCompany.email || '');
      }

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
      if (!isClientUser) {
        setRecognizedAccount(null);
        recognizedAccountRef.current = null;
        existingAccountUsernameRef.current = null;
        wasRecognizedRef.current = false;
      }
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
  }, [user, selectedCompany, setValue, getValues, isClientUser, isAddingNewCompany, isEditingExistingCompany]);

  // Ensure authenticated client exhibitor uses their verified username and does not trigger taken check
  React.useEffect(() => {
    if (isClientUser && user?.username) {
      setValue('username', user.username, { shouldValidate: true });
      setUsernameStatus('available');
      setUsernameMessage('Current account username');
    }
  }, [isClientUser, user?.username, setValue]);

  // Automatically reset GST verified status and invalidate previous company recognition if user modifies GST
  React.useEffect(() => {
    const currentGst = (watchedGstNumber || '').trim().toUpperCase();
    if (gstVerificationSuccess && verifiedGstRef.current && currentGst !== verifiedGstRef.current) {
      setGstVerificationSuccess(false);
      setGstVerifiedDetails(null);
      setGstNotice('');
      setGstError('');
    }

    if (previousGstRef.current && currentGst !== previousGstRef.current) {
      // GSTIN changed to different company or cleared
      if (recognizedAccountRef.current && recognizedAccountRef.current.gstNumber !== currentGst) {
        setRecognizedAccount(null);
        recognizedAccountRef.current = null;
        existingAccountUsernameRef.current = null;
        wasRecognizedRef.current = false;

        if (!isClientUser) {
          const currentPerson = getValues('contactPerson');
          const currentName = getValues('name');
          const suggested = generateSuggestedUsername(currentPerson || '', currentName || '');
          setValue('username', suggested, { shouldValidate: true, shouldDirty: false });
          setIsUsernameManuallyEdited(false);
          setUsernameStatus('idle');
          setUsernameMessage('');
        }
      }
    }
    previousGstRef.current = currentGst;
  }, [watchedGstNumber, gstVerificationSuccess, isClientUser, getValues, setValue]);

  // React to toggling between exact recognized exhibitor and sibling exhibitor
  React.useEffect(() => {
    if (isClientUser) return;

    if (isExistingExhibitorMatch && recognizedAccount) {
      // Switched into exact recognized exhibitor mode (e.g. user restored email/phone back)
      if (getValues('username') !== recognizedAccount.username) {
        setValue('username', recognizedAccount.username, { shouldValidate: true, shouldDirty: false });
      }
      setUsernameStatus('available');
      setUsernameMessage(`Existing exhibitor account recognized (${recognizedAccount.username}). You can continue directly as a guest.`);
      wasRecognizedRef.current = true;
    } else if (wasRecognizedRef.current && !isExistingExhibitorMatch) {
      // Switched from recognized existing account into potential sibling exhibitor mode
      wasRecognizedRef.current = false;
      const currentPerson = getValues('contactPerson');
      const currentName = getValues('name');
      const suggested = generateSuggestedUsername(currentPerson || '', currentName || '');
      setValue('username', suggested, { shouldValidate: true, shouldDirty: true });
      setIsUsernameManuallyEdited(false);
      setUsernameStatus('idle');
      setUsernameMessage('');
    }
  }, [isExistingExhibitorMatch, recognizedAccount, isClientUser, setValue, getValues]);

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

    const clean = rawUser.toLowerCase();
    if (
      clean.length < 3 ||
      clean.length > 30 ||
      !/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(clean) ||
      /\.{2,}/.test(clean)
    ) {
      setUsernameStatus('invalid');
      setUsernameMessage('Username must be 3-30 characters (letters, numbers, hyphens, underscores, dots without leading/trailing symbols or consecutive dots).');
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
            const nextCandidate = rawUser.endsWith('2') ? `${rawUser.slice(0, -1)}3` : `${rawUser}2`;
            setValue('username', nextCandidate, { shouldValidate: true, shouldDirty: false });
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
  }, [watchedUsername, isUsernameLocked, isClientUser, user?.username, setValue, isUsernameManuallyEdited]);

  // Auto-detect existing account when user enters their corporate email, mobile number, and company info
  React.useEffect(() => {
    const cleanEmail = watchedEmail?.trim().toLowerCase();
    const cleanPhone = watchedMobile?.replace(/\D/g, '').slice(-10);
    const cleanGst = watchedGstNumber?.trim().toUpperCase();
    const cleanName = watchedName?.trim();

    if ((!cleanEmail || !cleanEmail.includes('@')) && (!cleanPhone || cleanPhone.length !== 10) && !cleanGst) {
      return;
    }

    if (isClientUser) {
      return;
    }

    const seq = ++lookupSeqRef.current;

    const timer = setTimeout(async () => {
      try {
        const res = await authService.lookupAccount({
          email: cleanEmail && cleanEmail.includes('@') ? cleanEmail : undefined,
          phone: cleanPhone && cleanPhone.length === 10 ? cleanPhone : undefined,
          gstNumber: cleanGst || undefined,
          companyName: cleanName || undefined,
        });

        // Guard against race conditions and out-of-order responses:
        if (seq !== lookupSeqRef.current) {
          return;
        }

        // Verify that current form values still match what was queried
        const currentEmail = (getValues('email') || '').trim().toLowerCase();
        const currentPhone = (getValues('mobile') || '').replace(/\D/g, '').slice(-10);
        const currentGst = (getValues('gstNumber') || '').trim().toUpperCase();

        if (cleanEmail !== currentEmail || cleanPhone !== currentPhone || (cleanGst && cleanGst !== currentGst)) {
          return;
        }

        if (res.exactMatch && res.username && isExhibitorUsernameValid(res.username)) {
          const rec: RecognizedExhibitorAccount = {
            username: res.username,
            email: cleanEmail,
            phone: cleanPhone,
            gstNumber: cleanGst || res.company?.gstNumber || '',
            name: res.name,
          };
          setRecognizedAccount(rec);
          recognizedAccountRef.current = rec;
          existingAccountUsernameRef.current = res.username;

          setValue('username', res.username, { shouldValidate: true, shouldDirty: false });
          setUsernameStatus('available');
          setUsernameMessage(`Existing exhibitor account recognized (${res.username}). You can continue directly as a guest.`);
          wasRecognizedRef.current = true;

          if (res.name && !getValues('contactPerson')) {
            setValue('contactPerson', res.name, { shouldValidate: true });
          }
        }
      } catch (_err) {
        // Network or server error: do not claim recognition, preserve guest booking
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [watchedEmail, watchedMobile, watchedGstNumber, watchedName, isClientUser, setValue, getValues]);

  // Auto-fill username as user types contact person or company name if not manually edited and not locked to existing account
  React.useEffect(() => {
    if (!isUsernameManuallyEdited && !isClientUser && !isExistingExhibitorMatch) {
      if (watchedContactPerson || watchedName) {
        const suggested = generateSuggestedUsername(watchedContactPerson || '', watchedName || '');
        if (suggested && suggested.length >= 3) {
          setValue('username', suggested, { shouldValidate: true, shouldDirty: false });
        }
      }
    }
  }, [watchedContactPerson, watchedName, isUsernameManuallyEdited, isClientUser, isExistingExhibitorMatch, setValue]);

  const handleRegenerateUsername = () => {
    const raw = (watchedContactPerson || watchedName || 'exhibitor').trim().toLowerCase();
    const tokens = raw.replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    const filteredTokens =
      tokens.length > 2 && ['dr', 'mr', 'ms', 'mrs', 'prof'].includes(tokens[0])
        ? tokens.slice(1)
        : tokens;

    let baseDot = 'exhibitor';
    let baseJoined = 'exhibitor';

    if (filteredTokens.length >= 2) {
      const first = filteredTokens[0].slice(0, 14);
      const last = filteredTokens[filteredTokens.length - 1].slice(0, 14);
      baseDot = `${first}.${last}`.slice(0, 25);
      baseJoined = `${first}${last}`.slice(0, 25);
    } else if (filteredTokens.length === 1) {
      const single = filteredTokens[0].slice(0, 25);
      baseDot = single.length >= 3 ? single : `${single}.user`;
      baseJoined = baseDot;
    }

    const current = (watchedUsername || '').toLowerCase().trim();
    let nextSuggested = baseDot;
    if (current === baseDot && baseJoined !== baseDot) {
      nextSuggested = baseJoined;
    } else if (current === baseJoined || current === baseDot) {
      nextSuggested = `${baseDot}2`;
    } else if (current === `${baseDot}2`) {
      nextSuggested = `${baseDot}3`;
    } else {
      nextSuggested = baseDot;
    }

    setIsUsernameManuallyEdited(true);
    setValue('username', nextSuggested, { shouldValidate: true, shouldDirty: true });
  };

  const handleSuggestAlternative = async () => {
    const raw = (watchedUsername || watchedContactPerson || watchedName || 'exhibitor').trim().toLowerCase();
    const tokens = raw.replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    const filteredTokens =
      tokens.length > 2 && ['dr', 'mr', 'ms', 'mrs', 'prof'].includes(tokens[0])
        ? tokens.slice(1)
        : tokens;

    let base = 'exhibitor';
    let altBase = 'exhibitor';

    if (filteredTokens.length >= 2) {
      const first = filteredTokens[0].slice(0, 14);
      const last = filteredTokens[filteredTokens.length - 1].slice(0, 14);
      base = `${first}.${last}`.slice(0, 25);
      altBase = `${first}${last}`.slice(0, 25);
    } else if (filteredTokens.length === 1) {
      const single = filteredTokens[0].slice(0, 25);
      base = single.length >= 3 ? single : `${single}.user`;
      altBase = base;
    }

    setIsUsernameManuallyEdited(true);
    setUsernameStatus('checking');
    setUsernameMessage('Finding a clean available alternative...');

    const candidatesToTry = [
      altBase,
      `${base}2`,
      `${base}3`,
      `${base}4`,
      `${base}5`,
    ];

    let found = '';
    for (const candidate of candidatesToTry) {
      try {
        const res = await authService.checkUsernameAvailability(candidate);
        if (res.available) {
          found = candidate;
          break;
        }
      } catch (_e) {
        // Continue searching
      }
    }
    const finalSuggestion = found || `${base}2`;
    setValue('username', finalSuggestion, { shouldValidate: true, shouldDirty: true });
    setUsernameStatus('available');
    setUsernameMessage('Suggested available alternative');
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
          if (comp.tanNumber) setValue('tanNumber', comp.tanNumber, { shouldValidate: true, shouldDirty: true });
          if (comp.state) setValue('state', comp.state, { shouldValidate: true, shouldDirty: true });

          const currentAddr = comp.address || getValues('address') || '';
          const { cleanCity, updatedAddress } = extractCleanCityAndAddress(
            comp.city,
            comp.state,
            currentAddr,
            comp.country || 'India'
          );

          if (updatedAddress) setValue('address', updatedAddress, { shouldValidate: true, shouldDirty: true });
          if (cleanCity) setValue('city', cleanCity, { shouldValidate: true, shouldDirty: true });
          if (comp.pinCode) setValue('pinCode', comp.pinCode, { shouldValidate: true, shouldDirty: true });
          if (comp.country) setValue('country', normalizeCountryName(comp.country || 'India'), { shouldValidate: true, shouldDirty: true });
          // Only fill contact details if user has NOT already entered them in the form and not logged in as CLIENT
          if (user && user.role === 'CLIENT') {
            if (user.name) setValue('contactPerson', user.name, { shouldValidate: true, shouldDirty: true });
            if (user.phone) setValue('mobile', user.phone, { shouldValidate: true, shouldDirty: true });
            if (user.email) setValue('email', user.email, { shouldValidate: true, shouldDirty: true });
          } else {
            if (!getValues('contactPerson') && comp.contactPerson) setValue('contactPerson', comp.contactPerson, { shouldValidate: true, shouldDirty: true });
            if (!getValues('mobile') && comp.mobile) setValue('mobile', comp.mobile, { shouldValidate: true, shouldDirty: true });
            if (!getValues('email') && comp.email) setValue('email', comp.email, { shouldValidate: true, shouldDirty: true });
          }
          if (comp.website) setValue('website', comp.website || '', { shouldValidate: true, shouldDirty: true });
          if (comp.industry) setValue('category', comp.industry, { shouldValidate: true, shouldDirty: true });
          if (comp.username && isExhibitorUsernameValid(comp.username) && comp.email && comp.mobile) {
            const rec: RecognizedExhibitorAccount = {
              username: comp.username,
              email: comp.email.trim().toLowerCase(),
              phone: comp.mobile.replace(/\D/g, '').slice(-10),
              gstNumber: cleanGst,
              name: comp.contactPerson,
            };
            setRecognizedAccount(rec);
            recognizedAccountRef.current = rec;
            existingAccountUsernameRef.current = comp.username;

            const currentEmail = (getValues('email') || '').trim().toLowerCase();
            const currentPhone = (getValues('mobile') || '').replace(/\D/g, '').slice(-10);

            if (currentEmail === rec.email && currentPhone === rec.phone) {
              setValue('username', comp.username, { shouldValidate: true, shouldDirty: false });
              setUsernameStatus('available');
              setUsernameMessage(`Existing exhibitor account recognized (${comp.username}). You can continue directly as a guest.`);
              wasRecognizedRef.current = true;
            } else if (!isClientUser) {
              const currentPerson = getValues('contactPerson');
              const suggested = generateSuggestedUsername(currentPerson || '', comp.name || '');
              if (suggested && suggested.length >= 3) {
                setValue('username', suggested, { shouldValidate: true, shouldDirty: false });
              }
            }
          } else if (!isUsernameManuallyEdited && !isClientUser) {
            const currentPerson = getValues('contactPerson');
            const suggested = generateSuggestedUsername(currentPerson || '', comp.name || '');
            if (suggested && suggested.length >= 3) {
              setValue('username', suggested, { shouldValidate: true, shouldDirty: false });
            }
          }

          onSelectCompany(comp);
          setGstNotice('GST details verified successfully.');
        } else if (res.gstDetails) {
          const officialName = res.gstDetails.legalName || res.gstDetails.tradeName;
          if (officialName) setValue('name', officialName, { shouldValidate: true, shouldDirty: true });
          if (res.gstDetails.pan) setValue('panNumber', res.gstDetails.pan, { shouldValidate: true, shouldDirty: true });
          if (res.gstDetails.state) setValue('state', res.gstDetails.state, { shouldValidate: true, shouldDirty: true });

          const currentAddr = res.gstDetails.address || getValues('address') || '';
          const { cleanCity, updatedAddress } = extractCleanCityAndAddress(
            res.gstDetails.city,
            res.gstDetails.state,
            currentAddr,
            'India'
          );

          if (updatedAddress) setValue('address', updatedAddress, { shouldValidate: true, shouldDirty: true });
          if (cleanCity) setValue('city', cleanCity, { shouldValidate: true, shouldDirty: true });
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

  const handleRegisterNewCompany = () => {
    setIsEditingExistingCompany(false);
    setIsAddingNewCompany(true);
    setIsChangingCompany(false);
    onSelectCompany(null);

    reset({
      name: '',
      category: '',
      industry: '',
      designation: '',
      username: '',
      contactPerson: isClientUser ? (user?.name || '') : '',
      mobile: isClientUser ? (user?.phone || '') : '',
      email: isClientUser ? (user?.email || '') : '',
      pinCode: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      gstNumber: '',
      panNumber: '',
      tanNumber: '',
      website: '',
    });

    setGstVerificationSuccess(false);
    setGstVerifiedDetails(null);
    setGstError('');
    setGstNotice('');
    verifiedGstRef.current = '';
    previousGstRef.current = '';

    setRecognizedAccount(null);
    recognizedAccountRef.current = null;
    existingAccountUsernameRef.current = null;
    wasRecognizedRef.current = false;
    setUsernameStatus('idle');
    setUsernameMessage('');
  };

  const handleEditCompany = (comp: Company) => {
    onSelectCompany(comp);
    setIsEditingExistingCompany(true);
    setIsAddingNewCompany(true);
    setIsChangingCompany(false);

    reset({
      name: comp.name || '',
      category: comp.industry || 'General Exhibitor',
      industry: comp.industry || 'General Exhibitor',
      designation: (comp as any).designation || '',
      username: (comp as any).username || '',
      contactPerson: comp.contactPerson || '',
      mobile: comp.mobile || '',
      email: comp.email || '',
      pinCode: comp.pinCode || '',
      address: comp.address || '',
      city: comp.city || '',
      state: comp.state || '',
      country: normalizeCountryName(comp.country || 'India'),
      gstNumber: comp.gstNumber || '',
      panNumber: comp.panNumber || '',
      tanNumber: comp.tanNumber || '',
      website: comp.website || '',
    });

    if (comp.gstNumber) {
      setGstVerificationSuccess(true);
      verifiedGstRef.current = comp.gstNumber;
      previousGstRef.current = comp.gstNumber;
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

      {/* Existing Registered Company Cards / Privileged Company Picker */}
      {companies.length > 0 && !isAddingNewCompany && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#09539b] dark:text-blue-400" />
                  <span>{isPrivilegedUser ? 'Select Registered Exhibitor Company:' : 'Select Saved Corporate Profile:'}</span>
                </label>
                {isPrivilegedUser && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {user?.role} DIRECT
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isPrivilegedUser
                  ? 'Choose an existing exhibitor from the database or click below to register a new one.'
                  : 'Select one of your registered companies or add a new corporate profile.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRegisterNewCompany}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#09539b] dark:text-blue-400 hover:underline cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" /> Register New Company
            </button>
          </div>

          {/* Privileged Search Bar */}
          {isPrivilegedUser && (!selectedCompany || isChangingCompany) && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={privilegedCompanySearch}
                onChange={(e) => setPrivilegedCompanySearch(e.target.value)}
                placeholder="Search exhibitors by company name, GSTIN, code, contact person, or email..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09539b] shadow-2xs"
              />
              {privilegedCompanySearch && (
                <button
                  type="button"
                  onClick={() => setPrivilegedCompanySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Selected Company Spotlight Card (When Already Selected for Privileged Booking) */}
          {isPrivilegedUser && selectedCompany && !isChangingCompany && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/40 dark:from-slate-800/80 dark:to-slate-800/40 border-2 border-[#09539b] dark:border-blue-500 shadow-sm space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-blue-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#09539b] text-white flex items-center justify-center font-bold text-sm">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#09539b] dark:text-blue-400 block">
                      Target Exhibitor Selected
                    </span>
                    <h4 className="text-base font-black text-[#012970] dark:text-slate-100">
                      {selectedCompany.name}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono bg-white dark:bg-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                    {selectedCompany.companyCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleEditCompany(selectedCompany)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#09539b] dark:text-blue-400 hover:underline px-2.5 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChangingCompany(true)}
                    className="text-xs font-bold text-[#09539b] dark:text-blue-400 hover:underline px-2.5 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Change Company
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Registration No</span>
                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                    {selectedCompany.regNo || assignedRegNo || 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">GSTIN</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {selectedCompany.gstNumber || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Primary Contact</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {selectedCompany.contactPerson} ({selectedCompany.mobile})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Email</span>
                  <span className="text-slate-800 dark:text-slate-200 truncate block">
                    {selectedCompany.email}
                  </span>
                </div>
              </div>

              {selectedCompany.address && (
                <div className="pt-2 text-[11px] text-slate-600 dark:text-slate-300 border-t border-blue-100 dark:border-slate-700 flex items-center gap-1.5">
                  <span className="font-semibold text-slate-400">Address:</span>
                  <span className="truncate">{selectedCompany.address}, {selectedCompany.city}, {selectedCompany.state} - {selectedCompany.pinCode}</span>
                </div>
              )}
            </div>
          )}

          {/* Companies Grid List (Shown if not selected, or when changing, or for regular users) */}
          {(!isPrivilegedUser || !selectedCompany || isChangingCompany) && (
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3.5 ${isPrivilegedUser ? 'max-h-80 overflow-y-auto pr-1' : ''}`}>
              {(isPrivilegedUser ? filteredPrivilegedCompanies : companies).map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectCompany(c);
                    if (isPrivilegedUser) setIsChangingCompany(false);
                  }}
                  className={`p-4 border rounded-xl cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                    selectedCompany?.id === c.id
                      ? 'bg-[#f6f9ff] dark:bg-blue-950/40 border-[#09539b] dark:border-blue-500 ring-2 ring-[#09539b] dark:ring-blue-500'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs hover:shadow-xs'
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
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold">
                        {c.companyCode}
                      </span>
                      {c.city && (
                        <span className="text-[11px] text-slate-400">
                          {c.city}, {c.state}
                        </span>
                      )}
                    </div>
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

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCompany(c);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#09539b] dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Details
                    </button>
                    {selectedCompany?.id === c.id && (
                      <span className="text-[11px] font-bold text-[#09539b] dark:text-blue-400">
                        Selected Profile
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {isPrivilegedUser && filteredPrivilegedCompanies.length === 0 && (
                <div className="col-span-full p-8 text-center bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    No registered exhibitor matched "{privilegedCompanySearch}".
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRegisterNewCompany}
                    className="text-xs"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Register as New Company
                  </Button>
                </div>
              )}
            </div>
          )}

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
          {isEditingExistingCompany ? (
            <div className="flex items-center justify-between gap-2 p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl mb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#09539b] dark:text-blue-400" />
                <span className="text-xs font-bold text-[#09539b] dark:text-blue-300">
                  Editing Corporate Profile: <strong>{selectedCompany?.name}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNewCompany(false);
                  setIsEditingExistingCompany(false);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer"
              >
                Cancel Editing
              </button>
            </div>
          ) : companies.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsAddingNewCompany(false);
                setIsChangingCompany(true);
                setIsEditingExistingCompany(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer mb-3"
            >
              <Building2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>← {isPrivilegedUser ? `Select from ${companies.length} Registered Exhibitor${companies.length > 1 ? 's' : ''}` : 'Select Existing Saved Company'}</span>
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
                  placeholder="e.g. arun.kumar"
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
                    <span className="text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      Taken
                    </span>
                  ) : null}
                </div>
              </div>

              {isExistingExhibitorMatch && (
                <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  Recognized existing exhibitor account ({watchedUsername}). You can continue directly as a guest.
                </p>
              )}

              {!isUsernameLocked && errors.username ? (
                <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{errors.username.message}</p>
              ) : !isUsernameLocked && usernameStatus === 'invalid' && usernameMessage ? (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">{usernameMessage}</p>
              ) : !isUsernameLocked && usernameStatus === 'taken' ? (
                <div className="mt-1.5 p-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-xs space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-800 dark:text-amber-300 font-medium text-[11px]">
                      This username belongs to an existing account.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    {onOpenLoginModal && (
                      <button
                        type="button"
                        onClick={() => onOpenLoginModal(watchedEmail || '')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-[#09539b] hover:bg-[#012970] rounded-md transition-colors cursor-pointer shadow-2xs"
                      >
                        <LogIn className="w-3 h-3" /> Sign In to This Account
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSuggestAlternative}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md transition-colors cursor-pointer shadow-2xs"
                    >
                      <RotateCw className="w-3 h-3 text-[#09539b] dark:text-blue-400" /> Suggest Alternative
                    </button>
                  </div>
                </div>
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
