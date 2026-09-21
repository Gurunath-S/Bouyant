import { UserRole } from '@prisma/client';

export const Permissions = {
  // Super Admin User Governance
  USER_CREATE_ADMIN: 'USER_CREATE_ADMIN',
  USER_CREATE_STAFF: 'USER_CREATE_STAFF',
  USER_MANAGE_ADMIN: 'USER_MANAGE_ADMIN',
  USER_MANAGE_STAFF: 'USER_MANAGE_STAFF',
  USER_VIEW: 'USER_VIEW',
  USER_STATUS_TOGGLE: 'USER_STATUS_TOGGLE',
  USER_RESET_PASSWORD: 'USER_RESET_PASSWORD',

  // Event / Exhibition Capabilities
  EVENT_CREATE: 'EVENT_CREATE',
  EVENT_MANAGE: 'EVENT_MANAGE',
  EVENT_DELETE: 'EVENT_DELETE',

  // Floor Plan & Stall Capabilities
  FLOORPLAN_MANAGE: 'FLOORPLAN_MANAGE',
  STALL_MANAGE: 'STALL_MANAGE',

  // Bookings & Billing Capabilities
  BOOKING_MANAGE: 'BOOKING_MANAGE',
  BOOKING_VIEW_ALL: 'BOOKING_VIEW_ALL',
  PAYMENT_MANAGE: 'PAYMENT_MANAGE',
  INVOICE_MANAGE: 'INVOICE_MANAGE',
  COMPANY_MANAGE: 'COMPANY_MANAGE',

  // Role-Scoped Reporting
  REPORT_VIEW_PLATFORM: 'REPORT_VIEW_PLATFORM',
  REPORT_VIEW_EVENT: 'REPORT_VIEW_EVENT',
  REPORT_VIEW_OPERATIONAL: 'REPORT_VIEW_OPERATIONAL',

  // Client Capabilities
  STALL_BOOK: 'STALL_BOOK',
  MY_BOOKINGS_VIEW: 'MY_BOOKINGS_VIEW',
  MY_INVOICES_VIEW: 'MY_INVOICES_VIEW',
  PROFILE_MANAGE: 'PROFILE_MANAGE',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const ROLE_PERMISSIONS: Record<UserRole, Set<Permission>> = {
  SUPERADMIN: new Set([
    Permissions.USER_CREATE_ADMIN,
    Permissions.USER_CREATE_STAFF,
    Permissions.USER_MANAGE_ADMIN,
    Permissions.USER_MANAGE_STAFF,
    Permissions.USER_VIEW,
    Permissions.USER_STATUS_TOGGLE,
    Permissions.USER_RESET_PASSWORD,
    Permissions.EVENT_CREATE,
    Permissions.EVENT_MANAGE,
    Permissions.EVENT_DELETE,
    Permissions.FLOORPLAN_MANAGE,
    Permissions.STALL_MANAGE,
    Permissions.BOOKING_MANAGE,
    Permissions.BOOKING_VIEW_ALL,
    Permissions.PAYMENT_MANAGE,
    Permissions.INVOICE_MANAGE,
    Permissions.COMPANY_MANAGE,
    Permissions.REPORT_VIEW_PLATFORM,
    Permissions.REPORT_VIEW_EVENT,
    Permissions.REPORT_VIEW_OPERATIONAL,
    Permissions.PROFILE_MANAGE,
  ]),

  ADMIN: new Set([
    Permissions.EVENT_CREATE,
    Permissions.EVENT_MANAGE,
    Permissions.EVENT_DELETE,
    Permissions.FLOORPLAN_MANAGE,
    Permissions.STALL_MANAGE,
    Permissions.BOOKING_MANAGE,
    Permissions.BOOKING_VIEW_ALL,
    Permissions.PAYMENT_MANAGE,
    Permissions.INVOICE_MANAGE,
    Permissions.COMPANY_MANAGE,
    Permissions.REPORT_VIEW_EVENT,
    Permissions.PROFILE_MANAGE,
  ]),

  STAFF: new Set([
    Permissions.EVENT_CREATE,
    Permissions.REPORT_VIEW_OPERATIONAL,
    Permissions.PROFILE_MANAGE,
  ]),

  CLIENT: new Set([
    Permissions.STALL_BOOK,
    Permissions.MY_BOOKINGS_VIEW,
    Permissions.MY_INVOICES_VIEW,
    Permissions.PROFILE_MANAGE,
  ]),
};

export const hasPermission = (role: string | undefined, permission: Permission): boolean => {
  if (!role) return false;
  if (role === 'SUPERADMIN') return true;
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  return permissions ? permissions.has(permission) : false;
};

export const hasAnyPermission = (role: string | undefined, permissions: Permission[]): boolean => {
  if (!role) return false;
  if (role === 'SUPERADMIN') return true;
  return permissions.some((p) => hasPermission(role, p));
};
