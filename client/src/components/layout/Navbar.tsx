import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Bell, Search, LogOut, ChevronDown, Building, Sun, Moon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-14 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors duration-200">
      {/* Search & Breadcrumb */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search exhibitions, stalls, bookings..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dark / Light Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-slate-600 hover:text-slate-900" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400 hover:text-amber-300" />
          )}
          <span className="hidden md:inline text-[11px] font-semibold">
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>

        {/* Notifications Button */}
        <Link
          to="/notifications"
          className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white dark:ring-slate-900" />
        </Link>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">{user?.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {user?.role === 'ADMIN' ? 'Platform Administrator' : user?.company?.name || 'Exhibitor Client'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <p className="font-bold text-slate-900 dark:text-slate-100">{user?.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold text-[10px] rounded">
                  {user?.role} ACCOUNT
                </span>
              </div>

              <div className="py-1">
                {user?.role === 'CLIENT' && (
                  <Link
                    to="/my-company"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                  >
                    <Building className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    Company Profile
                  </Link>
                )}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
