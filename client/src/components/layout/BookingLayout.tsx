import React, { Suspense } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { ScrollToTop } from '../common/ScrollToTop';
import { PublicFooter } from './PublicFooter';
import { useAuthStore } from '../../stores/authStore';
import { getRoleDisplayName } from '../../utils/navigation';
import { User, UserCheck, X } from 'lucide-react';

const PageLoader = () => (
  <div className="w-full h-64 flex flex-col items-center justify-center gap-2">
    <div className="w-8 h-8 border-3 border-[#1E3FA0] dark:border-blue-500 border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading booking view...</span>
  </div>
);

export const BookingNavbar: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleExitClick = () => {
    const fromReferrer = (location.state as any)?.from;
    if (fromReferrer) {
      navigate(fromReferrer);
    } else {
      navigate('/exhibitions');
    }
  };

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#E6EAF0] dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo (Navigation guarded by useBlocker if holding stalls) */}
        <Link
          to="/"
          className="flex items-center gap-3 shrink-0 hover:opacity-90 transition-opacity"
          title="BUOYANT Media Home"
        >
          <div className="dark:bg-white/95 dark:px-2.5 dark:py-1 dark:rounded-xl dark:shadow-xs transition-all flex items-center">
            <img src="/assets/logo.png" alt="BUOYANT Media" className="h-9 sm:h-10 object-contain" />
          </div>
        </Link>

        {/* Right: User Identity & Exit Action (No distracting external links or sidebars) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
              <User className="w-3.5 h-3.5 text-[#1E3FA0] dark:text-blue-400 shrink-0" />
              <span className="max-w-[120px] truncate sm:max-w-[180px]">{user.name || user.email}</span>
              <span className="hidden md:inline-block text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                {getRoleDisplayName(user.role)}
              </span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
              <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Guest Session</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleExitClick}
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 rounded-xl transition-all shadow-2xs cursor-pointer"
            title="Exit Stall Booking"
          >
            <X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 group-hover:text-rose-600 transition-colors" />
            <span className="hidden sm:inline">Exit Booking</span>
            <span className="sm:hidden">Exit</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export const BookingLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-[#121B3D] dark:text-slate-100 flex flex-col justify-between font-sans selection:bg-[#0E8074] selection:text-white transition-colors duration-200">
      <ScrollToTop />
      <BookingNavbar />
      <main className="flex-1 w-full min-w-0">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
};
