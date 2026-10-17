import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { authService } from '../../../../services/auth/authService';
import { User } from '../../../../types';
import { Lock, Mail, KeyRound, Eye, EyeOff, LogIn, AlertTriangle } from 'lucide-react';

export interface AccountExistsLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  isHoldExpired?: boolean;
  onLoginSuccess: (user: User, tokens: { accessToken: string; refreshToken?: string }) => Promise<void> | void;
}

export const AccountExistsLoginModal: React.FC<AccountExistsLoginModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
  isHoldExpired = false,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const [resetInfo, setResetInfo] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setPassword('');
      setErrorMessage('');
      setResetInfo('');
      setResetRequested(false);
      setShowPassword(false);
      setIsSubmitting(false);
    }
  }, [isOpen, initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isHoldExpired) {
      setErrorMessage('Your stall hold reservation has expired. Please restart stall selection.');
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const res = await authService.login({
        email: cleanEmail,
        password,
      });

      if (!res || !res.tokens || !res.user) {
        throw new Error('Invalid authentication response from server.');
      }

      await onLoginSuccess(res.user, res.tokens);
      onClose();
    } catch (err: any) {
      console.error('Wizard login error:', err);
      const msg =
        err.message ||
        err.response?.data?.message ||
        'Invalid credentials. Please verify your password and try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address to receive password reset instructions.');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      const res = await authService.forgotPassword(cleanEmail);
      setResetRequested(true);
      setResetInfo(res?.message || 'If an account associated with this email exists, a password reset link has been dispatched.');
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to request password reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md" title="">
      <div className="p-6 space-y-5">
        {/* Header Visual */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/60 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex items-center justify-center mx-auto text-[#09539b] dark:text-blue-400 shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#012970] dark:text-slate-100">
            Sign In to Your Exhibitor Account
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            An account is already associated with this email. Sign in to link your booking and preserve selected stalls.
          </p>
        </div>

        {/* Status Notifications */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {resetInfo && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2.5 animate-fadeIn">
            <Mail className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span className="font-medium">{resetInfo}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Corporate Email or Username"
            type="text"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@company.com or username"
            disabled={isSubmitting}
            leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
          />

          <div className="relative">
            <Input
              label="Account Password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={isSubmitting}
              leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[32px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-hidden"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              disabled={isSubmitting || resetRequested}
              onClick={handleRequestPasswordReset}
              className="text-[#09539b] dark:text-blue-400 hover:underline cursor-pointer font-semibold text-[11px]"
            >
              {resetRequested ? 'Recovery instructions requested ✓' : 'Forgot password or did not receive initial credentials?'}
            </button>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-1/3 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              disabled={isSubmitting || !password}
              className="w-2/3 bg-[#09539b] hover:bg-[#012970] text-white font-bold text-xs"
              rightIcon={<LogIn className="w-3.5 h-3.5 text-[#9cc542]" />}
            >
              Sign In & Resume Booking
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
