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
            <div className="bg-white px-2.5 py-1 rounded-xl inline-flex items-center shadow-xs">
               <img src="/assets/logo.png" alt="BUOYANT Media" className="h-9 object-contain" />
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
                <span>No:57A, Ramasamy Street, KK Pudur,NSR Road, Saibaba Colony, Coimbatore - 641038 Tamilnadu, India</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-[#0E8074] shrink-0 mt-0.5" />
                <div className="flex flex-col space-y-1">
                  <a href="tel:04224332337" className="hover:text-white transition-colors">0422 4332337</a>
                  <a href="tel:+919500288222" className="hover:text-white transition-colors">+91 95002 88222</a>
                  <a href="tel:+919500288333" className="hover:text-white transition-colors">+91 95002 88333</a>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-[#0E8074] shrink-0 mt-0.5" />
                <div className="flex flex-col space-y-1">
                  <a href="mailto:info@buoyantevents.com" className="hover:text-white transition-colors">info@buoyantevents.com</a>
                  <a href="mailto:buoyantexhibition@gmail.com" className="hover:text-white transition-colors">buoyantexhibition@gmail.com</a>
                  <a href="mailto:buoyantevent@gmail.com" className="hover:text-white transition-colors">buoyantevent@gmail.com</a>
                </div>
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
            <a
              href="https://buoyantevents.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#2DD4BF] hover:text-teal-300 hover:underline transition-colors font-medium"
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>Official Event Platform</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
