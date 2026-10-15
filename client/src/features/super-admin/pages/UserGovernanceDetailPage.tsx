import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { userService } from '../../../services/users/userService';
import { AdminStaffUser } from '../../../types';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
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
} from 'lucide-react';

const PAGE_ACCESS_ITEMS = [
  { id: 'dashboard', label: 'Primary Dashboard', description: 'Executive KPIs, analytics, and operational hub' },
  { id: 'events_floorplans', label: 'Exhibitions & Floor Plans', description: 'Manage trade fairs, visual designer, and hall blueprints' },
  { id: 'event_register', label: 'Event Registration Hub', description: 'Exhibitor registration and direct stall assignments' },
  { id: 'companies', label: 'Exhibitors Directory', description: 'Corporate profiles, KYC verification, and tax details' },
  { id: 'bookings', label: 'Bookings & Allocations', description: 'Review stall reservations, holds, and approvals' },
  { id: 'payments', label: 'Billing & Invoices', description: 'Financial payments, GST invoices, and reconciliation' },
  { id: 'reports', label: 'Platform Reports & Analytics', description: 'Occupancy charts, revenue metrics, and export data' },
  { id: 'governance', label: 'User Governance & Roles', description: 'Super Admin control, staff accounts, and security' },
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
    const confirmMsg = nextState
      ? `Activate login and platform privileges for ${user.name}?`
      : `Deactivate account for ${user.name}? They will be immediately blocked from signing in.`;

    if (!window.confirm(confirmMsg)) return;

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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 py-6">
        <BackButton to="/super-admin/users" label="Back to User Governance" />
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
        <BackButton to="/super-admin/users" label="Back to User Governance" />
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

  const bookings = user.attributedBookings || [];
  const paidBookings = bookings.filter(
    (b) => b.paymentStatus === 'PAID_FULL' || b.paymentStatus === 'PAID' || Number(b.paidAmount || 0) > 0
  );
  const totalRevenueGenerated = bookings.reduce(
    (sum, b) => sum + (Number(b.paidAmount) || Number(b.grandTotal) || 0),
    0
  );
  const totalBookedValue = bookings.reduce((sum, b) => sum + Number(b.grandTotal || 0), 0);

  const heldStalls = user.heldStalls || [];
  const effectivePages = user.pageAccess || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <BackButton to="/super-admin/users" label="Back to User Governance" />

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
            className="print:hidden text-xs"
          >
            Print Audit Report
          </Button>
        </div>
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
              variant={user.isActive ? 'outline' : 'primary'}
              size="md"
              onClick={handleToggleStatus}
              disabled={togglingStatus}
              leftIcon={<Power className="w-4 h-4" />}
              className={`font-black text-xs rounded-xl shadow-xs ${
                user.isActive
                  ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/50'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {togglingStatus ? 'Updating...' : user.isActive ? 'Deactivate Login' : 'Activate User Account'}
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

                      <Link to={`/admin/events/${ex.slug || ex.id}/edit`}>
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
                  {bookings.slice(0, 4).map((bk) => (
                    <div
                      key={bk.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                            {bk.bookingReference}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                              bk.paymentStatus === 'PAID_FULL' || bk.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : bk.paymentStatus === 'PARTIALLY_PAID'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {bk.paymentStatus}
                          </span>
                        </div>
                        <h5 className="font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
                          {bk.company?.name || 'Client Exhibitor'}
                        </h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Event: {bk.exhibition?.title || 'Exhibition'} • Stalls:{' '}
                          {bk.stalls?.map((s: any) => s.stall?.stallNumber).filter(Boolean).join(', ') || 'Allocated'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-slate-900 dark:text-slate-100 block">
                          ₹{Number(bk.grandTotal || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDisplayDate(bk.createdAt)}</span>
                      </div>
                    </div>
                  ))}
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
                          <Link to={`/admin/events/${ex.slug || ex.id}/edit`}>
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
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Sales & Bookings Attributed to {user.name} ({user.spcode ? `SP Code: ${user.spcode}` : 'User ID'})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Total of {bookings.length} reservations with ₹{totalBookedValue.toLocaleString('en-IN')} aggregate value.
              </p>
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              No sales or bookings records registered under this user account or SP Code.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="w-12 px-4 py-3 text-center">S.No</th>
                    <th className="px-4 py-3">Booking Ref</th>
                    <th className="px-4 py-3">Exhibitor Company</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Stalls</th>
                    <th className="px-4 py-3">Grand Total</th>
                    <th className="px-4 py-3">Payment Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {bookings.map((bk, idx) => (
                    <tr key={bk.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="w-12 px-4 py-3.5 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-700 dark:text-blue-300">
                        {bk.bookingReference}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                        {bk.company?.name || 'Direct Exhibitor'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 truncate max-w-xs">
                        {bk.exhibition?.title || 'Exhibition'}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold">
                        {bk.stalls?.map((s: any) => s.stall?.stallNumber).filter(Boolean).join(', ') || 'Allocated'}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₹{Number(bk.grandTotal || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            bk.paymentStatus === 'PAID_FULL' || bk.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : bk.paymentStatus === 'PARTIALLY_PAID'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {bk.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {formatDisplayDate(bk.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadInvoicePdf(bk.id, bk.bookingReference)}
                          className="text-xs py-1 px-2.5"
                        >
                          PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
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
    </div>
  );
};
