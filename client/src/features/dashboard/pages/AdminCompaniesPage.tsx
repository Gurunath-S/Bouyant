import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { companyService } from '../../../services/companies/companyService';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { Company, Exhibition } from '../../../types';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { formatDisplayDate } from '../../../utils/date';
import {
  Building2,
  Search,
  Filter,
  CalendarPlus,
  Layers,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  MapPin,
  Sparkles,
  AlertCircle,
  X,
} from 'lucide-react';

export const AdminCompaniesPage: React.FC = () => {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Filtering criteria
  const [selectedExhibitionId, setSelectedExhibitionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'REGISTERED' | 'UNREGISTERED'>('ALL');

  // Modals state
  const [inspectedCompany, setInspectedCompany] = useState<Company | null>(null);
  const [registerModalCompany, setRegisterModalCompany] = useState<Company | null>(null);
  const [targetExhibitionId, setTargetExhibitionId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [companiesRes, exhibitionsData] = await Promise.all([
        companyService.listCompanies(1, '', undefined, undefined, 100),
        exhibitionService.getExhibitions(),
      ]);

      setCompanies(companiesRes.data || []);
      setExhibitions(exhibitionsData || []);
    } catch (err) {
      console.error('Failed to load companies or exhibitions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const totalCount = companies.length;
  const registeredCount = companies.filter(
    (c) => c.bookings && c.bookings.length > 0
  ).length;
  const unregisteredCount = companies.filter(
    (c) => !c.bookings || c.bookings.length === 0
  ).length;

  // Filtered companies based on search, exhibition selector, and tab
  const filteredCompanies = companies.filter((c) => {
    // 1. Tab filter
    const hasBookings = c.bookings && c.bookings.length > 0;
    if (activeTab === 'REGISTERED' && !hasBookings) return false;
    if (activeTab === 'UNREGISTERED' && hasBookings) return false;

    // 2. Exhibition filter
    if (selectedExhibitionId) {
      const matchExhibition = c.bookings?.some(
        (b) =>
          b.exhibitionId === selectedExhibitionId ||
          b.exhibition?.id === selectedExhibitionId
      );
      if (!matchExhibition) return false;
    }

    // 3. Search query
    if (!search.trim()) return true;
    const q = search.toLowerCase();

    const matchesBasic =
      c.name.toLowerCase().includes(q) ||
      c.companyCode?.toLowerCase().includes(q) ||
      c.regNo?.toLowerCase().includes(q) ||
      c.spcode?.toLowerCase().includes(q) ||
      c.gstNumber?.toLowerCase().includes(q) ||
      c.panNumber?.toLowerCase().includes(q) ||
      c.contactPerson?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.mobile?.toLowerCase().includes(q) ||
      c.industry?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.state?.toLowerCase().includes(q);

    if (matchesBasic) return true;

    // Also match against registered exhibition titles, codes, or stall numbers
    const matchesEvent = c.bookings?.some((b) => {
      const titleMatch = b.exhibition?.title.toLowerCase().includes(q);
      const codeMatch = b.exhibition?.eventCode?.toLowerCase().includes(q);
      const refMatch = b.bookingReference?.toLowerCase().includes(q);
      const stallMatch = b.stalls?.some((bs) =>
        bs.stall?.stallNumber.toLowerCase().includes(q)
      );
      return titleMatch || codeMatch || refMatch || stallMatch;
    });

    return !!matchesEvent;
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Confirmed
          </span>
        );
      case 'PENDING_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> Pending Payment
          </span>
        );
      case 'INITIATED':
      case 'HELD':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" /> Hold / Initiated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            {status || 'Active'}
          </span>
        );
    }
  };

  const handleRegisterCompanyToEvent = () => {
    if (!registerModalCompany || !targetExhibitionId) return;
    const targetExpo = exhibitions.find((e) => e.id === targetExhibitionId);
    if (!targetExpo) return;

    // Navigate to the exhibition booking wizard with company context
    navigate(`/exhibitions/${targetExpo.slug}/book`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-600" />
            Exhibitor Directory & Registered Events
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse exhibitor corporate profiles, filter by registered exhibitions, track stall reservations, or register companies to events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/events/register">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CalendarPlus className="w-4 h-4 text-purple-600" />}
              className="border-purple-200 hover:border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              Register New Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar: Exhibition Selector, Search & Status Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'ALL'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>All Exhibitors</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === 'ALL'
                    ? 'bg-purple-700 text-purple-100'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {totalCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('REGISTERED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'REGISTERED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Registered to Events</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === 'REGISTERED'
                    ? 'bg-emerald-700 text-emerald-100'
                    : 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                {registeredCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('UNREGISTERED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'UNREGISTERED'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>Not Registered Yet</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === 'UNREGISTERED'
                    ? 'bg-slate-800 text-slate-200'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {unregisteredCount}
              </span>
            </button>
          </div>

          {/* Exhibition Dropdown & Search Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Exhibition Filter Dropdown */}
            <div className="relative min-w-[240px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Layers className="w-4 h-4 text-purple-600" />
              </div>
              <select
                value={selectedExhibitionId}
                onChange={(e) => setSelectedExhibitionId(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
              >
                <option value="">All Exhibitions / Expos</option>
                {exhibitions.map((expo) => (
                  <option key={expo.id} value={expo.id}>
                    {expo.title} {expo.edition ? `(Ed. ${expo.edition})` : ''} - {expo.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search company, contact, GST, stall..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                className="py-1.5 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Active Filter Notice */}
        {(selectedExhibitionId || activeTab !== 'ALL' || search) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-purple-600" />
              <span>
                Showing <strong>{filteredCompanies.length}</strong> of{' '}
                <strong>{totalCount}</strong> exhibitors
                {selectedExhibitionId && (
                  <>
                    {' '}
                    registered for{' '}
                    <span className="font-semibold text-purple-700 dark:text-purple-300">
                      "{exhibitions.find((e) => e.id === selectedExhibitionId)?.title}"
                    </span>
                  </>
                )}
              </span>
            </div>

            <button
              onClick={() => {
                setSelectedExhibitionId('');
                setActiveTab('ALL');
                setSearch('');
              }}
              className="text-purple-600 hover:text-purple-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Exhibitors Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold">
                <th className="py-3.5 px-4 min-w-[200px]">Corporate Entity Name</th>
                <th className="py-3.5 px-4 min-w-[150px]">Contact Person</th>
                <th className="py-3.5 px-4 min-w-[170px]">Contact Info & Tax ID</th>
                <th className="py-3.5 px-4 min-w-[260px]">Registered Event(s) & Stalls</th>
                <th className="py-3.5 px-4 text-center min-w-[150px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading exhibitors and event bookings...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        No exhibitors match the selected filter criteria.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Try clearing your search query or selecting "All Exhibitions".
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((c) => {
                  const companyBookings = c.bookings || [];
                  const isRegistered = companyBookings.length > 0;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Entity Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {c.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {c.companyCode}
                          </span>
                          {c.regNo && (
                            <span className="font-mono text-[10px] text-purple-600 bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded font-bold">
                              Reg: {c.regNo}
                            </span>
                          )}
                          {c.spcode && (
                            <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                              SP: {c.spcode}
                            </span>
                          )}
                        </div>
                        {c.website && (
                          <a
                            href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-purple-600 hover:underline mt-1"
                          >
                            <span>Website</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>

                      {/* Contact Person */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {c.contactPerson}
                        </div>
                        {c.designation && (
                          <div className="text-[11px] text-slate-500">{c.designation}</div>
                        )}
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {c.industry || 'General Industry'}
                        </span>
                      </td>

                      {/* Contact Info & Tax ID */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {c.mobile || '—'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                          {c.email || '—'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                        </div>
                        {c.gstNumber && (
                          <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-1.5 py-0.5 rounded inline-block">
                            GSTIN: {c.gstNumber}
                          </div>
                        )}
                      </td>

                      {/* Registered Event(s) & Stalls */}
                      <td className="py-3.5 px-4">
                        {isRegistered ? (
                          <div className="space-y-2">
                            {companyBookings.map((b) => {
                              const stallsList =
                                b.stalls?.map((s) => s.stall?.stallNumber).filter(Boolean) || [];

                              return (
                                <div
                                  key={b.id}
                                  className="p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-xs space-y-1.5"
                                >
                                  {/* Exhibition Title & Status */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                                      <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                      <span className="truncate max-w-[170px]" title={b.exhibition?.title}>
                                        {b.exhibition?.title || 'Exhibition Event'}
                                      </span>
                                      {b.exhibition?.edition && (
                                        <span className="font-mono text-[10px] px-1 bg-purple-200 dark:bg-purple-900 rounded font-semibold">
                                          Ed. {b.exhibition.edition}
                                        </span>
                                      )}
                                    </div>
                                    <div>{getStatusBadge(b.status)}</div>
                                  </div>

                                  {/* Stalls Allocated & Value */}
                                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-slate-400 font-medium">Stalls:</span>
                                      {stallsList.length > 0 ? (
                                        stallsList.map((sn) => (
                                          <span
                                            key={sn}
                                            className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200 text-[10px]"
                                          >
                                            {sn}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-slate-400 italic">Unallocated</span>
                                      )}
                                    </div>

                                    {b.grandTotal && (
                                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                        ₹{Number(b.grandTotal).toLocaleString()} INR
                                      </span>
                                    )}
                                  </div>

                                  {/* Booking Reference */}
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    Ref: {b.bookingReference}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                            <span className="w-2 h-2 rounded-full bg-slate-300" />
                            <span>No Event Registrations</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setInspectedCompany(c)}
                            title="View Complete Event Registration History"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-600 border border-slate-200 hover:border-purple-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setRegisterModalCompany(c);
                              setTargetExhibitionId(exhibitions[0]?.id || '');
                            }}
                            title="Register / Book this Company to an Event"
                            className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span>Register</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Complete Event Registrations History */}
      {inspectedCompany && (
        <Modal
          isOpen={!!inspectedCompany}
          onClose={() => setInspectedCompany(null)}
          title={`Event Registration History: ${inspectedCompany.name}`}
          maxWidth="2xl"
        >
          <div className="p-6 space-y-6">
            {/* Exhibitor Profile Overview */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Company Code</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {inspectedCompany.companyCode}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Primary Contact</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {inspectedCompany.contactPerson}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Email & Phone</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                  {inspectedCompany.email}
                </span>
                <span className="text-slate-500 font-mono">{inspectedCompany.mobile}</span>
              </div>
              <div>
                <span className="text-slate-400 block">GSTIN / Tax ID</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {inspectedCompany.gstNumber || 'N/A'}
                </span>
              </div>
            </div>

            {/* List of Registered Exhibitions */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4 text-purple-600" />
                  Active Event Registrations ({inspectedCompany.bookings?.length || 0})
                </span>

                <button
                  onClick={() => {
                    setRegisterModalCompany(inspectedCompany);
                    setInspectedCompany(null);
                  }}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <CalendarPlus className="w-3.5 h-3.5" /> Register to Another Event
                </button>
              </h4>

              {!inspectedCompany.bookings || inspectedCompany.bookings.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 space-y-2">
                  <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="font-semibold text-xs">
                    This company has not registered for any exhibitions yet.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRegisterModalCompany(inspectedCompany);
                      setInspectedCompany(null);
                    }}
                    leftIcon={<CalendarPlus className="w-4 h-4 text-purple-600" />}
                  >
                    Register to an Exhibition Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {inspectedCompany.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3"
                    >
                      {/* Event Banner & Badge */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                        <div>
                          <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                            <Layers className="w-4 h-4 text-purple-600" />
                            {booking.exhibition?.title || 'Exhibition'}
                          </h5>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>
                              {booking.exhibition?.city} • {booking.exhibition?.venue}
                            </span>
                            {booking.exhibition?.startDate && (
                              <span>
                                • Starts {formatDisplayDate(booking.exhibition.startDate)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {getStatusBadge(booking.status)}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              booking.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            Payment: {booking.paymentStatus || 'UNPAID'}
                          </span>
                        </div>
                      </div>

                      {/* Stalls & Financials */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                          <span className="text-slate-400 block font-medium">Booked Stalls</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {booking.stalls && booking.stalls.length > 0 ? (
                              booking.stalls.map((bs) => (
                                <span
                                  key={bs.id || bs.stall?.id}
                                  className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 font-mono font-bold text-purple-800 dark:text-purple-300 text-[11px]"
                                >
                                  {bs.stall?.stallNumber} ({bs.stall?.category || 'STD'})
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">Pending Assignment</span>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                          <span className="text-slate-400 block font-medium">Contract Value</span>
                          <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-slate-100 mt-1 block">
                            ₹{Number(booking.grandTotal || 0).toLocaleString()} INR
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Booking Ref: {booking.bookingReference}
                          </span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                          <span className="text-slate-400 block font-medium">Registration Date</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300 mt-1 block">
                            {formatDisplayDate(booking.createdAt)}
                          </span>
                          {booking.exhibition?.slug && (
                            <Link
                              to={`/exhibitions/${booking.exhibition.slug}`}
                              target="_blank"
                              className="text-[11px] font-bold text-purple-600 hover:underline flex items-center gap-1 mt-1"
                            >
                              <span>View Exhibition</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
              <Button variant="outline" size="sm" onClick={() => setInspectedCompany(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 2: Register Company to Exhibition Event */}
      {registerModalCompany && (
        <Modal
          isOpen={!!registerModalCompany}
          onClose={() => setRegisterModalCompany(null)}
          title={`Register Company to Event: ${registerModalCompany.name}`}
          maxWidth="md"
        >
          <div className="p-6 space-y-5">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Select an active exhibition from the platform catalog to register{' '}
              <strong>"{registerModalCompany.name}"</strong> and allocate stall reservations.
            </p>

            {/* Exhibition Select */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Target Exhibition Event *
              </label>
              <select
                value={targetExhibitionId}
                onChange={(e) => setTargetExhibitionId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              >
                {exhibitions.map((expo) => (
                  <option key={expo.id} value={expo.id}>
                    {expo.title} {expo.edition ? `(Ed. ${expo.edition})` : ''} - {expo.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Expo Preview */}
            {targetExhibitionId && (() => {
              const selected = exhibitions.find((e) => e.id === targetExhibitionId);
              if (!selected) return null;
              return (
                <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs space-y-1.5">
                  <div className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>{selected.title}</span>
                  </div>
                  <div className="text-[11px] text-purple-700 dark:text-purple-300">
                    Venue: {selected.venue}, {selected.city}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Dates: {formatDisplayDate(selected.startDate)} to {formatDisplayDate(selected.endDate)}
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRegisterModalCompany(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRegisterCompanyToEvent}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                leftIcon={<CalendarPlus className="w-4 h-4" />}
              >
                Open Floor Plan Booking Wizard
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
