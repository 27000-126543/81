import { type Request, type Response, type NextFunction } from 'express';
import { z, type ZodSchema } from 'zod';
import type { ApiResponse } from '../../shared/types.js';

export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        const response: ApiResponse<null> = {
          code: 400,
          message: `请求参数验证失败: ${errors}`,
          data: null,
          timestamp: Date.now(),
        };
        res.status(400).json(response);
        return;
      }
      const response: ApiResponse<null> = {
        code: 400,
        message: '请求参数格式错误',
        data: null,
        timestamp: Date.now(),
      };
      res.status(400).json(response);
      return;
    }
  };
}

export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        const response: ApiResponse<null> = {
          code: 400,
          message: `查询参数验证失败: ${errors}`,
          data: null,
          timestamp: Date.now(),
        };
        res.status(400).json(response);
        return;
      }
      const response: ApiResponse<null> = {
        code: 400,
        message: '查询参数格式错误',
        data: null,
        timestamp: Date.now(),
      };
      res.status(400).json(response);
      return;
    }
  };
}

export function validateParams<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        const response: ApiResponse<null> = {
          code: 400,
          message: `路径参数验证失败: ${errors}`,
          data: null,
          timestamp: Date.now(),
        };
        res.status(400).json(response);
        return;
      }
      const response: ApiResponse<null> = {
        code: 400,
        message: '路径参数格式错误',
        data: null,
        timestamp: Date.now(),
      };
      res.status(400).json(response);
      return;
    }
  };
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const idSchema = z.object({
  id: z.coerce.number().int().min(1),
});

export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});
