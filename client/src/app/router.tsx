import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';

import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { ClientDashboardPage } from '../features/dashboard/pages/ClientDashboardPage';
import { AdminDashboardPage } from '../features/dashboard/pages/AdminDashboardPage';
import { AdminEventsPage } from '../features/dashboard/pages/AdminEventsPage';
import { AdminCompaniesPage } from '../features/dashboard/pages/AdminCompaniesPage';
import { AdminBookingsPage } from '../features/dashboard/pages/AdminBookingsPage';
import { AdminPaymentsPage } from '../features/dashboard/pages/AdminPaymentsPage';
import { ExhibitionsPage } from '../features/exhibitions/pages/ExhibitionsPage';
import { ExhibitionDetailPage } from '../features/exhibitions/pages/ExhibitionDetailPage';
import { CompanyProfilePage } from '../features/companies/pages/CompanyProfilePage';
import { BookingCheckoutPage } from '../features/bookings/pages/BookingCheckoutPage';
import { MyBookingsPage } from '../features/bookings/pages/MyBookingsPage';
import { PaymentSuccessPage } from '../features/payments/pages/PaymentSuccessPage';
import { MyInvoicesPage } from '../features/invoices/pages/MyInvoicesPage';
import { InvoiceDetailPage } from '../features/invoices/pages/InvoiceDetailPage';
import { NotificationsPage } from '../features/notifications/pages/NotificationsPage';

const RootLayout = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <RootLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <ClientDashboardPage /> },
      { path: '/exhibitions', element: <ExhibitionsPage /> },
      { path: '/exhibitions/:slug', element: <ExhibitionDetailPage /> },
      { path: '/my-company', element: <CompanyProfilePage /> },
      { path: '/checkout', element: <BookingCheckoutPage /> },
      { path: '/my-bookings', element: <MyBookingsPage /> },
      { path: '/payment-success', element: <PaymentSuccessPage /> },
      { path: '/invoices', element: <MyInvoicesPage /> },
      { path: '/invoices/:id', element: <InvoiceDetailPage /> },
      { path: '/notifications', element: <NotificationsPage /> },

      // Admin Routes
      {
        path: '/admin/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/events',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminEventsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/companies',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminCompaniesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/bookings',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminBookingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/payments',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminPaymentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/invoices',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <MyInvoicesPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
