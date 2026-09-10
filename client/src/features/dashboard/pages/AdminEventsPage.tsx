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
  Calendar,
  MapPin,
  Eye,
  Pencil,
  Trash2,
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export const AdminEventsPage: React.FC = () => {
  const navigate = useNavigate();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete modal state
  const [exhibitionToDelete, setExhibitionToDelete] = useState<Exhibition | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await exhibitionService.getExhibitions();
      setExhibitions(data);
    } catch (err) {
      console.error('Failed to load exhibitions:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleEditSuccess = () => {
    setNotification({
      type: 'success',
      message: 'Exhibition event updated successfully.',
    });
    fetchEvents();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-600" />
            Exhibition Event & Floor Plan Builder
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure trade fair events, publish interactive floor plans, inspect booking dossiers, and manage events.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/admin/events/create')}
          leftIcon={<Plus className="w-4 h-4" />}
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
        >
          Create Exhibition (Visual Floor Plan Studio)
        </Button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
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

      {/* Events Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
              <th className="py-3.5 px-4">Event Title</th>
              <th className="py-3.5 px-4">
                <div className="flex items-center gap-1 group relative cursor-help">
                  <span>Slug</span>
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition-colors" />
                  {/* Tooltip explanation */}
                  <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block z-30 w-64 p-2.5 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl font-normal normal-case leading-relaxed pointer-events-none">
                    <strong>What is a Slug?</strong>
                    <p className="mt-0.5 text-slate-300">
                      A URL-friendly string used to access the public booking page (e.g. <span className="text-purple-300 font-mono">/events/mediccon-2026</span>) and optimize search ranking.
                    </p>
                  </div>
                </div>
              </th>
              <th className="py-3.5 px-4">Codes (SP / Edition)</th>
              <th className="py-3.5 px-4">Venue & Location</th>
              <th className="py-3.5 px-4">Event Dates</th>
              <th className="py-3.5 px-4 text-center">Capacity</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {exhibitions.map((e) => (
              <tr
                key={e.id}
                onClick={() => navigate(`/admin/events/${e.id}/view`)}
                className="hover:bg-purple-50/40 cursor-pointer transition-colors group"
              >
                <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                  <div>{e.title}</div>
                  <div className="text-[10px] text-slate-400 font-normal font-mono">{e.slug}</div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">SP:</span>
                      <span className="bg-amber-50 text-amber-800 font-mono font-bold text-[11px] px-1.5 py-0.2 rounded border border-amber-200">
                        {e.spcode || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Reg:</span>
                      <span className="bg-indigo-50 text-indigo-700 font-mono font-semibold text-[10px] px-1.5 py-0.2 rounded border border-indigo-200">
                        {e.edition && e.eventCode ? `${e.edition}/${e.startDate ? new Date(e.startDate).getFullYear().toString().slice(-2) : '26'}/${e.eventCode}/*` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4">{e.venue}, {e.city}</td>
                <td className="py-3.5 px-4 text-slate-500">
                  {formatDisplayDate(e.startDate)} – {formatDisplayDate(e.endDate)}
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-purple-700">{e.totalStalls} Stalls</td>
                <td className="py-3.5 px-4 text-center">
                  <span
                    className={`px-2 py-0.5 font-bold text-[10px] rounded uppercase border ${
                      e.status === 'PUBLISHED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : e.status === 'CANCELLED'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}
                  >
                    {e.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <div
                    className="inline-flex items-center gap-1.5"
                    onClick={(evt) => evt.stopPropagation()}
                  >
                    {/* View in Studio Button */}
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/events/${e.id}/view`)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition-colors"
                      title="View Full Event in Studio"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit in Studio Button */}
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/events/${e.id}/edit`)}
                      className="p-1.5 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-md transition-colors"
                      title="Edit Event in Studio"
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
                      className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors"
                      title="Delete Exhibition Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
