import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Globe, ShieldCheck, Award, ExternalLink } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="bg-[#012970] text-white pt-12 pb-6 border-t border-[#09539b]/30 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-white/10">
          {/* Column 1: Brand Info */}
          <div className="space-y-4">
            <div className="bg-white p-2 rounded-xl inline-block shadow-sm">
              <img src="/assets/logo.png" alt="BUOYANT Media" className="h-9 object-contain" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Buoyant Media & Trade Fairs Pvt Ltd is India's leading industrial exhibition organizer, delivering high-value trade shows across healthcare, engineering, interiors, and textiles.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#9cc542]">
              <ShieldCheck className="w-4 h-4" /> GST Tax Compliant & Verified Partner
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#9cc542]">Exhibition Discovery</h4>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              <li>
                <Link to="/exhibitions" className="hover:text-white transition-colors">Upcoming Trade Fairs</Link>
              </li>
              <li>
                <Link to="/exhibitions?category=Medical" className="hover:text-white transition-colors">Mediccon Expos</Link>
              </li>
              <li>
                <Link to="/exhibitions?category=Interiors" className="hover:text-white transition-colors">Interio & Exterio Fairs</Link>
              </li>
              <li>
                <a href="#why-exhibit" className="hover:text-white transition-colors">Why Exhibit with Us</a>
              </li>
              <li>
                <a href="#about-us" className="hover:text-white transition-colors">Organizer Background</a>
              </li>
            </ul>
          </div>

          {/* Column 3: Venues & Coverage */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#9cc542]">Key Exhibition Venues</h4>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#9cc542] shrink-0 mt-0.5" />
                <span>CODISSIA Trade Fair Complex, Coimbatore</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#9cc542] shrink-0 mt-0.5" />
                <span>Chennai Trade Centre, Nandambakkam</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#9cc542] shrink-0 mt-0.5" />
                <span>BIEC Exhibition Centre, Bengaluru</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Registered Corporate Office */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#9cc542]">Corporate Office</h4>
            <div className="space-y-2 text-xs text-slate-300 font-medium leading-relaxed">
              <p className="font-bold text-white">Buoyant Media & Trade Fairs Pvt Ltd</p>
              <p>No. 57A, Ramasamy Street, KK Pudur, Coimbatore – 641038, Tamil Nadu, India.</p>
              <div className="pt-2 space-y-1">
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#9cc542]" /> +91 (0422) 4910-880 / 881
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#9cc542]" /> info@buoyantevents.com
                </p>
                <a
                  href="https://buoyantevents.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-[#9cc542] hover:underline font-bold pt-1"
                >
                  <Globe className="w-3.5 h-3.5" /> www.buoyantevents.com <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Rights */}
        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} Buoyant Media & Trade Fairs. All rights reserved.</p>
          <div className="flex items-center gap-6 font-semibold">
            <span className="hover:text-slate-200 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-200 cursor-pointer">Terms of Participation</span>
            <span className="hover:text-slate-200 cursor-pointer">Exhibitor Guidelines</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
