import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Exhibition } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { formatDisplayDate } from '../../../utils/date';
import {
  Layers,
  Plus,
  CalendarPlus,
  ChevronDown,
  Pencil,
  Trash2,
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
} from 'lucide-react';

const getStatusConfig = (status: Exhibition['status']) => {
  switch (status) {
    case 'PUBLISHED':
      return {
        label: 'Published',
        dotColor: 'bg-emerald-500 ring-emerald-200 dark:ring-emerald-800',
        badgeClass:
          'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60 hover:border-emerald-400 focus-within:ring-emerald-400/40',
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        dotColor: 'bg-blue-500 ring-blue-200 dark:ring-blue-800',
        badgeClass:
          'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700 hover:bg-blue-100/70 dark:hover:bg-blue-900/60 hover:border-blue-400 focus-within:ring-blue-400/40',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        dotColor: 'bg-rose-500 ring-rose-200 dark:ring-rose-800',
        badgeClass:
          'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700 hover:bg-rose-100/70 dark:hover:bg-rose-900/60 hover:border-rose-400 focus-within:ring-rose-400/40',
      };
    case 'DRAFT':
    default:
      return {
        label: 'Draft',
        dotColor: 'bg-amber-500 ring-amber-200 dark:ring-amber-800',
        badgeClass:
          'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100/70 dark:hover:bg-amber-900/60 hover:border-amber-400 focus-within:ring-amber-400/40',
      };
  }
};

