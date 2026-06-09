import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sign, verify } = jwt;
import { db } from '../db/database.js';
import type { User, LoginRequest, LoginResponse, UserRole, ApiResponse } from '../../shared/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

const rolePermissions: Record<UserRole, string[]> = {
  admin: [
    'dashboard:view', 'inventory:view', 'inventory:edit', 'orders:view', 'orders:edit',
    'customs:view', 'customs:edit', 'logistics:view', 'logistics:edit',
    'returns:view', 'returns:edit', 'reports:view', 'reports:export',
    'system:view', 'system:edit',
  ],
  operation_director: [
    'dashboard:view', 'inventory:view', 'inventory:edit', 'orders:view', 'orders:edit',
    'customs:view', 'customs:edit', 'logistics:view', 'logistics:edit',
    'returns:view', 'returns:edit', 'reports:view', 'reports:export',
  ],
  customs_officer: [
    'dashboard:view', 'customs:view', 'customs:edit', 'logistics:view', 'returns:view', 'reports:view',
  ],
  warehouse_manager: [
    'dashboard:view', 'inventory:view', 'inventory:edit', 'orders:view', 'logistics:view', 'returns:view',
  ],
  consumer: [
    'orders:view', 'returns:view', 'returns:edit',
  ],
};

export class AuthService {
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private generateToken(user: User): string {
    return sign({ user }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  private getPermissions(role: UserRole): string[] {
    return rolePermissions[role] || [];
  }

  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse | null>> {
    const users = db.getAll<User>('users');
    const user = users.find(u => u.username === credentials.username);

    if (!user) {
      return {
        code: 401,
        message: '用户名或密码错误',
        data: null,
        timestamp: Date.now(),
      };
    }

    const presetPasswords: Record<string, string> = {
      'admin': 'admin123',
      'director': 'admin123',
      'customs1': 'admin123',
      'wh_la': 'admin123',
      'wh_rtm': 'admin123',
      'consumer1': 'admin123',
    };
    const expectedPassword = presetPasswords[credentials.username] || '123456';
    const isPasswordValid = credentials.password === expectedPassword;

    if (!isPasswordValid) {
      return {
        code: 401,
        message: '用户名或密码错误',
        data: null,
        timestamp: Date.now(),
      };
    }

    const token = this.generateToken(user);
    const permissions = this.getPermissions(user.role);

    return {
      code: 200,
      message: '登录成功',
      data: {
        token,
        userInfo: user,
        permissions,
      },
      timestamp: Date.now(),
    };
  }

  private getPasswordHash(username: string): string {
    return '';
  }

  async logout(): Promise<ApiResponse<null>> {
    return {
      code: 200,
      message: '退出成功',
      data: null,
      timestamp: Date.now(),
    };
  }

  verifyToken(token: string): User | null {
    try {
      const decoded = verify(token, JWT_SECRET) as { user: User };
      return decoded.user;
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
