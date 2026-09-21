import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import { UserRole } from '../../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const getRoleDefaultDashboard = (role?: UserRole): string => {
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

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user) {
    // Platform Super Admin automatically qualifies for Admin routes
    const isAuthorized =
      allowedRoles.includes(user.role) ||
      (user.role === 'SUPERADMIN' && allowedRoles.includes('ADMIN'));

    if (!isAuthorized) {
      return <Navigate to={getRoleDefaultDashboard(user.role)} replace />;
    }
  }

  return <>{children}</>;
};
