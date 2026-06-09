import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { canAccessMenu } from '../utils/permission';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: string;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  requiredPermission,
}: ProtectedRouteProps) {
  const { isAuthenticated, userInfo, permissions } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && userInfo) {
    if (userInfo.role !== 'admin' && !allowedRoles.includes(userInfo.role)) {
      return <Navigate to="/403" replace />;
    }
  }

  if (requiredPermission) {
    if (!permissions.includes('*') && !permissions.includes(requiredPermission)) {
      return <Navigate to="/403" replace />;
    }
  }

  const path = location.pathname;
  if (!canAccessMenu(path)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
