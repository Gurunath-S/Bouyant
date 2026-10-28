export interface PageAccessItem {
  id: string;
  label: string;
  path: string;
  description: string;
}

export const PAGE_ACCESS_ITEMS: PageAccessItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard / Overview',
    path: '/dashboard',
    description: 'Access to the main control dashboard, KPI summaries, and fast actions',
  },
  {
    id: 'event_register',
    label: 'Event Registration Hub',
    path: '/workspace/events/register',
    description: 'Registration hub to launch and initiate new exhibitions and events',
  },
  {
    id: 'events_floorplans',
    label: 'Exhibitions & Floor Plans',
    path: '/workspace/events',
    description: 'Exhibition management, floor plan designer, and stall architecture',
  },
  {
    id: 'companies',
    label: 'Exhibitor Directory & Registered Events',
    path: '/workspace/companies',
    description: 'Directory of registered exhibitors, enterprise profiles, and KYC data',
  },
  {
    id: 'bookings',
    label: 'Exhibition Bookings',
    path: '/workspace/bookings',
    description: 'Stall booking management, approval pipeline, and hold states',
  },
  {
    id: 'payments',
    label: 'Payments & Transactions',
    path: '/workspace/payments',
    description: 'Payment reconciliations, Razorpay transactions, and financial audit logs',
  },
  {
    id: 'reports',
    label: 'Platform Reports',
    path: '/reports',
    description: 'High-level business analytics, revenue breakdowns, and performance trends',
  },
  {
    id: 'governance',
    label: 'User & Team Governance',
    path: '/workspace/users',
    description: 'User access governance, team roles, permissions, and credential management',
  },
];

export const DEFAULT_ROLE_PAGE_ACCESS: Record<string, string[]> = {
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
    'reports',
  ],
  STAFF: [
    'dashboard',
    'event_register',
    'companies',
    'bookings',
    'payments',
    'reports',
  ],
  CLIENT: ['dashboard'],
};

/**
 * Resolves the effective page access list for a user.
 * If pageAccess is explicitly set (even empty array if intended, though typically array of strings),
 * or falls back to the default role access.
 */
export function getUserEffectivePageAccess(
  user?: { role?: string; pageAccess?: string[] | null } | null
): string[] {
  if (!user) return [];
  if (Array.isArray(user.pageAccess) && user.pageAccess.length > 0) {
    return user.pageAccess;
  }
  const role = user.role || 'CLIENT';
  return DEFAULT_ROLE_PAGE_ACCESS[role] || ['dashboard'];
}

/**
 * Checks if the user has access to a specific page ID.
 */
export function hasPageAccess(
  user: { role?: string; pageAccess?: string[] | null } | null | undefined,
  pageId: string
): boolean {
  if (!user) return false;
  const effectivePages = getUserEffectivePageAccess(user);
  return effectivePages.includes(pageId);
}
