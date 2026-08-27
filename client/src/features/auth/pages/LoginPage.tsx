import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../../services/auth/authService';
import { useAuthStore } from '../../../stores/authStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  MapPin,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { setTokens, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [portalMode, setPortalMode] = useState<'CLIENT' | 'ADMIN'>('CLIENT');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'client@techcorp.com',
      password: 'client123',
    },
  });

  const handlePortalSwitch = (mode: 'CLIENT' | 'ADMIN') => {
    setPortalMode(mode);
    if (mode === 'ADMIN') {
      setValue('email', 'admin@buoyantmedia.com');
      setValue('password', 'admin123');
    } else {
      setValue('email', 'client@techcorp.com');
      setValue('password', 'client123');
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      setErrorMsg(null);
      const res = await authService.login(data);
      setTokens(res.tokens.accessToken, res.tokens.refreshToken);
      setUser(res.user);
      if (res.user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f6f9ff] dark:bg-slate-950 text-[#012970] dark:text-slate-100 font-sans flex flex-col justify-between">
      {/* Top Header Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 lg:px-12 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <img src="/assets/logo.png" alt="BUOYANT Media" className="h-10 object-contain" />
          <div className="hidden sm:block border-l border-slate-200 pl-3">
            <span className="block text-[10px] font-bold text-[#012970] dark:text-slate-400 uppercase tracking-wider">
              Exhibition & Trade Fair Management
            </span>
          </div>
        </div>

        <a
          href="https://buoyantevents.com"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-[#09539b] hover:text-[#012970] dark:text-blue-400 flex items-center gap-1.5 transition-colors bg-[#f6f9ff] px-3 py-1.5 rounded-lg border border-[#e1ecff]"
        >
          Official Website <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-10 lg:p-12 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left Information Section */}
        <div className="lg:w-1/2 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#9cc542]/15 border border-[#9cc542]/40 rounded-full text-[#012970] dark:text-emerald-300 text-xs font-extrabold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9cc542] animate-pulse" />
            Exhibitor Stall Reservation Portal
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#012970] dark:text-white tracking-tight leading-tight">
            Book Exhibition Stalls with <span className="text-[#09539b]">Buoyant Media</span>
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
            Welcome to the official stall booking platform for Buoyant Media trade shows. Select your stall layout, confirm company tax credentials, and manage invoices for upcoming industrial expos.
          </p>

          {/* Real Event Highlights */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-[#012970] dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#09539b]" /> Featured Upcoming Trade Fairs
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <span className="font-bold text-[#012970] dark:text-slate-100">MEDICCON EXPO 2026</span>
                  <span className="text-slate-500 block text-[11px] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" /> CODISSIA Trade Fair Centre, Coimbatore
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-[#9cc542]/20 text-[#012970] dark:text-emerald-300 border border-[#9cc542]/50 font-bold rounded-md text-[10px]">
                  Booking Open
                </span>
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <span className="font-bold text-[#012970] dark:text-slate-100">INTERIO & EXTERIO EXPO 2026</span>
                  <span className="text-slate-500 block text-[11px] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" /> CODISSIA Hall A & B, Coimbatore
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-[#09539b] border border-blue-200 font-bold rounded-md text-[10px]">
                  Upcoming
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-bold text-[#012970]/80 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#9cc542]" /> 1000+ Events Managed
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#9cc542]" /> GST Tax Compliant
            </div>
          </div>
        </div>

        {/* Right Login Card */}
        <div className="lg:w-5/12 w-full">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Sign In</h2>
              <p className="text-xs text-slate-500 mt-1">Access your exhibitor or administrator dashboard</p>
            </div>

            {/* Role Mode Selector */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handlePortalSwitch('CLIENT')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  portalMode === 'CLIENT'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> Exhibitor Client
              </button>
              <button
                type="button"
                onClick={() => handlePortalSwitch('ADMIN')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  portalMode === 'ADMIN'
                    ? 'bg-white text-purple-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Event Admin
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@company.com"
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                error={errors.password?.message}
                {...register('password')}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full font-bold shadow-sm bg-[#09539b] hover:bg-[#012970] border-[#09539b] text-white transition-all"
                isLoading={isSubmitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In to {portalMode === 'ADMIN' ? 'Admin Studio' : 'Exhibitor Portal'}
              </Button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="pt-4 border-t border-slate-100 text-center space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Demo Credentials
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    handlePortalSwitch('CLIENT');
                    onSubmit({ email: 'client@techcorp.com', password: 'client123' });
                  }}
                  className="p-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg font-semibold text-slate-700 text-left transition-colors"
                >
                  <span className="block text-blue-700 font-bold text-[11px]">Exhibitor Account</span>
                  <span className="text-[10px] text-slate-500 font-mono">client@techcorp.com</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handlePortalSwitch('ADMIN');
                    onSubmit({ email: 'admin@buoyantmedia.com', password: 'admin123' });
                  }}
                  className="p-2 bg-slate-50 hover:bg-purple-50 border border-slate-200 rounded-lg font-semibold text-slate-700 text-left transition-colors"
                >
                  <span className="block text-purple-700 font-bold text-[11px]">Admin Account</span>
                  <span className="text-[10px] text-slate-500 font-mono">admin@buoyantmedia.com</span>
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-slate-500 pt-2">
              Need to register a company?{' '}
              <Link to="/register" className="text-blue-700 font-bold hover:underline">
                Create Exhibitor Account
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Buoyant Media. No.57A Ramasamy Street, KK Pudur, Coimbatore, Tamil Nadu.
      </footer>
    </div>
  );
};
