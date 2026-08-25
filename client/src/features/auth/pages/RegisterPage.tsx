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
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 px-6 lg:px-12 py-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-700 text-white flex items-center justify-center font-extrabold text-xl shadow-xs">
            B
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1">
              BUOYANT <span className="text-blue-700 font-extrabold">MEDIA</span>
            </span>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Exhibition & Trade Fair Management
            </span>
          </div>
        </div>

        <a
          href="https://buoyantevents.com"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-slate-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors"
        >
          Official Website <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-10 lg:p-12 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left Information Section */}
        <div className="lg:w-1/2 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-blue-800 text-xs font-bold">
            <Building className="w-3.5 h-3.5 text-blue-700" />
            Exhibitor Registration
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Register for <span className="text-blue-700">Buoyant Expos</span>
          </h1>

          <p className="text-slate-600 text-sm leading-relaxed">
            Create your account to browse interactive exhibition maps, reserve stall spaces, manage corporate GST billing details, and download venue entry credentials.
          </p>

          <div className="space-y-3 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Interactive SVG Stall Map Selection (Mediccon & Interio Expos)</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Instant GST & Corporate Invoicing with Tax Calculations</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Direct Payment Integration & Downloadable Venue Pass Receipts</span>
            </div>
          </div>
        </div>

        {/* Right Register Card */}
        <div className="lg:w-5/12 w-full">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Create Account</h2>
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
                className="w-full font-bold shadow-xs bg-blue-700 hover:bg-blue-800"
                isLoading={isSubmitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Register Account
              </Button>
            </form>

            <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
              Already registered?{' '}
              <Link to="/login" className="text-blue-700 font-bold hover:underline">
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
