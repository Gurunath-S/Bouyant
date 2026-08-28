import React from 'react';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="bg-[#121B3D] text-slate-300 border-t border-[#1E3FA0]/40 pt-10 pb-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Upper Footer Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-800">
          {/* Brand Col */}
          <div className="md:col-span-7 space-y-4">
            <div className="flex items-center gap-3">
              <img src="/assets/logo.png" alt="BUOYANT Media" className="h-9 object-contain brightness-0 invert" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-lg font-normal">
              Buoyant Media is South India’s premier B2B trade fair organizer, hosting flagship industrial, construction, and healthcare exhibitions across Coimbatore, Chennai, and Bengaluru.
            </p>
          </div>

          {/* Corporate Office */}
          <div className="md:col-span-5 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">Head Office</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#0E8074] shrink-0 mt-0.5" />
                <span>No.57A Ramasamy Street, KK Pudur, Coimbatore - 641038, Tamil Nadu</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#0E8074] shrink-0" />
                <span>+91 422 244 8899 / +91 98422 12345</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#0E8074] shrink-0" />
                <span>info@buoyantevents.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © {new Date().getFullYear()} Buoyant Media. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-xs">
            <span className="flex items-center gap-1.5 text-[#2DD4BF]">
              <Globe className="w-3.5 h-3.5" /> Official Event Platform
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
