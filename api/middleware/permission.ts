import { type Response, type NextFunction } from 'express';
import type { UserRole, ApiResponse } from '../../shared/types.js';
import type { AuthRequest } from './auth.js';

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse<null> = {
        code: 401,
        message: '用户未认证',
        data: null,
        timestamp: Date.now(),
      };
      res.status(401).json(response);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      const response: ApiResponse<null> = {
        code: 403,
        message: '权限不足，无法访问该资源',
        data: null,
        timestamp: Date.now(),
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
}

export function requireWarehouseAccess(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    const response: ApiResponse<null> = {
      code: 401,
      message: '用户未认证',
      data: null,
      timestamp: Date.now(),
    };
    res.status(401).json(response);
    return;
  }

  if (req.user.role === 'warehouse_manager' && !req.user.warehouseId) {
    const response: ApiResponse<null> = {
      code: 403,
      message: '仓库管理员未分配仓库',
      data: null,
      timestamp: Date.now(),
    };
    res.status(403).json(response);
    return;
  }

  next();
}
