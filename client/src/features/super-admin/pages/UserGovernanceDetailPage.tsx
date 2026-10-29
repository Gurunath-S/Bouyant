import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { userService } from '../../../services/users/userService';
import { AdminStaffUser } from '../../../types';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { PaymentStatusBadge } from '../../../components/ui/Badge';
import { showConfirm } from '../../../stores/dialogStore';
import { formatDisplayDate, formatDisplayDateTime } from '../../../utils/date';
import { downloadInvoicePdf } from '../../../utils/downloadInvoicePdf';
import {
  ShieldCheck,
  UserCheck,
  Building2,
  Calendar,
  Layers,
  Lock,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  TrendingUp,
  CreditCard,
  Briefcase,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Power,
  MapPin,
  Tag,
  Clock,
  Printer,
  ChevronRight,
  KeyRound,
  Edit3,
  Sparkles,
  ShieldAlert,
  AtSign,
  Trash2,
  X,
  CheckSquare,
  Square,
  Shield,
  Users,
  LayoutDashboard,
  UserPlus,
  Search,
} from 'lucide-react';
import { getUserEffectivePageAccess } from '../../../config/pageAccess';
import { useAuthStore } from '../../../stores/authStore';

const PAGE_ICON_CONFIG: Record<
  string,
  { icon: React.FC<{ className?: string }>; color: string; bg: string; border: string }
> = {
  dashboard: {
    icon: LayoutDashboard,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    border: 'border-blue-200 dark:border-blue-800/80',
  },
  event_register: {
    icon: UserPlus,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/60',
    border: 'border-teal-200 dark:border-teal-800/80',
  },
  events_floorplans: {
    icon: Layers,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/60',
    border: 'border-indigo-200 dark:border-indigo-800/80',
  },
  companies: {
    icon: Building2,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/60',
    border: 'border-purple-200 dark:border-purple-800/80',
  },
  bookings: {
    icon: Calendar,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    border: 'border-emerald-200 dark:border-emerald-800/80',
  },
  payments: {
    icon: CreditCard,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    border: 'border-amber-200 dark:border-amber-800/80',
  },
  reports: {
    icon: TrendingUp,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    border: 'border-rose-200 dark:border-rose-800/80',
  },
  governance: {
    icon: ShieldCheck,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/60',
    border: 'border-violet-200 dark:border-violet-800/80',
  },
};

const DEFAULT_ROLE_PAGE_ACCESS: Record<string, string[]> = {
  SUPERADMIN: ['dashboard', 'events_floorplans', 'event_register', 'companies', 'bookings', 'payments', 'reports', 'governance'],
  ADMIN: ['dashboard', 'events_floorplans', 'event_register', 'companies', 'bookings', 'payments', 'reports'],
  STAFF: ['dashboard', 'event_register', 'companies', 'bookings', 'payments'],
  CLIENT: ['dashboard'],
};

const PAGE_ACCESS_ITEMS = [
  { id: 'dashboard', label: 'Primary Dashboard', description: 'Executive KPIs, analytics, and operational hub' },
  { id: 'events_floorplans', label: 'Exhibitions & Floor Plans', description: 'Manage trade fairs, visual designer, and hall blueprints' },
  { id: 'event_register', label: 'Event Registration Hub', description: 'Exhibitor registration and direct stall assignments' },
  { id: 'companies', label: 'Exhibitors Directory', description: 'Corporate profiles, KYC verification, and tax details' },
  { id: 'bookings', label: 'Bookings & Allocations', description: 'Review stall reservations, holds, and approvals' },
  { id: 'payments', label: 'Billing & Invoices', description: 'Financial payments, GST invoices, and reconciliation' },
  { id: 'reports', label: 'Platform Reports & Analytics', description: 'Occupancy charts, revenue metrics, and export data' },
  { id: 'governance', label: 'User Governance & Roles', description: 'User directory, team permissions, and security control' },
];

