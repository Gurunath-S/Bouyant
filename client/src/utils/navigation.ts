import { UserRole } from '../types';

export const getDashboardUrl = (role?: UserRole | string): string => {
  switch (role) {
    case 'SUPERADMIN':
      return '/super-admin/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    case 'STAFF':
      return '/staff/dashboard';
    case 'CLIENT':
    default:
      return '/dashboard';
  }
};

export const getEventsConsoleUrl = (role?: UserRole | string): string => {
  switch (role) {
    case 'SUPERADMIN':
    case 'ADMIN':
      return '/workspace/events';
    case 'STAFF':
      return '/staff/events';
    case 'CLIENT':
    default:
      return '/exhibitions';
  }
};

export const getInvoicesUrl = (role?: UserRole | string): string => {
  switch (role) {
    case 'SUPERADMIN':
    case 'ADMIN':
    case 'STAFF':
      return '/workspace/payments?tab=INVOICES';
    case 'CLIENT':
    default:
      return '/invoices';
  }
};

export const getBookingsUrl = (role?: UserRole | string): string => {
  switch (role) {
    case 'SUPERADMIN':
    case 'ADMIN':
    case 'STAFF':
      return '/workspace/bookings';
    case 'CLIENT':
    default:
      return '/my-bookings';
  }
};

export const getRoleDisplayName = (role?: UserRole | string): string => {
  switch (role) {
    case 'SUPERADMIN':
      return 'Super Administrator';
    case 'ADMIN':
      return 'Platform Administrator';
    case 'STAFF':
      return 'Operations Staff';
    case 'CLIENT':
    default:
      return 'Exhibitor';
  }
};
