import React from 'react';
import { NavLink, Link } from 'react-router-dom';
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
  Award,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

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
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-3.5rem)] transition-colors duration-200">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-[#012970] text-white flex items-center justify-between shadow-xs">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-lg shadow-sm flex items-center justify-center">
            <img src="/assets/logo.png" alt="BUOYANT Media" className="h-8 object-contain max-w-[140px]" />
          </div>
        </Link>
      </div>

      {/* Nav Links */}
      <div className="flex-1 p-3 space-y-6 overflow-y-auto">
        {/* Client Portal Navigation */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Exhibitor Workspace
          </p>
          {clientLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#09539b]/10 dark:bg-blue-950/70 text-[#09539b] dark:text-blue-300 border-l-4 border-[#9cc542] shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#012970] dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Admin Navigation Section (Visible to Admins) */}
        {isAdmin && (
          <div className="space-y-1 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="px-3 text-[10px] font-bold text-[#012970] dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9cc542]" /> Platform Operations
            </p>
            {adminLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#012970]/10 dark:bg-purple-950/60 text-[#012970] dark:text-purple-300 border-l-4 border-[#9cc542] shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#012970] dark:hover:text-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 text-[#012970] dark:text-purple-400" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Context */}
      <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-[#f6f9ff] dark:bg-slate-900/60 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
        <span className="font-semibold text-[#012970]">© 2026 Buoyant Media</span>
        <span className="font-mono text-[10px] bg-[#9cc542]/20 text-[#012970] font-bold px-1.5 py-0.5 rounded">v2.4.0</span>
      </div>
    </aside>
  );
};
