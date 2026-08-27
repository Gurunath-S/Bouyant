import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Search, Calendar, ShieldCheck, User, LogOut, Menu, X, ExternalLink, Building2, Phone } from 'lucide-react';
import { Button } from '../ui/Button';

export const PublicNavbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/exhibitions?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs transition-colors">
      {/* Top Corporate Banner */}
      <div className="bg-[#012970] text-white text-xs py-1.5 px-4 sm:px-8 flex justify-between items-center">
        <div className="flex items-center gap-4 text-[11px] font-medium">
          <span className="hidden sm:inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#9cc542]" /> Official Trade Fair & Exhibition Organizer
          </span>
          <span className="flex items-center gap-1 text-slate-200">
            <Phone className="w-3 h-3 text-[#9cc542]" /> Helpline: +91 (0422) 4910-880
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <a
            href="https://buoyantevents.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#9cc542] flex items-center gap-1 transition-colors"
          >
            Corporate Portal <ExternalLink className="w-3 h-3" />
          </a>
          {isAuthenticated && (
            <span className="px-2 py-0.5 bg-[#9cc542]/20 text-[#9cc542] rounded font-bold uppercase text-[10px]">
              {user?.role} Account Active
            </span>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img src="/assets/logo.png" alt="BUOYANT Media" className="h-9 sm:h-10 object-contain" />
        </Link>

        {/* Center Search Input (Desktop) */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exhibitions by name, city or industry..."
            className="w-full bg-[#f6f9ff] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-[#012970] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#09539b] font-medium"
          />
        </form>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-[#012970] dark:text-slate-200">
          <Link to="/" className="hover:text-[#09539b] transition-colors">
            Home
          </Link>
          <Link to="/exhibitions" className="hover:text-[#09539b] transition-colors flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#09539b]" /> Exhibitions
          </Link>
          <a href="#why-exhibit" className="hover:text-[#09539b] transition-colors">
            Why Exhibit
          </a>
          <a href="#about-us" className="hover:text-[#09539b] transition-colors">
            About Organizer
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link to={user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'}>
                <Button variant="outline" size="sm" className="font-bold border-[#09539b] text-[#09539b] hover:bg-[#09539b]/10">
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
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="outline" size="sm" className="font-bold border-slate-300 text-[#012970]">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm" className="font-bold shadow-xs">
                  Become Exhibitor
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-150">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trade fairs..."
              className="w-full bg-[#f6f9ff] border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium"
            />
          </form>

          <div className="flex flex-col gap-3 text-sm font-bold text-[#012970] dark:text-slate-200">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-[#09539b]">
              Home Discovery
            </Link>
            <Link to="/exhibitions" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-[#09539b]">
              All Exhibitions
            </Link>
            <a href="#why-exhibit" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-[#09539b]">
              Why Exhibit
            </a>
            <a href="#about-us" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-[#09539b]">
              About Buoyant Media
            </a>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <Link to={user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'} onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" className="w-full font-bold">
                  Go to {user?.role === 'ADMIN' ? 'Admin Studio' : 'Dashboard'}
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full font-bold">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full font-bold">
                    Become Exhibitor
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
