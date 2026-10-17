import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../../services/auth/authService';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { PublicFooter } from '../../../components/layout/PublicFooter';
import { PublicNavbar } from '../../../components/layout/PublicNavbar';
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string>('');
  const [hasCheckedToken, setHasCheckedToken] = useState<boolean>(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isExpiredOrInvalid, setIsExpiredOrInvalid] = useState(false);

  // Safely extract token from URL on mount and remove it from visible URL bar
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken && urlToken.trim()) {
        setToken(urlToken.trim());
        // Clean the token parameter from the address bar to prevent shoulder surfing or referrer leakage
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {
      // In non-browser environments or malformed search string
    } finally {
      setHasCheckedToken(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsExpiredOrInvalid(false);

    if (!token) {
      setErrorMessage('Missing password reset token. Please request a new link from the login page.');
      setIsExpiredOrInvalid(true);
      return;
    }

    if (!password || password.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.resetPassword(token, password);
      setIsSuccess(true);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to reset password. Please check your recovery link or try again.';

      setErrorMessage(message);
      if (
        message.toLowerCase().includes('expired') ||
        message.toLowerCase().includes('invalid') ||
        message.toLowerCase().includes('malformed')
      ) {
        setIsExpiredOrInvalid(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPasswordValid = password.length >= 8;
  const doPasswordsMatch = password && confirmPassword && password === confirmPassword;

  return (
    <div className="min-h-screen w-full bg-[#f6f9ff] dark:bg-slate-950 text-[#012970] dark:text-slate-100 font-sans flex flex-col justify-between transition-colors">
      <PublicNavbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          {/* SUCCESS VIEW */}
          {isSuccess ? (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Password Reset Complete 🎉
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your account password has been securely updated. You can now log in using your new credentials.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  className="w-full"
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => navigate('/login')}
                >
                  Proceed to Login
                </Button>
              </div>
            </div>
          ) : hasCheckedToken && !token ? (
            /* MISSING TOKEN VIEW */
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Missing Reset Token
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Password reset requires a valid, single-use link dispatched to your verified email address.
                </p>
              </div>

              <div className="pt-3 flex flex-col gap-2.5">
                <Button
                  className="w-full"
                  variant="primary"
                  onClick={() => navigate('/login')}
                >
                  Return to Login & Request Link
                </Button>
              </div>
            </div>
          ) : (
            /* RESET FORM VIEW */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/60 rounded-xl flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Set New Password
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Please create a secure password for your exhibitor portal account.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <span>{errorMessage}</span>
                  </div>
                  {isExpiredOrInvalid && (
                    <div className="pt-1">
                      <Link
                        to="/login"
                        className="font-semibold underline text-rose-800 dark:text-rose-200 hover:text-rose-900"
                      >
                        Click here to return to login and request a new recovery link →
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {/* New Password */}
                <div>
                  <Input
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter at least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-slate-600 focus:outline-none"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    <ShieldCheck
                      className={`w-3.5 h-3.5 ${
                        isPasswordValid ? 'text-emerald-500' : 'text-slate-400'
                      }`}
                    />
                    <span className={isPasswordValid ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500'}>
                      Minimum 8 characters
                    </span>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <Input
                    label="Confirm New Password"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="text-slate-400 hover:text-slate-600 focus:outline-none"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                  {confirmPassword && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          doPasswordsMatch ? 'text-emerald-500' : 'text-rose-400'
                        }`}
                      />
                      <span
                        className={
                          doPasswordsMatch
                            ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {doPasswordsMatch ? 'Passwords match' : 'Passwords do not match'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                disabled={!isPasswordValid || !doPasswordsMatch}
              >
                Update Password
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Remember your password? Return to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
