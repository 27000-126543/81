import { db } from '../db/database.js';
import type {
  ApiResponse, PaginatedResponse, User, SystemRule, ApprovalFlow, Warehouse,
} from '../../shared/types.js';

class SystemService {
  getUsers(
    page: number,
    pageSize: number,
    role?: string,
  ): ApiResponse<PaginatedResponse<User & { warehouse?: Warehouse }>> {
    const filter = (item: User) => {
      if (role && item.role !== role) return false;
      return true;
    };

    const result = db.paginate<User>('users', page, pageSize, filter);
    const warehouses = db.getAll<Warehouse>('warehouses');

    const itemsWithRelations = result.items.map(item => ({
      ...item,
      warehouse: warehouses.find(w => w.id === item.warehouseId),
    }));

    return {
      code: 200,
      message: '获取用户列表成功',
      data: {
        ...result,
        items: itemsWithRelations,
      },
      timestamp: Date.now(),
    };
  }

  getUserById(id: number): ApiResponse<(User & { warehouse?: Warehouse }) | null> {
    const user = db.getById<User>('users', id);
    if (!user) {
      return {
        code: 404,
        message: '用户不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const warehouses = db.getAll<Warehouse>('warehouses');

    return {
      code: 200,
      message: '获取用户详情成功',
      data: {
        ...user,
        warehouse: warehouses.find(w => w.id === user.warehouseId),
      },
      timestamp: Date.now(),
    };
  }

  createUser(data: {
    username: string; realName: string; role: string; warehouseId?: number;
  }): ApiResponse<User | null> {
    const users = db.getAll<User>('users');
    const existing = users.find(u => u.username === data.username);

    if (existing) {
      return {
        code: 400,
        message: '用户名已存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const newUser = db.create<User>('users', {
      username: data.username,
      realName: data.realName,
      role: data.role as any,
      warehouseId: data.warehouseId,
      createdAt: new Date().toISOString(),
    } as any);

    return {
      code: 201,
      message: '创建用户成功',
      data: newUser,
      timestamp: Date.now(),
    };
  }

  updateUser(id: number, data: {
    realName?: string; role?: string; warehouseId?: number;
  }): ApiResponse<User | null> {
    const user = db.getById<User>('users', id);
    if (!user) {
      return {
        code: 404,
        message: '用户不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const updates: Partial<User> = {};
    if (data.realName !== undefined) updates.realName = data.realName;
    if (data.role !== undefined) updates.role = data.role as any;
    if (data.warehouseId !== undefined) updates.warehouseId = data.warehouseId;

    const updated = db.update<User>('users', id, updates);

    return {
      code: 200,
      message: '更新用户成功',
      data: updated,
      timestamp: Date.now(),
    };
  }

  deleteUser(id: number): ApiResponse<null> {
    const success = db.delete('users', id);
    if (!success) {
      return {
        code: 404,
        message: '用户不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    return {
      code: 200,
      message: '删除用户成功',
      data: null,
      timestamp: Date.now(),
    };
  }

  getSystemRules(): ApiResponse<SystemRule[]> {
    return {
      code: 200,
      message: '获取系统规则成功',
      data: db.getAll<SystemRule>('systemRules'),
      timestamp: Date.now(),
    };
  }

  updateSystemRule(id: number, ruleValue: string, description: string): ApiResponse<SystemRule | null> {
    const rule = db.getById<SystemRule>('systemRules', id);
    if (!rule) {
      return {
        code: 404,
        message: '规则不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const updated = db.update<SystemRule>('systemRules', id, {
      ruleValue,
      description,
      updatedAt: new Date().toISOString(),
    });

    return {
      code: 200,
      message: '更新规则成功',
      data: updated,
      timestamp: Date.now(),
    };
  }

  getApprovalFlows(): ApiResponse<ApprovalFlow[]> {
    return {
      code: 200,
      message: '获取审批流程成功',
      data: db.getAll<ApprovalFlow>('approvalFlows'),
      timestamp: Date.now(),
    };
  }

  updateApprovalFlow(id: number, data: {
    thresholdAmount?: number;
    level1Role?: string;
    level2Role?: string;
    escalationHours?: number;
    isActive?: boolean;
  }): ApiResponse<ApprovalFlow | null> {
    const flow = db.getById<ApprovalFlow>('approvalFlows', id);
    if (!flow) {
      return {
        code: 404,
        message: '审批流程不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const updates: Partial<ApprovalFlow> = {};
    if (data.thresholdAmount !== undefined) updates.thresholdAmount = data.thresholdAmount;
    if (data.level1Role !== undefined) updates.level1Role = data.level1Role as any;
    if (data.level2Role !== undefined) updates.level2Role = data.level2Role as any;
    if (data.escalationHours !== undefined) updates.escalationHours = data.escalationHours;
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    const updated = db.update<ApprovalFlow>('approvalFlows', id, updates);

    return {
      code: 200,
      message: '更新审批流程成功',
      data: updated,
      timestamp: Date.now(),
    };
  }

  getWarehouses(): ApiResponse<Warehouse[]> {
    return {
      code: 200,
      message: '获取仓库列表成功',
      data: db.getAll<Warehouse>('warehouses'),
      timestamp: Date.now(),
    };
  }
}

export const systemService = new SystemService();
