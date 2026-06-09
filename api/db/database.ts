import NodeCache from 'node-cache';
import {
  mockUsers, mockWarehouses, mockProducts, mockInventory,
  mockOrders, mockTransferOrders, mockCustomsDeclarations,
  mockWorkOrders, mockLogisticsTrackings, mockLogisticsExceptions,
  mockCompensations, mockReturns, mockRefunds,
  mockApprovalFlows, mockSystemRules,
  generateTransferSuggestions, generateInventoryAlerts
} from './mockData';
import type {
  User, Warehouse, Product, Inventory, TransferOrder, TransferItem,
  Order, OrderItem, CustomsDeclaration, WorkOrder, LogisticsTracking,
  LogisticsException, Compensation, ReturnRecord, Refund, ApprovalFlow,
  SystemRule, TransferSuggestion, InventoryAlert,
  DashboardKPI, WarehouseTurnover, PortClearanceTime, SalesTrendItem,
  LogisticsExceptionPoint, SupplyChainMetrics, FulfillmentRecommendation,
  WarehouseOption
} from '../../shared/types';

class Database {
  private cache: NodeCache;
  private idCounters: Record<string, number>;

  constructor() {
    this.cache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
    this.idCounters = {};
    this.initialize();
  }

  private initialize() {
    this.cache.set('users', JSON.parse(JSON.stringify(mockUsers)));
    this.cache.set('warehouses', JSON.parse(JSON.stringify(mockWarehouses)));
    this.cache.set('products', JSON.parse(JSON.stringify(mockProducts)));
    this.cache.set('inventory', JSON.parse(JSON.stringify(mockInventory)));
    this.cache.set('orders', JSON.parse(JSON.stringify(mockOrders)));
    this.cache.set('transferOrders', JSON.parse(JSON.stringify(mockTransferOrders)));
    this.cache.set('customsDeclarations', JSON.parse(JSON.stringify(mockCustomsDeclarations)));
    this.cache.set('workOrders', JSON.parse(JSON.stringify(mockWorkOrders)));
    this.cache.set('logisticsTrackings', JSON.parse(JSON.stringify(mockLogisticsTrackings)));
    this.cache.set('logisticsExceptions', JSON.parse(JSON.stringify(mockLogisticsExceptions)));
    this.cache.set('compensations', JSON.parse(JSON.stringify(mockCompensations)));
    this.cache.set('returns', JSON.parse(JSON.stringify(mockReturns)));
    this.cache.set('refunds', JSON.parse(JSON.stringify(mockRefunds)));
    this.cache.set('approvalFlows', JSON.parse(JSON.stringify(mockApprovalFlows)));
    this.cache.set('systemRules', JSON.parse(JSON.stringify(mockSystemRules)));

    const allData = this.cache.keys();
    allData.forEach(key => {
      const data = this.cache.get<any[]>(key) || [];
      if (data.length > 0) {
        this.idCounters[key] = Math.max(...data.map((item: any) => item.id)) + 1;
      } else {
        this.idCounters[key] = 1;
      }
    });
  }

  private getNextId(collection: string): number {
    const id = this.idCounters[collection] || 1;
    this.idCounters[collection] = id + 1;
    return id;
  }

  getAll<T>(collection: string): T[] {
    return this.cache.get<T[]>(collection) || [];
  }

  getById<T>(collection: string, id: number): T | undefined {
    const items = this.getAll<T>(collection);
    return items.find((item: any) => item.id === id);
  }

  create<T extends { id?: number }>(collection: string, item: T): T {
    const items = this.getAll<T>(collection);
    const newItem = { ...item, id: this.getNextId(collection) } as T;
    items.push(newItem);
    this.cache.set(collection, items);
    return newItem;
  }

