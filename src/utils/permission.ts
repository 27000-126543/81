import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types';

export const roleHierarchy: Record<UserRole, number> = {
  consumer: 0,
  warehouse_manager: 1,
  customs_officer: 2,
  operation_director: 3,
  admin: 10,
};

export const hasPermission = (permission: string): boolean => {
  const { permissions } = useAuthStore.getState();
  return permissions.includes('*') || permissions.includes(permission);
};

export const hasRole = (role: UserRole | UserRole[]): boolean => {
  const { userInfo } = useAuthStore.getState();
  if (!userInfo) return false;
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(userInfo.role);
};

export const hasMinRole = (minRole: UserRole): boolean => {
  const { userInfo } = useAuthStore.getState();
  if (!userInfo) return false;
  return roleHierarchy[userInfo.role] >= roleHierarchy[minRole];
};

export const isAdmin = (): boolean => {
  return hasRole('admin');
};

export const isConsumer = (): boolean => {
  const { userInfo } = useAuthStore.getState();
  return userInfo?.role === 'consumer';
};

export const canAccessPage = (
  allowedRoles: UserRole[],
  requiredPermission?: string
): boolean => {
  const { userInfo, permissions } = useAuthStore.getState();

  if (!userInfo || !userInfo.role) return false;

  if (userInfo.role === 'admin') return true;

  if (!allowedRoles.includes(userInfo.role)) return false;

  if (requiredPermission) {
    return permissions.includes('*') || permissions.includes(requiredPermission);
  }

  return true;
};

export const menuPermissionMap: Record<string, UserRole[]> = {
  '/dashboard': ['warehouse_manager', 'customs_officer', 'operation_director', 'admin'],
  '/inventory': ['warehouse_manager', 'operation_director', 'admin'],
  '/inventory/overview': ['warehouse_manager', 'operation_director', 'admin'],
  '/inventory/alerts': ['warehouse_manager', 'operation_director', 'admin'],
  '/inventory/transfers': ['warehouse_manager', 'operation_director', 'admin'],
  '/orders': ['warehouse_manager', 'operation_director', 'admin'],
  '/orders/list': ['warehouse_manager', 'operation_director', 'admin'],
  '/orders/fulfillment': ['warehouse_manager', 'operation_director', 'admin'],
  '/customs': ['customs_officer', 'operation_director', 'admin'],
  '/customs/tracking': ['customs_officer', 'operation_director', 'admin'],
  '/customs/work-orders': ['customs_officer', 'operation_director', 'admin'],
  '/logistics': ['warehouse_manager', 'operation_director', 'admin'],
  '/logistics/tracking': ['warehouse_manager', 'operation_director', 'admin'],
  '/logistics/exceptions': ['warehouse_manager', 'operation_director', 'admin'],
  '/returns': ['warehouse_manager', 'operation_director', 'admin'],
  '/reports': ['operation_director', 'admin'],
  '/system': ['admin'],
  '/system/users': ['admin'],
  '/system/rules': ['admin'],
  '/consumer/orders': ['consumer'],
};

export const canAccessMenu = (path: string): boolean => {
  const allowedRoles = menuPermissionMap[path];
  if (!allowedRoles) return true;
  return canAccessPage(allowedRoles);
};

export const usePermission = () => {
  const authState = useAuthStore();

  return {
    hasPermission: (permission: string) =>
      authState.permissions.includes('*') || authState.permissions.includes(permission),
    hasRole: (role: UserRole | UserRole[]) => {
      if (!authState.userInfo) return false;
      const roles = Array.isArray(role) ? role : [role];
      return roles.includes(authState.userInfo.role);
    },
    hasMinRole: (minRole: UserRole) => {
      if (!authState.userInfo) return false;
      return roleHierarchy[authState.userInfo.role] >= roleHierarchy[minRole];
    },
    isAdmin: authState.userInfo?.role === 'admin',
    isConsumer: authState.userInfo?.role === 'consumer',
    canAccessPage: (allowedRoles: UserRole[], requiredPermission?: string) => {
      if (!authState.userInfo || !authState.userInfo.role) return false;
      if (authState.userInfo.role === 'admin') return true;
      if (!allowedRoles.includes(authState.userInfo.role)) return false;
      if (requiredPermission) {
        return (
          authState.permissions.includes('*') || authState.permissions.includes(requiredPermission)
        );
      }
      return true;
    },
    canAccessMenu: (path: string) => {
      const allowedRoles = menuPermissionMap[path];
      if (!allowedRoles) return true;
      if (!authState.userInfo || !authState.userInfo.role) return false;
      if (authState.userInfo.role === 'admin') return true;
      return allowedRoles.includes(authState.userInfo.role);
    },
  };
};
