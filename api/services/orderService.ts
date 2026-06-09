import { db } from '../db/database.js';
import type {
  ApiResponse, PaginatedResponse, Order, OrderItem, FulfillmentRecommendation, Warehouse, Product, CustomsDocument,
} from '../../shared/types.js';

class OrderService {
  getOrderList(
    page: number,
    pageSize: number,
    status?: string,
    userId?: number,
  ): ApiResponse<PaginatedResponse<Order & { fulfilledWarehouse?: Warehouse }>> {
    const filter = (item: Order) => {
      if (status && item.status !== status) return false;
      if (userId && item.userId !== userId) return false;
      return true;
    };

    const result = db.paginate<Order>('orders', page, pageSize, filter);
    const warehouses = db.getAll<Warehouse>('warehouses');

    const itemsWithRelations = result.items.map(item => ({
      ...item,
      fulfilledWarehouse: warehouses.find(w => w.id === item.fulfilledWarehouseId),
    }));

    return {
      code: 200,
      message: '获取订单列表成功',
      data: {
        ...result,
        items: itemsWithRelations,
      },
      timestamp: Date.now(),
    };
  }

  getOrderById(id: number): ApiResponse<(Order & {
    items: (OrderItem & { product?: Product })[];
    fulfilledWarehouse?: Warehouse;
  }) | null> {
    const order = db.getById<Order>('orders', id);
    if (!order) {
      return {
        code: 404,
        message: '订单不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const products = db.getAll<Product>('products');
    const warehouses = db.getAll<Warehouse>('warehouses');

    const itemsWithProducts = order.items.map(item => ({
      ...item,
      product: products.find(p => p.id === item.productId),
    }));

    return {
      code: 200,
      message: '获取订单详情成功',
      data: {
        ...order,
        items: itemsWithProducts,
        fulfilledWarehouse: warehouses.find(w => w.id === order.fulfilledWarehouseId),
      },
      timestamp: Date.now(),
    };
  }

  getFulfillmentRecommendation(orderId: number): ApiResponse<FulfillmentRecommendation | null> {
    const recommendation = db.getFulfillmentRecommendation(orderId);
    if (!recommendation) {
      return {
        code: 404,
        message: '订单不存在或无法生成分仓推荐',
        data: null,
        timestamp: Date.now(),
      };
    }

    return {
      code: 200,
      message: '获取分仓推荐成功',
      data: recommendation,
      timestamp: Date.now(),
    };
  }

  confirmFulfillment(orderId: number, warehouseId: number): ApiResponse<Order | null> {
    const order = db.getById<Order>('orders', orderId);
    if (!order) {
      return {
        code: 404,
        message: '订单不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const updated = db.update<Order>('orders', orderId, {
      fulfilledWarehouseId: warehouseId,
      status: 'processing',
    });

    return {
      code: 200,
      message: '确认分仓成功',
      data: updated,
      timestamp: Date.now(),
    };
  }

  generateCustomsDocuments(orderId: number): ApiResponse<CustomsDocument[]> {
    const order = db.getById<Order>('orders', orderId);
    if (!order) {
      return {
        code: 404,
        message: '订单不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const documents: CustomsDocument[] = [
      {
        type: 'invoice',
        url: `/api/orders/${orderId}/documents/invoice`,
        filename: `INV-${order.orderNo}.pdf`,
      },
      {
        type: 'packing_list',
        url: `/api/orders/${orderId}/documents/packing_list`,
        filename: `PL-${order.orderNo}.pdf`,
      },
      {
        type: 'declaration',
        url: `/api/orders/${orderId}/documents/declaration`,
        filename: `DEC-${order.orderNo}.pdf`,
      },
    ];

    return {
      code: 200,
      message: '生成清关文件成功',
      data: documents,
      timestamp: Date.now(),
    };
  }

  updateOrderStatus(id: number, status: string): ApiResponse<Order | null> {
    const order = db.getById<Order>('orders', id);
    if (!order) {
      return {
        code: 404,
        message: '订单不存在',
        data: null,
        timestamp: Date.now(),
      };
    }

    const updated = db.update<Order>('orders', id, { status });

    return {
      code: 200,
      message: '更新订单状态成功',
      data: updated,
      timestamp: Date.now(),
    };
  }
}

export const orderService = new OrderService();
