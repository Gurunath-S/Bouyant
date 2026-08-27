import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';

import { HomePage } from '../features/discovery/pages/HomePage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { ClientDashboardPage } from '../features/dashboard/pages/ClientDashboardPage';
import { AdminDashboardPage } from '../features/dashboard/pages/AdminDashboardPage';
import { AdminEventsPage } from '../features/dashboard/pages/AdminEventsPage';
import { AdminExhibitionBuilderPage } from '../features/dashboard/pages/AdminExhibitionBuilderPage';
import { AdminCompaniesPage } from '../features/dashboard/pages/AdminCompaniesPage';
import { AdminBookingsPage } from '../features/dashboard/pages/AdminBookingsPage';
import { AdminPaymentsPage } from '../features/dashboard/pages/AdminPaymentsPage';
import { ExhibitionsPage } from '../features/exhibitions/pages/ExhibitionsPage';
import { ExhibitionDetailPage } from '../features/exhibitions/pages/ExhibitionDetailPage';
import { BookingWizardPage } from '../features/bookings/pages/BookingWizardPage';
import { CompanyProfilePage } from '../features/companies/pages/CompanyProfilePage';
import { BookingCheckoutPage } from '../features/bookings/pages/BookingCheckoutPage';
import { MyBookingsPage } from '../features/bookings/pages/MyBookingsPage';
import { PaymentSuccessPage } from '../features/payments/pages/PaymentSuccessPage';
import { MyInvoicesPage } from '../features/invoices/pages/MyInvoicesPage';
import { InvoiceDetailPage } from '../features/invoices/pages/InvoiceDetailPage';
import { NotificationsPage } from '../features/notifications/pages/NotificationsPage';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { PublicFooter } from '../components/layout/PublicFooter';

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-[#f6f9ff] dark:bg-slate-950 text-[#012970] dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-[#f6f9ff] text-[#012970] flex flex-col justify-between font-sans">
      <PublicNavbar />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};

export const router = createBrowserRouter([
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

  // Public Exhibition Discovery Routes
  {
    path: '/exhibitions',
    element: <PublicLayout />,
    children: [
      { path: '', element: <ExhibitionsPage /> },
      { path: ':slug', element: <ExhibitionDetailPage /> },
      { path: ':slug/book', element: <BookingWizardPage /> },
    ],
  },

  // Protected Exhibitor & Admin Workspace Routes
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <ClientDashboardPage /> },
      { path: 'exhibitions/:slug/book', element: <BookingWizardPage /> },
      { path: 'my-company', element: <CompanyProfilePage /> },
      { path: 'checkout', element: <BookingCheckoutPage /> },
      { path: 'my-bookings', element: <MyBookingsPage /> },
      { path: 'payment-success', element: <PaymentSuccessPage /> },
      { path: 'invoices', element: <MyInvoicesPage /> },
      { path: 'invoices/:id', element: <InvoiceDetailPage /> },
      { path: 'notifications', element: <NotificationsPage /> },

      // Admin Routes
      {
        path: 'admin/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/events',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminEventsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/events/create',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminExhibitionBuilderPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/companies',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminCompaniesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/bookings',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminBookingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/payments',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminPaymentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/invoices',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <MyInvoicesPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
