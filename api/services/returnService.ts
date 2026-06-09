import { db } from '../db/database.js';
import type {
  ApiResponse, PaginatedResponse, ReturnRecord, Refund, Order, Product, ReturnLiability, Inventory,
} from '../../shared/types.js';

class ReturnService {
  getReturns(
    page: number,
    pageSize: number,
    status?: string,
    userId?: number,
  ): ApiResponse<PaginatedResponse<ReturnRecord & { order?: Order; product?: Product; refund?: Refund }>> {
    const filter = (item: ReturnRecord) => {
      if (status && item.status !== status) return false;
      if (userId) {
        const orders = db.getAll<Order>('orders');
        const order = orders.find(o => o.id === item.orderId);
        if (order && order.userId !== userId) return false;
      }
      return true;
    };

    const result = db.paginate<ReturnRecord>('returns', page, pageSize, filter);
    const orders = db.getAll<Order>('orders');
    const products = db.getAll<Product>('products');
    const refunds = db.getAll<Refund>('refunds');

    const itemsWithRelations = result.items.map(item => ({
      ...item,
      order: orders.find(o => o.id === item.orderId),
      product: products.find(p => p.id === item.productId),
      refund: refunds.find(r => r.returnId === item.id),
    }));

    return {
      code: 200,
      message: '获取退货列表成功',
      data: {
        ...result,
        items: itemsWithRelations,
      },
      timestamp: Date.now(),
    };
  }