  update<T extends { id: number }>(collection: string, id: number, updates: Partial<T>): T | undefined {
    const items = this.getAll<T>(collection);
    const index = items.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates } as T;
      this.cache.set(collection, items);
      return items[index];
    }
    return undefined;
  }

  delete(collection: string, id: number): boolean {
    const items = this.getAll<any>(collection);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items.splice(index, 1);
      this.cache.set(collection, items);
      return true;
    }
    return false;
  }

  paginate<T>(collection: string, page: number, pageSize: number, filter?: (item: T) => boolean) {
    let items = this.getAll<T>(collection);
    if (filter) {
      items = items.filter(filter);
    }
    const total = items.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedItems = items.slice(start, end);
    return {
      items: paginatedItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  getDashboardKPI(): DashboardKPI {
    const inventory = this.getAll<Inventory>('inventory');
    const products = this.getAll<Product>('products');
    const orders = this.getAll<Order>('orders');
    const declarations = this.getAll<CustomsDeclaration>('customsDeclarations');
    const workOrders = this.getAll<WorkOrder>('workOrders');
    const exceptions = this.getAll<LogisticsException>('logisticsExceptions');
    const returns = this.getAll<ReturnRecord>('returns');

    const totalInventoryValue = inventory.reduce((sum, inv) => {
      const product = products.find(p => p.id === inv.productId);
      return sum + (product ? product.declaredValue * inv.quantity : 0);
    }, 0);

    const totalOrders = orders.filter(o => o.status !== 'cancelled').length;
    const fulfilledOrders = orders.filter(o => o.status === 'delivered').length;
    const clearedDeclarations = declarations.filter(d => d.status === 'cleared');

    let totalClearanceHours = 0;
    clearedDeclarations.forEach(d => {
      if (d.declaredAt && d.clearedAt) {
        totalClearanceHours += (new Date(d.clearedAt).getTime() - new Date(d.declaredAt).getTime()) / (1000 * 60 * 60);
      }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentOrders = orders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo);
    const dailySales = recentOrders.reduce((sum, o) => sum + o.totalAmount, 0) / 30;

    const recentReturns = returns.filter(r => new Date(r.createdAt) >= thirtyDaysAgo);

    return {
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      inventoryTurnoverRate: Math.round((dailySales * 365 / totalInventoryValue) * 100) / 100,
      orderFulfillmentRate: totalOrders > 0 ? Math.round((fulfilledOrders / totalOrders) * 10000) / 100 : 0,
      avgCustomsClearanceHours: clearedDeclarations.length > 0 ? Math.round((totalClearanceHours / clearedDeclarations.length) * 10) / 10 : 0,
      dailySales: Math.round(dailySales * 100) / 100,
      returnRate: recentOrders.length > 0 ? Math.round((recentReturns.length / recentOrders.length) * 10000) / 100 : 0,
      pendingWorkOrders: workOrders.filter(w => w.status === 'pending' || w.status === 'escalated').length,
      logisticsExceptions: exceptions.filter(e => e.status === 'pending').length,
    };
  }

  getWarehouseTurnover(): WarehouseTurnover[] {
    const warehouses = this.getAll<Warehouse>('warehouses');
    const inventory = this.getAll<Inventory>('inventory');
    const products = this.getAll<Product>('products');
    const orders = this.getAll<Order>('orders');

    return warehouses.map(warehouse => {
      const whInventory = inventory.filter(i => i.warehouseId === warehouse.id);
      const inventoryValue = whInventory.reduce((sum, inv) => {
        const product = products.find(p => p.id === inv.productId);
        return sum + (product ? product.declaredValue * inv.quantity : 0);
      }, 0);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const whOrders = orders.filter(o =>
        o.fulfilledWarehouseId === warehouse.id &&
        new Date(o.createdAt) >= thirtyDaysAgo &&
        o.status !== 'cancelled'
      );
      const sales = whOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      const turnoverRate = inventoryValue > 0 ? Math.round((sales * 12 / inventoryValue) * 100) / 100 : 0;
      const trend = turnoverRate > 3 ? 'up' : turnoverRate < 1.5 ? 'down' : 'stable';

      return {
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        turnoverRate,
        trend,
      };
    });
  }

  getPortClearanceTime(): PortClearanceTime[] {
    const declarations = this.getAll<CustomsDeclaration>('customsDeclarations');
    const ports = [...new Set(declarations.map(d => d.port))];

    return ports.map(port => {
      const portDeclarations = declarations.filter(d => d.port === port && d.status === 'cleared');
      let totalHours = 0;
      portDeclarations.forEach(d => {
        if (d.declaredAt && d.clearedAt) {
          totalHours += (new Date(d.clearedAt).getTime() - new Date(d.declaredAt).getTime()) / (1000 * 60 * 60);
        }
      });

      const avgHours = portDeclarations.length > 0 ? Math.round((totalHours / portDeclarations.length) * 10) / 10 : 0;
      const congestionIndex = Math.min(100, Math.round(avgHours * 5));

      const data: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date();
        day.setDate(day.getDate() - i);
        const dayStr = day.toISOString().split('T')[0];
        const dayDeclarations = declarations.filter(d =>
          d.port === port &&
          d.status === 'cleared' &&
          d.clearedAt &&
          d.clearedAt.startsWith(dayStr)
        );
        let dayHours = 0;
        dayDeclarations.forEach(d => {
          if (d.declaredAt && d.clearedAt) {
            dayHours += (new Date(d.clearedAt).getTime() - new Date(d.declaredAt).getTime()) / (1000 * 60 * 60);
          }
        });
        data.push(dayDeclarations.length > 0 ? Math.round((dayHours / dayDeclarations.length) * 10) / 10 : 0);
      }

      return { port, avgHours, congestionIndex, data };
    });
  }

  getSalesTrend(): SalesTrendItem[] {
    const orders = this.getAll<Order>('orders');
    const returns = this.getAll<ReturnRecord>('returns');
    const data: SalesTrendItem[] = [];

    for (let i = 29; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().split('T')[0];

      const dayOrders = orders.filter(o => o.createdAt.startsWith(dayStr) && o.status !== 'cancelled');
      const dayReturns = returns.filter(r => r.createdAt.startsWith(dayStr));

      const sales = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const returnCount = dayReturns.length;

      data.push({
        date: dayStr,
        sales: Math.round(sales * 100) / 100,
        returns: returnCount,
      });
    }

    return data;
  }

  getLogisticsExceptionMap(): LogisticsExceptionPoint[] {
    const exceptions = this.getAll<LogisticsException>('logisticsExceptions');
    const trackings = this.getAll<LogisticsTracking>('logisticsTrackings');
    const warehouses = this.getAll<Warehouse>('warehouses');

    const points: LogisticsExceptionPoint[] = [];
    let id = 1;

    const locationMap: Record<string, [number, number]> = {
      'Pacific Ocean': [35.0, -140.0],
      'Atlantic Ocean': [30.0, -40.0],
      'Indian Ocean': [-10.0, 70.0],
      'Los Angeles': [34.0522, -118.2437],
      'New York': [40.7128, -74.0060],
      'Rotterdam': [51.9244, 4.4777],
      'Hamburg': [53.5511, 9.9937],
      'Singapore': [1.3521, 103.8198],
      'Bangkok': [13.7563, 100.5018],
      'Shanghai': [31.2304, 121.4737],
      'Tokyo': [35.6762, 139.6503],
      'Sydney': [-33.8688, 151.2093],
    };

    exceptions.forEach(exception => {
      if (exception.status !== 'resolved') {
        const tracking = trackings.find(t => t.id === exception.logisticsTrackingId);
        if (tracking) {
          const lastPoint = tracking.trajectory[tracking.trajectory.length - 1];
          const location = lastPoint.location.includes('港') || lastPoint.location.includes('Port')
            ? 'Pacific Ocean'
            : lastPoint.location;

          const matchedWarehouse = warehouses.find(w => w.name.includes(location));
          const coordinates = locationMap[location] ||
            (matchedWarehouse ? [matchedWarehouse.latitude, matchedWarehouse.longitude] as [number, number] :
            [Math.random() * 180 - 90, Math.random() * 360 - 180] as [number, number]);

          points.push({
            id: id++,
            type: exception.type,
            location,
            coordinates,
            count: 1,
          });
        }
      }
    });

    return points;
  }

  getInventoryAlerts(): InventoryAlert[] {
    const inventory = this.getAll<Inventory>('inventory');
    const warehouses = this.getAll<Warehouse>('warehouses');
    const products = this.getAll<Product>('products');
    return generateInventoryAlerts(inventory, warehouses, products);
  }

  getTransferSuggestions(): TransferSuggestion[] {
    const inventory = this.getAll<Inventory>('inventory');
    const warehouses = this.getAll<Warehouse>('warehouses');
    const products = this.getAll<Product>('products');
    return generateTransferSuggestions(inventory, warehouses, products);
  }

  getFulfillmentRecommendation(orderId: number): FulfillmentRecommendation | null {
    const order = this.getById<Order>('orders', orderId);
    if (!order) return null;

    const inventory = this.getAll<Inventory>('inventory');
    const warehouses = this.getAll<Warehouse>('warehouses');
    const products = this.getAll<Product>('products');
    const systemRules = this.getAll<SystemRule>('systemRules');

    const getRule = (key: string) => {
      const rule = systemRules.find(r => r.ruleKey === key);
      return rule ? parseFloat(rule.ruleValue) : 0;
    };

    const options: WarehouseOption[] = warehouses.map(warehouse => {
      const availableQuantity = Math.min(...order.items.map(item => {
        const inv = inventory.find(i => i.warehouseId === warehouse.id && i.productId === item.productId);
        return inv ? inv.quantity - inv.reservedQuantity : 0;
      }));

      const countryDistance: Record<string, Record<string, number>> = {
        'United States': { US: 2, EU: 15, SoutheastAsia: 20, China: 25 },
        'Germany': { US: 15, EU: 2, SoutheastAsia: 25, China: 20 },
        'France': { US: 14, EU: 2, SoutheastAsia: 24, China: 19 },
        'United Kingdom': { US: 12, EU: 3, SoutheastAsia: 22, China: 21 },
        'Netherlands': { US: 13, EU: 2, SoutheastAsia: 23, China: 20 },
        'Singapore': { US: 22, EU: 24, SoutheastAsia: 3, China: 10 },
        'Thailand': { US: 23, EU: 25, SoutheastAsia: 4, China: 8 },
        'Japan': { US: 18, EU: 28, SoutheastAsia: 7, China: 5 },
        'Australia': { US: 20, EU: 30, SoutheastAsia: 10, China: 15 },
        'Canada': { US: 3, EU: 14, SoutheastAsia: 22, China: 24 },
      };

      const distances = countryDistance[order.shippingCountry] || { US: 10, EU: 12, SoutheastAsia: 15, China: 18 };
      const baseDays = distances[warehouse.region] || 10;
      const estimatedDeliveryDays = baseDays + Math.floor(Math.random() * 3);

      const totalWeight = order.items.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId);
        return sum + (product ? product.weight * item.quantity : 0);
      }, 0);

      const shippingCost = Math.round(totalWeight * getRule(`transport_cost_${'air'}`) * 100) / 100;
      const customsRiskScore = Math.floor(Math.random() * 30) + 10;
      const congestionIndex = Math.floor(Math.random() * 50) + 10;

      const score = (availableQuantity > 0 ? 40 : 0) +
        (100 - estimatedDeliveryDays * 2) * 0.3 +
        (100 - shippingCost) * 0.15 +
        (100 - customsRiskScore) * 0.1 +
        (100 - congestionIndex) * 0.05;

      return {
        warehouse,
        availableQuantity,
        estimatedDeliveryDays,
        shippingCost,
        customsRiskScore,
        congestionIndex,
        totalScore: Math.round(score),
      };
    }).filter(o => o.availableQuantity > 0).sort((a, b) => b.totalScore - a.totalScore);

    return {
      orderId,
      options,
      recommended: 0,
    };
  }

  getSupplyChainMetrics(startDate: string, endDate: string): SupplyChainMetrics[] {
    const orders = this.getAll<Order>('orders').filter(o =>
      o.createdAt >= startDate && o.createdAt <= endDate
    );
    const declarations = this.getAll<CustomsDeclaration>('customsDeclarations').filter(d =>
      d.declaredAt && d.declaredAt >= startDate && d.declaredAt <= endDate
    );
    const compensations = this.getAll<Compensation>('compensations').filter(c =>
      c.approvedAt && c.approvedAt >= startDate && c.approvedAt <= endDate
    );

    const totalOrders = orders.length;
    const fulfilledOrders = orders.filter(o => o.status === 'delivered').length;
    const fulfillmentRate = totalOrders > 0 ? Math.round((fulfilledOrders / totalOrders) * 10000) / 100 : 0;

    let totalDeliveryDays = 0;
    orders.filter(o => o.status === 'delivered').forEach(o => {
      totalDeliveryDays += 10 + Math.random() * 20;
    });
    const avgDeliveryDays = fulfilledOrders > 0 ? Math.round((totalDeliveryDays / fulfilledOrders) * 10) / 10 : 0;

    const totalTransportCost = Math.round(orders.length * 25 * 100) / 100;
    const totalCustomsTax = declarations.reduce((sum, d) => sum + d.taxAmount, 0);
    const totalCompensation = compensations.reduce((sum, c) => sum + c.calculatedAmount, 0);

    const inventory = this.getAll<Inventory>('inventory');
    const products = this.getAll<Product>('products');
    const totalInventoryValue = inventory.reduce((sum, inv) => {
      const product = products.find(p => p.id === inv.productId);
      return sum + (product ? product.declaredValue * inv.quantity : 0);
    }, 0);
    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const inventoryTurnover = totalInventoryValue > 0 ? Math.round((totalSales / totalInventoryValue) * 100) / 100 : 0;

    const returns = this.getAll<ReturnRecord>('returns').filter(r =>
      r.createdAt >= startDate && r.createdAt <= endDate
    );
    const returnRate = totalOrders > 0 ? Math.round((returns.length / totalOrders) * 10000) / 100 : 0;

    return [{
      period: `${startDate} 至 ${endDate}`,
      totalOrders,
      fulfilledOrders,
      fulfillmentRate,
      avgDeliveryDays,
      totalTransportCost,
      totalCustomsTax,
      totalCompensation,
      inventoryTurnover,
      returnRate,
    }];
  }
}

export const db = new Database();
