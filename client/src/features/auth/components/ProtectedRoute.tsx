import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import { UserRole } from '../../../types';
import { hasPageAccess } from '../../../config/pageAccess';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPage?: string;
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
  requiredPage,
}) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user) {
    // If a requiredPage is specified, check page permission
    if (requiredPage) {
      const pagePermitted = user.role === 'SUPERADMIN' || hasPageAccess(user, requiredPage);
      if (!pagePermitted) {
        return <Navigate to={getRoleDefaultDashboard(user.role)} replace />;
      }
    } else if (allowedRoles) {
      // Platform Super Admin automatically qualifies for Admin routes
      const isAuthorized =
        allowedRoles.includes(user.role) ||
        (user.role === 'SUPERADMIN' && allowedRoles.includes('ADMIN'));

      if (!isAuthorized) {
        return <Navigate to={getRoleDefaultDashboard(user.role)} replace />;
      }
    }
  }

  return <>{children}</>;
};
