import React, { useEffect, useState } from 'react';
import { userService } from '../../../services/users/userService';
import { AdminStaffUser, CreateAdminStaffPayload, UpdateUserPayload } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
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
  Calendar,
  Sparkles,
} from 'lucide-react';

export const SuperAdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminStaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ADMIN' | 'STAFF'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createRole, setCreateRole] = useState<'ADMIN' | 'STAFF'>('ADMIN');
  const [editUser, setEditUser] = useState<AdminStaffUser | null>(null);
  const [statusTargetUser, setStatusTargetUser] = useState<AdminStaffUser | null>(null);
  const [resetTargetUser, setResetTargetUser] = useState<AdminStaffUser | null>(null);

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

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const roleParam = activeTab === 'ALL' ? undefined : activeTab;
      const data = await userService.getUsers(roleParam);
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = (role: 'ADMIN' | 'STAFF') => {
    setCreateRole(role);
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      if (createRole === 'ADMIN') {
        await userService.createAdmin(createForm);
      } else {
        await userService.createStaff(createForm);
      }
      setFeedbackMsg({
        type: 'success',
        text: `${createRole === 'ADMIN' ? 'Admin' : 'Staff'} account created successfully!`,
      });
      setCreateModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to create user. Please check credentials.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (user: AdminStaffUser) => {
    setEditUser(user);
    setEditForm({
      name: user.name,
      phone: user.phone || '',
      spcode: user.spcode || '',
    });
    setFeedbackMsg(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      setActionLoading(true);
      await userService.updateUser(editUser.id, editForm);
      setFeedbackMsg({
        type: 'success',
        text: `User "${editUser.name}" updated successfully!`,
      });
      setEditUser(null);
      await fetchUsers();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to update user.',
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
      await fetchUsers();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to update user status.',
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
        text: res.message,
      });
      setResetTargetUser(null);
      setNewPassword('');
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to reset password.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.spcode && u.spcode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? u.isActive
        : !u.isActive;

    return matchesSearch && matchesStatus;
  });

  const adminsCount = users.filter((u) => u.role === 'ADMIN').length;
  const staffCount = users.filter((u) => u.role === 'STAFF').length;

  return (
    <div className="space-y-6">
      {/* Header */}
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
            Manage platform Admins and Operations Staff accounts, configure SP allocation codes, and govern access privileges.
          </p>
        </div>

        {/* Create Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => handleOpenCreate('ADMIN')}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-xs font-bold"
          >
            Create Admin
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => handleOpenCreate('STAFF')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-bold"
          >
            Create Staff
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

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Role Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All Accounts ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('ADMIN')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'ADMIN'
                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'text-slate-500 hover:text-purple-600 dark:hover:text-purple-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Admins ({adminsCount})
          </button>
          <button
            onClick={() => setActiveTab('STAFF')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'STAFF'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Staff ({staffCount})
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, email, SP code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
            Loading accounts directory...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No users found</p>
            <p className="text-xs text-slate-500 mt-1">Try changing search filters or create a new user account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                <tr>
                  <th className="px-5 py-3">User & Contact</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Staff SP Code</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Events Created</th>
                  <th className="px-4 py-3">Created Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Name & Email */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{user.name}</p>
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

                    {/* Role */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-black tracking-wide border ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* SP Code */}
                    <td className="px-4 py-3.5">
                      {user.spcode ? (
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {user.spcode}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
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

                    {/* Events Created */}
                    <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        {user._count?.createdExhibitions || 0}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="px-4 py-3.5 text-[11px] text-slate-500 font-medium">
                      {formatDisplayDate(user.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 text-slate-600 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-300 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors"
                          title="Edit User Details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setStatusTargetUser(user)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.isActive
                              ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                              : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                          }`}
                          title={user.isActive ? 'Deactivate Account' : 'Activate Account'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setResetTargetUser(user);
                            setNewPassword('');
                          }}
                          className="p-1.5 text-slate-600 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-300 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                          title="Reset Password"
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
      </div>

      {/* 1. CREATE USER MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={`Create New ${createRole === 'ADMIN' ? 'Admin' : 'Operations Staff'} User`}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px]">
            {createRole === 'ADMIN' ? (
              <p>
                <strong>Admin User:</strong> Has permissions to manage exhibitions, configure visual floor plans, price stalls, and monitor bookings.
              </p>
            ) : (
              <p>
                <strong>Operations Staff:</strong> Can register new exhibitions (submitted in Draft state for Admin review) and view operational event reports.
              </p>
            )}
          </div>

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

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Initial Password * (min 8 characters)
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
              Unique Staff SP Code (Optional)
            </label>
            <Input
              type="text"
              placeholder={createRole === 'ADMIN' ? 'e.g. B005' : 'e.g. ST05'}
              value={createForm.spcode || ''}
              onChange={(e) => setCreateForm({ ...createForm, spcode: e.target.value })}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Used for event attribution and sales representative recognition.
            </p>
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
              className={createRole === 'ADMIN' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'}
            >
              Create {createRole === 'ADMIN' ? 'Admin' : 'Staff'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. EDIT USER MODAL */}
      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title={`Edit User: ${editUser?.name}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Full Name
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

      {/* 3. TOGGLE STATUS MODAL */}
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

      {/* 4. RESET PASSWORD MODAL */}
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
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Set New Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
