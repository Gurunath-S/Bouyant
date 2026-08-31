import React from 'react';
import { Company, Exhibition, Stall } from '../../../types';
import { Building2, Calendar, MapPin, Printer, ShieldCheck, CreditCard } from 'lucide-react';

interface OfficialContractFormProps {
  company: Company;
  exhibition: Exhibition;
  stall: Stall;
  paymentType: 'FULL' | 'PARTIAL';
  effectivePartialPercent: number;
  payableToday: number;
  remainingBalance: number;
  formattedDeadline: string;
  onPrint?: () => void;
}

export const OfficialContractForm: React.FC<OfficialContractFormProps> = ({
  company,
  exhibition,
  stall,
  paymentType,
  effectivePartialPercent,
  payableToday,
  remainingBalance,
  formattedDeadline,
  onPrint,
}) => {
  const isHallA = stall.stallNumber.startsWith('A');
  const hallName = isHallA ? 'HALL - A (PAVILION A)' : 'HALL - B (PAVILION B)';
  const ratePerSqm = stall.category === 'CORNER' || stall.category === 'ISLAND' ? 7000 : 6500;
  const baseRental = Number(stall.price) || 100000;
  const taxAmount = Math.round(baseRental * 0.18);
  const grandTotal = baseRental + taxAmount;

  return (
    <div className="bg-white border-2 border-[#012970] rounded-2xl p-6 sm:p-8 space-y-6 shadow-md text-slate-800 font-sans print:border-none print:shadow-none">
      {/* Header Banner */}
      <div className="border-b-2 border-[#012970] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-black tracking-widest text-[#09539b] uppercase bg-[#f6f9ff] px-2.5 py-1 rounded border border-[#09539b]/20">
            OFFICIAL EXHIBITION STALL REGISTRATION FORM
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#012970] mt-1 uppercase tracking-tight">
            {exhibition.title || 'MEDICCON EXPO 2026'}
          </h2>
          <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-[#09539b]" /> 20, 21 & 22 November 2026 (Friday, Saturday & Sunday • 10:30am - 6:00pm)
          </p>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-[#09539b]" /> CODISSIA TRADE FAIR CENTRE, (HALL - A & HALL – B), COIMBATORE, TAMILNADU
          </p>
        </div>

        <div className="text-right sm:text-right flex flex-col items-start sm:items-end gap-1 shrink-0">
          <div className="text-xs font-mono font-bold text-slate-500">
            REG NO: <span className="text-[#012970] font-black">01/26/ME</span>
          </div>
          <div className="text-xs font-mono font-bold text-slate-500">
            SP CODE: <span className="text-[#09539b] font-black">BM-CB-2026</span>
          </div>
          <span className="px-3 py-1 bg-[#9cc542]/20 text-[#012970] font-black text-[10px] uppercase rounded-md border border-[#9cc542]/50">
            ORGANIZER: BUOYANT MEDIA
          </span>
        </div>
      </div>

      {/* Contract Declaration */}
      <div className="p-3 bg-[#f6f9ff] border border-slate-200 rounded-xl text-xs font-medium leading-relaxed text-slate-700">
        We wish to participate in <b>{exhibition.title || 'MEDICCON EXPO 2026'}</b> at CODISSIA TRADE CENTRE Hall-A & Hall-B, COIMBATORE as an Exhibitor. We acknowledge explicitly that we have read and accepted in full the Rules and Regulations of the Exhibition printed overleaf and by submitting this application, we undertake to comply with the same.
      </div>

      {/* Exhibitor Corporate Profile Grid */}
      <div className="space-y-2">
        <h4 className="text-xs font-black text-[#012970] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-[#09539b]" /> Exhibitor Corporate Particulars
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-400 text-[10px] uppercase block font-bold">Company Name</span>
            <span className="font-extrabold text-[#012970]">{company.name}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase block font-bold">Contact Person</span>
            <span className="font-bold text-slate-800">{company.contactPerson} ({company.designation || 'Exhibitor'})</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase block font-bold">Mobile & Email</span>
            <span className="font-semibold text-slate-800">{company.mobile} • {company.email}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase block font-bold">Corporate Address</span>
            <span className="font-medium text-slate-700">{company.address}, {company.city}, {company.state}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase block font-bold">GSTIN & PAN</span>
            <span className="font-mono font-bold text-slate-800">{company.gstNumber || 'N/A'} • {company.panNumber || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase block font-bold">Product / Industry</span>
            <span className="font-semibold text-slate-800">{company.category} ({company.industry})</span>
          </div>
        </div>
      </div>

      {/* Reserved Stall Particulars Table */}
      <div className="space-y-2">
        <h4 className="text-xs font-black text-[#012970] uppercase tracking-wider border-b border-slate-200 pb-1">
          Reserved Stall & Financial Statement
        </h4>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#012970] text-white font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Stall No</th>
                <th className="p-3">Location / Hall</th>
                <th className="p-3">Scheme Type</th>
                <th className="p-3">Area (Sq.Mtr)</th>
                <th className="p-3">Rate / Sq.Mtr</th>
                <th className="p-3">Base Amount</th>
                <th className="p-3">18% GST</th>
                <th className="p-3 text-right">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              <tr className="bg-white hover:bg-slate-50">
                <td className="p-3 font-mono font-black text-[#09539b]">Stall {stall.stallNumber}</td>
                <td className="p-3 font-bold text-slate-700">{hallName}</td>
                <td className="p-3 font-semibold text-emerald-700">Shell Scheme (Modular)</td>
                <td className="p-3 font-mono font-bold">{stall.areaSqFt ? Math.round(stall.areaSqFt / 10.764) : 9} Sqm</td>
                <td className="p-3 font-mono">₹{ratePerSqm.toLocaleString()} / Sqm</td>
                <td className="p-3 font-mono">₹{baseRental.toLocaleString()}</td>
                <td className="p-3 font-mono">₹{taxAmount.toLocaleString()}</td>
                <td className="p-3 font-mono font-black text-[#012970] text-right">₹{grandTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Structure & Bank Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Terms Breakdown */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
          <h4 className="font-extrabold text-[#09539b] uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-[#09539b]" /> Payment Plan Structure
          </h4>
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-500 font-semibold">Selected Payment Mode:</span>
            <span className="font-bold text-[#012970]">
              {paymentType === 'PARTIAL' ? `Partial Advance (${effectivePartialPercent}%)` : 'Full Payment (100%)'}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-1 font-bold">
            <span className="text-slate-600">Initial Advance Payable Today:</span>
            <span className="font-mono text-emerald-700 text-sm">₹{payableToday.toLocaleString()} INR</span>
          </div>
          {paymentType === 'PARTIAL' && (
            <div className="flex justify-between text-amber-900 font-bold bg-amber-100/70 p-2 rounded-lg">
              <span>Remaining Balance Due:</span>
              <span className="font-mono">₹{remainingBalance.toLocaleString()} INR (By {formattedDeadline})</span>
            </div>
          )}
          <p className="text-[10px] text-slate-500 italic">
            * Note: Full and final payment must be cleared at least 15 days before the event (Oct 25, 2026 cutoff).
          </p>
        </div>

        {/* Organizer Federal Bank Credentials */}
        <div className="p-4 bg-[#012970] text-white rounded-xl space-y-2 text-xs shadow-sm">
          <h4 className="font-extrabold text-[#9cc542] uppercase tracking-wider text-[11px] border-b border-white/20 pb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#9cc542]" /> Official Organizer Online Bank Credentials
          </h4>
          <div className="space-y-1 font-mono text-[11px] text-slate-200">
            <p><span className="text-slate-400 font-sans">BENEFICIARY NAME:</span> <b className="text-white font-sans">BUOYANT MEDIA</b></p>
            <p><span className="text-slate-400 font-sans">BANK NAME:</span> <b className="text-white font-sans">THE FEDERAL BANK LTD</b></p>
            <p><span className="text-slate-400 font-sans">BRANCH:</span> SAIBABA COLONY, COIMBATORE - 641011</p>
            <p><span className="text-slate-400 font-sans">ACCOUNT NO:</span> <b className="text-[#9cc542] text-sm">18020200001046</b></p>
            <p><span className="text-slate-400 font-sans">IFSC CODE:</span> <b className="text-[#9cc542] text-sm">FDRL0001802</b></p>
          </div>
        </div>
      </div>

      {/* Organiser & Exhibitor Signature Seals */}
      <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-6 text-xs">
        <div className="space-y-8">
          <div className="border-b border-slate-300 pb-1">
            <span className="font-bold text-[#012970] uppercase tracking-wider text-[10px] block">For and on Behalf of</span>
            <span className="font-black text-slate-900 text-sm">BUOYANT MEDIA</span>
          </div>
          <div className="pt-2 text-[10px] text-slate-500 space-y-0.5">
            <p className="font-bold">Signature of the Organizer</p>
            <p>No:57A, II Floor, Ramasamy Street, KK Pudur, NSR Road, Saibaba Colony, Coimbatore – 641011</p>
            <p>Ph: 0422-4332337 / Mob: +91 95002 88222 • www.buoyantevents.com</p>
          </div>
        </div>

        <div className="space-y-8 text-right">
          <div className="border-b border-slate-300 pb-1">
            <span className="font-bold text-[#012970] uppercase tracking-wider text-[10px] block">For and on Behalf of</span>
            <span className="font-black text-slate-900 text-sm">{company.name}</span>
          </div>
          <div className="pt-2 text-[10px] text-slate-500 space-y-0.5">
            <p className="font-bold">Seal & Signature of the Exhibitor</p>
            <p>Authorized Signatory: {company.contactPerson}</p>
            <p>Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Print Action */}
      {onPrint && (
        <div className="pt-2 flex justify-end print:hidden">
          <button
            onClick={onPrint}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#012970] font-bold text-xs rounded-xl flex items-center gap-2 border border-slate-300 transition-colors"
          >
            <Printer className="w-4 h-4 text-[#09539b]" /> Print Official Contract Form
          </button>
        </div>
      )}
    </div>
  );
};
