import React from 'react';
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
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-900 dark:bg-slate-950 text-white">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
          <Award className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-extrabold text-sm tracking-tight text-white">Buoyant Events</h2>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            Stall Management SaaS
          </p>
        </div>
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
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold border-l-3 border-blue-600 dark:border-blue-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
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
            <p className="px-3 text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">
              Platform Operations
            </p>
            {adminLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold border-l-3 border-purple-600 dark:border-purple-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Context */}
      <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
        <span>© 2026 Buoyant Media</span>
        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">v2.4.0</span>
      </div>
    </aside>
  );
};
