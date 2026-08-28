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
  Calendar,
  MapPin,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
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
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'client@techcorp.com',
      password: 'client123',
    },
  });

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
    <div className="min-h-screen w-full bg-gradient-to-br from-[#F4F8FD] via-[#EEF4FC] to-white text-[#121B3D] font-sans flex flex-col justify-between relative overflow-hidden">
      {/* Subtle Architectural Dot Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.25] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#1E3FA0 1.2px, transparent 1.2px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Top Header Bar — Original Clean White Header */}
      <header className="relative z-10 w-full bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="BUOYANT Media" className="h-9 sm:h-10 object-contain" />
          </Link>

          <Link
            to="/"
            className="text-xs font-bold text-[#1E3FA0] hover:text-[#152B75] flex items-center gap-2 transition-all bg-[#EEF4FC] px-4 py-2 rounded-xl border border-[#1E3FA0]/15 hover:shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="relative z-10 flex-1 max-w-[1600px] w-full mx-auto px-6 lg:px-12 py-6 sm:py-10 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-14">
        {/* Left Side: Featured Exhibition Showcase Card */}
        <div className="w-full lg:w-1/2 max-w-xl lg:max-w-none">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-white/80 bg-slate-900 group">
            {/* Background Event Photo */}
            <div className="h-[420px] sm:h-[480px] lg:h-[500px] relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop"
                alt="BuildinTec Expo 2026"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              
              {/* Gradient Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/40 to-transparent" />

              {/* Floating Top Category Badge */}
              <div className="absolute top-5 left-5 z-10">
                <span className="px-3.5 py-1.5 bg-[#0E8074] text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-lg backdrop-blur-md">
                  Flagship Exhibition
                </span>
              </div>

              {/* Event Details Footer Overlay */}
              <div className="absolute bottom-6 left-6 right-6 z-10 text-white space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 backdrop-blur-md text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Stall Reservations Open
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  BuildinTec & Engineering Expo 2026
                </h2>

                <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-200 pt-1">
                  <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                    <Calendar className="w-3.5 h-3.5 text-[#2DD4BF]" /> Feb 12 – 15, 2026
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                    <MapPin className="w-3.5 h-3.5 text-[#2DD4BF]" /> CODISSIA Complex, Coimbatore
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Sleek Glassmorphic Sign In Card */}
        <div className="w-full lg:w-5/12 max-w-md">
          <div className="bg-white/90 backdrop-blur-xl border border-white rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="text-center">
              <h2 className="text-3xl font-black text-[#1B37A0] tracking-tight">Sign In</h2>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">
                Enter your credentials to access your account
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold animate-in fade-in duration-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="name@company.com"
                  leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              <div>
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-[#1E3FA0] focus:outline-none p-1 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  error={errors.password?.message}
                  {...register('password')}
                />
              </div>

              {/* Sleek & Professional Remember Me Checkbox */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="inline-flex items-center gap-2.5 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-[#1E3FA0] focus:ring-[#1E3FA0] focus:ring-2 focus:ring-offset-1 accent-[#1E3FA0] cursor-pointer transition-all group-hover:border-[#1E3FA0]"
                  />
                  <span className="font-semibold text-slate-700 text-xs group-hover:text-[#1E3FA0] transition-colors">
                    Remember me
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-extrabold shadow-lg bg-gradient-to-r from-[#1E3FA0] to-[#152B75] hover:from-[#152B75] hover:to-[#0F294D] text-white transition-all rounded-2xl py-3.5 text-sm flex items-center justify-center gap-2 group"
                  isLoading={isSubmitting}
                  rightIcon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                >
                  Sign In
                </Button>
              </div>
            </form>

            {/* Security Guarantee Badge */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] font-bold text-slate-400">
              <ShieldCheck className="w-4 h-4 text-[#0E8074]" />
              <span>256-Bit SSL Encrypted & Tax Compliant Portal</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer — Corporate Blue */}
      <footer className="relative z-10 w-full bg-[#121B3D] text-slate-300 border-t border-[#1E3FA0]/40 px-6 py-4 text-center text-xs font-medium">
        © {new Date().getFullYear()} Buoyant Media. All rights reserved.
      </footer>
    </div>
  );
};
