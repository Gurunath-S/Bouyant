import React, { useState } from 'react';
import { FileText, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, Download, X } from 'lucide-react';

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  isAccepted?: boolean;
}

export const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  isAccepted = false,
}) => {
  const [openSection, setOpenSection] = useState<number | null>(null);

  if (!isOpen) return null;

  const toggleSection = (idx: number) => {
    setOpenSection(openSection === idx ? null : idx);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-6 bg-[#012970] text-white flex justify-between items-center shrink-0">
          <div>
            <span className="px-2.5 py-0.5 bg-[#9cc542] text-[#012970] font-black text-[10px] uppercase rounded">
              Official Exhibition Contract Clauses
            </span>
            <h3 className="text-xl font-black text-white mt-1">
              Rules & Regulations — MEDICCON EXPO 2026
            </h3>
            <p className="text-xs text-slate-200">
              CODISSIA TRADE CENTRE (HALL - A & HALL - B), COIMBATORE • BUOYANT MEDIA
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Terms Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed flex-1">
          <div className="p-3.5 bg-[#f6f9ff] border border-[#09539b]/30 rounded-xl flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-[#09539b] shrink-0" />
            <p className="text-slate-600 font-medium">
              Please read the official exhibition terms and conditions overleaf below. By checking the agreement box or completing stall reservation, the exhibitor undertakes full compliance with these clauses.
            </p>
          </div>

          {/* Section 01 */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection(1)}
              className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex justify-between items-center text-left font-bold text-[#012970]"
            >
              <span className="text-sm">01. PARTICIPATION & PAYMENT TERMS</span>
              {openSection === 1 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <div className={`p-4 space-y-2 bg-white ${openSection === 1 ? 'block' : 'hidden'}`}>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>To participate in the exhibition, the participant shall submit the application form completely filled with all the details along with relevant participation stall charges.</li>
                <li>The organizer reserves all rights to accept or refuse any application of any applicant to participate in the exhibition. The organizer shall further have rights to decide which items / products may or may not be displayed by any exhibitor. Organizer&apos;s decision shall be final and binding.</li>
                <li><b>Payment Terms:</b> All applicants are liable to pay a minimum of 50% participation charges at the time of submitting application. Full and final payment must be cleared at least 15 days before the event (on or before 25th October 2026).</li>
                <li><b>Constructed-up Indoor Space (Shell Scheme):</b> Includes modular stalls of international specifications with 1 display table, 2 chairs, 3 spot lights, 1 waste paper basket, fascia board with company name, and synthetic carpeting.</li>
                <li>Extra requirements (tables, shelves, additional power) must be requested in advance on actual cost basis.</li>
                <li>The organizer reserves the right to reallocate space or modify hall orientation if necessary.</li>
              </ul>
            </div>
          </div>

          {/* Section 02 */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection(2)}
              className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex justify-between items-center text-left font-bold text-[#012970]"
            >
              <span className="text-sm">02. CANCELLATION POLICY & REFUND SCALE</span>
              {openSection === 2 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            <div className={`p-4 space-y-2 bg-white ${openSection === 2 ? 'block' : 'hidden'}`}>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>The organizer reserves all rights to cancel the exhibition or any day thereof at any time without assigning any reason.</li>
                <li><b>Cancellation Charges Scale:</b></li>
                <li className="font-semibold text-slate-800">If cancelled on or before 25th October, 2026: 50% of participation charges shall be deducted and remaining 50% shall be refunded.</li>
                <li className="font-semibold text-rose-700">If cancelled after 25th October, 2026: The exhibitor shall NOT be entitled to any refund and the entire participation fee shall be forfeited.</li>
                <li>Notice of cancellation must be submitted in writing via official letter or email.</li>
              </ul>
            </div>
          </div>

          {/* Section 03 */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection(3)}
              className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex justify-between items-center text-left font-bold text-[#012970]"
            >
              <span className="text-sm">03. STALL CONSTRUCTION & DESIGNING</span>
              {openSection === 3 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            <div className={`p-4 space-y-2 bg-white ${openSection === 3 ? 'block' : 'hidden'}`}>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>Built-in stalls are of designated size and design including fascia board. No alterations to standard fascia lettering are permitted.</li>
                <li>Exhibitors assigning custom contractors must submit detailed stall design plans for organizer approval latest by October 25, 2026. Erection must be completed by 12 AM on 20th November 2026.</li>
                <li><b>No Drilling, Screws, or Glue:</b> No posters, wallpapers, paint, drills, nails, glue, or screws may be applied to standard aluminum frames, panels, floors, or pillars. Exhibitors are liable for any physical frame damage.</li>
                <li>Waste and trash resulting from erection or dismantling must be cleared immediately by exhibitor contractors.</li>
              </ul>
            </div>
          </div>

          {/* Section 04 */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection(4)}
              className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex justify-between items-center text-left font-bold text-[#012970]"
            >
              <span className="text-sm">04. STALL OPERATIONS & MEDICAL COMPLIANCE</span>
              {openSection === 4 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            <div className={`p-4 space-y-2 bg-white ${openSection === 4 ? 'block' : 'hidden'}`}>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>Stalls must be attended at all times during exhibition opening hours. Staff must arrive at least 30 minutes prior to opening.</li>
                <li>All business activity and canvassing must take place strictly inside the allocated stall space. No canvassing allowed in registration areas or hall gangways.</li>
                <li>Audio-visual sound levels must be adjusted so as not to annoy neighboring stalls.</li>
                <li><b>Medical Regulatory Approvals:</b> All medical devices and healthcare products exhibited must possess valid regulatory approvals (e.g. FDA, CE Mark) and credible scientific backing.</li>
                <li>Live medical demonstrations must be pre-approved by organizers and conducted solely by qualified licensed professionals.</li>
              </ul>
            </div>
          </div>

          {/* Section 05 */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection(5)}
              className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex justify-between items-center text-left font-bold text-[#012970]"
            >
              <span className="text-sm">05. INSURANCE, INDEMNITY & LIABILITY</span>
              {openSection === 5 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            <div className={`p-4 space-y-2 bg-white ${openSection === 5 ? 'block' : 'hidden'}`}>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>Exhibitors must maintain valid insurance coverage against theft, fire, public liability, personal injury, and natural calamities.</li>
                <li>All exhibitor property is brought and stored at the exhibitor&apos;s own risk.</li>
                <li>Exhibitor agrees to indemnify Buoyant Media against any claims or damages arising from their exhibition activities.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            {isAccepted && (
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <CheckCircle2 className="w-4 h-4" /> Accepted & Verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
            >
              Close
            </button>
            {onAccept && !isAccepted && (
              <button
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="px-5 py-2 bg-[#09539b] hover:bg-[#012970] text-white font-bold text-xs rounded-xl shadow-xs"
              >
                I Accept Terms & Conditions
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
