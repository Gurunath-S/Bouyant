import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { userService } from '../../../services/users/userService';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { AdminStaffUser, CreateAdminStaffPayload, CreateUserPayload, UpdateUserPayload, Exhibition } from '../../../types';
import { PAGE_ACCESS_ITEMS, DEFAULT_ROLE_PAGE_ACCESS, getUserEffectivePageAccess } from '../../../config/pageAccess';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { TablePagination } from '../../../components/ui/TablePagination';
import { formatDisplayDate } from '../../../utils/date';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  KeyRound,
  CheckCircle2,
  XCircle,
  Pencil,
  Power,
  RefreshCw,
  Eye,
  Phone,
  Mail,
  Layers,
  TrendingUp,
  Building2,
  Calendar,
  Globe2,
  Lock,
  Shield,
  Briefcase,
  AlertCircle,
  CheckSquare,
  Square,
  Check,
  ExternalLink,
} from 'lucide-react';

export const SuperAdminUsersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const eventParam = searchParams.get('exhibitionId') || 'ALL';

  const [users, setUsers] = useState<AdminStaffUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [roleCounts, setRoleCounts] = useState<{
    ALL: number;
    SUPERADMIN: number;
    ADMIN: number;
    STAFF: number;
    CLIENT: number;
  }>({
    ALL: 0,
    SUPERADMIN: 0,
    ADMIN: 0,
    STAFF: 0,
    CLIENT: 0,
  });
  const [publishedEvents, setPublishedEvents] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedEventId, setSelectedEventId] = useState<string>(eventParam);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createUserRole, setCreateUserRole] = useState<'SUPERADMIN' | 'ADMIN' | 'STAFF'>('ADMIN');
  const [createUserPages, setCreateUserPages] = useState<string[]>(DEFAULT_ROLE_PAGE_ACCESS.ADMIN);
  const [editUser, setEditUser] = useState<AdminStaffUser | null>(null);
  const [editUserRole, setEditUserRole] = useState<'SUPERADMIN' | 'ADMIN' | 'STAFF' | 'CLIENT'>('ADMIN');
  const [editUserPages, setEditUserPages] = useState<string[]>([]);
  const [statusTargetUser, setStatusTargetUser] = useState<AdminStaffUser | null>(null);
  const [resetTargetUser, setResetTargetUser] = useState<AdminStaffUser | null>(null);

  // Complete User Details State
  const [viewDetailsUserId, setViewDetailsUserId] = useState<string | null>(null);
  const [viewDetailsUser, setViewDetailsUser] = useState<AdminStaffUser | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsSection, setDetailsSection] = useState<'profile' | 'access' | 'organization' | 'events' | 'activity'>('profile');

  // Form states
  const [createForm, setCreateForm] = useState<CreateAdminStaffPayload>({
    name: '',
    email: '',
    password: '',
    phone: '',
    spcode: '',
  });

  const [editForm, setEditForm] = useState<UpdateUserPayload>({
    name: '',
    phone: '',
    spcode: '',
  });

  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Ref to protect against asynchronous race conditions
  const usersReqIdRef = useRef(0);

  const fetchEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const expos = await exhibitionService.getExhibitions('PUBLISHED');
      setPublishedEvents(expos || []);
    } catch (err) {
      console.error('Failed to load published events:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const fetchUsers = useCallback(async (eventId: string, status: string, search: string, role: string, page: number, limit = pageSize) => {
    const reqId = ++usersReqIdRef.current;
    try {
      setLoading(true);
      const res = await userService.getUsers({
        exhibitionId: eventId === 'ALL' ? undefined : eventId,
        status: status === 'ALL' ? undefined : status,
        search: search.trim() ? search.trim() : undefined,
        role: role === 'ALL' ? undefined : role,
        page,
        limit,
      });
      if (reqId === usersReqIdRef.current) {
        setUsers(res?.data || []);
        setTotalUsers(res?.meta?.total || 0);
        if (res?.meta?.roleCounts) {
          setRoleCounts(res.meta.roleCounts);
        }
      }
    } catch (err: any) {
      if (reqId === usersReqIdRef.current) {
        console.error('Failed to load users directory:', err);
        setUsers([]);
        setTotalUsers(0);
        setFeedbackMsg({
          type: 'error',
          text: err?.response?.data?.message || err?.message || 'Failed to load user directory.',
        });
      }
    } finally {
      if (reqId === usersReqIdRef.current) {
        setLoading(false);
      }
    }
  }, [pageSize]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchUsers(selectedEventId, statusFilter, searchQuery, activeTab, currentPage, pageSize);
  }, [selectedEventId, statusFilter, searchQuery, activeTab, currentPage, pageSize, fetchUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEventId, statusFilter, searchQuery, activeTab]);

  // Synchronize URL search params
  const handleEventFilterChange = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentPage(1);
    const nextParams = new URLSearchParams(searchParams);
    if (eventId === 'ALL') {
      nextParams.delete('exhibitionId');
    } else {
      nextParams.set('exhibitionId', eventId);
    }
    setSearchParams(nextParams);
  };

  const handleOpenDetails = async (userId: string) => {
    setViewDetailsUserId(userId);
    setViewDetailsUser(null);
    setDetailsError(null);
    setDetailsSection('profile');
    setLoadingDetails(true);

    try {
      const fullUserData = await userService.getUserById(userId);
      setViewDetailsUser(fullUserData);
    } catch (err: any) {
      console.error('Failed to fetch detailed user record:', err);
      setDetailsError(err?.response?.data?.message || err?.message || 'Could not load complete user record.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseDetails = () => {
    setViewDetailsUserId(null);
    setViewDetailsUser(null);
    setDetailsError(null);
  };

  const handleOpenCreate = (initialRole: 'SUPERADMIN' | 'ADMIN' | 'STAFF' = 'ADMIN') => {
    setCreateUserRole(initialRole);
    setCreateUserPages([...(DEFAULT_ROLE_PAGE_ACCESS[initialRole] || [])]);
    setCreateForm({
      name: '',
      email: '',
      password: '',
      phone: '',
      spcode: '',
    });
    setFeedbackMsg(null);
    setCreateModalOpen(true);
  };

  const handleCreateRoleChange = (newRole: 'SUPERADMIN' | 'ADMIN' | 'STAFF') => {
    setCreateUserRole(newRole);
    setCreateUserPages([...(DEFAULT_ROLE_PAGE_ACCESS[newRole] || [])]);
  };

  const handleToggleCreatePage = (pageId: string) => {
    setCreateUserPages((prev) =>
      prev.includes(pageId) ? prev.filter((p) => p !== pageId) : [...prev, pageId]
    );
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await userService.createUser({
        ...createForm,
        role: createUserRole,
        pageAccess: createUserPages,
      });
      setFeedbackMsg({
        type: 'success',
        text: `${createUserRole === 'SUPERADMIN' ? 'Super Admin' : createUserRole === 'ADMIN' ? 'Admin' : 'Staff'} user account created successfully with custom page access!`,
      });
      setCreateModalOpen(false);
      await fetchUsers(selectedEventId, statusFilter, searchQuery, activeTab, currentPage);
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.response?.data?.message || err?.message || 'Failed to create user. Please check credentials.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (user: AdminStaffUser) => {
    setEditUser(user);
    const userRole = (user.role as 'SUPERADMIN' | 'ADMIN' | 'STAFF' | 'CLIENT') || 'CLIENT';
    setEditUserRole(userRole);
    setEditUserPages(getUserEffectivePageAccess(user));
    setEditForm({
      name: user.name,
      phone: user.phone || '',
      spcode: user.spcode || '',
    });
    setFeedbackMsg(null);
  };

  const handleEditRoleChange = (newRole: 'SUPERADMIN' | 'ADMIN' | 'STAFF' | 'CLIENT') => {
    setEditUserRole(newRole);
    setEditUserPages([...(DEFAULT_ROLE_PAGE_ACCESS[newRole] || ['dashboard'])]);
  };

  const handleToggleEditPage = (pageId: string) => {
    setEditUserPages((prev) =>
      prev.includes(pageId) ? prev.filter((p) => p !== pageId) : [...prev, pageId]
    );
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      setActionLoading(true);
      await userService.updateUser(editUser.id, {
        ...editForm,
        role: editUserRole,
        pageAccess: editUserPages,
      });
      setFeedbackMsg({
        type: 'success',
        text: `User "${editUser.name}" updated successfully!`,
      });
      setEditUser(null);
      await fetchUsers(selectedEventId, statusFilter, searchQuery, activeTab, currentPage);
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.response?.data?.message || err?.message || 'Failed to update user.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatusConfirm = async () => {
    if (!statusTargetUser) return;
    try {
      setActionLoading(true);
      const newStatus = !statusTargetUser.isActive;
      await userService.toggleStatus(statusTargetUser.id, newStatus);
      setFeedbackMsg({
        type: 'success',
        text: `User "${statusTargetUser.name}" has been ${newStatus ? 'activated' : 'deactivated'}.`,
      });
      setStatusTargetUser(null);
      await fetchUsers(selectedEventId, statusFilter, searchQuery, activeTab, currentPage);
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.response?.data?.message || err?.message || 'Failed to update user status.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !newPassword) return;
    try {
      setActionLoading(true);
      const res = await userService.resetPassword(resetTargetUser.id, newPassword);
      setFeedbackMsg({
        type: 'success',
        text: res.message || 'Password reset successfully.',
      });
      setResetTargetUser(null);
      setNewPassword('');
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.response?.data?.message || err?.message || 'Failed to reset password.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Role counts from server-side database groupBy
  const superAdminsCount = roleCounts.SUPERADMIN;
  const adminsCount = roleCounts.ADMIN;
  const staffCount = roleCounts.STAFF;
  const clientsCount = roleCounts.CLIENT;
  const allRolesCount = roleCounts.ALL;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Shield className="w-3 h-3 text-amber-500" />
            Super Admin
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            <ShieldCheck className="w-3 h-3 text-purple-500" />
            Admin
          </span>
        );
      case 'STAFF':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <Users className="w-3 h-3 text-emerald-500" />
            Staff
          </span>
        );
      case 'CLIENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Building2 className="w-3 h-3 text-blue-500" />
            Client
          </span>
        );
      default:
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-300">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              User & Team Governance
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Administrative user directory, role governance, account activation, staff SP allocations, and audit details.
          </p>
        </div>

        {/* Single Add User Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => handleOpenCreate('ADMIN')}
            className="bg-[#09539b] hover:bg-[#07427d] text-white shadow-sm font-bold px-4 py-2"
          >
            Add User
          </Button>
        </div>
      </div>

      {/* Alert Notification */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs font-bold underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Filters & Governance Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-4">
        {/* Top Filter Controls: Event Scope Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
            <label
              htmlFor="users-event-filter"
              className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0"
            >
              Event Scope:
            </label>
            <select
              id="users-event-filter"
              value={selectedEventId}
              onChange={(e) => handleEventFilterChange(e.target.value)}
              disabled={loadingEvents}
              className="text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
            >
              <option value="ALL">All Events (Platform-Wide Directory)</option>
              {publishedEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} {ev.edition ? `(Edition ${ev.edition})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedEventId !== 'ALL' && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                Displaying users associated with selected event (Super Admins preserved)
              </span>
              <button
                onClick={() => handleEventFilterChange('ALL')}
                className="text-xs font-bold underline text-slate-500 hover:text-slate-800"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Secondary Filter Controls: Role Tabs, Status Filter, Search Input */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Role Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => {
                setActiveTab('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All Roles ({allRolesCount})
            </button>
            <button
              onClick={() => {
                setActiveTab('SUPERADMIN');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                activeTab === 'SUPERADMIN'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shadow-2xs'
                  : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-300'
              }`}
            >
              <Shield className="w-3 h-3" />
              Super Admins ({superAdminsCount})
            </button>
            <button
              onClick={() => {
                setActiveTab('ADMIN');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                activeTab === 'ADMIN'
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shadow-2xs'
                  : 'text-slate-500 hover:text-purple-600 dark:hover:text-purple-300'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              Admins ({adminsCount})
            </button>
            <button
              onClick={() => {
                setActiveTab('STAFF');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                activeTab === 'STAFF'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                  : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-300'
              }`}
            >
              <Users className="w-3 h-3" />
              Staff ({staffCount})
            </button>
            <button
              onClick={() => {
                setActiveTab('CLIENT');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                activeTab === 'CLIENT'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-500 hover:text-blue-600 dark:hover:text-blue-300'
              }`}
            >
              <Building2 className="w-3 h-3" />
              Clients ({clientsCount})
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, email, SP, company..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e: any) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Deactivated Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. User Directory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
            Loading accounts directory...
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No {activeTab !== 'ALL' ? `${activeTab.toLowerCase()} ` : ''}accounts found
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab !== 'ALL'
                ? 'Try selecting "All Roles" or clearing your search filters.'
                : 'Try resetting search filters or event scope.'}
            </p>
            {activeTab !== 'ALL' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveTab('ALL');
                  setCurrentPage(1);
                }}
                className="mt-3 text-xs"
              >
                View All Roles
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                <tr>
                  <th className="w-12 px-3 py-3.5 text-center">S.No</th>
                  <th className="px-5 py-3.5">User & Contact</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Account Status</th>
                  <th className="px-4 py-3.5">Company / Org</th>
                  <th className="px-4 py-3.5">Page Access & Scope</th>
                  <th className="px-4 py-3.5">Created Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((user, idx) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {/* S.No */}
                    <td className="w-12 px-3 py-3.5 text-center font-mono text-slate-400 font-bold">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    {/* 1. Name & Contact */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                            user.role === 'SUPERADMIN'
                              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                              : user.role === 'ADMIN'
                              ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : user.role === 'STAFF'
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            to={`/super-admin/users/${user.id}`}
                            className="font-bold text-slate-900 dark:text-slate-100 hover:text-purple-600 dark:hover:text-purple-400 hover:underline transition-colors block"
                            title="Open Staff & Admin Works Detail Page"
                          >
                            {user.name}
                          </Link>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {user.email}
                          </p>
                          {user.phone && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              {user.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Role */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                      {user.spcode && (
                        <span className="block font-mono text-[10px] font-bold text-slate-400 mt-1">
                          SP: {user.spcode}
                        </span>
                      )}
                    </td>

                    {/* 3. Account Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <XCircle className="w-3 h-3" />
                          Deactivated
                        </span>
                      )}
                    </td>

                    {/* 4. Company / Org */}
                    <td className="px-4 py-3.5">
                      {user.company ? (
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            {user.company.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {user.company.companyCode}
                          </p>
                        </div>
                      ) : user.role === 'SUPERADMIN' || user.role === 'ADMIN' || user.role === 'STAFF' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          Buoyant Platform Team
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Independent</span>
                      )}
                    </td>

                    {/* 5. Page Access & Scope */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        {user.role === 'SUPERADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                            <Shield className="w-3 h-3 text-amber-500" />
                            All 8 Pages (Super Admin)
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                getUserEffectivePageAccess(user).length === PAGE_ACCESS_ITEMS.length
                                  ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                              title={getUserEffectivePageAccess(user).join(', ')}
                            >
                              <ShieldCheck className="w-3 h-3 text-blue-500" />
                              {getUserEffectivePageAccess(user).length}/8 Pages
                            </span>
                            {getUserEffectivePageAccess(user).includes('governance') && user.role !== 'SUPERADMIN' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300">
                                +Governance
                              </span>
                            )}
                          </div>
                        )}
                        {user.eventAssociation ? (
                          <p className="text-[10px] text-slate-400 font-medium">
                            {user.eventAssociation}
                          </p>
                        ) : user._count?.createdExhibitions ? (
                          <p className="text-[10px] text-slate-400 font-medium">
                            {user._count.createdExhibitions} Event(s) Created
                          </p>
                        ) : null}
                      </div>
                    </td>

                    {/* 6. Created Date */}
                    <td className="px-4 py-3.5 text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDisplayDate(user.createdAt)}
                    </td>

                    {/* 7. Actions */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/super-admin/users/${user.id}`}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors inline-flex items-center"
                          title="View Staff & Admin Work Audit Profile (Dedicated Page)"
                          aria-label={`View details for ${user.name}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg transition-colors"
                          title="Edit User Details"
                          aria-label={`Edit user ${user.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setStatusTargetUser(user)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.isActive
                              ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                          }`}
                          title={user.isActive ? 'Deactivate Account' : 'Activate Account'}
                          aria-label={`${user.isActive ? 'Deactivate' : 'Activate'} user ${user.name}`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setResetTargetUser(user);
                            setNewPassword('');
                          }}
                          className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors"
                          title="Reset Password"
                          aria-label={`Reset password for ${user.name}`}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <TablePagination
          currentPage={currentPage}
          totalItems={totalUsers}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel={activeTab === 'ALL' ? 'users' : `${activeTab.toLowerCase()} accounts`}
        />
      </div>

      {/* 4. COMPLETE USER DETAILS MODAL */}
      <Modal
        isOpen={!!viewDetailsUserId}
        onClose={handleCloseDetails}
        title={viewDetailsUser ? `User Governance Detail: ${viewDetailsUser.name}` : 'Loading User Details...'}
      >
        {loadingDetails ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
            Fetching authorized user profile and activity records...
          </div>
        ) : detailsError ? (
          <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Failed to load user details: {detailsError}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleOpenDetails(viewDetailsUserId!)}>
              Retry
            </Button>
          </div>
        ) : viewDetailsUser ? (
          <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* User Profile Header Banner */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl font-black text-base flex items-center justify-center shrink-0 ${
                    viewDetailsUser.role === 'SUPERADMIN'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : viewDetailsUser.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700 border border-purple-300'
                      : viewDetailsUser.role === 'STAFF'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-blue-100 text-blue-700 border border-blue-300'
                  }`}
                >
                  {viewDetailsUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
                      {viewDetailsUser.name}
                    </h3>
                    {getRoleBadge(viewDetailsUser.role)}
                    {viewDetailsUser.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active Account
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Deactivated
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 flex items-center gap-2">
                    <span>{viewDetailsUser.email}</span>
                    {viewDetailsUser.phone && <span>• {viewDetailsUser.phone}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {viewDetailsUser.spcode && (
                  <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                    <p className="text-[9px] font-bold text-indigo-500 uppercase">Sales SP Code</p>
                    <p className="font-mono font-black text-sm text-indigo-700 dark:text-indigo-300">
                      {viewDetailsUser.spcode}
                    </p>
                  </div>
                )}
                <Link to={`/super-admin/users/${viewDetailsUser.id}`}>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs"
                  >
                    Open Dedicated Work Audit Page
                  </Button>
                </Link>
              </div>
            </div>

            {/* Navigation Tabs Inside Modal */}
            <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setDetailsSection('profile')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  detailsSection === 'profile'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                1. Profile
              </button>
              <button
                onClick={() => setDetailsSection('access')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  detailsSection === 'access'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                2. Access & Permissions
              </button>
              <button
                onClick={() => setDetailsSection('organization')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  detailsSection === 'organization'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                3. Organization
              </button>
              <button
                onClick={() => setDetailsSection('events')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  detailsSection === 'events'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                4. Event Assignments
              </button>
              <button
                onClick={() => setDetailsSection('activity')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  detailsSection === 'activity'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                5. Activity History
              </button>
            </div>

            {/* TAB 1: Profile */}
            {detailsSection === 'profile' && (
              <div className="space-y-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                  User Profile Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Full Name</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{viewDetailsUser.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Email Address</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{viewDetailsUser.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Phone</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {viewDetailsUser.phone || <em className="text-slate-400">Not provided</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Account Status</span>
                    <span className={viewDetailsUser.isActive ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      {viewDetailsUser.isActive ? 'Active (Full Platform Login)' : 'Deactivated'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Created On</span>
                    <span className="text-slate-600 dark:text-slate-400">{formatDisplayDate(viewDetailsUser.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Last Updated</span>
                    <span className="text-slate-600 dark:text-slate-400">{formatDisplayDate(viewDetailsUser.updatedAt)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Access & Permissions */}
            {detailsSection === 'access' && (
              <div className="space-y-4 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-600" />
                  Authorization Level & Configured Page Access
                </h4>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    Role: {viewDetailsUser.role}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {viewDetailsUser.role === 'SUPERADMIN'
                      ? 'Highest platform level access. Can govern all accounts, manage exhibitions, create administrators, and view executive financial analytics.'
                      : viewDetailsUser.role === 'ADMIN'
                      ? 'Exhibition administrator. Can configure visual floor plans, pricing tiers, and audit reservations across assigned events.'
                      : viewDetailsUser.role === 'STAFF'
                      ? 'Operations staff. Can submit event proposals (Draft state), manage bookings, and coordinate registered exhibitors.'
                      : 'Client exhibitor. Can reserve floor plan stalls and manage organization bookings.'}
                  </p>
                </div>

                {/* Page Access Rights Matrix */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                      Platform Page Access Rights ({getUserEffectivePageAccess(viewDetailsUser).length} of {PAGE_ACCESS_ITEMS.length} Pages Granted)
                    </h5>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PAGE_ACCESS_ITEMS.map((page) => {
                      const isGranted = getUserEffectivePageAccess(viewDetailsUser).includes(page.id);
                      return (
                        <div
                          key={page.id}
                          className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                            isGranted
                              ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/60'
                              : 'bg-slate-50/60 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700 opacity-60'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isGranted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                {page.label}
                              </span>
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                  isGranted
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                }`}
                              >
                                {isGranted ? 'Granted' : 'Restricted'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{page.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h5 className="font-bold text-[11px] text-slate-700 dark:text-slate-300 mb-2">
                    Server Permissions Enforced For This Account ({viewDetailsUser.rolePermissions?.length || 0})
                  </h5>
                  {viewDetailsUser.rolePermissions && viewDetailsUser.rolePermissions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {viewDetailsUser.rolePermissions.map((perm) => (
                        <span
                          key={perm}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] rounded border border-slate-200 dark:border-slate-700"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-[11px]">No specific permissions attributed.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Organization */}
            {detailsSection === 'organization' && (
              <div className="space-y-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  Organization & Entity Affiliation
                </h4>

                {viewDetailsUser.company ? (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Company Name</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{viewDetailsUser.company.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Company Code</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{viewDetailsUser.company.companyCode}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Contact Person</span>
                      <span className="text-slate-800 dark:text-slate-200">{viewDetailsUser.company.contactPerson || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Industry</span>
                      <span className="text-slate-800 dark:text-slate-200">{viewDetailsUser.company.industry || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">GST Number</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{viewDetailsUser.company.gstNumber || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">PAN Number</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{viewDetailsUser.company.panNumber || 'Not provided'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Address</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {viewDetailsUser.company.address}, {viewDetailsUser.company.city}, {viewDetailsUser.company.state} {viewDetailsUser.company.pinCode}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-slate-500">
                    <Briefcase className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">Internal Platform Account</p>
                    <p className="text-[11px] mt-0.5">
                      This user belongs directly to the internal Buoyant Media operations team and is not linked to an external exhibitor company entity.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Event Assignments */}
            {detailsSection === 'events' && (
              <div className="space-y-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  Exhibitions Created & Managed ({viewDetailsUser.createdExhibitions?.length || 0})
                </h4>

                {!viewDetailsUser.createdExhibitions || viewDetailsUser.createdExhibitions.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                    No exhibitions registered under this account.
                  </p>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="w-10 px-2.5 py-2 text-center">S.No</th>
                          <th className="px-3 py-2">Event Title</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Total Stalls</th>
                          <th className="px-3 py-2">Created Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {viewDetailsUser.createdExhibitions.map((ex: any, idx: number) => (
                          <tr key={ex.id} className="hover:bg-slate-50/50">
                            <td className="w-10 px-2.5 py-2 text-center font-mono text-slate-400 font-bold">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">
                              {ex.title} {ex.edition ? `(Ed. ${ex.edition})` : ''}
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold rounded text-[10px]">
                                {ex.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-semibold">{ex.totalStalls || 0} Stalls</td>
                            <td className="px-3 py-2 text-slate-400">{formatDisplayDate(ex.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: Activity History */}
            {detailsSection === 'activity' && (
              <div className="space-y-4 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                {/* 1. Attributed Bookings */}
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    Sales & Bookings Attributed ({viewDetailsUser.attributedBookings?.length || 0})
                  </h4>
                  {!viewDetailsUser.attributedBookings || viewDetailsUser.attributedBookings.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      No sales or bookings attributed to this account.
                    </p>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="w-10 px-2.5 py-2 text-center">S.No</th>
                            <th className="px-3 py-2">Booking Ref</th>
                            <th className="px-3 py-2">Company / Client</th>
                            <th className="px-3 py-2">Grand Total</th>
                            <th className="px-3 py-2">Payment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {viewDetailsUser.attributedBookings.map((bk: any, idx: number) => (
                            <tr key={bk.id} className="hover:bg-slate-50/50">
                              <td className="w-10 px-2.5 py-2 text-center font-mono text-slate-400 font-bold">
                                {idx + 1}
                              </td>
                              <td className="px-3 py-2 font-mono font-bold text-blue-700 dark:text-blue-300">
                                {bk.bookingReference}
                              </td>
                              <td className="px-3 py-2 font-medium">{bk.company?.name || 'Guest'}</td>
                              <td className="px-3 py-2 font-bold font-mono">
                                ₹{Number(bk.grandTotal || 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`px-1.5 py-0.5 font-bold rounded text-[10px] ${
                                    bk.paymentStatus === 'PAID_FULL' || bk.paymentStatus === 'PAID'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {bk.paymentStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 2. Client Reservations (If client user) */}
                {viewDetailsUser.companyBookings && viewDetailsUser.companyBookings.length > 0 && (
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5 mb-2">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                      Client Organization Reservations ({viewDetailsUser.companyBookings.length})
                    </h4>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="w-10 px-2.5 py-2 text-center">S.No</th>
                            <th className="px-3 py-2">Booking Ref</th>
                            <th className="px-3 py-2">Exhibition</th>
                            <th className="px-3 py-2">Grand Total</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {viewDetailsUser.companyBookings.map((cb: any, idx: number) => (
                            <tr key={cb.id} className="hover:bg-slate-50/50">
                              <td className="w-10 px-2.5 py-2 text-center font-mono text-slate-400 font-bold">
                                {idx + 1}
                              </td>
                              <td className="px-3 py-2 font-mono font-bold text-blue-700 dark:text-blue-300">
                                {cb.bookingReference}
                              </td>
                              <td className="px-3 py-2 font-medium">{cb.exhibition?.title}</td>
                              <td className="px-3 py-2 font-bold font-mono">
                                ₹{Number(cb.grandTotal || 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-2">
                                <span className="px-1.5 py-0.5 font-bold rounded text-[10px] bg-slate-100 dark:bg-slate-800">
                                  {cb.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" size="sm" onClick={handleCloseDetails}>
                Close User Details
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* 5. ADD USER MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add New Platform User"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs max-h-[78vh] overflow-y-auto pr-1">
          {/* Role Selection */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              User Role *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['ADMIN', 'STAFF', 'SUPERADMIN'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleCreateRoleChange(r)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    createUserRole === r
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
                    {r === 'SUPERADMIN' ? 'Full Platform Control' : r === 'ADMIN' ? 'Event & Floor Plans' : 'Bookings & Operations'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px]">
            {createUserRole === 'SUPERADMIN' ? (
              <p>
                <strong>Super Admin:</strong> Highest platform level. Granted access to all 8 platform pages by default, including Platform Reports and User Governance.
              </p>
            ) : createUserRole === 'ADMIN' ? (
              <p>
                <strong>Admin:</strong> Manages exhibitions, floor plans, bookings, payments, and exhibitors. By default, access to Reports and User Governance is restricted unless granted below.
              </p>
            ) : (
              <p>
                <strong>Staff:</strong> Operations team. By default has access to Dashboard, Event Registration Hub, Exhibitor Directory, Bookings, and Payments. Additional pages can be delegated below.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Corporate Email Address *
              </label>
              <Input
                type="email"
                required
                placeholder="name@buoyantmedia.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Initial Password * (min 8 chars)
              </label>
              <Input
                type="password"
                required
                minLength={8}
                placeholder="••••••••••••"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number (Optional)
              </label>
              <Input
                type="text"
                placeholder="+91 98765 43210"
                value={createForm.phone || ''}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Staff SP Code (Optional)
              </label>
              <Input
                type="text"
                placeholder={createUserRole === 'ADMIN' ? 'e.g. B005' : 'e.g. ST05'}
                value={createForm.spcode || ''}
                onChange={(e) => setCreateForm({ ...createForm, spcode: e.target.value })}
              />
            </div>
          </div>

          {/* Granular Page Access Rights Checkboxes */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                  Configured Page Access Rights ({createUserPages.length}/{PAGE_ACCESS_ITEMS.length} Pages Granted)
                </label>
                <p className="text-[10px] text-slate-400">
                  Select which pages this user can view and access in their workspace navigation.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCreateUserPages([...DEFAULT_ROLE_PAGE_ACCESS[createUserRole]])}
                  className="px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={() => setCreateUserPages(PAGE_ACCESS_ITEMS.map((p) => p.id))}
                  className="px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-800 transition-colors"
                >
                  Select All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {PAGE_ACCESS_ITEMS.map((page) => {
                const isSelected = createUserPages.includes(page.id);
                return (
                  <div
                    key={page.id}
                    onClick={() => handleToggleCreatePage(page.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 text-slate-900 dark:text-slate-100 ring-1 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#09539b] dark:text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs truncate">
                          {page.label}
                        </span>
                        {page.id === 'governance' && (
                          <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Super Admin
                          </span>
                        )}
                        {page.id === 'reports' && (
                          <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Reports
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {page.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={actionLoading}
              className="bg-[#09539b] hover:bg-[#07427d] text-white font-bold"
            >
              Add User
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. EDIT USER MODAL */}
      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title={`Edit User: ${editUser?.name}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs max-h-[78vh] overflow-y-auto pr-1">
          {/* Role Selection */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              User Role
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['SUPERADMIN', 'ADMIN', 'STAFF', 'CLIENT'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleEditRoleChange(r)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    editUserRole === r
                      ? 'border-[#09539b] bg-blue-50/70 text-[#09539b] dark:bg-blue-950/40 dark:text-blue-300 ring-2 ring-blue-500/30 font-bold'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold block">
                    {r === 'SUPERADMIN' ? 'Super Admin' : r === 'ADMIN' ? 'Admin' : r === 'STAFF' ? 'Staff' : 'Client'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <Input
                type="text"
                required
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <Input
                type="text"
                placeholder="+91 98765 43210"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Unique Staff SP Code
              </label>
              <Input
                type="text"
                placeholder="e.g. B001, ST01"
                value={editForm.spcode || ''}
                onChange={(e) => setEditForm({ ...editForm, spcode: e.target.value })}
              />
            </div>
          </div>

          {/* Granular Page Access Rights Checkboxes */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                  Configured Page Access Rights ({editUserPages.length}/{PAGE_ACCESS_ITEMS.length} Pages Granted)
                </label>
                <p className="text-[10px] text-slate-400">
                  Custom page permissions for this user account.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditUserPages([...(DEFAULT_ROLE_PAGE_ACCESS[editUserRole] || ['dashboard'])])}
                  className="px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={() => setEditUserPages(PAGE_ACCESS_ITEMS.map((p) => p.id))}
                  className="px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-800 transition-colors"
                >
                  Select All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {PAGE_ACCESS_ITEMS.map((page) => {
                const isSelected = editUserPages.includes(page.id);
                return (
                  <div
                    key={page.id}
                    onClick={() => handleToggleEditPage(page.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 text-slate-900 dark:text-slate-100 ring-1 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#09539b] dark:text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs truncate">
                          {page.label}
                        </span>
                        {page.id === 'governance' && (
                          <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Super Admin
                          </span>
                        )}
                        {page.id === 'reports' && (
                          <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Reports
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {page.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditUser(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={actionLoading}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. TOGGLE STATUS MODAL */}
      <Modal
        isOpen={!!statusTargetUser}
        onClose={() => setStatusTargetUser(null)}
        title={statusTargetUser?.isActive ? 'Deactivate User Account' : 'Activate User Account'}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Are you sure you want to {statusTargetUser?.isActive ? 'deactivate' : 'activate'}{' '}
            <strong>{statusTargetUser?.name}</strong> ({statusTargetUser?.email})?
          </p>

          {statusTargetUser?.isActive ? (
            <p className="p-3 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-xl border border-amber-200 text-[11px]">
              Deactivated users are immediately prevented from logging into the platform. Existing exhibitions and historical bookings attributed to this user will remain preserved.
            </p>
          ) : (
            <p className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-xl border border-emerald-200 text-[11px]">
              Re-activating this account will immediately restore login capabilities and platform access according to their role.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStatusTargetUser(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={statusTargetUser?.isActive ? 'danger' : 'primary'}
              size="sm"
              isLoading={actionLoading}
              onClick={handleToggleStatusConfirm}
            >
              Confirm {statusTargetUser?.isActive ? 'Deactivation' : 'Activation'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 8. RESET PASSWORD MODAL */}
      <Modal
        isOpen={!!resetTargetUser}
        onClose={() => setResetTargetUser(null)}
        title={`Reset Password: ${resetTargetUser?.name}`}
      >
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Set a new temporary or permanent password for <strong>{resetTargetUser?.email}</strong>.
          </p>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              New Password * (min 8 characters)
            </label>
            <Input
              type="password"
              required
              minLength={8}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResetTargetUser(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={actionLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              Set New Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