export const UserGovernanceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<AdminStaffUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'exhibitions' | 'bookings' | 'permissions' | 'organization'>('overview');
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Reset Password State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetUsername, setResetUsername] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [sendNotificationEmail, setSendNotificationEmail] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Edit User Profile State
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';
  const canModifyThisUser = isSuperAdmin || user?.role !== 'SUPERADMIN';
  const allowedEditRoles = isSuperAdmin ? (['SUPERADMIN', 'ADMIN', 'STAFF'] as const) : (['ADMIN', 'STAFF'] as const);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editUserRole, setEditUserRole] = useState<'SUPERADMIN' | 'ADMIN' | 'STAFF'>('ADMIN');
  const [editUserPages, setEditUserPages] = useState<string[]>([]);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [editFieldErrors, setEditFieldErrors] = useState<{
    name?: string;
    email?: string;
    username?: string;
    phone?: string;
    spcode?: string;
    pageAccess?: string;
  }>({});
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    username: '',
    phone: '',
    spcode: '',
  });
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');

  const generateRandomPassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let pwd = 'Buoy@';
    for (let i = 0; i < 6; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setShowResetPassword(true);
  };

  const handleOpenReset = () => {
    if (!user) return;
    setNewPassword('');
    setResetUsername(user.username || '');
    setShowResetPassword(false);
    setSendNotificationEmail(true);
    setIsResetModalOpen(true);
  };

  const handleOpenEdit = () => {
    if (!user) return;
    const role: 'SUPERADMIN' | 'ADMIN' | 'STAFF' =
      user.role === 'SUPERADMIN' || user.role === 'ADMIN' || user.role === 'STAFF'
        ? (user.role as any)
        : 'ADMIN';
    setEditUserRole(role);
    setEditUserPages(getUserEffectivePageAccess(user));
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      username: user.username || '',
      phone: user.phone || '',
      spcode: user.spcode || '',
    });
    setEditModalError(null);
    setEditFieldErrors({});
    setIsEditModalOpen(true);
  };

  const handleEditRoleChange = (newRole: 'SUPERADMIN' | 'ADMIN' | 'STAFF') => {
    setEditUserRole(newRole);
    setEditUserPages([...(DEFAULT_ROLE_PAGE_ACCESS[newRole] || ['dashboard'])]);
    if (editFieldErrors.pageAccess) {
      setEditFieldErrors((prev) => ({ ...prev, pageAccess: undefined }));
    }
  };

  const handleToggleEditPage = (pageId: string) => {
    setEditUserPages((prev) => {
      const next = prev.includes(pageId) ? prev.filter((p) => p !== pageId) : [...prev, pageId];
      if (next.length > 0 && editFieldErrors.pageAccess) {
        setEditFieldErrors((e) => ({ ...e, pageAccess: undefined }));
      }
      return next;
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setEditModalError(null);

    const trimmedName = editForm.name?.trim() || '';
    const trimmedEmail = editForm.email?.trim() || '';
    const trimmedUsername = editForm.username?.trim() || '';
    const trimmedPhone = editForm.phone?.trim() || '';
    const trimmedSpcode = editForm.spcode?.trim().toUpperCase() || '';

    const errors: {
      name?: string;
      email?: string;
      username?: string;
      phone?: string;
      spcode?: string;
      pageAccess?: string;
    } = {};

    if (!trimmedName || trimmedName.length < 2) {
      errors.name = 'Full name is required (minimum 2 characters)';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!trimmedUsername) {
      errors.username = 'Portal username is required';
    } else if (trimmedUsername.length < 3) {
      errors.username = 'Portal username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUsername)) {
      errors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
    }

    if (!trimmedPhone) {
      errors.phone = 'Phone number is required';
    } else if (trimmedPhone.length < 7) {
      errors.phone = 'Phone number must be at least 7 digits';
    }

    if (!trimmedSpcode) {
      errors.spcode = 'SP Code is required';
    } else if (trimmedSpcode.length < 2) {
      errors.spcode = 'SP Code must be at least 2 characters long';
    }

    if (editUserPages.length === 0) {
      errors.pageAccess = 'At least one page access permission must be granted';
    }

    if (Object.keys(errors).length > 0) {
      const missingLabels: string[] = [];
      if (errors.name) missingLabels.push('Full Name');
      if (errors.email) missingLabels.push('Email Address');
      if (errors.username) missingLabels.push('Portal Username');
      if (errors.phone) missingLabels.push('Phone Number');
      if (errors.spcode) missingLabels.push('SP Code');
      if (errors.pageAccess) missingLabels.push('Page Access Rights');

      setEditFieldErrors(errors);
      setEditModalError(`Please correct the required fields: ${missingLabels.join(', ')}.`);
      return;
    }

    try {
      setSavingEdit(true);
      const updated = await userService.updateUser(user.id, {
        name: trimmedName,
        email: trimmedEmail,
        username: trimmedUsername,
        phone: trimmedPhone,
        spcode: trimmedSpcode,
        role: editUserRole,
        pageAccess: editUserPages,
      });
      setUser((prev) =>
        prev
          ? {
              ...prev,
              name: updated.name,
              email: updated.email,
              username: updated.username,
              phone: updated.phone,
              spcode: updated.spcode,
              role: updated.role,
              pageAccess: updated.pageAccess,
            }
          : null
      );
      setActionNotice({
        type: 'success',
        message: `User "${updated.name}" profile updated successfully!`,
      });
      setIsEditModalOpen(false);
      setEditModalError(null);
      setEditFieldErrors({});
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to update user profile.';
      setEditModalError(errMsg);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPassword) return;
    try {
      setResettingPassword(true);
      const res = await userService.resetPassword(
        user.id,
        newPassword,
        sendNotificationEmail,
        resetUsername.trim() || undefined
      );
      setActionNotice({
        type: 'success',
        message: res.message || 'Password reset successfully.',
      });
      setIsResetModalOpen(false);
      setNewPassword('');
      if (resetUsername.trim()) {
        setUser((prev) => (prev ? { ...prev, username: resetUsername.trim() } : null));
      }
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to reset password.',
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const fetchUserData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getUserById(id);
      setUser(data);
    } catch (err: any) {
      console.error('Failed to load user details:', err);
      setError(err?.response?.data?.message || err?.message || 'Could not load user records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [id]);

  const handleToggleStatus = async () => {
    if (!user) return;
    const nextState = !user.isActive;
    const confirmed = await showConfirm({
      title: nextState ? 'Activate User Account?' : 'Deactivate User Account?',
      message: nextState
        ? `Are you sure you want to activate login and platform privileges for ${user.name}?`
        : `Are you sure you want to deactivate the account for ${user.name}? They will be immediately blocked from signing in.`,
      type: nextState ? 'info' : 'warning',
      confirmText: nextState ? 'Yes, Activate' : 'Yes, Deactivate',
    });

    if (!confirmed) return;

    try {
      setTogglingStatus(true);
      const updated = await userService.toggleStatus(user.id, nextState);
      setUser((prev) => (prev ? { ...prev, isActive: updated.isActive } : null));
      setActionNotice({
        type: 'success',
        message: `Account status updated: ${user.name} is now ${nextState ? 'Active' : 'Deactivated'}.`,
      });
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      console.error('Failed to toggle status:', err);
      setActionNotice({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to update account state.',
      });
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!user) return;
    try {
      setDeletingUser(true);
      await userService.deleteUser(user.id);
      navigate('/workspace/users');
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to delete user account.',
      });
      setIsDeleteModalOpen(false);
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setDeletingUser(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            ★ Super Admin
          </span>
        );
      case 'ADMIN':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            Administrator
          </span>
        );
      case 'STAFF':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            Operations Staff
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            Client Exhibitor
          </span>
        );
    }
  };

  const bookings = React.useMemo(() => {
    const raw = user?.attributedBookings || [];
    if (!user) return [];
    return raw.filter((b: any) => {
      if (b.bookedByUserId) {
        return b.bookedByUserId === user.id;
      }
      if (b.userId) {
        return b.userId === user.id;
      }
      return true;
    });
  }, [user]);

  const filteredBookings = React.useMemo(() => {
    if (!bookingSearchQuery.trim()) return bookings;
    const q = bookingSearchQuery.toLowerCase().trim();
    return bookings.filter(
      (b: any) =>
        b.bookingReference?.toLowerCase().includes(q) ||
        b.company?.name?.toLowerCase().includes(q) ||
        b.exhibition?.title?.toLowerCase().includes(q) ||
        b.contactPerson?.toLowerCase().includes(q) ||
        b.bookedByUser?.name?.toLowerCase().includes(q) ||
        b.stalls?.some((s: any) => s.stall?.stallNumber?.toLowerCase().includes(q))
    );
  }, [bookings, bookingSearchQuery]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 py-6">
        <BackButton to="/workspace/users" label="Back to User Governance" />
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            Loading Staff & Admin Work Audit Records...
          </h3>
          <p className="text-xs text-slate-400">
            Aggregating exhibitions created, bookings attributed, and security credentials.
          </p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 py-6">
        <BackButton to="/workspace/users" label="Back to User Governance" />
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">User Not Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {error || 'The requested user governance profile could not be loaded.'}
          </p>
          <Button variant="primary" onClick={fetchUserData}>
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  // Work Calculations
  const exhibitions = user.createdExhibitions || [];
  const publishedExhibitions = exhibitions.filter((e) => e.status === 'PUBLISHED');
  const totalStallsInEvents = exhibitions.reduce((sum, e) => sum + (e.totalStalls || 0), 0);

  const paidBookings = bookings.filter(
    (b) => b.paymentStatus === 'PAID_FULL' || b.paymentStatus === 'PAID' || Number(b.paidAmount || 0) > 0
  );
  const totalRevenueGenerated = bookings.reduce(
    (sum, b) => sum + (Number(b.paidAmount) || Number(b.grandTotal) || 0),
    0
  );
  const totalBookedValue = bookings.reduce((sum, b) => sum + Number(b.grandTotal || 0), 0);

  const heldStalls = user.heldStalls || [];
  const effectivePages = getUserEffectivePageAccess(user);

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'CLIENT_DIRECT':
        return { label: 'Client Direct', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
      case 'STAFF_ASSISTED':
        return { label: 'Staff Assisted', cls: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800' };
      case 'ADMIN_DIRECT':
        return { label: 'Admin Direct', cls: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
      case 'SUPERADMIN_MANUAL':
        return { label: 'SuperAdmin', cls: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
      default:
        return { label: 'Direct', cls: 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <BackButton to="/workspace/users" label="Back to User Governance" />
      </div>

      {/* Action Toast Alert */}
      {actionNotice && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between animate-fadeIn ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Profile Banner Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl font-black text-2xl flex items-center justify-center shrink-0 shadow-xs ring-4 ${
                user.role === 'SUPERADMIN'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 ring-amber-300 dark:ring-amber-800'
                  : user.role === 'ADMIN'
                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 ring-purple-300 dark:ring-purple-800'
                  : user.role === 'STAFF'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 ring-emerald-300 dark:ring-emerald-800'
                  : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 ring-blue-300 dark:ring-blue-800'
              }`}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {user.name}
                </h1>
                {user.username && (
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1 font-semibold">
                    <AtSign className="w-3 h-3 text-purple-500" />
                    {user.username}
                  </span>
                )}
                {getRoleBadge(user.role)}
                {user.isActive ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Account
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                    Deactivated
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="flex items-center gap-1.5 font-mono">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {user.email}
                </span>
                {user.phone && (
                  <span className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {user.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Member since {formatDisplayDate(user.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* SP Code & Account Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {user.spcode && (
              <div className="px-4 py-2.5 bg-purple-50 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 rounded-2xl shadow-xs">
                <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 block tracking-wider">
                  Attributed Sales SP Code
                </span>
                <span className="font-mono font-black text-base text-purple-900 dark:text-purple-200">
                  {user.spcode}
                </span>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleOpenEdit}
              disabled={!canModifyThisUser}
              leftIcon={<Edit3 className="w-4 h-4 text-purple-600" />}
              className="font-bold text-xs rounded-xl shadow-xs border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/50 disabled:opacity-40 disabled:cursor-not-allowed"
              title={!canModifyThisUser ? 'Only Super Administrators can edit Super Admin accounts' : undefined}
            >
              Edit Profile
            </Button>

            {user.role !== 'SUPERADMIN' && (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleOpenReset}
                leftIcon={<KeyRound className="w-4 h-4 text-amber-500" />}
                className="font-bold text-xs rounded-xl shadow-xs border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/50"
              >
                Reset Password
              </Button>
            )}

            <Button
              type="button"
              variant={user.isActive ? 'outline' : 'primary'}
              size="md"
              onClick={handleToggleStatus}
              disabled={togglingStatus || !canModifyThisUser || currentUser?.id === user.id}
              leftIcon={<Power className="w-4 h-4" />}
              className={`font-black text-xs rounded-xl shadow-xs disabled:opacity-40 disabled:cursor-not-allowed ${
                user.isActive
                  ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/50'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              title={
                !canModifyThisUser
                  ? 'Only Super Administrators can alter Super Admin account status'
                  : currentUser?.id === user.id
                  ? 'You cannot deactivate your own account'
                  : undefined
              }
            >
              {togglingStatus ? 'Updating...' : user.isActive ? 'Deactivate Login' : 'Activate User Account'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={
                !canModifyThisUser ||
                user.email?.toLowerCase() === 'superadmin@buoyantmedia.com' ||
                currentUser?.id === user.id
              }
              leftIcon={<Trash2 className="w-4 h-4 text-rose-500" />}
              className="font-bold text-xs rounded-xl shadow-xs border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50 disabled:opacity-40 disabled:cursor-not-allowed"
              title={
                !canModifyThisUser
                  ? 'Only Super Administrators can delete Super Admin accounts'
                  : user.email?.toLowerCase() === 'superadmin@buoyantmedia.com'
                  ? 'Root Super Administrator account cannot be deleted'
                  : currentUser?.id === user.id
                  ? 'You cannot delete your own account'
                  : `Delete user account for ${user.name}`
              }
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* Staff & Admin Works Performance Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Exhibitions Managed
            </span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-2">
            {exhibitions.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {publishedExhibitions.length} published • {totalStallsInEvents} stalls in catalog
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Attributed Bookings
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-2">
            {bookings.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {paidBookings.length} completed / verified
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Revenue Generated
            </span>
            <CreditCard className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-2">
            ₹{totalRevenueGenerated.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Total value: ₹{totalBookedValue.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Page Rights Granted
            </span>
            <Lock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-2">
            {effectivePages.length} / {PAGE_ACCESS_ITEMS.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {user.rolePermissions?.length || 0} API permissions configured
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'overview'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          Works Overview & Timeline
        </button>

        <button
          onClick={() => setActiveTab('exhibitions')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'exhibitions'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Exhibitions Created ({exhibitions.length})
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'bookings'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Sales & Attributed Bookings ({bookings.length})
        </button>

        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'permissions'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          Page Access & Permissions ({effectivePages.length})
        </button>

        <button
          onClick={() => setActiveTab('organization')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'organization'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Entity & Profile
        </button>
      </div>

      {/* TAB 1: OVERVIEW & WORKS SUMMARY */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive Performance Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              Staff & Admin Operational Scope
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {user.role === 'SUPERADMIN' ? (
                <>
                  <strong className="text-slate-900 dark:text-slate-100">Super Administrator Authority:</strong>{' '}
                  This user possesses full root platform governance, unrestricted access to financial auditing,
                  account lifecycle controls, executive reporting, and the ability to configure all trade fairs and
                  visual floor plans.
                </>
              ) : user.role === 'ADMIN' ? (
                <>
                  <strong className="text-slate-900 dark:text-slate-100">Exhibition Administrator Scope:</strong>{' '}
                  This administrator is responsible for configuring interactive floor plans, managing visual studio
                  stalls, validating corporate registrations, and tracking sales performance under assigned SP Code{' '}
                  <strong className="text-purple-600 font-mono">{user.spcode || 'N/A'}</strong>.
                </>
              ) : user.role === 'STAFF' ? (
                <>
                  <strong className="text-slate-900 dark:text-slate-100">Field Operations Staff Scope:</strong>{' '}
                  This team member facilitates exhibitor registrations, reserves stalls, coordinates on-site
                  operations, and generates sales pipelines attributed to their employee SP Code{' '}
                  <strong className="text-emerald-600 font-mono">{user.spcode || 'N/A'}</strong>.
                </>
              ) : (
                <>
                  <strong className="text-slate-900 dark:text-slate-100">Client Exhibitor Account:</strong>{' '}
                  Registered exhibitor profile participating in trade exhibitions with stall allocations and tax
                  invoices.
                </>
              )}
            </p>
          </div>

          {/* Dual Columns: Recent Exhibitions & Recent Bookings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Recent Exhibitions */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Recent Exhibitions Created
                </h4>
                <button
                  onClick={() => setActiveTab('exhibitions')}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  View all ({exhibitions.length}) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {exhibitions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No exhibitions created by this account yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {exhibitions.slice(0, 4).map((ex) => (
                    <div
                      key={ex.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {ex.eventCode || 'EX'}-{ex.edition || '01'}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                              ex.status === 'PUBLISHED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : ex.status === 'COMPLETED'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {ex.status}
                          </span>
                        </div>
                        <h5 className="font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
                          {ex.title}
                        </h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {ex.totalStalls || 0} Stalls • Created {formatDisplayDate(ex.createdAt)}
                        </p>
                      </div>

                      <Link to={`/workspace/events/${ex.slug || ex.id}/edit`}>
                        <Button variant="outline" size="sm" className="shrink-0 text-xs py-1 px-2.5">
                          Manage
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Recent Attributed Bookings */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Recent Sales & Attributed Bookings
                </h4>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  View all ({bookings.length}) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {bookings.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No sales bookings attributed to this SP code or user account yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.slice(0, 5).map((bk) => {
                    const badge = getSourceBadge(bk.bookingSource);
                    const grandTotal = Number(bk.grandTotal || 0);
                    const paid = Number(bk.paidAmount || 0);
                    const balance = Number(bk.balanceAmount ?? (grandTotal - paid));
                    const bookedByName = bk.bookedByUser?.name || bk.user?.name || user.name;
                    const bookedByRole = bk.bookedByUser?.role || bk.user?.role || user.role;
                    const bookedBySpcode = bk.bookedByUser?.spcode || bk.user?.spcode || user.spcode;

                    return (
                      <div
                        key={bk.id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                              {bk.bookingReference}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold rounded-full border ${badge.cls}`}>
                              {badge.label}
                            </span>
                            <PaymentStatusBadge status={bk.paymentStatus} />
                          </div>
                          <h5 className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {bk.company?.name || 'Client Exhibitor'}
                          </h5>
                          <p className="text-[11px] text-slate-400">
                            Event: {bk.exhibition?.title || 'Exhibition'} • Stalls:{' '}
                            {bk.stalls?.map((s: any) => s.stall?.stallNumber).filter(Boolean).join(', ') || 'Allocated'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Booked by: <span className="font-semibold text-purple-700 dark:text-purple-300">{bookedByName}</span> ({bookedByRole}{bookedBySpcode ? ` • ${bookedBySpcode}` : ''})
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-black text-slate-900 dark:text-slate-100 block">
                            ₹{grandTotal.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                            Paid: ₹{paid.toLocaleString('en-IN')}
                          </span>
                          {balance > 0 && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-bold">
                              Due: ₹{balance.toLocaleString('en-IN')}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 mt-0.5 block">{formatDisplayDate(bk.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXHIBITIONS CREATED */}
      {activeTab === 'exhibitions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                Exhibitions Created & Managed by {user.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Total of {exhibitions.length} exhibitions registered by this administrator / staff member.
              </p>
            </div>
          </div>

          {exhibitions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              No exhibition records created by this user.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="w-12 px-4 py-3 text-center">S.No</th>
                    <th className="px-4 py-3">Event Code</th>
                    <th className="px-4 py-3">Exhibition Title</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Total Stalls</th>
                    <th className="px-4 py-3">Event Dates</th>
                    <th className="px-4 py-3">Created On</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {exhibitions.map((ex, idx) => (
                    <tr key={ex.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="w-12 px-4 py-3.5 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-purple-700 dark:text-purple-300">
                        {ex.eventCode || 'EX'}-{ex.edition || '01'}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                        {ex.title}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            ex.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : ex.status === 'COMPLETED'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {ex.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold">
                        {ex.totalStalls || 0} Stalls
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {formatDisplayDate(ex.startDate)} – {formatDisplayDate(ex.endDate)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {formatDisplayDate(ex.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/exhibitions/${ex.slug || ex.id}`}>
                            <Button variant="outline" size="sm" className="text-xs py-1 px-2.5">
                              View
                            </Button>
                          </Link>
                          <Link to={`/workspace/events/${ex.slug || ex.id}/edit`}>
                            <Button variant="primary" size="sm" className="text-xs py-1 px-2.5 bg-purple-600">
                              Edit Builder
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ATTRIBUTED BOOKINGS & SALES */}
      {activeTab === 'bookings' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Sales & Bookings Attributed to {user.name} ({user.spcode ? `SP Code: ${user.spcode}` : 'User ID'})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Total of {bookings.length} reservations with ₹{totalBookedValue.toLocaleString('en-IN')} aggregate value.
              </p>
            </div>

            {bookings.length > 0 && (
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by ref, exhibitor, event, stall..."
                  value={bookingSearchQuery}
                  onChange={(e) => setBookingSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>
            )}
          </div>

          {bookings.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              No sales or bookings records registered under this user account or SP Code.
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
              <p>No bookings match "{bookingSearchQuery}".</p>
              <button
                type="button"
                onClick={() => setBookingSearchQuery('')}
                className="text-xs text-purple-600 font-bold hover:underline"
              >
                Clear Filter
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="w-10 px-3 py-3 text-center">#</th>
                    <th className="px-3.5 py-3">Booking Ref</th>
                    <th className="px-3.5 py-3">Channel</th>
                    <th className="px-3.5 py-3">Booked By</th>
                    <th className="px-3.5 py-3">Exhibitor Company</th>
                    <th className="px-3.5 py-3">Event & Venue</th>
                    <th className="px-3.5 py-3">Allocated Stalls</th>
                    <th className="px-3.5 py-3">Status & Payment</th>
                    <th className="px-3.5 py-3 text-right">Value & Balance</th>
                    <th className="px-3.5 py-3">Date</th>
                    <th className="px-3.5 py-3 text-center">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredBookings.map((bk, idx) => {
                    const badge = getSourceBadge(bk.bookingSource);
                    const grandTotal = Number(bk.grandTotal || 0);
                    const paid = Number(bk.paidAmount || 0);
                    const balance = Number(bk.balanceAmount ?? (grandTotal - paid));
                    const bookedByName = bk.bookedByUser?.name || bk.user?.name || user.name;
                    const bookedByRole = bk.bookedByUser?.role || bk.user?.role || user.role;
                    const bookedBySpcode = bk.bookedByUser?.spcode || bk.user?.spcode || user.spcode;

                    return (
                      <tr key={bk.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="w-10 px-3 py-3.5 text-center font-mono font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-3.5 py-3.5">
                          <span className="font-mono font-bold text-blue-700 dark:text-blue-300 block">
                            {bk.bookingReference}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {bk.id.slice(-6)}
                          </span>
                        </td>
                        <td className="px-3.5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-3.5 py-3.5">
                          <span className="font-semibold text-xs text-purple-700 dark:text-purple-300 block">
                            {bookedByName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {bookedByRole}
                            {bookedBySpcode && ` • ${bookedBySpcode}`}
                          </span>
                        </td>
                        <td className="px-3.5 py-3.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">
                            {bk.company?.name || 'Direct Exhibitor'}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                            {bk.contactPerson || bk.company?.contactPerson || '—'}
                            {bk.company?.city && ` • ${bk.company.city}`}
                          </span>
                        </td>
                        <td className="px-3.5 py-3.5">
                          <span className="text-slate-700 dark:text-slate-200 font-semibold block truncate max-w-[160px]">
                            {bk.exhibition?.title || 'Exhibition'}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[160px]">
                            {bk.exhibition?.city || bk.exhibition?.venue || 'Venue'}
                          </span>
                        </td>
                        <td className="px-3.5 py-3.5">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
                            {bk.stalls?.map((s: any) => s.stall?.stallNumber).filter(Boolean).join(', ') || 'Allocated'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {bk.stalls?.length || 0} Stall{(bk.stalls?.length || 0) === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td className="px-3.5 py-3.5">
                          <div className="space-y-1">
                            <PaymentStatusBadge status={bk.paymentStatus} />
                            {bk.status && (
                              <span className="text-[10px] font-mono block text-slate-400 uppercase">
                                {bk.status}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-3.5 text-right">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block">
                            ₹{grandTotal.toLocaleString('en-IN')}
                          </span>
                          <div className="text-[10px]">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Paid: ₹{paid.toLocaleString('en-IN')}
                            </span>
                            {balance > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 font-bold block">
                                Due: ₹{balance.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-3.5 text-slate-400 font-mono text-[11px]">
                          {formatDisplayDate(bk.createdAt)}
                        </td>
                        <td className="px-3.5 py-3.5 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadInvoicePdf(bk.id, bk.bookingReference)}
                            className="text-xs py-1 px-2.5 font-bold"
                          >
                            PDF
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PAGE ACCESS & PERMISSIONS */}
      {activeTab === 'permissions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-600" />
              Platform Authorization & Page Access Rights
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Role: <strong className="text-purple-600 font-bold">{user.role}</strong> • Granted{' '}
              {effectivePages.length} of {PAGE_ACCESS_ITEMS.length} platform areas.
            </p>
          </div>

          {/* 8-Page Access Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {PAGE_ACCESS_ITEMS.map((page) => {
              const isGranted = effectivePages.includes(page.id);
              return (
                <div
                  key={page.id}
                  className={`p-4 rounded-2xl border text-xs flex items-start gap-3 transition-all ${
                    isGranted
                      ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/60 shadow-xs'
                      : 'bg-slate-50/60 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700 opacity-60'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isGranted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-black text-sm text-slate-900 dark:text-slate-100 truncate">
                        {page.label}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isGranted
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {isGranted ? 'Granted' : 'Restricted'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{page.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enforced API Security Permissions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h4 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Assigned Server Role Permissions ({user.rolePermissions?.length || 0})
            </h4>
            {user.rolePermissions && user.rolePermissions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.rolePermissions.map((perm) => (
                  <span
                    key={perm}
                    className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-mono text-[11px] font-bold rounded-lg border border-purple-200 dark:border-purple-800/60"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No specific permissions attributed.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ENTITY & PROFILE */}
      {activeTab === 'organization' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Entity & Corporate Organization Details
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified corporate affiliation, GST identification, and operational domicile.
            </p>
          </div>

          {user.company ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Company Name</span>
                <span className="font-black text-sm text-slate-900 dark:text-slate-100">{user.company.name}</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Company Code</span>
                <span className="font-mono font-bold text-sm text-purple-600">{user.company.companyCode}</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Contact Person</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{user.company.contactPerson || '—'}</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Industry Sector</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{user.company.industry || '—'}</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">GSTIN Registration</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{user.company.gstNumber || 'Not provided'}</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">PAN Number</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{user.company.panNumber || 'Not provided'}</span>
              </div>

              <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Registered Domicile</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {user.company.address}, {user.company.city}, {user.company.state} {user.company.pinCode}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <Briefcase className="w-8 h-8 text-purple-600 mx-auto" />
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Internal Buoyant Media Staff Member
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                This account is an internal operational employee and is not bound to a third-party exhibitor corporate entity.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reset Password Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => {
          setIsResetModalOpen(false);
          setNewPassword('');
          setResetUsername('');
          setShowResetPassword(false);
          setSendNotificationEmail(true);
        }}
        title={`Reset Password: ${user.name}`}
      >
        <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
          {/* Target User & Company Identity Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-purple-600" />
                {user.name}
              </span>
              {getRoleBadge(user.role)}
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono text-slate-700 dark:text-slate-300">{user.email}</span>
              </div>
              {user.company && (
                <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-medium">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Exhibitor Company: <strong>{user.company.name}</strong> ({user.company.companyCode})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Editable Username field */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Portal Username / Login Identifier
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono text-xs">
                @
              </span>
              <input
                type="text"
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
                placeholder="e.g. johndoe"
                className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              The user can log into the portal with either their email address or this username. You can modify it here.
            </p>
          </div>

          {/* New Password input with generator & visibility toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                New Temporary Password * (min 8 characters)
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800"
              >
                <Sparkles className="w-3 h-3 text-purple-500" />
                Generate Strong Password
              </button>
            </div>

            <div className="relative">
              <input
                type={showResetPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter or generate temporary password"
                className="w-full pl-3 pr-10 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowResetPassword(!showResetPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Email Notification Option */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <input
                type="checkbox"
                checked={sendNotificationEmail}
                onChange={(e) => setSendNotificationEmail(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div className="flex-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                  Send notification email with login credentials to user
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  {sendNotificationEmail
                    ? `An email with the username and the new temporary password will be sent securely to ${user.email}.`
                    : 'No email will be sent. The user password will be silently updated in the system.'}
                </span>
              </div>
            </label>
          </div>

          {/* Security Notice Note */}
          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>How does the user know which password to login with?</strong>
              <br />
              When notification email is enabled, the system transmits this new temporary password along with their username to <strong>{user.email}</strong> via TLS-encrypted email. For account security, the user is instructed in the email to sign in and immediately change this temporary password.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsResetModalOpen(false);
                setNewPassword('');
                setResetUsername('');
                setShowResetPassword(false);
                setSendNotificationEmail(true);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={resettingPassword}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              Confirm Password Reset
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditModalError(null);
          setEditFieldErrors({});
        }}
        title={`Edit User Profile: ${user.name}`}
        maxWidth="5xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs max-h-[82vh] overflow-y-auto pr-1">
          {/* In-Modal Alert Banner */}
          {editModalError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5 shadow-xs animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-rose-900 dark:text-rose-100">Update Failed</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">{editModalError}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalError(null)}
                className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 p-0.5 rounded transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Horizontal 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT COLUMN: Role & Profile Fields (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              {/* Account Role */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Account Role *
                </label>
                <div className={`grid gap-2 ${allowedEditRoles.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {allowedEditRoles.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleEditRoleChange(r)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        editUserRole === r
                          ? 'border-[#09539b] bg-blue-50/70 text-[#09539b] dark:bg-blue-950/40 dark:text-blue-300 ring-2 ring-blue-500/30 font-bold'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {r === 'SUPERADMIN' ? (
                          <Shield className="w-3.5 h-3.5 text-amber-500" />
                        ) : r === 'ADMIN' ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                        ) : (
                          <Users className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        <span>{r === 'SUPERADMIN' ? 'Super Admin' : r === 'ADMIN' ? 'Admin' : 'Staff'}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-normal">
                        {r === 'SUPERADMIN' ? 'Full Control' : r === 'ADMIN' ? 'Events & Stalls' : 'Operations'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={editForm.name}
                    error={editFieldErrors.name}
                    onChange={(e) => {
                      setEditForm((prev) => ({ ...prev, name: e.target.value }));
                      if (editFieldErrors.name) setEditFieldErrors((prev) => ({ ...prev, name: undefined }));
                      if (editModalError) setEditModalError(null);
                    }}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={editForm.email}
                    error={editFieldErrors.email}
                    onChange={(e) => {
                      setEditForm((prev) => ({ ...prev, email: e.target.value }));
                      if (editFieldErrors.email) setEditFieldErrors((prev) => ({ ...prev, email: undefined }));
                      if (editModalError) setEditModalError(null);
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Portal Username *
                  </label>
                  <Input
                    type="text"
                    value={editForm.username}
                    error={editFieldErrors.username}
                    placeholder="e.g. johndoe"
                    onChange={(e) => {
                      setEditForm((prev) => ({ ...prev, username: e.target.value }));
                      if (editFieldErrors.username) setEditFieldErrors((prev) => ({ ...prev, username: undefined }));
                      if (editModalError) setEditModalError(null);
                    }}
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Primary login identifier</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number *
                  </label>
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={editForm.phone}
                    error={editFieldErrors.phone}
                    onChange={(e) => {
                      setEditForm((prev) => ({ ...prev, phone: e.target.value }));
                      if (editFieldErrors.phone) setEditFieldErrors((prev) => ({ ...prev, phone: undefined }));
                      if (editModalError) setEditModalError(null);
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  SP Code *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. SP-201"
                  value={editForm.spcode}
                  error={editFieldErrors.spcode}
                  onChange={(e) => {
                    setEditForm((prev) => ({ ...prev, spcode: e.target.value.toUpperCase() }));
                    if (editFieldErrors.spcode) setEditFieldErrors((prev) => ({ ...prev, spcode: undefined }));
                    if (editModalError) setEditModalError(null);
                  }}
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Granular Page Access Rights (7 cols, 2-column grid with clean images/icons) */}
            <div className="lg:col-span-7 flex flex-col space-y-2.5 bg-slate-50/70 dark:bg-slate-800/30 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#09539b] dark:text-blue-400" />
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                      Page Permissions *
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {editUserPages.length}/{PAGE_ACCESS_ITEMS.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Select granted platform areas. At least one permission required.
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditUserPages([...(DEFAULT_ROLE_PAGE_ACCESS[editUserRole] || ['dashboard'])])}
                    className="px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditUserPages(PAGE_ACCESS_ITEMS.map((p) => p.id))}
                    className="px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-800 transition-colors shadow-2xs"
                  >
                    All
                  </button>
                </div>
              </div>

              {editFieldErrors.pageAccess && (
                <div className="p-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{editFieldErrors.pageAccess}</span>
                </div>
              )}

              {/* 2-Column Permissions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                {PAGE_ACCESS_ITEMS.map((page) => {
                  const isSelected = editUserPages.includes(page.id);
                  const config = PAGE_ICON_CONFIG[page.id] || {
                    icon: Layers,
                    color: 'text-blue-600 dark:text-blue-400',
                    bg: 'bg-blue-50 dark:bg-blue-950/60',
                    border: 'border-blue-200 dark:border-blue-800/80',
                  };
                  const IconComp = config.icon;

                  return (
                    <div
                      key={page.id}
                      onClick={() => handleToggleEditPage(page.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 select-none group hover:shadow-xs ${
                        isSelected
                          ? 'border-[#09539b] bg-blue-50/70 dark:bg-blue-950/40 text-slate-900 dark:text-slate-100 ring-1 ring-blue-500/25 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${config.bg} ${config.color} ${config.border} transition-transform group-hover:scale-105`}
                          >
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          {page.id === 'governance' && (
                            <span className="text-[7.5px] font-black uppercase px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
                              Super Admin
                            </span>
                          )}
                          {page.id === 'reports' && (
                            <span className="text-[7.5px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                              Reports
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 mt-0.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#09539b] dark:text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400" />
                          )}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <span className="font-bold text-[11px] text-slate-900 dark:text-slate-100 block truncate group-hover:text-[#09539b] dark:group-hover:text-blue-300 transition-colors">
                          {page.label}
                        </span>
                        <p className="text-[9.5px] text-slate-400 line-clamp-2 mt-0.5 leading-tight">
                          {page.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">* Required fields</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditModalError(null);
                  setEditFieldErrors({});
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={savingEdit}
                className="bg-[#09539b] hover:bg-[#07427d] text-white font-bold"
              >
                Save Profile Changes
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete User Account"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Permanent Action Warning</p>
              <p className="mt-1 text-[11px] leading-relaxed">
                Are you sure you want to permanently delete the account for{' '}
                <strong>{user?.name}</strong> ({user?.email})? This action cannot be reversed.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 space-y-1.5 text-[11px]">
            <p><strong>Account Role:</strong> {user?.role}</p>
            {user?.spcode && <p><strong>SP Code:</strong> {user?.spcode}</p>}
            <p className="pt-1 text-slate-500 dark:text-slate-400">
              Historical bookings and created exhibitions will remain preserved with user reference unlinked, and any active stall holds placed by this user will be immediately released.
            </p>
          </div>

          {!canModifyThisUser && (
            <p className="p-2.5 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-lg border border-amber-200 text-[11px] font-semibold">
              Only Super Administrators have permission to delete Super Admin accounts.
            </p>
          )}

          {user?.email?.toLowerCase() === 'superadmin@buoyantmedia.com' && (
            <p className="p-2.5 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-lg border border-amber-200 text-[11px] font-semibold">
              The root Super Administrator account is protected and cannot be deleted.
            </p>
          )}

          {currentUser?.id === user?.id && (
            <p className="p-2.5 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-lg border border-amber-200 text-[11px] font-semibold">
              You cannot delete your own currently logged-in account.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={deletingUser}
              disabled={
                !canModifyThisUser ||
                user?.email?.toLowerCase() === 'superadmin@buoyantmedia.com' ||
                currentUser?.id === user?.id
              }
              onClick={handleDeleteConfirm}
            >
              Delete User Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
