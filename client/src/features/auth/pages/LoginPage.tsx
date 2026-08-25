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
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  Users,
  Award,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Valid corporate email address is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { setTokens, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loginRoleTab, setLoginRoleTab] = useState<'CLIENT' | 'ADMIN'>('CLIENT');

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

  const handleSelectRoleTab = (role: 'CLIENT' | 'ADMIN') => {
    setLoginRoleTab(role);
    if (role === 'ADMIN') {
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
      setErrorMsg(err.response?.data?.message || err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* LEFT PANEL: B2B BRANDING HERO */}
      <div className="lg:w-7/12 relative flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 border-r border-slate-800/80">
        {/* Background Mesh Gradient Blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Subtle Grid Pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

        {/* Top Header: Brand Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl tracking-wider">
              B
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                BUOYANT <span className="text-blue-400 font-extrabold">MEDIA</span>
              </span>
              <span className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Exhibitions & Trade Fairs
              </span>
            </div>
          </div>

          <a
            href="https://buoyantevents.com"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-blue-400 transition-colors bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-full backdrop-blur-sm"
          >
            buoyantevents.com <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Middle Hero Showcase */}
        <div className="relative z-10 my-12 lg:my-0 space-y-8 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>Next-Gen Interactive B2B Stall Booking Portal</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Expose Your Business Through <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300">Premier Trade Shows</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-normal">
              Select your optimal exhibition stall, reserve realtime hall locations, manage corporate tax billing, and scale your brand presence across India's largest trade fair venues.
            </p>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
            <div>
              <div className="flex items-center gap-1.5 text-blue-400 font-extrabold text-2xl font-mono">
                <Award className="w-5 h-5 text-blue-400" /> 1000+
              </div>
              <p className="text-xs text-slate-400 font-medium">Events Completed</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-cyan-400 font-extrabold text-2xl font-mono">
                <Calendar className="w-5 h-5 text-cyan-400" /> 40+
              </div>
              <p className="text-xs text-slate-400 font-medium">Major Trade Fairs</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-indigo-400 font-extrabold text-2xl font-mono">
                <Users className="w-5 h-5 text-indigo-400" /> 30,000+
              </div>
              <p className="text-xs text-slate-400 font-medium">Exhibitors & Visitors</p>
            </div>
          </div>

          {/* Flagship Expos Badges */}
          <div className="pt-2 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Featured Buoyant Expos</span>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300">
                🏥 Mediccon Expo 2026
              </span>
              <span className="px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300">
                🏢 Interio & Exterio Expo
              </span>
              <span className="px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300">
                🛍️ Kovai Bazaar Expo
              </span>
              <span className="px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300">
                💎 Jewel-Ex 2026
              </span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-6 border-t border-slate-900 text-xs text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} Buoyant Media Events Ltd. All rights reserved.</span>
          <span>CODISSIA Trade Fair Center Partner</span>
        </div>
      </div>

      {/* RIGHT PANEL: SAAS LOGIN CARD */}
      <div className="lg:w-5/12 flex items-center justify-center p-6 sm:p-12 bg-slate-950 relative">
        <div className="w-full max-w-md space-y-6">
          {/* Form Header */}
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Sign In to Platform</h2>
            <p className="text-xs text-slate-400">
              Select your role portal and authenticate to access your booking dashboard.
            </p>
          </div>

          {/* Role Portal Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => handleSelectRoleTab('CLIENT')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                loginRoleTab === 'CLIENT'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Exhibitor Client
            </button>
            <button
              type="button"
              onClick={() => handleSelectRoleTab('ADMIN')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                loginRoleTab === 'ADMIN'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Admin / Organizer
            </button>
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Corporate Email Address"
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
              className="w-full mt-2 shadow-lg shadow-blue-600/20 font-bold"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In as {loginRoleTab === 'ADMIN' ? 'Organizer Admin' : 'Exhibitor'}
            </Button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" /> One-Click Demo Access
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Seed Data Ready</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  handleSelectRoleTab('CLIENT');
                  onSubmit({ email: 'client@techcorp.com', password: 'client123' });
                }}
                className="p-2.5 bg-blue-950/50 hover:bg-blue-900/60 border border-blue-800/80 rounded-lg text-left transition-all group"
              >
                <span className="font-bold text-blue-300 block text-xs group-hover:text-white">Demo Exhibitor</span>
                <span className="text-[10px] text-slate-400 block font-mono">client@techcorp.com</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSelectRoleTab('ADMIN');
                  onSubmit({ email: 'admin@buoyantmedia.com', password: 'admin123' });
                }}
                className="p-2.5 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800/80 rounded-lg text-left transition-all group"
              >
                <span className="font-bold text-purple-300 block text-xs group-hover:text-white">Demo Organizer</span>
                <span className="text-[10px] text-slate-400 block font-mono">admin@buoyantmedia.com</span>
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-900">
            Need to register a new company?{' '}
            <Link to="/register" className="text-blue-400 font-extrabold hover:underline">
              Register Exhibitor Credentials
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
