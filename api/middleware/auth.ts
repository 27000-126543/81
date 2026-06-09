import { createRequire } from 'module';
import { type Request, type Response, type NextFunction } from 'express';
const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');
const { verify } = jwt;
import type { User, ApiResponse } from '../../shared/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: User;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const response: ApiResponse<null> = {
      code: 401,
      message: '未提供认证令牌',
      data: null,
      timestamp: Date.now(),
    };
    res.status(401).json(response);
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = verify(token, JWT_SECRET) as { user: User; exp: number };
    req.user = decoded.user;
    next();
  } catch (error) {
    const response: ApiResponse<null> = {
      code: 401,
      message: '认证令牌无效或已过期',
      data: null,
      timestamp: Date.now(),
    };
    res.status(401).json(response);
    return;
  }
}
