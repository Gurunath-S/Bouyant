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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUsername(initialEmail || '');
      setPassword('');
      setErrorMessage('');
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

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage('Please enter your exhibitor username.');
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
        email: cleanUsername,
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md" title="">
      <div className="p-6 space-y-5">
        {/* Header Visual */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/60 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex items-center justify-center mx-auto text-[#09539b] dark:text-blue-400 shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#012970] dark:text-slate-100">
            Sign In to Exhibitor Account
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Exhibitor accounts authenticate using their unique username. You may also continue directly as a guest without logging in.
          </p>
        </div>

        {/* Status Notifications */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Exhibitor Username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. rajesh.kumar"
            disabled={isSubmitting}
            leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
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

          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl text-[11px] text-slate-600 dark:text-slate-400">
            Exhibitor passwords are administrator-controlled. Contact your exhibition coordinator if you need a password reset.
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-1/2 text-xs font-semibold"
            >
              Continue as Guest
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              disabled={isSubmitting || !password}
              className="w-1/2 bg-[#09539b] hover:bg-[#012970] text-white font-bold text-xs"
              rightIcon={<LogIn className="w-3.5 h-3.5 text-[#9cc542]" />}
            >
              Sign In
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
