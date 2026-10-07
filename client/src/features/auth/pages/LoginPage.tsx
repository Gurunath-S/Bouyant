import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../../services/auth/authService';
import { exhibitionService } from '../../../services/exhibitions/exhibitionService';
import { useAuthStore } from '../../../stores/authStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { PublicFooter } from '../../../components/layout/PublicFooter';
import { PublicNavbar } from '../../../components/layout/PublicNavbar';
import { Exhibition } from '../../../types';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email address or Staff SP Code is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { setTokens, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Dynamic Exhibitions Carousel State
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [currentExpoIdx, setCurrentExpoIdx] = useState(0);
  const [loadingExhibitions, setLoadingExhibitions] = useState(true);

  useEffect(() => {
    const fetchPublishedEvents = async () => {
      try {
        setLoadingExhibitions(true);
        const data = await exhibitionService.getExhibitions('PUBLISHED');
        if (data && data.length > 0) {
          setExhibitions(data);
        }
      } catch (err) {
        console.warn('Failed to load published exhibitions for login showcase:', err);
      } finally {
        setLoadingExhibitions(false);
      }
    };
    fetchPublishedEvents();
  }, []);

  // Auto-slide carousel every 6 seconds if multiple exhibitions exist
  useEffect(() => {
    if (exhibitions.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentExpoIdx((prev) => (prev + 1) % exhibitions.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [exhibitions.length]);

  const activeExpo = exhibitions[currentExpoIdx];

  const formatDateRange = (start?: string, end?: string) => {
    if (!start) return 'Upcoming Event';
    const s = new Date(start);
    const sStr = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!end) return `${sStr}, ${s.getFullYear()}`;
    const e = new Date(end);
    const eStr = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${sStr} – ${eStr}`;
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setErrorMsg(null);
      const res = await authService.login(data);
      setTokens(res.tokens.accessToken, res.tokens.refreshToken);
      setUser(res.user);
      if (res.user.role === 'SUPERADMIN') {
        navigate('/super-admin/dashboard');
      } else if (res.user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (res.user.role === 'STAFF') {
        navigate('/staff/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F4F8FD] dark:bg-slate-950 text-[#121B3D] dark:text-slate-100 font-sans flex flex-col justify-between relative overflow-hidden">
      {/* Full-bleed Architectural Dot Matrix Pattern */}
      <div
        className="fixed inset-0 opacity-[0.40] dark:opacity-[0.18] pointer-events-none z-0"
        style={{
          backgroundImage: 'radial-gradient(#1E3FA0 1.4px, transparent 1.4px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-blue-500/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed -bottom-40 -right-40 w-[600px] h-[600px] bg-[#0E8074]/15 rounded-full blur-[160px] pointer-events-none z-0" />

      {/* Shared Unified Navbar */}
      <PublicNavbar />

      {/* Main Content Body: Single Unified Dual-Panel Card matching EventEase UI */}
      <main className="relative z-10 flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex items-center justify-center">
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[32px] p-3 sm:p-4 shadow-2xl flex flex-col lg:flex-row items-stretch overflow-hidden gap-4 lg:gap-6 min-h-[580px] lg:min-h-[640px]">
          
          {/* Left Side: Dynamic Showcase Image Panel with Curved Edge */}
          <div className="w-full lg:w-7/12 relative rounded-[26px] overflow-hidden bg-slate-950 flex flex-col justify-between group min-h-[400px] sm:min-h-[480px] lg:min-h-full">
            {/* Background Image & Gradient */}
            <div className="absolute inset-0 z-0">
              <img
                key={activeExpo?.id || 'default-bg'}
                src={
                  activeExpo?.bannerUrl ||
                  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1400&auto=format&fit=crop'
                }
                alt={activeExpo?.title || 'Exhibition Showcase'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out animate-in fade-in duration-700"
              />
              {/* Multi-layer Vibe Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#09152B] via-[#09152B]/60 to-black/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#09152B]/85 via-[#09152B]/40 to-transparent" />
            </div>

            {/* Top Bar inside Left Card */}
            <div className="relative z-10 p-6 sm:p-8 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/15 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                  Featured Trade Shows
                </span>
              </div>

              {exhibitions.length > 1 && (
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-mono text-white">
                  <span className="font-black text-emerald-400">{currentExpoIdx + 1}</span>
                  <span className="text-white/40">/</span>
                  <span>{exhibitions.length}</span>
                </div>
              )}
            </div>

            {/* Bottom Content Area inside Left Card */}
            <div className="relative z-10 p-6 sm:p-10 space-y-5 text-white">
              {loadingExhibitions ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-32 bg-white/20 rounded-full" />
                  <div className="h-9 w-3/4 bg-white/20 rounded-xl" />
                  <div className="h-4 w-1/2 bg-white/20 rounded-lg" />
                </div>
              ) : activeExpo ? (
                <div key={activeExpo.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 backdrop-blur-md text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Stall Booking Open • {activeExpo.edition || '2026 Edition'}
                  </div>

                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-md">
                    {activeExpo.title}
                  </h2>

                  <p className="text-sm text-slate-300 line-clamp-2 max-w-2xl font-medium leading-relaxed">
                    {activeExpo.description || 'Join top industry leaders, register your brand booth, and unlock new partnership opportunities.'}
                  </p>

                  <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-100 pt-1">
                    <span className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15 shadow-xs">
                      <Calendar className="w-4 h-4 text-[#2DD4BF]" />
                      {formatDateRange(activeExpo.startDate, activeExpo.endDate)}
                    </span>

                    {activeExpo.venue && (
                      <span className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15 shadow-xs">
                        <MapPin className="w-4 h-4 text-[#2DD4BF]" />
                        {activeExpo.venue}{activeExpo.city ? `, ${activeExpo.city}` : ''}
                      </span>
                    )}

                    {activeExpo.slug && (
                      <button
                        type="button"
                        onClick={() => navigate(`/exhibitions/${activeExpo.slug}`)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#09539b] hover:bg-[#0b64b8] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md group/btn"
                      >
                        <span>Explore Layout</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 backdrop-blur-md text-blue-300 border border-blue-400/30 rounded-full text-xs font-bold">
                    Official Stall Booking Portal
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white">
                    Buoyant Media Exhibitions Platform
                  </h2>
                  <p className="text-sm text-slate-300">
                    Seamlessly select floor plan stalls, process instant reservations, and manage exhibitor passes online.
                  </p>
                </div>
              )}

              {/* Carousel Indicators & Nav Buttons */}
              {exhibitions.length > 1 && (
                <div className="pt-4 flex items-center justify-between border-t border-white/15">
                  <div className="flex items-center gap-2">
                    {exhibitions.map((expo, idx) => (
                      <button
                        key={expo.id}
                        type="button"
                        onClick={() => setCurrentExpoIdx(idx)}
                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                          idx === currentExpoIdx ? 'w-8 bg-emerald-400' : 'w-2 bg-white/30 hover:bg-white/60'
                        }`}
                        title={expo.title}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentExpoIdx((prev) => (prev - 1 + exhibitions.length) % exhibitions.length)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors cursor-pointer border border-white/15"
                      title="Previous Exhibition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentExpoIdx((prev) => (prev + 1) % exhibitions.length)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors cursor-pointer border border-white/15"
                      title="Next Exhibition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: High Taste Clean Form Panel */}
          <div className="w-full lg:w-5/12 flex flex-col justify-center p-6 sm:p-10 space-y-6">
            <div className="text-center space-y-2">
              {/* Brand Accent Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1E3FA0]/10 dark:bg-blue-500/10 text-[#1E3FA0] dark:text-blue-400 rounded-full text-xs font-bold">
                Exhibitor & Staff Portal
              </div>
              <h2 className="text-3xl font-black text-[#1E3FA0] dark:text-blue-400 tracking-tight">Welcome Back</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Enter your account credentials to continue
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold animate-in fade-in duration-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Input
                  label="Email, Username or Staff SP Code"
                  type="text"
                  placeholder="name@company.com, username, or B001"
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
                      className="text-slate-400 hover:text-[#1E3FA0] dark:hover:text-blue-400 focus:outline-none p-1 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  error={errors.password?.message}
                  {...register('password')}
                />
              </div>

              {/* Sleek Remember Me Checkbox */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="inline-flex items-center gap-2.5 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-[#1E3FA0] focus:ring-[#1E3FA0] focus:ring-2 focus:ring-offset-1 accent-[#1E3FA0] cursor-pointer transition-all group-hover:border-[#1E3FA0]"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs group-hover:text-[#1E3FA0] dark:group-hover:text-blue-400 transition-colors">
                    Remember me
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-extrabold shadow-lg bg-gradient-to-r from-[#1E3FA0] to-[#152B75] hover:from-[#152B75] hover:to-[#0F294D] text-white transition-all rounded-2xl py-3.5 text-sm flex items-center justify-center gap-2 group cursor-pointer"
                  isLoading={isSubmitting}
                  rightIcon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                >
                  Sign In
                </Button>
              </div>
            </form>

            {/* Security Guarantee Badge */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">
              <ShieldCheck className="w-4 h-4 text-[#0E8074] dark:text-teal-400 shrink-0" />
              <span>256-Bit SSL Encrypted & Tax Compliant Portal</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer — Identical to Homepage */}
      <PublicFooter />
    </div>
  );
};

