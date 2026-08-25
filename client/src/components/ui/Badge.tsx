import React from 'react';
import { StallStatus, BookingStatus, PaymentStatus } from '../../types';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'sm' }) => {
  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  );
};

export const StallStatusBadge: React.FC<{ status: StallStatus }> = ({ status }) => {
  switch (status) {
    case 'AVAILABLE':
      return <Badge variant="success">Available</Badge>;
    case 'TEMPORARILY_HELD':
      return <Badge variant="warning">Temporarily Held</Badge>;
    case 'BOOKING_IN_PROGRESS':
    case 'PAYMENT_PENDING':
      return <Badge variant="info">Pending Payment</Badge>;
    case 'BOOKED_CONFIRMED':
      return <Badge variant="neutral">Booked</Badge>;
    case 'BLOCKED':
      return <Badge variant="danger">Blocked</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
};

export const BookingStatusBadge: React.FC<{ status: BookingStatus }> = ({ status }) => {
  switch (status) {
    case 'CONFIRMED':
      return <Badge variant="success">Confirmed</Badge>;
    case 'PENDING_PAYMENT':
    case 'INITIATED':
      return <Badge variant="warning">Pending Payment</Badge>;
    case 'EXPIRED':
    case 'CANCELLED':
      return <Badge variant="danger">{status}</Badge>;
    default:
      return <Badge variant="info">{status}</Badge>;
  }
};

export const PaymentStatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  switch (status) {
    case 'SUCCESS':
      return <Badge variant="success">Paid & Verified</Badge>;
    case 'PENDING':
      return <Badge variant="warning">Pending</Badge>;
    case 'FAILED':
    case 'CANCELLED':
      return <Badge variant="danger">Failed</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
};
