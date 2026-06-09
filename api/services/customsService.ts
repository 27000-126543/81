import { db } from '../db/database.js';
import type {
  ApiResponse, PaginatedResponse, CustomsDeclaration, CustomsTrajectory, WorkOrder, Order, User,
} from '../../shared/types.js';

class CustomsService {
  getDeclarations(
    page: number,
    pageSize: number,
    status?: string,
    port?: string,
  ): ApiResponse<PaginatedResponse<CustomsDeclaration & { order?: Order }>> {
    const filter = (item: CustomsDeclaration) => {
      if (status && item.status !== status) return false;
      if (port && item.port !== port) return false;
      return true;
    };

    const result = db.paginate<CustomsDeclaration>('customsDeclarations', page, pageSize, filter);
    const orders = db.getAll<Order>('orders');

    const itemsWithRelations = result.items.map(item => ({
      ...item,
      order: orders.find(o => o.id === item.orderId),
    }));

    return {
      code: 200,
      message: '获取清关申报列表成功',
      data: {
        ...result,
        items: itemsWithRelations,
      },
      timestamp: Date.now(),
    };
  }

  getDeclarationById(id: number): ApiResponse<(CustomsDeclaration & { order?: Order }) | null> {
    const declaration = db.getById<CustomsDeclaration>('customsDeclarations', id);
    if (!declaration) {
      return {
        code: 404,
        message: '申报记录不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const orders = db.getAll<Order>('orders');

    return {
      code: 200,
      message: '获取申报详情成功',
      data: {
        ...declaration,
        order: orders.find(o => o.id === declaration.orderId),
      },
      timestamp: Date.now(),
    };
  }

  getDeclarationTrajectory(declarationId: number): ApiResponse<CustomsTrajectory[]> {
    const declaration = db.getById<CustomsDeclaration>('customsDeclarations', declarationId);
    if (!declaration) {
      return {
        code: 404,
        message: '申报记录不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const trajectory: CustomsTrajectory[] = [
      {
        id: 1,
        declarationId,
        status: 'declared',
        location: declaration.port,
        description: '已提交申报',
        timestamp: declaration.declaredAt || new Date().toISOString(),
      },
    ];

    if (declaration.status === 'inspecting' || declaration.status === 'detained' || declaration.status === 'cleared') {
      trajectory.push({
        id: 2,
        declarationId,
        status: 'inspecting',
        location: declaration.port,
        description: '海关查验中',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      });
    }

    if (declaration.status === 'cleared') {
      trajectory.push({
        id: 3,
        declarationId,
        status: 'cleared',
        location: declaration.port,
        description: '已放行',
        timestamp: declaration.clearedAt || new Date().toISOString(),
      });
    }

    return {
      code: 200,
      message: '获取清关轨迹成功',
      data: trajectory,
      timestamp: Date.now(),
    };
  }

  getWorkOrders(
    page: number,
    pageSize: number,
    status?: string,
    priority?: string,
  ): ApiResponse<PaginatedResponse<WorkOrder & { customsDeclaration?: CustomsDeclaration; level1Approver?: User; level2Approver?: User }>> {
    const filter = (item: WorkOrder) => {
      if (status && item.status !== status) return false;
      if (priority && item.priority !== priority) return false;
      return true;
    };

    const result = db.paginate<WorkOrder>('workOrders', page, pageSize, filter);
    const declarations = db.getAll<CustomsDeclaration>('customsDeclarations');
    const users = db.getAll<User>('users');

    const itemsWithRelations = result.items.map(item => ({
      ...item,
      customsDeclaration: declarations.find(d => d.id === item.customsDeclarationId),
      level1Approver: users.find(u => u.id === item.level1ApproverId),
      level2Approver: users.find(u => u.id === item.level2ApproverId),
    }));

    return {
      code: 200,
      message: '获取工单列表成功',
      data: {
        ...result,
        items: itemsWithRelations,
      },
      timestamp: Date.now(),
    };
  }

  getWorkOrderById(id: number): ApiResponse<(WorkOrder & { customsDeclaration?: CustomsDeclaration }) | null> {
    const workOrder = db.getById<WorkOrder>('workOrders', id);
    if (!workOrder) {
      return {
        code: 404,
        message: '工单不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const declarations = db.getAll<CustomsDeclaration>('customsDeclarations');

    return {
      code: 200,
      message: '获取工单详情成功',
      data: {
        ...workOrder,
        customsDeclaration: declarations.find(d => d.id === workOrder.customsDeclarationId),
      },
      timestamp: Date.now(),
    };
  }

  createWorkOrder(data: {
    customsDeclarationId: number; type: string; priority: string; description: string;
  }): ApiResponse<WorkOrder | null> {
    const declaration = db.getById<CustomsDeclaration>('customsDeclarations', data.customsDeclarationId);
    if (!declaration) {
      return {
        code: 400,
        message: '申报记录不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const newWorkOrder = db.create<WorkOrder>('workOrders', {
      workOrderNo: `WO-${String(Date.now()).padStart(6, '0')}`,
      customsDeclarationId: data.customsDeclarationId,
      type: data.type as any,
      priority: data.priority as any,
      status: 'pending',
      currentApprovalLevel: 1,
      isEscalated: false,
      createdAt: new Date().toISOString(),
    } as any);

    return {
      code: 201,
      message: '创建工单成功',
      data: newWorkOrder,
      timestamp: Date.now(),
    };
  }

  approveWorkOrder(id: number, level: number, approverId: number, comment: string): ApiResponse<WorkOrder | null> {
    const workOrder = db.getById<WorkOrder>('workOrders', id);
    if (!workOrder) {
      return {
        code: 404,
        message: '工单不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    if (level === 1) {
      const updated = db.update<WorkOrder>('workOrders', id, {
        level1ApproverId: approverId,
        level1Comment: comment,
        level1ApprovedAt: new Date().toISOString(),
        currentApprovalLevel: 2,
      });

      return {
        code: 200,
        message: '一级审批成功，已提交二级审批',
        data: updated,
        timestamp: Date.now(),
      };
    }

    if (level === 2) {
      const updated = db.update<WorkOrder>('workOrders', id, {
        level2ApproverId: approverId,
        level2Comment: comment,
        level2ApprovedAt: new Date().toISOString(),
        status: 'approved',
        currentApprovalLevel: 2,
      });

      return {
        code: 200,
        message: '二级审批成功，工单已完成',
        data: updated,
        timestamp: Date.now(),
      };
    }

    return {
      code: 400,
      message: '无效的审批级别',
      data: null,
      timestamp: Date.now(),
    };
  }

  rejectWorkOrder(id: number, level: number, approverId: number, comment: string): ApiResponse<WorkOrder | null> {
    const workOrder = db.getById<WorkOrder>('workOrders', id);
    if (!workOrder) {
      return {
        code: 404,
        message: '工单不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    if (level === 1) {
      const updated = db.update<WorkOrder>('workOrders', id, {
        level1ApproverId: approverId,
        level1Comment: comment,
        level1ApprovedAt: new Date().toISOString(),
        status: 'rejected',
      });

      return {
        code: 200,
        message: '工单已驳回',
        data: updated,
        timestamp: Date.now(),
      };
    }

    if (level === 2) {
      const updated = db.update<WorkOrder>('workOrders', id, {
        level2ApproverId: approverId,
        level2Comment: comment,
        level2ApprovedAt: new Date().toISOString(),
        status: 'rejected',
      });

      return {
        code: 200,
        message: '工单已驳回',
        data: updated,
        timestamp: Date.now(),
      };
    }

    return {
      code: 400,
      message: '无效的审批级别',
      data: null,
      timestamp: Date.now(),
    };
  }

  escalateWorkOrder(id: number): ApiResponse<WorkOrder | null> {
    const workOrder = db.getById<WorkOrder>('workOrders', id);
    if (!workOrder) {
      return {
        code: 404,
        message: '工单不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const updated = db.update<WorkOrder>('workOrders', id, {
      isEscalated: true,
      status: 'escalated',
    });

    return {
      code: 200,
      message: '工单已升级',
      data: updated,
      timestamp: Date.now(),
    };
  }

  updateDeclarationStatus(id: number, status: string): ApiResponse<CustomsDeclaration | null> {
    const declaration = db.getById<CustomsDeclaration>('customsDeclarations', id);
    if (!declaration) {
      return {
        code: 404,
        message: '申报记录不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const updates: Partial<CustomsDeclaration> = { status: status as any };
    if (status === 'cleared') {
      updates.clearedAt = new Date().toISOString();
    }

    const updated = db.update<CustomsDeclaration>('customsDeclarations', id, updates);

    return {
      code: 200,
      message: '更新申报状态成功',
      data: updated,
      timestamp: Date.now(),
    };
  }
}

export const customsService = new CustomsService();
