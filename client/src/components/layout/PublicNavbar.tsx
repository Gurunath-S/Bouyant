import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { LogOut, Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';

export const PublicNavbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Left: Buoyant Media Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img src="/assets/logo.png" alt="BUOYANT Media" className="h-9 sm:h-10 object-contain" />
        </Link>

        {/* Right: Home and Login Links Only */}
        <div className="hidden sm:flex items-center gap-6">
          <nav className="flex items-center gap-6 text-sm font-bold text-[#121B3D] dark:text-slate-200">
            <Link
              to="/"
              className={`transition-colors hover:text-[#0E8074] ${isActive('/') ? 'text-[#84CC16]' : ''}`}
            >
              Home
            </Link>
          </nav>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link to={user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'}>
                <Button variant="primary" size="sm" className="font-bold bg-[#1E3FA0] hover:bg-[#152B75] text-white">
                  {user?.role === 'ADMIN' ? 'Admin Studio' : 'Exhibitor Portal'}
                </Button>
              </Link>
              <button
                onClick={() => logout()}
                className="p-2 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link to="/login">
              <Button
                variant="primary"
                size="sm"
                className="font-bold bg-[#1E3FA0] hover:bg-[#152B75] text-white px-6 py-2 rounded-lg shadow-xs"
              >
                Login
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-bold text-[#121B3D] dark:text-slate-200 hover:text-[#0E8074]"
          >
            Home
          </Link>
          {isAuthenticated ? (
            <Link
              to={user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button variant="primary" className="w-full font-bold bg-[#1E3FA0]">
                Go to {user?.role === 'ADMIN' ? 'Admin Studio' : 'Dashboard'}
              </Button>
            </Link>
          ) : (
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" className="w-full font-bold bg-[#1E3FA0]">
                Login
              </Button>
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
