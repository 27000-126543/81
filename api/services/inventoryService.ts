import { db } from '../db/database.js';
import type {
  ApiResponse, PaginatedResponse, Inventory, InventoryAlert, TransferSuggestion, TransferOrder, Product, Warehouse,
} from '../../shared/types.js';

class InventoryService {
  getInventoryList(
    page: number,
    pageSize: number,
    warehouseId?: number,
    productId?: number,
  ): ApiResponse<PaginatedResponse<Inventory & { product?: Product; warehouse?: Warehouse }>> {
    const filter = (item: Inventory) => {
      if (warehouseId && item.warehouseId !== warehouseId) return false;
      if (productId && item.productId !== productId) return false;
      return true;
    };

    const result = db.paginate<Inventory>('inventory', page, pageSize, filter);
    const products = db.getAll<Product>('products');
    const warehouses = db.getAll<Warehouse>('warehouses');

    const itemsWithRelations = result.items.map(item => ({
      ...item,
      product: products.find(p => p.id === item.productId),
      warehouse: warehouses.find(w => w.id === item.warehouseId),
    }));

    return {
      code: 200,
      message: '获取库存列表成功',
      data: {
        ...result,
        items: itemsWithRelations,
      },
      timestamp: Date.now(),
    };
  }

  getInventoryById(id: number): ApiResponse<(Inventory & { product?: Product; warehouse?: Warehouse }) | null> {
    const inventory = db.getById<Inventory>('inventory', id);
    if (!inventory) {
      return {
        code: 404,
        message: '库存记录不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const products = db.getAll<Product>('products');
    const warehouses = db.getAll<Warehouse>('warehouses');

    return {
      code: 200,
      message: '获取库存详情成功',
      data: {
        ...inventory,
        product: products.find(p => p.id === inventory.productId),
        warehouse: warehouses.find(w => w.id === inventory.warehouseId),
      },
      timestamp: Date.now(),
    };
  }

  getInventoryAlerts(type?: string, severity?: string): ApiResponse<InventoryAlert[]> {
    let alerts = db.getInventoryAlerts();
    
    if (type) {
      alerts = alerts.filter(a => a.type === type);
    }
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }
    
    return {
      code: 200,
      message: '获取库存预警成功',
      data: alerts,
      timestamp: Date.now(),
    };
  }

  getTransferSuggestions(): ApiResponse<TransferSuggestion[]> {
    return {
      code: 200,
      message: '获取调拨建议成功',
      data: db.getTransferSuggestions(),
      timestamp: Date.now(),
    };
  }

  getTransferOrders(
    page: number,
    pageSize: number,
    status?: string,
  ): ApiResponse<PaginatedResponse<TransferOrder & { sourceWarehouse?: Warehouse; targetWarehouse?: Warehouse }>> {
    const filter = (item: TransferOrder) => {
      if (status && item.status !== status) return false;
      return true;
    };

    const result = db.paginate<TransferOrder>('transferOrders', page, pageSize, filter);
    const warehouses = db.getAll<Warehouse>('warehouses');

    const itemsWithRelations = result.items.map(item => ({
      ...item,
      sourceWarehouse: warehouses.find(w => w.id === item.sourceWarehouseId),
      targetWarehouse: warehouses.find(w => w.id === item.targetWarehouseId),
    }));

    return {
      code: 200,
      message: '获取调拨单列表成功',
      data: {
        ...result,
        items: itemsWithRelations,
      },
      timestamp: Date.now(),
    };
  }

  createTransferOrder(data: {
    sourceWarehouseId: number; targetWarehouseId: number; transportMode: string; items: Array<{ productId: number; quantity: number }>;
  }): ApiResponse<TransferOrder | null> {
    const warehouses = db.getAll<Warehouse>('warehouses');
    const sourceWarehouse = warehouses.find(w => w.id === data.sourceWarehouseId);
    const targetWarehouse = warehouses.find(w => w.id === data.targetWarehouseId);

    if (!sourceWarehouse || !targetWarehouse) {
      return {
        code: 400,
        message: '仓库不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const newOrder = db.create<TransferOrder>('transferOrders', {
      orderNo: `TRF-${String(Date.now()).padStart(6, '0')}`,
      sourceWarehouseId: data.sourceWarehouseId,
      targetWarehouseId: data.targetWarehouseId,
      transportMode: data.transportMode as any,
      estimatedCost: Math.round((Math.random() * 5000 + 500) * 100) / 100,
      estimatedDays: 14,
      status: 'pending',
      createdAt: new Date().toISOString(),
      items: data.items.map((item, index) => ({
        id: index + 1,
        transferOrderId: 0,
        productId: item.productId,
        quantity: item.quantity,
      })),
    } as any);

    newOrder.items.forEach(item => {
      item.transferOrderId = newOrder.id;
    });

    return {
      code: 201,
      message: '创建调拨单成功',
      data: newOrder,
      timestamp: Date.now(),
    };
  }

  updateTransferOrderStatus(id: number, status: string, approverId: number): ApiResponse<TransferOrder | null> {
    const order = db.getById<TransferOrder>('transferOrders', id);
    if (!order) {
      return {
        code: 404,
        message: '调拨单不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const updated = db.update<TransferOrder>('transferOrders', id, {
      status: status as any,
      approvedBy: approverId,
      approvedAt: new Date().toISOString(),
    });

    return {
      code: 200,
      message: '更新调拨单状态成功',
      data: updated,
      timestamp: Date.now(),
    };
  }

  getTransferOrderById(id: number): ApiResponse<(TransferOrder & { sourceWarehouse?: Warehouse; targetWarehouse?: Warehouse }) | null> {
    const order = db.getById<TransferOrder>('transferOrders', id);
    if (!order) {
      return {
        code: 404,
        message: '调拨单不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const warehouses = db.getAll<Warehouse>('warehouses');

    return {
      code: 200,
      message: '获取调拨单详情成功',
      data: {
        ...order,
        sourceWarehouse: warehouses.find(w => w.id === order.sourceWarehouseId),
        targetWarehouse: warehouses.find(w => w.id === order.targetWarehouseId),
      },
      timestamp: Date.now(),
    };
  }

  executeTransfer(id: number): ApiResponse<TransferOrder | null> {
    const order = db.getById<TransferOrder>('transferOrders', id);
    if (!order) {
      return {
        code: 404,
        message: '调拨单不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    if (order.status !== 'approved') {
      return {
        code: 400,
        message: '只有已批准的调拨单才能执行',
        data: null,
        timestamp: Date.now(),
      };
    }

    const inventory = db.getAll<Inventory>('inventory');

    for (const item of order.items) {
      const sourceInv = inventory.find(inv => inv.warehouseId === order.sourceWarehouseId && inv.productId === item.productId);
      const targetInv = inventory.find(inv => inv.warehouseId === order.targetWarehouseId && inv.productId === item.productId);

      if (sourceInv) {
        db.update<Inventory>('inventory', sourceInv.id, {
          quantity: sourceInv.quantity - item.quantity,
          lastUpdated: new Date().toISOString(),
        });
      }
      if (targetInv) {
        db.update<Inventory>('inventory', targetInv.id, {
          quantity: targetInv.quantity + item.quantity,
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    const updated = db.update<TransferOrder>('transferOrders', id, { status: 'completed' as any });

    return {
      code: 200,
      message: '调拨执行成功',
      data: updated,
      timestamp: Date.now(),
    };
  }
}

export const inventoryService = new InventoryService();