export const AdminEventsPage: React.FC = () => {
  const navigate = useNavigate();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete modal state
  const [exhibitionToDelete, setExhibitionToDelete] = useState<Exhibition | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  async function fetchEvents() {
    try {
      setLoading(true);
      const data = await exhibitionService.getExhibitions();
      setExhibitions(data);
    } catch (err) {
      console.error('Failed to load exhibitions:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  // Metric counts breakdown
  const statsCounts = React.useMemo(() => {
    const published = exhibitions.filter((e) => e.status === 'PUBLISHED').length;
    const draft = exhibitions.filter((e) => e.status === 'DRAFT').length;
    const completed = exhibitions.filter((e) => e.status === 'COMPLETED').length;
    const cancelled = exhibitions.filter((e) => e.status === 'CANCELLED').length;
    return {
      total: exhibitions.length,
      published,
      draft,
      completed,
      cancelled,
      active: published + draft,
    };
  }, [exhibitions]);

  const filteredExhibitions = React.useMemo(() => {
    return exhibitions.filter((e) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        e.title.toLowerCase().includes(q) ||
        (e.eventCode && e.eventCode.toLowerCase().includes(q)) ||
        (e.slug && e.slug.toLowerCase().includes(q)) ||
        (e.city && e.city.toLowerCase().includes(q)) ||
        (e.venue && e.venue.toLowerCase().includes(q)) ||
        (e.spcode && e.spcode.toLowerCase().includes(q));

      let matchesStatus = true;
      if (statusFilter === 'ACTIVE') {
        matchesStatus = e.status === 'PUBLISHED' || e.status === 'DRAFT';
      } else if (statusFilter === 'PUBLISHED') {
        matchesStatus = e.status === 'PUBLISHED';
      } else if (statusFilter === 'DRAFT') {
        matchesStatus = e.status === 'DRAFT';
      } else if (statusFilter === 'COMPLETED') {
        matchesStatus = e.status === 'COMPLETED';
      } else if (statusFilter === 'CANCELLED') {
        matchesStatus = e.status === 'CANCELLED';
      } else if (statusFilter === 'ALL') {
        matchesStatus = true;
      }

      return matchesQuery && matchesStatus;
    });
  }, [exhibitions, searchQuery, statusFilter]);

  const handleConfirmDelete = async () => {
    if (!exhibitionToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await exhibitionService.deleteExhibition(exhibitionToDelete.id);
      setNotification({
        type: 'success',
        message: `Exhibition "${exhibitionToDelete.title}" deleted successfully.`,
      });
      setExhibitionToDelete(null);
      await fetchEvents();
    } catch (err: any) {
      console.error('Failed to delete exhibition:', err);
      const apiMsg =
        err.response?.data?.message ||
        err.message ||
        'Cannot delete exhibition. Active bookings or dependencies exist.';
      setDeleteError(apiMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (eventId: string, newStatus: Exhibition['status']) => {
    const previousEvents = [...exhibitions];
    // Optimistically update the UI
    setExhibitions((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e))
    );
    setUpdatingStatusId(eventId);
    try {
      await exhibitionService.updateExhibition(eventId, { status: newStatus });
      setNotification({
        type: 'success',
        message: `Exhibition status updated to ${newStatus}.`,
      });
    } catch (err: any) {
      console.error('Failed to update status:', err);
      // Revert optimistic update on failure
      setExhibitions(previousEvents);
      const apiMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to update exhibition status.';
      setNotification({
        type: 'error',
        message: apiMsg,
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Exhibitions & Trade Fairs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your scheduled B2B trade fairs, interactive floor plan builders, and booking availability statuses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/events/register')}
            leftIcon={<CalendarPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
            className="border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
          >
            Register Event
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/events/builder/new')}
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
          >
            Create Exhibition
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold underline hover:opacity-80 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Status Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setStatusFilter('PUBLISHED')}
          className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'PUBLISHED'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-xs ring-1 ring-emerald-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Published (Live)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{statsCounts.published}</span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Publicly Open</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('DRAFT')}
          className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'DRAFT'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 shadow-xs ring-1 ring-amber-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">To Be Published</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{statsCounts.draft}</span>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Draft Setup</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('COMPLETED')}
          className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'COMPLETED'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-xs ring-1 ring-blue-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completed Fairs</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{statsCounts.completed}</span>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Past Events</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-500 shadow-xs ring-1 ring-purple-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Exhibitions</span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{statsCounts.total}</span>
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">All Statuses</span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search exhibitions by title, code, slug, venue or SP code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500/30 text-slate-800 dark:text-slate-200 placeholder-slate-400"
          />
        </div>

        {/* Action Tabs & Options (Replaces old select dropdown) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-purple-600 text-white shadow-xs font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Active & Upcoming ({statsCounts.active})
          </button>

          <button
            onClick={() => setStatusFilter('PUBLISHED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'PUBLISHED'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Published ({statsCounts.published})
          </button>

          <button
            onClick={() => setStatusFilter('DRAFT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'DRAFT'
                ? 'bg-amber-600 text-white shadow-xs font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            To Be Published ({statsCounts.draft})
          </button>

          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'COMPLETED'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Completed ({statsCounts.completed})
          </button>

          {/* Dedicated Cancelled Events Option */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'CANCELLED' ? 'ACTIVE' : 'CANCELLED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
              statusFilter === 'CANCELLED'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs font-bold'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60'
            }`}
            title="Toggle Cancelled Events View"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Cancelled ({statsCounts.cancelled})</span>
          </button>

          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg ml-auto lg:ml-1">
            Showing {filteredExhibitions.length} / {exhibitions.length}
          </span>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading exhibitions...</div>
        ) : filteredExhibitions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="font-bold text-slate-600 dark:text-slate-300">No Exhibitions Found</p>
            <p>No event matched your search query or status filter.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold">
                <th className="py-3.5 px-4">
                  <div className="flex items-center gap-1 group relative cursor-help">
                    <span>Event Title & Slug</span>
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                    {/* Tooltip explanation */}
                    <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block z-30 w-64 p-2.5 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl font-normal normal-case leading-relaxed pointer-events-none">
                      <strong>What is a Slug?</strong>
                      <p className="mt-0.5 text-slate-300">
                        A URL-friendly string used to access the public booking page (e.g. <span className="text-purple-300 font-mono">/events/mediccon-2026</span>) and optimize search ranking.
                      </p>
                    </div>
                  </div>
                </th>
                <th className="py-3.5 px-4">SP Code</th>
                <th className="py-3.5 px-4">Venue & Location</th>
                <th className="py-3.5 px-4">Event Dates</th>
                <th className="py-3.5 px-4 text-center">Capacity</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {filteredExhibitions.map((e) => (
              <tr
                key={e.id}
                onClick={() => navigate(`/admin/events/${e.id}/view`)}
                className="hover:bg-purple-50/40 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group"
              >
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                  <div className="flex items-center gap-3">
                    {e.bannerUrl ? (
                      <img
                        src={e.bannerUrl}
                        alt={e.title}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs"
                        onError={(err) => {
                          (err.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                        <Layers className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                        {e.title}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal font-mono truncate mt-0.5">
                        {e.slug}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  {e.spcode ? (
                    <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono font-bold text-[11px] px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 inline-block">
                      {e.spcode}
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-mono">—</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{e.venue}, {e.city}</td>
                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                  {formatDisplayDate(e.startDate)} – {formatDisplayDate(e.endDate)}
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-purple-700 dark:text-purple-400">{e.totalStalls} Stalls</td>
                <td className="py-3.5 px-4 text-center">
                  <div
                    className="inline-flex items-center justify-center relative"
                    onClick={(evt) => evt.stopPropagation()}
                  >
                    {updatingStatusId === e.id ? (
                      <div className="w-[130px] h-8 inline-flex items-center justify-center gap-1.5 px-2.5 text-[10px] font-bold rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 shadow-2xs">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600 dark:text-purple-400" />
                        <span>Updating...</span>
                      </div>
                    ) : (() => {
                      const cfg = getStatusConfig(e.status);
                      return (
                        <div
                          className={`relative inline-flex items-center w-[130px] h-8 rounded-lg border shadow-2xs transition-all focus-within:ring-2 focus-within:ring-offset-1 ${cfg.badgeClass}`}
                        >
                          {/* Status Dot Indicator */}
                          <span
                            className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ring-2 pointer-events-none ${cfg.dotColor}`}
                          />

                          {/* Interactive Status Select */}
                          <select
                            value={e.status}
                            onChange={(evt) =>
                              handleStatusChange(e.id, evt.target.value as Exhibition['status'])
                            }
                            className="w-full h-full appearance-none bg-transparent cursor-pointer pl-6 pr-6 text-[11px] font-bold tracking-wider uppercase focus:outline-none font-mono"
                            title="Click to quickly change event status"
                          >
                            <option value="DRAFT" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 py-1 font-semibold normal-case">
                              Draft
                            </option>
                            <option value="PUBLISHED" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 py-1 font-semibold normal-case">
                              Published
                            </option>
                            <option value="COMPLETED" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 py-1 font-semibold normal-case">
                              Completed
                            </option>
                            <option value="CANCELLED" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 py-1 font-semibold normal-case">
                              Cancelled
                            </option>
                          </select>

                          {/* Dropdown Chevron */}
                          <ChevronDown className="w-3.5 h-3.5 text-current absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                        </div>
                      );
                    })()}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <div
                    className="inline-flex items-center justify-center gap-1.5"
                    onClick={(evt) => evt.stopPropagation()}
                  >
                    {/* Edit Exhibition & Floor Plan Button */}
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/events/${e.id}/edit`)}
                      className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 rounded-lg shadow-2xs transition-all"
                      title="Edit Exhibition & Floor Plan"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setExhibitionToDelete(e);
                      }}
                      className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700 rounded-lg shadow-2xs transition-all"
                      title="Delete Exhibition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!exhibitionToDelete}
        onClose={() => {
          if (!isDeleting) {
            setExhibitionToDelete(null);
            setDeleteError(null);
          }
        }}
        title="Delete Exhibition Event"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-rose-900">Permanent Action</p>
              <p className="mt-1 leading-relaxed">
                Are you sure you want to delete{' '}
                <strong className="text-rose-950">{exhibitionToDelete?.title}</strong>? All associated floor plan canvasses, stalls, and configurations will be permanently removed.
              </p>
            </div>
          </div>

          {deleteError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Cannot Delete Event</span>
              </div>
              <p className="text-[11px] leading-relaxed pl-5">{deleteError}</p>
              <p className="text-[11px] text-amber-700 pl-5 mt-1 font-semibold">
                Tip: You can change the exhibition's status to <strong>CANCELLED</strong> in the Edit menu to preserve financial records.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setExhibitionToDelete(null);
                setDeleteError(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              leftIcon={
                isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )
              }
            >
              {isDeleting ? 'Deleting Event...' : 'Yes, Delete Event'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
