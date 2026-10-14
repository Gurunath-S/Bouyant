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

export const PAGE_ACCESS_ITEMS = [
  { id: 'dashboard', label: 'Dashboard & Analytics', path: '/dashboard', description: 'Platform overview and operational analytics' },
  { id: 'event_register', label: 'Event Registration Hub', path: '/admin/events/register', description: 'Register new exhibitions and events' },
  { id: 'events_floorplans', label: 'Exhibitions & Floor Plans', path: '/admin/events', description: 'Interactive floor plan designer and stall allocation' },
  { id: 'companies', label: 'Exhibitor Directory & Registered Events', path: '/admin/companies', description: 'Exhibitor directory, company profiles and allocations' },
  { id: 'bookings', label: 'Exhibition Bookings', path: '/admin/bookings', description: 'Booking requests, holds, and order approvals' },
  { id: 'payments', label: 'Payments & Transactions', path: '/admin/payments', description: 'Financial ledger, payment verification, and receipts' },
  { id: 'reports', label: 'Platform Reports', path: '/reports', description: 'Platform and business reports' },
  { id: 'governance', label: 'User & Team Governance', path: '/super-admin/users', description: 'User directory, role assignment, and access control' },
] as const;

export type PageAccessId = (typeof PAGE_ACCESS_ITEMS)[number]['id'];

export const DEFAULT_ROLE_PAGE_ACCESS: Record<UserRole, string[]> = {
  SUPERADMIN: [
    'dashboard',
    'event_register',
    'events_floorplans',
    'companies',
    'bookings',
    'payments',
    'reports',
    'governance',
  ],
  ADMIN: [
    'dashboard',
    'event_register',
    'events_floorplans',
    'companies',
    'bookings',
    'payments',
  ],
  STAFF: [
    'dashboard',
    'event_register',
    'companies',
    'bookings',
    'payments',
  ],
  CLIENT: [
    'dashboard',
  ],
};

export const hasUserPermission = (
  user: { role?: string; pageAccess?: string[] } | undefined,
  permission: Permission
): boolean => {
  if (!user || !user.role) return false;
  if (user.role === 'SUPERADMIN') return true;

  // Baseline role permissions check
  const roleSet = ROLE_PERMISSIONS[user.role as UserRole];
  if (roleSet && roleSet.has(permission)) return true;

  // Custom page access grants check
  const effectivePages =
    user.pageAccess && user.pageAccess.length > 0
      ? user.pageAccess
      : DEFAULT_ROLE_PAGE_ACCESS[user.role as UserRole] || [];

  if (effectivePages.includes('governance')) {
    const govPermissions: Permission[] = [
      Permissions.USER_VIEW,
      Permissions.USER_CREATE_ADMIN,
      Permissions.USER_CREATE_STAFF,
      Permissions.USER_MANAGE_ADMIN,
      Permissions.USER_MANAGE_STAFF,
      Permissions.USER_STATUS_TOGGLE,
      Permissions.USER_RESET_PASSWORD,
    ];
    if (govPermissions.includes(permission)) return true;
  }

  if (effectivePages.includes('reports')) {
    const reportPermissions: Permission[] = [
      Permissions.REPORT_VIEW_PLATFORM,
      Permissions.REPORT_VIEW_EVENT,
      Permissions.REPORT_VIEW_OPERATIONAL,
    ];
    if (reportPermissions.includes(permission)) return true;
  }

  if (effectivePages.includes('events_floorplans')) {
    const eventPermissions: Permission[] = [
      Permissions.EVENT_MANAGE,
      Permissions.EVENT_DELETE,
      Permissions.FLOORPLAN_MANAGE,
      Permissions.STALL_MANAGE,
    ];
    if (eventPermissions.includes(permission)) return true;
  }

  if (effectivePages.includes('event_register')) {
    if (permission === Permissions.EVENT_CREATE) return true;
  }

  if (effectivePages.includes('companies')) {
    if (permission === Permissions.COMPANY_MANAGE) return true;
  }

  if (effectivePages.includes('bookings')) {
    if (permission === Permissions.BOOKING_MANAGE || permission === Permissions.BOOKING_VIEW_ALL) return true;
  }

  if (effectivePages.includes('payments')) {
    if (permission === Permissions.PAYMENT_MANAGE || permission === Permissions.INVOICE_MANAGE) return true;
  }

  return false;
};

export const hasPermission = (role: string | undefined, permission: Permission): boolean => {
  return hasUserPermission({ role }, permission);
};

export const hasAnyPermission = (role: string | undefined, permissions: Permission[]): boolean => {
  if (!role) return false;
  if (role === 'SUPERADMIN') return true;
  return permissions.some((p) => hasPermission(role, p));
};
