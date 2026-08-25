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
  User as UserIcon,
  Phone,
  ArrowRight,
  ShieldCheck,
  Building2,
  Award,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid corporate email address is required'),
  phone: z.string().min(8, 'Phone number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { setTokens, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setErrorMsg(null);
      const res = await authService.register(data);
      setTokens(res.tokens.accessToken, res.tokens.refreshToken);
      setUser(res.user);
      navigate('/my-company');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Registration failed.');
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

        {/* Top Header */}
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

        {/* Middle Content */}
        <div className="relative z-10 my-12 lg:my-0 space-y-8 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>Exhibitor Portal Account Onboarding</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300">India's Premier</span> Exhibition Network
            </h1>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-normal">
              Create your corporate profile to unlock instant interactive floor plan stall reservations, official tax invoicing, and direct event manager coordination.
            </p>
          </div>

          {/* Benefits List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Real-time Interactive 2D/3D SVG Hall Layout Selection</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Automated GST & PAN Compliant Corporate Billing</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Instant Digital Receipts & Pass Downloads for Venue Entry</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-6 border-t border-slate-900 text-xs text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} Buoyant Media Events Ltd. All rights reserved.</span>
          <span>CODISSIA Trade Fair Center Partner</span>
        </div>
      </div>

      {/* RIGHT PANEL: SAAS REGISTER CARD */}
      <div className="lg:w-5/12 flex items-center justify-center p-6 sm:p-12 bg-slate-950 relative">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Create Exhibitor Account</h2>
            <p className="text-xs text-slate-400">
              Enter your official corporate representative details to set up your account.
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="e.g. Rajesh Kumar"
              leftIcon={<UserIcon className="w-4 h-4 text-slate-400" />}
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Corporate Email Address"
              type="email"
              placeholder="rajesh@company.com"
              leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Phone / Mobile Number"
              placeholder="+91 98200 12345"
              leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Minimum 8 characters"
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
              Register & Setup Corporate Profile
            </Button>
          </form>

          <div className="text-center text-xs text-slate-400 pt-4 border-t border-slate-900">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 font-extrabold hover:underline">
              Sign In to Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
