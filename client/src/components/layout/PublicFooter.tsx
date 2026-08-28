import React from 'react';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="bg-[#121B3D] text-slate-300 border-t border-[#1E3FA0]/40 py-6 px-6 text-center text-xs font-medium">
      © {new Date().getFullYear()} Buoyant Media. No.57A Ramasamy Street, KK Pudur, Coimbatore, Tamil Nadu.
    </footer>
  );
};
