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
  ShieldAlert,
  CreditCard,
  Building,
  Layers,
  ChevronLeft,
  ChevronRight,
  Users,
  BarChart3,
  CalendarPlus,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;

  const isSuperAdmin = role === 'SUPERADMIN';
  const isAdmin = role === 'ADMIN';
  const isStaff = role === 'STAFF';
  const isClient = role === 'CLIENT' || !role;

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
    { to: '/exhibitions', label: 'Browse Exhibitions', icon: Calendar },
    { to: '/my-bookings', label: 'My Bookings', icon: BookmarkCheck },
    { to: '/my-company', label: 'My Company Profile', icon: Building2 },
    { to: '/invoices', label: 'Invoices & Receipts', icon: FileText },
    { to: '/notifications', label: 'Notifications', icon: Bell },
  ];

  const superAdminLinks = [
    { to: '/super-admin/dashboard', label: 'Platform Overview', icon: ShieldAlert },
    { to: '/super-admin/users', label: 'User Governance', icon: Users },
    { to: '/admin/events', label: 'Exhibitions & Floor Plans', icon: Layers },
    { to: '/admin/companies', label: 'Exhibitor Directory', icon: Building },
    { to: '/admin/bookings', label: 'Bookings & Orders', icon: BookmarkCheck },
    { to: '/admin/payments', label: 'Payments & Billing', icon: CreditCard },
    { to: '/reports', label: 'Platform Reports', icon: BarChart3 },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Admin Dashboard', icon: ShieldCheck },
    { to: '/admin/events', label: 'Manage Exhibitions', icon: Layers },
    { to: '/admin/companies', label: 'Exhibitor Directory', icon: Building },
    { to: '/admin/bookings', label: 'Bookings & Allocations', icon: BookmarkCheck },
    { to: '/admin/payments', label: 'Payments & Billing', icon: CreditCard },
    { to: '/reports', label: 'Business Reports', icon: BarChart3 },
  ];

  const staffLinks = [
    { to: '/staff/dashboard', label: 'Staff Dashboard', icon: LayoutDashboard },
    { to: '/staff/events', label: 'Exhibitions & Events', icon: Layers },
    { to: '/staff/events/register', label: 'Register New Event', icon: CalendarPlus },
    { to: '/reports', label: 'Operational Reports', icon: BarChart3 },
  ];

  const getWorkspaceTitle = () => {
    if (isSuperAdmin) return 'Super Admin Hub';
    if (isAdmin) return 'Admin Workspace';
    if (isStaff) return 'Staff Operations';
    return 'Exhibitor Portal';
  };

  const getWorkspaceSubtitle = () => {
    if (isSuperAdmin) return 'Platform Control';
    if (isAdmin) return 'Management Console';
    if (isStaff) return 'Field Operations';
    return 'Client Dashboard';
  };

  return (
    <aside
      className={`sticky top-14 h-[calc(100vh-3.5rem)] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-20 transition-all duration-300 ease-in-out select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-30 w-7 h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-md flex items-center justify-center text-slate-500 hover:text-[#09539b] dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer group"
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-[#09539b] group-hover:scale-110 transition-transform" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-[#09539b] group-hover:scale-110 transition-transform" />
        )}
      </button>

      {/* Workspace Indicator Header */}
      <div
        className={`px-3 py-3 border-b border-slate-100 dark:border-slate-800 bg-[#f8faff] dark:bg-slate-800/40 flex items-center transition-all ${
          isCollapsed ? 'justify-center' : 'justify-between px-4'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0" title={getWorkspaceTitle()}>
          <span
            className={`w-2.5 h-2.5 rounded-full animate-pulse shrink-0 ${
              isSuperAdmin ? 'bg-amber-500' : isAdmin ? 'bg-[#9cc542]' : isStaff ? 'bg-emerald-500' : 'bg-blue-500'
            }`}
          />
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="block text-xs font-black text-[#012970] dark:text-slate-100 tracking-wide truncate">
                {getWorkspaceTitle()}
              </span>
              <span className="block text-[10px] text-slate-400 font-medium truncate">
                {getWorkspaceSubtitle()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Nav Links Container */}
      <div className="flex-1 p-2.5 space-y-1 overflow-y-auto overflow-x-hidden">
        {/* 1. SUPERADMIN NAVIGATION */}
        {isSuperAdmin &&
          superAdminLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/admin/events'}
                title={isCollapsed ? link.label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-xl text-xs font-semibold transition-all ${
                    isCollapsed ? 'justify-center p-2.5 mx-auto' : 'gap-3 px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-l-4 border-amber-500 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-amber-900 dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-amber-600 dark:text-amber-400 shrink-0`} />
                {!isCollapsed && <span className="truncate">{link.label}</span>}
              </NavLink>
            );
          })}

        {/* 2. ADMIN NAVIGATION */}
        {isAdmin &&
          adminLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/admin/events'}
                title={isCollapsed ? link.label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-xl text-xs font-semibold transition-all ${
                    isCollapsed ? 'justify-center p-2.5 mx-auto' : 'gap-3 px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-[#012970]/10 dark:bg-purple-950/60 text-[#012970] dark:text-purple-300 border-l-4 border-[#9cc542] shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#012970] dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-[#012970] dark:text-purple-400 shrink-0`} />
                {!isCollapsed && <span className="truncate">{link.label}</span>}
              </NavLink>
            );
          })}

        {/* 3. STAFF NAVIGATION */}
        {isStaff &&
          staffLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                title={isCollapsed ? link.label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-xl text-xs font-semibold transition-all ${
                    isCollapsed ? 'justify-center p-2.5 mx-auto' : 'gap-3 px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-l-4 border-emerald-500 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-900 dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-emerald-600 dark:text-emerald-400 shrink-0`} />
                {!isCollapsed && <span className="truncate">{link.label}</span>}
              </NavLink>
            );
          })}

        {/* 4. CLIENT / EXHIBITOR NAVIGATION */}
        {isClient &&
          clientLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                title={isCollapsed ? link.label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-xl text-xs font-semibold transition-all ${
                    isCollapsed ? 'justify-center p-2.5 mx-auto' : 'gap-3 px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-[#09539b]/10 dark:bg-blue-950/70 text-[#09539b] dark:text-blue-300 border-l-4 border-[#9cc542] shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#012970] dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-[#09539b] dark:text-blue-400 shrink-0`} />
                {!isCollapsed && <span className="truncate">{link.label}</span>}
              </NavLink>
            );
          })}
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
              v2.5.0
            </span>
          </>
        ) : (
          <span className="font-mono text-[10px] text-slate-400">v2.5</span>
        )}
      </div>
    </aside>
  );
};
