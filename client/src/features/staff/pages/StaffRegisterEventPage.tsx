import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { useAuthStore } from '../../../stores/authStore';
import { Input } from '../../../components/ui/Input';
import { DateInput } from '../../../components/ui/DateInput';
import { Button } from '../../../components/ui/Button';
import {
  CalendarPlus,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  MapPin,
  Building,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getMonthEdition = (dateStr?: string): string => {
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return String(d.getMonth() + 1).padStart(2, '0');
    }
  }
  return String(new Date().getMonth() + 1).padStart(2, '0');
};

const getMonthNameByEdition = (editionStr: string): string => {
  const m = parseInt(editionStr, 10);
  if (!isNaN(m) && m >= 1 && m <= 12) {
    return MONTH_NAMES[m - 1];
  }
  return '';
};

export const StaffRegisterEventPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isAdminOrSuperAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  const [isEventCodeCustom, setIsEventCodeCustom] = useState(false);
  const [isEditionCustom, setIsEditionCustom] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    edition: getMonthEdition(),
    eventCode: '',
    spcode: user?.spcode || '',
    description: '',
    venue: '',
    city: 'Mumbai',
    startDate: '',
    endDate: '',
    bookingEndDate: '',
    totalStalls: 50,
    bannerUrl: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successEvent, setSuccessEvent] = useState<any | null>(null);

  const handleTitleChange = (val: string) => {
    let code = '';
    const clean = val.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    if (clean) {
      const words = clean.split(/\s+/).filter((w) => w.length > 0 && !/^\d{4}$/.test(w));
      if (words.length >= 2) {
        code = words.slice(0, 4).map((w) => w[0]).join('').toUpperCase();
      } else if (words.length === 1 && words[0].length >= 2) {
        code = words[0].substring(0, 3).toUpperCase();
      } else if (words.length === 1) {
        code = words[0].toUpperCase();
      }
    }

    setFormData((prev) => ({
      ...prev,
      title: val,
      eventCode: isEventCodeCustom ? prev.eventCode : code,
    }));
  };

  const handleStartDateChange = (val: string) => {
    // Calculate default cut-off 15 days prior
    let cutOff = '';
    if (val) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() - 15);
        cutOff = d.toISOString().split('T')[0];
      }
    }

    setFormData((prev) => ({
      ...prev,
      startDate: val,
      bookingEndDate: prev.bookingEndDate || cutOff,
      edition: isEditionCustom ? prev.edition : getMonthEdition(val),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg(null);

      const payload = {
        ...formData,
        totalStalls: Number(formData.totalStalls) || 0,
        status: 'DRAFT', // Enters as DRAFT ready for layout & publishing
      };

      const created = await exhibitionService.createExhibition(payload as any);
      setSuccessEvent(created);
    } catch (err: any) {
      console.error('Failed to submit event registration:', err);
      setErrorMsg(
        err.response?.data?.message || err.message || 'Failed to submit event registration.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (successEvent) {
    return (
      <div className="max-w-2xl mx-auto py-10 space-y-6">
        <div className={`bg-white dark:bg-slate-900 border ${isAdminOrSuperAdmin ? 'border-purple-200 dark:border-purple-800' : 'border-emerald-200 dark:border-emerald-800'} rounded-3xl p-8 shadow-xl text-center space-y-4`}>
          <div className={`w-16 h-16 rounded-full ${isAdminOrSuperAdmin ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-600' : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600'} mx-auto flex items-center justify-center`}>
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
            Exhibition Event Registered Successfully!
          </h2>

          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Your event <strong>"{successEvent.title}"</strong> has been saved as <strong>DRAFT</strong> in the platform catalog.
          </p>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2 max-w-md mx-auto">
            <div className="flex justify-between">
              <span className="text-slate-500">Event Code & Edition:</span>
              <span className="font-mono font-bold">{successEvent.eventCode}-{successEvent.edition}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Creator Attribution:</span>
              <span className="font-mono font-bold text-indigo-600">{successEvent.spcode || user?.spcode || 'N/A'} ({user?.role})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Venue & City:</span>
              <span className="font-semibold">{successEvent.venue}, {successEvent.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Next Action:</span>
              <span className="font-bold text-purple-600">
                {isAdminOrSuperAdmin ? 'Configure Floor Plan Studio & Publish' : 'Pending Admin Floor Plan Design'}
              </span>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            {isAdminOrSuperAdmin ? (
              <>
                <Link to={`/admin/events/${successEvent.id}/edit`}>
                  <Button variant="primary" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                    Design Floor Plan & Stalls
                  </Button>
                </Link>
                <Link to="/admin/events">
                  <Button variant="outline" size="sm">
                    Manage Exhibitions
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/staff/events">
                  <Button variant="outline" size="sm">
                    View My Events
                  </Button>
                </Link>
                <Link to="/staff/dashboard">
                  <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    Back to Staff Dashboard
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <Link
            to={isAdminOrSuperAdmin ? '/admin/events' : '/staff/dashboard'}
            className={`text-xs font-bold text-slate-500 ${isAdminOrSuperAdmin ? 'hover:text-purple-600' : 'hover:text-emerald-600'} flex items-center gap-1.5 mb-1 transition-colors`}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to {isAdminOrSuperAdmin ? 'Manage Exhibitions' : 'Dashboard'}
          </Link>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <CalendarPlus className={`w-6 h-6 ${isAdminOrSuperAdmin ? 'text-purple-600' : 'text-emerald-600'}`} />
            Register New Exhibition Event
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isAdminOrSuperAdmin
              ? 'Quick event registration to initialize dates, venue, capacity, and short codes.'
              : 'Submit foundational event information for review and floor plan layout by Admin.'}
          </p>
        </div>
      </div>

      {/* Scope Notice */}
      <div className={`p-4 ${isAdminOrSuperAdmin ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300' : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'} border rounded-2xl flex items-start gap-3 text-xs`}>
        <Info className={`w-4 h-4 ${isAdminOrSuperAdmin ? 'text-purple-600' : 'text-emerald-600'} shrink-0 mt-0.5`} />
        <p>
          {isAdminOrSuperAdmin ? (
            <>
              <strong>Administrator Fast Registration:</strong> Submitting this form registers the exhibition in <strong>DRAFT</strong> status under your sales allocation code (<span className="font-mono font-bold">{user?.spcode || 'Internal Admin'}</span>). You will immediately be able to design interactive floor plans, place and price stalls, or publish the event for public exhibitor bookings.
            </>
          ) : (
            <>
              <strong>Operations Staff Workflow:</strong> Submitting this form registers the exhibition with your unique Staff SP Code (<span className="font-mono font-bold">{user?.spcode || 'Assigned'}</span>). Once submitted, platform Admins will design the interactive floor plan, place stalls, and publish the event for exhibitor booking.
            </>
          )}
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Basic Event Details */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> 1. Event Identification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Event Title *
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. BuildAsia Industrial Expo 2026"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Edition (2 digits) *
              </label>
              <Input
                type="text"
                required
                maxLength={2}
                placeholder="09"
                value={formData.edition}
                onChange={(e) => {
                  setIsEditionCustom(true);
                  setFormData({ ...formData, edition: e.target.value.replace(/\D/g, '').slice(0, 2) });
                }}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {getMonthNameByEdition(formData.edition) ? `${getMonthNameByEdition(formData.edition)} Edition (auto-synced with start date)` : '2-digit numeric edition code'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Event Short Code (2–4 letters) *
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. BA"
                value={formData.eventCode}
                onChange={(e) => {
                  setIsEventCodeCustom(true);
                  setFormData({ ...formData, eventCode: e.target.value.toUpperCase() });
                }}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Auto-derived from title words (e.g. "BuildAsia" → "BA").
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Staff SP Allocation Code *
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. ST01"
                value={formData.spcode}
                onChange={(e) => setFormData({ ...formData, spcode: e.target.value.toUpperCase() })}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Identifies you as the event creator/sales manager for company registration attribution.
              </p>
            </div>
          </div>
        </div>

        {/* Schedule & Dates */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> 2. Schedule & Cut-Off
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Start Date *
              </label>
              <DateInput
                required
                value={formData.startDate}
                onChange={handleStartDateChange}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                End Date *
              </label>
              <DateInput
                required
                value={formData.endDate}
                onChange={(val) => setFormData({ ...formData, endDate: val })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Booking Cut-off Date
              </label>
              <DateInput
                value={formData.bookingEndDate}
                onChange={(val) => setFormData({ ...formData, bookingEndDate: val })}
              />
            </div>
          </div>
        </div>

        {/* Venue & Location */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> 3. Venue & Logistics
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Exhibition Venue / Convention Center *
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. CODISSIA Trade Fair Complex"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Host City *
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. Coimbatore, Mumbai, Chennai"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Estimated Total Stalls
              </label>
              <Input
                type="number"
                min={1}
                max={500}
                value={formData.totalStalls}
                onChange={(e) => setFormData({ ...formData, totalStalls: parseInt(e.target.value, 10) || 0 })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Banner Image URL (Optional)
              </label>
              <Input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={formData.bannerUrl}
                onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Event Description & Overview
            </label>
            <textarea
              rows={3}
              placeholder="Brief summary of the exhibition, target industries, and exhibitor profile..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Link to="/staff/dashboard">
            <Button type="button" variant="outline" size="md">
              Cancel
            </Button>
          </Link>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md px-6"
          >
            Submit Event Registration
          </Button>
        </div>
      </form>
    </div>
  );
};
