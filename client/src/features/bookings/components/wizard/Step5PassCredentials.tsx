import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Booking, Company, Exhibition, Stall, User } from '../../../../types';
import { Button } from '../../../../components/ui/Button';
import {
  CheckCircle2,
  XCircle,
  Key,
  Mail,
  ShieldCheck,
  Building,
  RefreshCw,
  Download,
  Check,
  AtSign,
} from 'lucide-react';

interface Step5PassCredentialsProps {
  paymentStatus: 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  paymentErrorMessage: string;
  createdBooking: Booking | null;
  selectedCompany: Company | null;
  selectedStalls: Stall[];
  exhibition: Exhibition;
  user: User | null;
  generatedOTP: string;
  onRetryPayment: () => void;
}

export const Step5PassCredentials: React.FC<Step5PassCredentialsProps> = ({
  paymentStatus,
  paymentErrorMessage,
  createdBooking,
  selectedCompany,
  selectedStalls,
  exhibition,
  user,
  generatedOTP,
  onRetryPayment,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (paymentStatus === 'PROCESSING') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-md space-y-4">
        <div className="w-16 h-16 border-4 border-[#09539b] dark:border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-lg font-bold text-[#012970] dark:text-slate-100">Processing Razorpay Transaction...</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Communicating with bank server and locking your allocated booth(s).</p>
      </div>
    );
  }

  if (paymentStatus === 'FAILED') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-md space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <XCircle className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-rose-700 dark:text-rose-400">Payment Authorization Failed</h3>
        <p className="text-xs text-slate-600 dark:text-slate-300">{paymentErrorMessage || 'Transaction could not be completed.'}</p>
        <div className="pt-4 flex justify-center gap-3">
          <Button variant="primary" onClick={onRetryPayment} className="bg-[#09539b]" leftIcon={<RefreshCw className="w-4 h-4" />}>
            Retry Payment
          </Button>
          <Button variant="outline" onClick={() => navigate('/exhibitions')}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const handleCopyPassword = () => {
    if (generatedOTP) {
      navigator.clipboard.writeText(generatedOTP);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const userEmail = selectedCompany?.email || user?.email || 'your-email@company.com';
  const username = user?.username;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl max-w-xl mx-auto text-center space-y-6 animate-in zoom-in-95 duration-200">
      <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div className="space-y-1">
        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-[#9cc542] text-[#012970]">
          Payment Confirmed
        </span>
        <h2 className="text-2xl font-black text-[#012970] dark:text-slate-100 pt-1">Booth Reserved Successfully!</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Booking Reference: <b className="font-mono text-slate-800 dark:text-slate-200">{createdBooking?.bookingReference}</b>
        </p>
      </div>

      {/* Corporate Entity & Stall Allocation Card */}
      <div className="p-4 bg-[#f6f9ff] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-left space-y-2 text-xs">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-1.5">
          <span className="font-bold text-[#09539b] dark:text-blue-400 uppercase">Confirmed Stall(s):</span>
          <div className="flex gap-1">
            {selectedStalls.map((s) => (
              <span key={s.id} className="px-2 py-0.5 bg-[#09539b] text-white rounded font-mono font-bold text-[11px]">
                #{s.stallNumber}
              </span>
            ))}
          </div>
        </div>
        <p className="text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-500 dark:text-slate-400">Exhibitor:</span> {selectedCompany?.name}</p>
        <p className="text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-500 dark:text-slate-400">Event:</span> {exhibition.title}</p>
        <p className="text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-500 dark:text-slate-400">Venue:</span> {exhibition.venue}, {exhibition.city}</p>
      </div>

      {/* Auto-Generated Login Credentials / Temporary Password Card */}
      <div className="p-5 bg-indigo-50/80 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800/80 rounded-2xl text-left space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
          <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">Exhibitor Portal Login Credentials</h4>
        </div>
        <p className="text-xs text-indigo-800 dark:text-indigo-300">
          An account has been created for your corporate profile. You can log in using your Username or Email to access passes, badges, and tax invoices.
        </p>

        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-2 text-xs">
          {username && (
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <AtSign className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Portal Username:
              </span>
              <span className="font-mono font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                {username}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Login Email:
            </span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{userEmail}</span>
          </div>
          {generatedOTP && (
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <Key className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Temporary Password:
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                  {generatedOTP}
                </span>
                <button
                  onClick={handleCopyPassword}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold underline cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


      <div className="pt-2 flex flex-col sm:flex-row gap-3">
        <Button
          variant="primary"
          className="flex-1 bg-[#09539b] hover:bg-[#012970]"
          onClick={() => navigate('/my-bookings')}
        >
          View My Bookings Dashboard
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => navigate(`/exhibitions/${exhibition.slug}`)}
        >
          Back to Exhibition Catalog
        </Button>
      </div>
    </div>
  );
};
