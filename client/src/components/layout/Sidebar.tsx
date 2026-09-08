import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  LayoutDashboard,
  Calendar,
  BookmarkCheck,
  Building2,
  FileText,
  Bell,
  ShieldCheck,
  CreditCard,
  Building,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('buoyant_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('buoyant_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const clientLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/exhibitions', label: 'Exhibitions', icon: Calendar },
    { to: '/my-bookings', label: 'My Bookings', icon: BookmarkCheck },
    { to: '/my-company', label: 'My Company', icon: Building2 },
    { to: '/invoices', label: 'Invoices & Receipts', icon: FileText },
    { to: '/notifications', label: 'Notifications', icon: Bell },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Admin Dashboard', icon: ShieldCheck },
    { to: '/admin/events', label: 'Events & Floor Plans', icon: Layers },
    { to: '/admin/companies', label: 'Exhibitor Directory', icon: Building },
    { to: '/admin/bookings', label: 'Booking Ledger', icon: BookmarkCheck },
    { to: '/admin/payments', label: 'Financial Audits', icon: CreditCard },
  ];

  return (
    <aside
      className={`sticky top-14 h-[calc(100vh-3.5rem)] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-20 transition-all duration-300 ease-in-out select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Middle Floating Collapse / Expand Toggle Button */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-30 w-7 h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-md flex items-center justify-center text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer group"
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-purple-600 group-hover:scale-110 transition-transform" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-purple-600 group-hover:scale-110 transition-transform" />
        )}
      </button>

      {/* Workspace Indicator */}
      <div
        className={`px-3 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center transition-all ${
          isCollapsed ? 'justify-center' : 'justify-between px-4'
        }`}
      >
        <div className="flex items-center gap-2" title={isAdmin ? 'Admin Console' : 'Exhibitor Portal'}>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          {!isCollapsed && (
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide truncate">
              {isAdmin ? 'Admin Console' : 'Exhibitor Portal'}
            </span>
          )}
        </div>
        {!isCollapsed && (
          <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
            {isAdmin ? 'ADMIN' : 'CLIENT'}
          </span>
        )}
      </div>

      {/* Nav Links */}
      <div className="flex-1 p-2.5 space-y-5 overflow-y-auto overflow-x-hidden">
        {/* Client Portal Navigation */}
        <div className="space-y-1">
          {!isCollapsed ? (
            <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Exhibitor Workspace
            </p>
          ) : (
            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2" />
          )}
          {clientLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                title={isCollapsed ? link.label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-xl text-xs font-semibold transition-all ${
                    isCollapsed
                      ? 'justify-center p-2.5 mx-auto'
                      : 'gap-3 px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-[#09539b]/10 dark:bg-blue-950/70 text-[#09539b] dark:text-blue-300 border-l-4 border-[#9cc542] shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#012970] dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
                {!isCollapsed && <span className="truncate">{link.label}</span>}
              </NavLink>
            );
          })}
        </div>

        {/* Admin Navigation Section (Visible to Admins) */}
        {isAdmin && (
          <div className="space-y-1 pt-3 border-t border-slate-100 dark:border-slate-800">
            {!isCollapsed ? (
              <p className="px-3 text-[10px] font-bold text-[#012970] dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9cc542]" /> Platform Operations
              </p>
            ) : (
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2" />
            )}
            {adminLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  title={isCollapsed ? link.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl text-xs font-semibold transition-all ${
                      isCollapsed
                        ? 'justify-center p-2.5 mx-auto'
                        : 'gap-3 px-3 py-2.5'
                    } ${
                      isActive
                        ? 'bg-[#012970]/10 dark:bg-purple-950/60 text-[#012970] dark:text-purple-300 border-l-4 border-[#9cc542] shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#012970] dark:hover:text-slate-100'
                    }`
                  }
                >
                  <Icon
                    className={`${
                      isCollapsed
                        ? 'w-5 h-5 text-purple-600 dark:text-purple-400'
                        : 'w-4 h-4 text-[#012970] dark:text-purple-400'
                    } shrink-0`}
                  />
                  {!isCollapsed && <span className="truncate">{link.label}</span>}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Context */}
      <div
        className={`p-3 border-t border-slate-100 dark:border-slate-800 bg-[#f6f9ff] dark:bg-slate-900/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-center ${
          isCollapsed ? 'justify-center' : 'justify-between px-3.5'
        }`}
      >
        {!isCollapsed ? (
          <>
            <span className="font-semibold text-[#012970] dark:text-slate-300">© 2026 Buoyant</span>
            <span className="font-mono text-[10px] bg-[#9cc542]/20 text-[#012970] dark:text-slate-200 font-bold px-1.5 py-0.5 rounded">
              v2.4.0
            </span>
          </>
        ) : (
          <span className="font-mono text-[10px] text-slate-400">v2.4</span>
        )}
      </div>
    </aside>
  );
};
