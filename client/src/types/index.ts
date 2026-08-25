export type UserRole = 'CLIENT' | 'ADMIN';

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

export type InvoiceStatus = 'ISSUED' | 'PAID' | 'VOID';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  companyId?: string | null;
  company?: Company | null;
  createdAt: string;
}

export interface Company {
  id: string;
  companyCode: string;
  name: string;
  contactPerson: string;
  designation: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  gstNumber?: string;
  panNumber?: string;
  industry: string;
  category: string;
  website?: string;
  createdAt: string;
}

export interface Exhibition {
  id: string;
  title: string;
  slug: string;
  description: string;
  venue: string;
  city: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED';
  bannerUrl?: string;
  totalStalls: number;
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

export interface Booking {
  id: string;
  bookingReference: string;
  userId: string;
  companyId: string;
  exhibitionId: string;
  stallId: string;
  status: BookingStatus;
  totalAmount: number | string;
  taxAmount: number | string;
  grandTotal: number | string;
  expiresAt?: string;
  createdAt: string;
  stall?: Stall;
  exhibition?: Exhibition;
  company?: Company;
  payment?: Payment;
  invoice?: Invoice;
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
