import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Outlet, Navigate, useParams } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { PublicFooter } from '../components/layout/PublicFooter';
import { BookingLayout } from '../components/layout/BookingLayout';
import { ScrollToTop } from '../components/common/ScrollToTop';
import { useAuthStore } from '../stores/authStore';

// Eagerly loaded critical initial views
import { HomePage } from '../features/discovery/pages/HomePage';
import { LoginPage } from '../features/auth/pages/LoginPage';

// Lazy loaded page components
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ResetPasswordPage = lazy(() => import('../features/auth/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const ClientDashboardPage = lazy(() => import('../features/dashboard/pages/ClientDashboardPage').then(m => ({ default: m.ClientDashboardPage })));
const AdminDashboardPage = lazy(() => import('../features/dashboard/pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminEventsPage = lazy(() => import('../features/dashboard/pages/AdminEventsPage').then(m => ({ default: m.AdminEventsPage })));
const AdminExhibitionBuilderPage = lazy(() => import('../features/dashboard/pages/AdminExhibitionBuilderPage').then(m => ({ default: m.AdminExhibitionBuilderPage })));
const AdminCompaniesPage = lazy(() => import('../features/dashboard/pages/AdminCompaniesPage').then(m => ({ default: m.AdminCompaniesPage })));
const AdminCompanyDetailPage = lazy(() => import('../features/dashboard/pages/AdminCompanyDetailPage').then(m => ({ default: m.AdminCompanyDetailPage })));
const AdminBookingsPage = lazy(() => import('../features/dashboard/pages/AdminBookingsPage').then(m => ({ default: m.AdminBookingsPage })));
const AdminPaymentsPage = lazy(() => import('../features/dashboard/pages/AdminPaymentsPage').then(m => ({ default: m.AdminPaymentsPage })));
const AdminEventRegistrationPage = lazy(() => import('../features/dashboard/pages/AdminEventRegistrationPage').then(m => ({ default: m.AdminEventRegistrationPage })));
const ExhibitionsPage = lazy(() => import('../features/exhibitions/pages/ExhibitionsPage').then(m => ({ default: m.ExhibitionsPage })));
const ExhibitionDetailPage = lazy(() => import('../features/exhibitions/pages/ExhibitionDetailPage').then(m => ({ default: m.ExhibitionDetailPage })));
const BookingWizardPage = lazy(() => import('../features/bookings/pages/BookingWizardPage').then(m => ({ default: m.BookingWizardPage })));
const CompanyProfilePage = lazy(() => import('../features/companies/pages/CompanyProfilePage').then(m => ({ default: m.CompanyProfilePage })));
const BookingCheckoutPage = lazy(() => import('../features/bookings/pages/BookingCheckoutPage').then(m => ({ default: m.BookingCheckoutPage })));
const MyBookingsPage = lazy(() => import('../features/bookings/pages/MyBookingsPage').then(m => ({ default: m.MyBookingsPage })));
const PaymentSuccessPage = lazy(() => import('../features/payments/pages/PaymentSuccessPage').then(m => ({ default: m.PaymentSuccessPage })));
const MyInvoicesPage = lazy(() => import('../features/invoices/pages/MyInvoicesPage').then(m => ({ default: m.MyInvoicesPage })));
const InvoiceDetailPage = lazy(() => import('../features/invoices/pages/InvoiceDetailPage').then(m => ({ default: m.InvoiceDetailPage })));
const SuperAdminDashboardPage = lazy(() => import('../features/super-admin/pages/SuperAdminDashboardPage').then(m => ({ default: m.SuperAdminDashboardPage })));
const SuperAdminUsersPage = lazy(() => import('../features/super-admin/pages/SuperAdminUsersPage').then(m => ({ default: m.SuperAdminUsersPage })));
const UserGovernanceDetailPage = lazy(() => import('../features/super-admin/pages/UserGovernanceDetailPage').then(m => ({ default: m.UserGovernanceDetailPage })));
const StaffDashboardPage = lazy(() => import('../features/staff/pages/StaffDashboardPage').then(m => ({ default: m.StaffDashboardPage })));
const StaffRegisterEventPage = lazy(() => import('../features/staff/pages/StaffRegisterEventPage').then(m => ({ default: m.StaffRegisterEventPage })));
const StaffEventsPage = lazy(() => import('../features/staff/pages/StaffEventsPage').then(m => ({ default: m.StaffEventsPage })));
const ReportsPage = lazy(() => import('../features/reports/pages/ReportsPage').then(m => ({ default: m.ReportsPage })));

const WorkspaceUserDetailRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/workspace/users/${id}` : '/workspace/users'} replace />;
};

const PageLoader = () => (
  <div className="w-full h-64 flex flex-col items-center justify-center gap-2">
    <div className="w-8 h-8 border-3 border-[#1E3FA0] dark:border-blue-500 border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading view...</span>
  </div>
);

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-[#f6f9ff] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between font-sans transition-colors duration-200">
      <ScrollToTop />
      <Navbar />
      <div className="flex flex-1 items-start relative">
        <Sidebar />
        <main className="flex-1 p-3 sm:p-6 w-full min-w-0">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <PublicFooter />
    </div>
  );
};

const PublicLayout = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    return <DashboardLayout />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-[#121B3D] dark:text-slate-100 flex flex-col justify-between font-sans selection:bg-[#0E8074] selection:text-white transition-colors duration-200">
      <ScrollToTop />
      <PublicNavbar />
      <main className="flex-1 w-full">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
};

const RootLayout = () => {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </>
  );
};

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public Homepage & Exhibition Discovery Routes
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
      {
        path: '/reset-password',
        element: <ResetPasswordPage />,
      },

  // Public Exhibition Discovery & Booking Confirmation Routes
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { path: 'exhibitions', element: <ExhibitionsPage /> },
      { path: 'exhibitions/:slug', element: <ExhibitionDetailPage /> },
      { path: 'booking/success', element: <PaymentSuccessPage /> },
    ],
  },

  // Focused Distraction-Free Stall Booking Shell (Unauthenticated Guests & Authenticated Users)
  {
    path: '/',
    element: <BookingLayout />,
    children: [
      { path: 'exhibitions/:slug/book', element: <BookingWizardPage /> },
      { path: 'checkout', element: <BookingCheckoutPage /> },
    ],
  },

  // Protected Exhibitor, Admin, SuperAdmin, & Staff Workspace Routes
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      // Client Routes
      { path: 'dashboard', element: <ClientDashboardPage /> },
      { path: 'my-company', element: <CompanyProfilePage /> },
      { path: 'my-bookings', element: <MyBookingsPage /> },
      { path: 'payment-success', element: <PaymentSuccessPage /> },
      { path: 'invoices', element: <MyInvoicesPage /> },
      { path: 'invoices/:id', element: <InvoiceDetailPage /> },
      { path: 'notifications', element: <Navigate to="/dashboard" replace /> },

      // Super Admin Routes (Legacy aliases redirect to /workspace/users)
      {
        path: 'super-admin/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['SUPERADMIN']} requiredPage="dashboard">
            <SuperAdminDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'super-admin/users',
        element: <Navigate to="/workspace/users" replace />,
      },
      {
        path: 'super-admin/users/:id',
        element: <WorkspaceUserDetailRedirect />,
      },

      // Staff Routes
      {
        path: 'staff/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPERADMIN']} requiredPage="dashboard">
            <StaffDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'staff/events/register',
        element: (
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPERADMIN']} requiredPage="event_register">
            <StaffRegisterEventPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'staff/events',
        element: (
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPERADMIN']} requiredPage="events_floorplans">
            <StaffEventsPage />
          </ProtectedRoute>
        ),
      },

      // Unified Role-Scoped Reports Route
      {
        path: 'reports',
        element: (
          <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'STAFF']} requiredPage="reports">
            <ReportsPage />
          </ProtectedRoute>
        ),
      },

      // Shared Workspace Routes (Authoritative Console for Exhibitions, Companies, Bookings & Payments)
      {
        path: 'workspace/events',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN', 'STAFF']} requiredPage="events_floorplans">
            <AdminEventsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'workspace/events/register',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN', 'STAFF']} requiredPage="event_register">
            <AdminEventRegistrationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'workspace/events/create',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']} requiredPage="events_floorplans">
            <AdminExhibitionBuilderPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'workspace/events/new',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']} requiredPage="events_floorplans">
            <AdminExhibitionBuilderPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'workspace/events/builder/new',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']} requiredPage="events_floorplans">
            <AdminExhibitionBuilderPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'workspace/events/:id/edit',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']} requiredPage="events_floorplans">
            <AdminExhibitionBuilderPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'workspace/events/:id/view',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN', 'STAFF']} requiredPage="events_floorplans">
            <AdminExhibitionBuilderPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'workspace/exhibitions/create',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']} requiredPage="events_floorplans">
            <AdminExhibitionBuilderPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'workspace/exhibitions/:id/edit',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']} requiredPage="events_floorplans">
            <AdminExhibitionBuilderPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'workspace/exhibitions/:id/view',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN', 'STAFF']} requiredPage="events_floorplans">
            <AdminExhibitionBuilderPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'workspace/companies',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN', 'STAFF']} requiredPage="companies">
            <AdminCompaniesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'workspace/companies/:id',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN', 'STAFF']} requiredPage="companies">
            <AdminCompanyDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'workspace/bookings',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN', 'STAFF']} requiredPage="bookings">
            <AdminBookingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'workspace/payments',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN', 'STAFF']} requiredPage="payments">
            <AdminPaymentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'workspace/invoices',
        element: <Navigate to="/workspace/payments?tab=INVOICES" replace />,
      },
      {
        path: 'workspace/users',
        element: (
          <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'STAFF']} requiredPage="governance">
            <SuperAdminUsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'workspace/users/:id',
        element: (
          <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'STAFF']} requiredPage="governance">
            <UserGovernanceDetailPage />
          </ProtectedRoute>
        ),
      },

      // Admin Routes (Accessible to ADMIN and SUPERADMIN, with redirects/aliases for legacy compatibility)
      {
        path: 'admin/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']} requiredPage="dashboard">
            <AdminDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/events',
        element: <Navigate to="/workspace/events" replace />,
      },
      {
        path: 'admin/events/register',
        element: <Navigate to="/workspace/events/register" replace />,
      },
      {
        path: 'admin/events/create',
        element: <Navigate to="/workspace/events/create" replace />,
      },
      {
        path: 'admin/events/new',
        element: <Navigate to="/workspace/events/new" replace />,
      },
      {
        path: 'admin/events/builder/new',
        element: <Navigate to="/workspace/events/builder/new" replace />,
      },
      {
        path: 'admin/events/:id/edit',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']} requiredPage="events_floorplans">
            <AdminExhibitionBuilderPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/events/:id/view',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN', 'STAFF']} requiredPage="events_floorplans">
            <AdminExhibitionBuilderPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/exhibitions/create',
        element: <Navigate to="/workspace/events/create" replace />,
      },
      {
        path: 'admin/exhibitions/:id/edit',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']} requiredPage="events_floorplans">
            <AdminExhibitionBuilderPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/exhibitions/:id/view',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN', 'STAFF']} requiredPage="events_floorplans">
            <AdminExhibitionBuilderPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/companies',
        element: <Navigate to="/workspace/companies" replace />,
      },
      {
        path: 'admin/companies/:id',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN', 'STAFF']} requiredPage="companies">
            <AdminCompanyDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/bookings',
        element: <Navigate to="/workspace/bookings" replace />,
      },
      {
        path: 'admin/payments',
        element: <Navigate to="/workspace/payments" replace />,
      },
      {
        path: 'admin/invoices',
        element: <Navigate to="/workspace/payments?tab=INVOICES" replace />,
      },
      {
        path: 'admin/users',
        element: <Navigate to="/workspace/users" replace />,
      },
      {
        path: 'admin/users/:id',
        element: <WorkspaceUserDetailRedirect />,
      },
    ],
  }],
}]);