  getReturnById(id: number): ApiResponse<(ReturnRecord & { order?: Order; product?: Product; refund?: Refund }) | null> {
    const returnRecord = db.getById<ReturnRecord>('returns', id);
    if (!returnRecord) {
      return {
        code: 404,
        message: '退货记录不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const orders = db.getAll<Order>('orders');
    const products = db.getAll<Product>('products');
    const refunds = db.getAll<Refund>('refunds');

    return {
      code: 200,
      message: '获取退货详情成功',
      data: {
        ...returnRecord,
        order: orders.find(o => o.id === returnRecord.orderId),
        product: products.find(p => p.id === returnRecord.productId),
        refund: refunds.find(r => r.returnId === returnRecord.id),
      },
      timestamp: Date.now(),
    };
  }

  createReturn(data: {
    orderId: number; productId: number; quantity: number; reason: string;
  }): ApiResponse<ReturnRecord | null> {
    const order = db.getById<Order>('orders', data.orderId);
    if (!order) {
      return {
        code: 400,
        message: '订单不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const orderItem = order.items.find(i => i.productId === data.productId);
    if (!orderItem) {
      return {
        code: 400,
        message: '订单中不存在该商品',
        data: null,
        timestamp: Date.now(),
      };
    }

    const newReturn = db.create<ReturnRecord>('returns', {
      returnNo: `RET-${String(Date.now()).padStart(6, '0')}`,
      orderId: data.orderId,
      productId: data.productId,
      quantity: data.quantity,
      reason: data.reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    } as any);

    return {
      code: 201,
      message: '创建退货申请成功',
      data: newReturn,
      timestamp: Date.now(),
    };
  }

  updateReturnLiability(id: number, liability: ReturnLiability, reason?: string): ApiResponse<(ReturnRecord & { order?: Order; product?: Product; refund?: Refund }) | null> {
    const returnRecord = db.getById<ReturnRecord>('returns', id);
    if (!returnRecord) {
      return {
        code: 404,
        message: '退货记录不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    db.update<ReturnRecord>('returns', id, {
      liability,
      status: 'processing',
    });

    const updated = db.getById<ReturnRecord>('returns', id);
    const orders = db.getAll<Order>('orders');
    const products = db.getAll<Product>('products');
    const refunds = db.getAll<Refund>('refunds');

    return {
      code: 200,
      message: '责任判定成功',
      data: {
        ...updated!,
        order: orders.find(o => o.id === updated!.orderId),
        product: products.find(p => p.id === updated!.productId),
        refund: refunds.find(r => r.returnId === updated!.id),
      },
      timestamp: Date.now(),
    };
  }

  processRefund(id: number): ApiResponse<(ReturnRecord & { order?: Order; product?: Product; refund?: Refund; inventoryChange?: { before: number; after: number; change: number; reason: string } }) | null> {
    const returnRecord = db.getById<ReturnRecord>('returns', id);
    if (!returnRecord) {
      return {
        code: 404,
        message: '退货记录不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    if (!returnRecord.liability) {
      return {
        code: 400,
        message: '请先进行责任判定',
        data: null,
        timestamp: Date.now(),
      };
    }

    const order = db.getById<Order>('orders', returnRecord.orderId);
    if (!order?.fulfilledWarehouseId) {
      return {
        code: 400,
        message: '该订单尚未分配发货仓，请先确认订单的发货仓',
        data: null,
        timestamp: Date.now(),
      };
    }

    const orderItem = order.items.find(i => i.productId === returnRecord.productId);
    if (!orderItem) {
      return {
        code: 400,
        message: '订单项不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const deductAmount = returnRecord.liability === 'customer' ? 15 : 0;
    const refundAmount = Math.max(0, Math.round((orderItem.unitPrice * returnRecord.quantity - deductAmount) * 100) / 100);

    db.create<Refund>('refunds', {
      returnId: id,
      amount: refundAmount,
      status: 'completed',
      processedAt: new Date().toISOString(),
    } as any);

    db.update<ReturnRecord>('returns', id, { status: 'refunded' });

    const inventory = db.getAll<Inventory>('inventory');
    const warehouseId = order.fulfilledWarehouseId!;
    const inv = inventory.find(i => i.warehouseId === warehouseId && i.productId === returnRecord.productId);
    const inventoryBefore = inv?.quantity || 0;
    let inventoryAfter = inventoryBefore;
    let changeReason = '';

    if (returnRecord.liability === 'logistics') {
      if (inv) {
        const updatedInv = db.update<Inventory>('inventory', inv.id, {
          quantity: inv.quantity + returnRecord.quantity,
          lastUpdated: new Date().toISOString(),
        });
        inventoryAfter = updatedInv?.quantity || inventoryBefore;
      }
      changeReason = '物流责任，商品退回后可重新销售，库存增加';
    } else if (returnRecord.liability === 'customer') {
      changeReason = '用户责任，不影响销售库存';
    } else if (returnRecord.liability === 'quality') {
      changeReason = '品质问题，商品报废处理，不增加库存';
    }

    const updated = db.getById<ReturnRecord>('returns', id);
    const orders = db.getAll<Order>('orders');
    const products = db.getAll<Product>('products');
    const refunds = db.getAll<Refund>('refunds');

    return {
      code: 200,
      message: '退款处理成功',
      data: {
        ...updated!,
        order: orders.find(o => o.id === updated!.orderId),
        product: products.find(p => p.id === updated!.productId),
        refund: refunds.find(r => r.returnId === updated!.id),
        inventoryChange: {
          before: inventoryBefore,
          after: inventoryAfter,
          change: inventoryAfter - inventoryBefore,
          reason: changeReason,
        },
      },
      timestamp: Date.now(),
    };
  }

  processExchange(id: number): ApiResponse<(ReturnRecord & { order?: Order; product?: Product; refund?: Refund; inventoryChange?: { before: number; after: number; change: number; reason: string } }) | null> {
    const returnRecord = db.getById<ReturnRecord>('returns', id);
    if (!returnRecord) {
      return {
        code: 404,
        message: '退货记录不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    if (!returnRecord.liability) {
      return {
        code: 400,
        message: '请先进行责任判定',
        data: null,
        timestamp: Date.now(),
      };
    }

    const order = db.getById<Order>('orders', returnRecord.orderId);
    if (!order?.fulfilledWarehouseId) {
      return {
        code: 400,
        message: '该订单尚未分配发货仓，请先确认订单的发货仓',
        data: null,
        timestamp: Date.now(),
      };
    }

    const inventory = db.getAll<Inventory>('inventory');
    const warehouseId = order.fulfilledWarehouseId!;
    const inv = inventory.find(i => i.warehouseId === warehouseId && i.productId === returnRecord.productId);
    const inventoryBefore = inv?.quantity || 0;
    let inventoryAfter = inventoryBefore;
    let changeReason = '';

    if (inv && inv.quantity >= returnRecord.quantity) {
      const updatedInv = db.update<Inventory>('inventory', inv.id, {
        quantity: inv.quantity - returnRecord.quantity,
        lastUpdated: new Date().toISOString(),
      });
      inventoryAfter = updatedInv?.quantity || inventoryBefore;
    }

    if (returnRecord.liability === 'logistics') {
      if (inv) {
        const updatedInv = db.update<Inventory>('inventory', inv.id, {
          quantity: inventoryAfter + returnRecord.quantity,
          lastUpdated: new Date().toISOString(),
        });
        inventoryAfter = updatedInv?.quantity || inventoryAfter;
      }
      changeReason = '换货处理，发出新商品扣减库存，退回商品入库，库存不变';
    } else {
      changeReason = '换货处理，发出新商品扣减库存，退回商品不入库';
    }

    db.update<ReturnRecord>('returns', id, { status: 'exchanged' });

    const updated = db.getById<ReturnRecord>('returns', id);
    const orders = db.getAll<Order>('orders');
    const products = db.getAll<Product>('products');
    const refunds = db.getAll<Refund>('refunds');

    return {
      code: 200,
      message: '换货处理成功',
      data: {
        ...updated!,
        order: orders.find(o => o.id === updated!.orderId),
        product: products.find(p => p.id === updated!.productId),
        refund: refunds.find(r => r.returnId === updated!.id),
        inventoryChange: {
          before: inventoryBefore,
          after: inventoryAfter,
          change: inventoryAfter - inventoryBefore,
          reason: changeReason,
        },
      },
      timestamp: Date.now(),
    };
  }

  processScrap(id: number): ApiResponse<(ReturnRecord & { order?: Order; product?: Product; refund?: Refund; inventoryChange?: { before: number; after: number; change: number; reason: string } }) | null> {
    const returnRecord = db.getById<ReturnRecord>('returns', id);
    if (!returnRecord) {
      return {
        code: 404,
        message: '退货记录不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    if (!returnRecord.liability) {
      return {
        code: 400,
        message: '请先进行责任判定',
        data: null,
        timestamp: Date.now(),
      };
    }

    const order = db.getById<Order>('orders', returnRecord.orderId);
    if (!order?.fulfilledWarehouseId) {
      return {
        code: 400,
        message: '该订单尚未分配发货仓，请先确认订单的发货仓',
        data: null,
        timestamp: Date.now(),
      };
    }

    const inventory = db.getAll<Inventory>('inventory');
    const warehouseId = order.fulfilledWarehouseId!;
    const inv = inventory.find(i => i.warehouseId === warehouseId && i.productId === returnRecord.productId);
    const inventoryBefore = inv?.quantity || 0;

    db.update<ReturnRecord>('returns', id, { status: 'scrapped' });

    const updated = db.getById<ReturnRecord>('returns', id);
    const orders = db.getAll<Order>('orders');
    const products = db.getAll<Product>('products');
    const refunds = db.getAll<Refund>('refunds');

    return {
      code: 200,
      message: '报废处理成功',
      data: {
        ...updated!,
        order: orders.find(o => o.id === updated!.orderId),
        product: products.find(p => p.id === updated!.productId),
        refund: refunds.find(r => r.returnId === updated!.id),
        inventoryChange: {
          before: inventoryBefore,
          after: inventoryBefore,
          change: 0,
          reason: '商品报废处理，不进入库存',
        },
      },
      timestamp: Date.now(),
    };
  }

  updateReturnStatus(id: number, status: string): ApiResponse<ReturnRecord | null> {
    const returnRecord = db.getById<ReturnRecord>('returns', id);
    if (!returnRecord) {
      return {
        code: 404,
        message: '退货记录不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const updated = db.update<ReturnRecord>('returns', id, { status });

    return {
      code: 200,
      message: '更新退货状态成功',
      data: updated,
      timestamp: Date.now(),
    };
  }
}

export const returnService = new ReturnService();
