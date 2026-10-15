import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { LogOut, Menu, X, User } from 'lucide-react';
import { ConfirmLeaveToHomeModal } from '../ui/ConfirmLeaveToHomeModal';
import { getDashboardUrl, getRoleDisplayName } from '../../utils/navigation';

export const PublicNavbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showHomeConfirmModal, setShowHomeConfirmModal] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  const handleHomeClick = (e: React.MouseEvent) => {
    if (isAuthenticated) {
      e.preventDefault();
      setShowHomeConfirmModal(true);
    }
  };

  return (
    <>
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#E6EAF0] dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          {/* Left: Buoyant Media Logo */}
          <Link
            to={isAuthenticated ? getDashboardUrl(user?.role) : '/'}
            className="flex items-center gap-3 shrink-0"
            title={isAuthenticated ? 'Go to Dashboard' : 'BUOYANT Media Home'}
          >
            <div className="dark:bg-white/95 dark:px-2.5 dark:py-1 dark:rounded-xl dark:shadow-xs transition-all flex items-center">
              <img src="/assets/logo.png" alt="BUOYANT Media" className="h-9 sm:h-10 object-contain" />
            </div>
          </Link>

          {/* Right: Harmonious Navigation & Auth Action */}
          <div className="hidden sm:flex items-center gap-6">
            <nav className="flex items-center gap-6">
              <Link
                to="/"
                onClick={handleHomeClick}
                className={`text-sm font-bold transition-colors ${
                  isActive('/')
                    ? 'text-[#1E3FA0] dark:text-blue-400 border-b-2 border-[#1E3FA0] dark:border-blue-400 pb-0.5'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#1E3FA0] dark:hover:text-blue-400'
                }`}
              >
                Home
              </Link>
              <Link
                to="/exhibitions"
                className={`text-sm font-bold transition-colors ${
                  isActive('/exhibitions')
                    ? 'text-[#1E3FA0] dark:text-blue-400 border-b-2 border-[#1E3FA0] dark:border-blue-400 pb-0.5'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#1E3FA0] dark:hover:text-blue-400'
                }`}
              >
                Exhibitions
              </Link>
            </nav>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link to={getDashboardUrl(user?.role)}>
                  <button className="inline-flex items-center gap-2 bg-[#1E3FA0] dark:bg-blue-600 hover:bg-[#152B75] dark:hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all">
                    <User className="w-3.5 h-3.5" />
                    {user?.role === 'SUPERADMIN'
                      ? 'Super Admin Portal'
                      : user?.role === 'ADMIN'
                      ? 'Admin Dashboard'
                      : user?.role === 'STAFF'
                      ? 'Staff Portal'
                      : 'Exhibitor Portal'}
                  </button>
                </Link>
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="p-2 text-slate-500 hover:text-rose-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link to="/login">
                <button className="inline-flex items-center gap-2 bg-[#1E3FA0] dark:bg-blue-600 hover:bg-[#152B75] dark:hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-xs transition-all transform hover:-translate-y-0.5">
                  Login
                </button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
            <Link
              to="/"
              onClick={(e) => {
                setMobileMenuOpen(false);
                handleHomeClick(e);
              }}
              className="block py-2 text-sm font-bold text-[#1E3FA0] dark:text-blue-400"
            >
              Home
            </Link>
            <Link
              to="/exhibitions"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-bold text-slate-700 dark:text-slate-200"
            >
              Exhibitions
            </Link>
            {isAuthenticated ? (
              <Link
                to={getDashboardUrl(user?.role)}
                onClick={() => setMobileMenuOpen(false)}
              >
                <button className="w-full font-bold bg-[#1E3FA0] dark:bg-blue-600 text-white py-2.5 rounded-xl">
                  Go to {getRoleDisplayName(user?.role)} Dashboard
                </button>
              </Link>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full font-bold bg-[#1E3FA0] dark:bg-blue-600 text-white py-2.5 rounded-xl">
                  Login
                </button>
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Leave To Public Home Confirmation Modal */}
      <ConfirmLeaveToHomeModal
        isOpen={showHomeConfirmModal}
        onClose={() => setShowHomeConfirmModal(false)}
        onConfirmHome={() => {
          setShowHomeConfirmModal(false);
          navigate('/');
        }}
        onGoToDashboard={() => {
          setShowHomeConfirmModal(false);
          navigate(getDashboardUrl(user?.role));
        }}
      />

      {/* Sign Out Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Confirm Sign Out</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to sign out of your account?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
