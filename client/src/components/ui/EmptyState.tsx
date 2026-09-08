import React from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  label?: string; // made dynamic instead of hardcoded "Exhibitions"
}

export const EmptyState = ({
  title,
  description,
  icon,
  action,
  label = "Exhibitions",
}: EmptyStateProps) => {
  return (
    <div className="w-full px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
      <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white px-5 py-10 text-center shadow-[0_20px_60px_-20px_rgba(18,27,61,0.18)] sm:px-10 sm:py-14 lg:px-16 lg:py-16">

        {/* Decorative background circles - clipped, sized down for mobile */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#1E3FA0]/5 sm:-right-20 sm:-top-20 sm:h-48 sm:w-48" />
        <div className="pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-[#0F9D8A]/5 sm:-bottom-24 sm:-left-20 sm:h-52 sm:w-52" />

        {/* Icon */}
        {icon && (
          <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1E3FA0]/10 text-[#1E3FA0] shadow-sm sm:mb-7 sm:h-20 sm:w-20">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm sm:h-14 sm:w-14">
              {icon}
            </div>
          </div>
        )}

        {/* Small label */}
        <div className="relative mb-3">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
            {label}
          </span>
        </div>

        {/* Title */}
        <h2 className="relative text-xl font-bold tracking-tight text-[#121B3D] sm:text-3xl lg:text-4xl leading-snug">
          {title}
        </h2>

        {/* Description */}
        <p className="relative mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:mt-4 sm:text-base sm:leading-7">
          {description}
        </p>

        {/* Action */}
        {action && (
          <div className="relative mt-6 flex justify-center sm:mt-8">
            {action}
          </div>
        )}

        {/* Bottom helper text */}
        <p className="relative mt-5 text-xs text-slate-400 sm:mt-6">
          New exhibitions will appear here when they are published.
        </p>
      </div>
    </div>
  );
};