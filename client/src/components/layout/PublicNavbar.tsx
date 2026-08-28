import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { LogOut, Menu, X, User } from 'lucide-react';

export const PublicNavbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-[#E6EAF0] sticky top-0 z-40 shadow-xs transition-colors">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between gap-6">
        {/* Left: Buoyant Media Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img src="/assets/logo.png" alt="BUOYANT Media" className="h-9 sm:h-10 object-contain" />
        </Link>

        {/* Right: Harmonious Navigation & Auth Action */}
        <div className="hidden sm:flex items-center gap-8">
          <nav className="flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-bold transition-colors ${
                isActive('/')
                  ? 'text-[#1E3FA0] border-b-2 border-[#1E3FA0] pb-0.5'
                  : 'text-slate-600 hover:text-[#1E3FA0]'
              }`}
            >
              Home
            </Link>
          </nav>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link to={user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'}>
                <button className="inline-flex items-center gap-2 bg-[#1E3FA0] hover:bg-[#152B75] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all">
                  <User className="w-3.5 h-3.5" />
                  {user?.role === 'ADMIN' ? 'Admin Studio' : 'Exhibitor Portal'}
                </button>
              </Link>
              <button
                onClick={() => logout()}
                className="p-2 text-slate-500 hover:text-rose-600 rounded-xl hover:bg-slate-100 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link to="/login">
              <button className="inline-flex items-center gap-2 bg-[#1E3FA0] hover:bg-[#152B75] text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-xs transition-all transform hover:-translate-y-0.5">
                Login
              </button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-b border-slate-200 px-6 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-bold text-[#1E3FA0]"
          >
            Home
          </Link>
          {isAuthenticated ? (
            <Link
              to={user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'}
              onClick={() => setMobileMenuOpen(false)}
            >
              <button className="w-full font-bold bg-[#1E3FA0] text-white py-2.5 rounded-xl">
                Go to {user?.role === 'ADMIN' ? 'Admin Studio' : 'Dashboard'}
              </button>
            </Link>
          ) : (
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
              <button className="w-full font-bold bg-[#1E3FA0] text-white py-2.5 rounded-xl">
                Login
              </button>
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
