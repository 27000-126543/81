import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  userInfo: User | null;
  permissions: string[];
  login: (token: string, userInfo: User, permissions: string[]) => void;
  logout: () => void;
  updateUserInfo: (userInfo: Partial<User>) => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      token: null,
      userInfo: null,
      permissions: [],

      login: (token, userInfo, permissions) => {
        set({
          isAuthenticated: true,
          token,
          userInfo,
          permissions,
        });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          token: null,
          userInfo: null,
          permissions: [],
        });
      },

      updateUserInfo: (userInfo) => {
        set((state) => ({
          userInfo: state.userInfo ? { ...state.userInfo, ...userInfo } : null,
        }));
      },

      hasPermission: (permission) => {
        const { permissions } = get();
        return permissions.includes('*') || permissions.includes(permission);
      },

      hasRole: (role) => {
        const { userInfo } = get();
        if (!userInfo) return false;
        const roles = Array.isArray(role) ? role : [role];
        return roles.includes(userInfo.role);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        token: state.token,
        userInfo: state.userInfo,
        permissions: state.permissions,
      }),
    }
  )
);
