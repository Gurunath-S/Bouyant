import React from 'react';
import { StallStatus, BookingStatus, PaymentStatus, BookingPaymentStatus, InvoiceStatus } from '../../types';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'sm', className = '' }) => {
  const variantStyles = {
    success: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    danger: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    info: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    purple: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap font-semibold rounded-md border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export const StallStatusBadge: React.FC<{ status: StallStatus; userView?: boolean; className?: string }> = ({ status, userView = true, className = '' }) => {
  switch (status) {
    case 'AVAILABLE':
      return <Badge variant="success" className={className}>Available</Badge>;
    case 'TEMPORARILY_HELD':
    case 'BOOKING_IN_PROGRESS':
    case 'PAYMENT_PENDING':
      return userView ? <Badge variant="danger" className={className}>Booked</Badge> : <Badge variant="neutral" className={className}>Blocked (In Progress)</Badge>;
    case 'BOOKED_CONFIRMED':
      return userView ? <Badge variant="danger" className={className}>Booked</Badge> : <Badge variant="neutral" className={className}>Booked</Badge>;
    case 'BLOCKED':
      return userView ? <Badge variant="danger" className={className}>Booked</Badge> : <Badge variant="danger" className={className}>Blocked</Badge>;
    default:
      return <Badge variant="neutral" className={className}>{status}</Badge>;
  }
};

export const BookingStatusBadge: React.FC<{ status: BookingStatus | string; className?: string }> = ({ status, className = '' }) => {
  switch (status) {
    case 'CONFIRMED':
      return <Badge variant="success" className={className}>Confirmed</Badge>;
    case 'PENDING_PAYMENT':
    case 'INITIATED':
      return <Badge variant="warning" className={className}>Pending Payment</Badge>;
    case 'CANCELLED':
      return <Badge variant="danger" className={className}>Cancelled</Badge>;
    case 'EXPIRED':
      return <Badge variant="danger" className={className}>Expired</Badge>;
    default:
      return <Badge variant="neutral" className={className}>{status}</Badge>;
  }
};

export const PaymentStatusBadge: React.FC<{ status: PaymentStatus | BookingPaymentStatus | string; className?: string }> = ({ status, className = '' }) => {
  switch (status) {
    case 'SUCCESS':
      return <Badge variant="success" className={className}>Success</Badge>;
    case 'PAID':
    case 'PAID_FULL':
      return <Badge variant="success" className={className}>Fully Paid</Badge>;
    case 'PARTIALLY_PAID':
    case 'PARTIAL':
      return <Badge variant="info" className={className}>Partially Paid</Badge>;
    case 'PENDING':
      return <Badge variant="warning" className={className}>Payment Pending</Badge>;
    case 'UNPAID':
      return <Badge variant="warning" className={className}>Unpaid</Badge>;
    case 'FAILED':
      return <Badge variant="danger" className={className}>Failed</Badge>;
    case 'CANCELLED':
      return <Badge variant="danger" className={className}>Cancelled</Badge>;
    default:
      return <Badge variant="neutral" className={className}>{status}</Badge>;
  }
};

export const InvoiceStatusBadge: React.FC<{ status: InvoiceStatus | string; className?: string }> = ({ status, className = '' }) => {
  switch (status) {
    case 'PAID':
    case 'ISSUED':
      return <Badge variant="success" className={className}>Paid</Badge>;
    case 'VOID':
    case 'CANCELLED':
      return <Badge variant="danger" className={className}>Void</Badge>;
    default:
      return <Badge variant="neutral" className={className}>{status}</Badge>;
  }
};
