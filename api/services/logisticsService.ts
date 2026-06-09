import { db } from '../db/database.js';
import type {
  ApiResponse, PaginatedResponse, LogisticsTracking, LogisticsException, Compensation, Order,
} from '../../shared/types.js';

class LogisticsService {
  getTrackings(
    page: number,
    pageSize: number,
    status?: string,
    transportMode?: string,
  ): ApiResponse<PaginatedResponse<LogisticsTracking & { order?: Order }>> {
    const filter = (item: LogisticsTracking) => {
      if (status && item.status !== status) return false;
      if (transportMode && item.transportMode !== transportMode) return false;
      return true;
    };

    const result = db.paginate<LogisticsTracking>('logisticsTrackings', page, pageSize, filter);
    const orders = db.getAll<Order>('orders');

    const itemsWithRelations = result.items.map(item => ({
      ...item,
      order: orders.find(o => o.id === item.orderId),
    }));

    return {
      code: 200,
      message: '获取物流追踪列表成功',
      data: {
        ...result,
        items: itemsWithRelations,
      },
      timestamp: Date.now(),
    };
  }

  getTrackingById(id: number): ApiResponse<(LogisticsTracking & { order?: Order }) | null> {
    const tracking = db.getById<LogisticsTracking>('logisticsTrackings', id);
    if (!tracking) {
      return {
        code: 404,
        message: '物流追踪不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const orders = db.getAll<Order>('orders');

    return {
      code: 200,
      message: '获取物流详情成功',
      data: {
        ...tracking,
        order: orders.find(o => o.id === tracking.orderId),
      },
      timestamp: Date.now(),
    };
  }

  getTrackingByOrderId(orderId: number): ApiResponse<LogisticsTracking | null> {
    const trackings = db.getAll<LogisticsTracking>('logisticsTrackings');
    const tracking = trackings.find(t => t.orderId === orderId);

    if (!tracking) {
      return {
        code: 404,
        message: '该订单暂无物流信息',
        data: null,
        timestamp: Date.now(),
      };
    }

    return {
      code: 200,
      message: '获取物流信息成功',
      data: tracking,
      timestamp: Date.now(),
    };
  }

  getExceptions(
    page: number,
    pageSize: number,
    type?: string,
    status?: string,
  ): ApiResponse<PaginatedResponse<LogisticsException & { tracking?: LogisticsTracking; compensation?: Compensation }>> {
    const filter = (item: LogisticsException) => {
      if (type && item.type !== type) return false;
      if (status && item.status !== status) return false;
      return true;
    };

    const result = db.paginate<LogisticsException>('logisticsExceptions', page, pageSize, filter);
    const trackings = db.getAll<LogisticsTracking>('logisticsTrackings');
    const compensations = db.getAll<Compensation>('compensations');

    const itemsWithRelations = result.items.map(item => ({
      ...item,
      tracking: trackings.find(t => t.id === item.logisticsTrackingId),
      compensation: compensations.find(c => c.exceptionId === item.id),
    }));

    return {
      code: 200,
      message: '获取物流异常列表成功',
      data: {
        ...result,
        items: itemsWithRelations,
      },
      timestamp: Date.now(),
    };
  }

  getExceptionById(id: number): ApiResponse<(LogisticsException & { tracking?: LogisticsTracking; compensation?: Compensation }) | null> {
    const exception = db.getById<LogisticsException>('logisticsExceptions', id);
    if (!exception) {
      return {
        code: 404,
        message: '异常记录不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const trackings = db.getAll<LogisticsTracking>('logisticsTrackings');
    const compensations = db.getAll<Compensation>('compensations');

    return {
      code: 200,
      message: '获取异常详情成功',
      data: {
        ...exception,
        tracking: trackings.find(t => t.id === exception.logisticsTrackingId),
        compensation: compensations.find(c => c.exceptionId === exception.id),
      },
      timestamp: Date.now(),
    };
  }

  createException(data: {
    logisticsTrackingId: number; type: string; description: string;
  }): ApiResponse<LogisticsException | null> {
    const tracking = db.getById<LogisticsTracking>('logisticsTrackings', data.logisticsTrackingId);
    if (!tracking) {
      return {
        code: 400,
        message: '物流追踪不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const newException = db.create<LogisticsException>('logisticsExceptions', {
      logisticsTrackingId: data.logisticsTrackingId,
      type: data.type as any,
      description: data.description,
      occurredAt: new Date().toISOString(),
      status: 'pending',
    } as any);

    return {
      code: 201,
      message: '创建异常记录成功',
      data: newException,
      timestamp: Date.now(),
    };
  }

  updateExceptionStatus(id: number, status: string): ApiResponse<LogisticsException | null> {
    const exception = db.getById<LogisticsException>('logisticsExceptions', id);
    if (!exception) {
      return {
        code: 404,
        message: '异常记录不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const updated = db.update<LogisticsException>('logisticsExceptions', id, { status });

    return {
      code: 200,
      message: '更新异常状态成功',
      data: updated,
      timestamp: Date.now(),
    };
  }

  getCompensations(
    page: number,
    pageSize: number,
    status?: string,
  ): ApiResponse<PaginatedResponse<Compensation & { exception?: LogisticsException }>> {
    const filter = (item: Compensation) => {
      if (status && item.status !== status) return false;
      return true;
    };

    const result = db.paginate<Compensation>('compensations', page, pageSize, filter);
    const exceptions = db.getAll<LogisticsException>('logisticsExceptions');

    const itemsWithRelations = result.items.map(item => ({
      ...item,
      exception: exceptions.find(e => e.id === item.exceptionId),
    }));

    return {
      code: 200,
      message: '获取补偿列表成功',
      data: {
        ...result,
        items: itemsWithRelations,
      },
      timestamp: Date.now(),
    };
  }

  calculateCompensation(exceptionId: number): ApiResponse<Compensation | null> {
    const exception = db.getById<LogisticsException>('logisticsExceptions', exceptionId);
    if (!exception) {
      return {
        code: 404,
        message: '异常记录不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const trackings = db.getAll<LogisticsTracking>('logisticsTrackings');
    const tracking = trackings.find(t => t.id === exception.logisticsTrackingId);
    const orders = db.getAll<Order>('orders');
    const order = tracking ? orders.find(o => o.id === tracking.orderId) : null;

    const baseAmount = order ? order.totalAmount : 100;
    const compensationAmount = exception.type === 'lost' ? baseAmount : baseAmount * 0.5;
    const breakdown = [
      { item: '商品价值', amount: Math.round(compensationAmount * 0.7 * 100) / 100, description: '订单商品金额' },
      { item: '运费', amount: Math.round(compensationAmount * 0.2 * 100) / 100, description: '已支付运费' },
      { item: '补偿', amount: Math.round(compensationAmount * 0.1 * 100) / 100, description: '额外补偿' },
    ];

    const existingCompensations = db.getAll<Compensation>('compensations');
    const existing = existingCompensations.find(c => c.exceptionId === exceptionId);

    if (existing) {
      return {
        code: 200,
        message: '获取补偿核算结果成功',
        data: existing,
        timestamp: Date.now(),
      };
    }

    const compensation: Compensation = {
      id: 0,
      exceptionId,
      policyNo: `POL-${String(Date.now()).padStart(6, '0')}`,
      calculatedAmount: Math.round(compensationAmount * 100) / 100,
      status: 'pending',
      compensationType: compensationAmount > 500 ? 'refund_and_compensation' : 'refund',
      breakdown,
    };

    return {
      code: 200,
      message: '核算补偿金额成功',
      data: compensation,
      timestamp: Date.now(),
    };
  }

  createCompensation(exceptionId: number, approverId?: number, compensationData?: Partial<Compensation>): ApiResponse<Compensation | null> {
    const result = this.calculateCompensation(exceptionId);
    if (!result.data) {
      return result as ApiResponse<null>;
    }

    const calculatedAmount = result.data.calculatedAmount;
    const status = calculatedAmount > 500 ? 'pending' : 'approved';

    const newCompensation = db.create<Compensation>('compensations', {
      ...result.data,
      ...compensationData,
      approvedBy: status === 'approved' ? (approverId || 1) : undefined,
      approvedAt: status === 'approved' ? new Date().toISOString() : undefined,
      status,
    } as any);

    return {
      code: 201,
      message: status === 'approved' ? '创建补偿记录成功，已自动批准' : '创建补偿记录成功，等待审批',
      data: newCompensation,
      timestamp: Date.now(),
    };
  }

  approveCompensation(id: number, approverId: number): ApiResponse<Compensation | null> {
    const compensation = db.getById<Compensation>('compensations', id);
    if (!compensation) {
      return {
        code: 404,
        message: '补偿记录不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const updated = db.update<Compensation>('compensations', id, {
      status: 'approved',
      approvedBy: approverId,
      approvedAt: new Date().toISOString(),
    });

    return {
      code: 200,
      message: '补偿已批准',
      data: updated,
      timestamp: Date.now(),
    };
  }

  updateTrackingStatus(id: number, status: string, location: string, description?: string): ApiResponse<LogisticsTracking | null> {
    const tracking = db.getById<LogisticsTracking>('logisticsTrackings', id);
    if (!tracking) {
      return {
        code: 404,
        message: '物流追踪不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const newPoint = {
      timestamp: new Date().toISOString(),
      location,
      status,
      description: description || `包裹${location}`,
    };

    const updatedTrajectory = [newPoint, ...tracking.trajectory];

    const updated = db.update<LogisticsTracking>('logisticsTrackings', id, {
      status,
      trajectory: updatedTrajectory,
    });

    return {
      code: 200,
      message: '物流状态更新成功',
      data: updated,
      timestamp: Date.now(),
    };
  }
}

export const logisticsService = new LogisticsService();
