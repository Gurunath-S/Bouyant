export type UserRole = 'CLIENT' | 'STAFF' | 'ADMIN' | 'SUPERADMIN';

export type StallCategory = 'STANDARD' | 'PREMIUM' | 'CORNER' | 'ISLAND';

export type StallStatus =
  | 'AVAILABLE'
  | 'TEMPORARILY_HELD'
  | 'BOOKING_IN_PROGRESS'
  | 'PAYMENT_PENDING'
  | 'BOOKED_CONFIRMED'
  | 'BLOCKED';

export type BookingStatus =
  | 'INITIATED'
  | 'HELD'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'EXPIRED';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

export type BookingPaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';

export type InvoiceStatus = 'ISSUED' | 'PAID' | 'VOID';

export interface User {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  phone?: string | null;
  spcode?: string | null;
  role: UserRole;
  isActive?: boolean;
  companyId?: string | null;
  company?: Company | null;
  createdAt: string;
}

export interface Company {
  id: string;
  companyCode: string;
  regNo?: string | null;
  spcode?: string | null;
  name: string;
  contactPerson: string;
  designation: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pinCode?: string;
  country?: string;
  gstNumber?: string;
  panNumber?: string;
  tanNumber?: string;
  industry: string;
  category?: string;
  website?: string;
  createdAt: string;
  bookings?: Booking[];
  _count?: {
    bookings: number;
    users?: number;
  };
}

export interface Exhibition {
  id: string;
  title: string;
  slug: string;
  description: string;
  edition?: string | null;
  eventCode?: string | null;
  spcode?: string | null;
  notificationEmails?: string | null;
  venue: string;
  city: string;
  startDate: string;
  endDate: string;
  bookingEndDate?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED';
  category?: string;
  bannerUrl?: string;
  totalStalls: number;
  createdByUserId?: string | null;
  createdBy?: Partial<User> | null;
  floorPlans?: FloorPlan[];
  _count?: { bookings: number };
}

export interface FloorPlan {
  id: string;
  exhibitionId: string;
  name: string;
  width: number;
  height: number;
  backgroundUrl?: string;
  gridColumns: number;
  gridRows: number;
  isPublished: boolean;
  stalls?: Stall[];
}

export interface Stall {
  id: string;
  floorPlanId: string;
  stallNumber: string;
  name?: string;
  category: StallCategory;
  price: number | string;
  areaSqFt: number;
  width: number;
  height: number;
  xPosition: number;
  yPosition: number;
  status: StallStatus;
  heldUntil?: string | null;
  heldByUserId?: string | null;
}

export interface BookingStall {
  id: string;
  stallId: string;
  bookingId: string;
  price: number | string;
  stall?: Stall;
}

export interface Booking {
  id: string;
  bookingReference: string;
  userId: string;
  companyId: string;
  exhibitionId: string;
  status: BookingStatus;
  totalAmount: number | string;
  taxAmount: number | string;
  grandTotal: number | string;
  paidAmount?: number | string;
  balanceAmount?: number | string;
  paymentStatus?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'PAID_FULL' | 'REFUNDED';
  expiresAt?: string;
  createdAt: string;
  stalls?: BookingStall[];
  exhibition?: Exhibition;
  company?: Company;
  payment?: Payment;
  payments?: Payment[];
  invoice?: Invoice;
  invoices?: Invoice[];
  user?: Partial<User>;
}

export interface Payment {
  id: string;
  paymentReference: string;
  bookingId: string;
  userId: string;
  amount: number | string;
  currency: string;
  status: PaymentStatus;
  provider: string;
  transactionId?: string;
  paymentMethod?: string;
  failureReason?: string;
  paidAt?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  paymentId?: string;
  payment?: Payment;
  companyId: string;
  totalAmount: number | string;
  taxAmount: number | string;
  grandTotal: number | string;
  pdfUrl?: string;
  status: InvoiceStatus;
  issueDate: string;
  booking?: Booking;
  company?: Company;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
  isRead: boolean;
  createdAt: string;
}

export type Notification = NotificationItem;

// Super Admin User Management Types
export interface AdminStaffUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'SUPERADMIN' | 'ADMIN' | 'STAFF' | 'CLIENT' | string;
  spcode?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  companyId?: string | null;
  company?: {
    id: string;
    name: string;
    companyCode: string;
    contactPerson?: string;
    mobile?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    country?: string;
    gstNumber?: string | null;
    panNumber?: string | null;
    industry?: string | null;
    website?: string | null;
  } | null;
  createdExhibitions?: Array<{
    id: string;
    title: string;
    slug?: string;
    status: string;
    startDate?: string;
    endDate?: string;
    totalStalls?: number;
    edition?: string | null;
    eventCode?: string | null;
    spcode?: string | null;
    createdAt?: string;
    _count?: { bookings: number };
  }>;
  attributedBookings?: any[];
  companyBookings?: any[];
  heldStalls?: any[];
  rolePermissions?: string[];
  isGlobal?: boolean;
  eventAssociation?: string;
  _count?: {
    createdExhibitions: number;
  };
}

export interface CreateAdminStaffPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  spcode?: string;
}

export interface UpdateUserPayload {
  name?: string;
  phone?: string;
  spcode?: string;
}

// Reports Types
export interface ReportOverviewData {
  roleScope: 'SUPERADMIN' | 'ADMIN' | 'STAFF' | string;
  eventScoped?: boolean;
  totalRevenue?: number;
  totalBookings?: number;
  confirmedBookings?: number;
  totalExhibitions?: number;
  publishedExhibitions?: number;
  activeAdmins?: number;
  activeStaff?: number;
  totalStalls?: number;
  occupiedStalls?: number;
  occupancyRate?: number;
  totalExhibitors?: number;
  recentBookings?: any[];
  exhibition?: {
    id: string;
    title: string;
    edition?: string | null;
    eventCode?: string | null;
    status: string;
    venue: string;
    city: string;
    startDate: string;
    endDate: string;
    createdBy?: {
      id: string;
      name: string;
      email: string;
      role: string;
      spcode?: string | null;
    } | null;
  };
  // Staff scope metrics
  totalEventsRegistered?: number;
  platformTotalEvents?: number;
  upcomingEvents?: number;
  totalStallsInRegisteredEvents?: number;
  registeredEvents?: any[];
}

export interface OccupancyReportData {
  totalStalls: number;
  totalAvailable: number;
  totalBooked: number;
  totalBlocked: number;
  categoryBreakdown: Record<string, { total: number; available: number; booked: number }>;
}

