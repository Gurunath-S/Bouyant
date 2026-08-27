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
  User as UserIcon,
  Phone,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Building,
} from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid corporate email address'),
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
            <Building className="w-3.5 h-3.5 text-[#09539b]" />
            Exhibitor Registration
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#012970] dark:text-white tracking-tight leading-tight">
            Register for <span className="text-[#09539b]">Buoyant Expos</span>
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
            Create your account to browse interactive exhibition maps, reserve stall spaces, manage corporate GST billing details, and download venue entry credentials.
          </p>

          <div className="space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3 text-xs font-bold text-[#012970] dark:text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-[#9cc542] shrink-0" />
              <span>Interactive SVG Stall Map Selection (Mediccon & Interio Expos)</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-[#012970] dark:text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-[#9cc542] shrink-0" />
              <span>Instant GST & Corporate Invoicing with Tax Calculations</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-[#012970] dark:text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-[#9cc542] shrink-0" />
              <span>Direct Payment Integration & Downloadable Venue Pass Receipts</span>
            </div>
          </div>
        </div>

        {/* Right Register Card */}
        <div className="lg:w-5/12 w-full">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-lg space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#012970] dark:text-white">Create Account</h2>
              <p className="text-xs text-slate-500 mt-1">Enter representative details to get started</p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
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
                label="Mobile Number"
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
                className="w-full font-bold shadow-sm bg-[#09539b] hover:bg-[#012970] border-[#09539b] text-white transition-all"
                isLoading={isSubmitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Register Account
              </Button>
            </form>

            <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
              Already registered?{' '}
              <Link to="/login" className="text-[#09539b] font-bold hover:underline">
                Sign In to Portal
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
