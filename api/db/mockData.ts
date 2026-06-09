import type {
  User, Warehouse, Product, Inventory, TransferOrder, TransferItem,
  Order, OrderItem, CustomsDeclaration, WorkOrder, LogisticsTracking,
  LogisticsException, Compensation, ReturnRecord, Refund, ApprovalFlow,
  SystemRule, TransferSuggestion, InventoryAlert, LogisticsTrajectoryPoint
} from '../../shared/types';

export const mockWarehouses: Warehouse[] = [
  { id: 1, name: '洛杉矶仓', code: 'WH-LA', region: 'US', address: '123 Logistics Ave, Los Angeles, CA 90001', latitude: 34.0522, longitude: -118.2437, capacity: 50000, isActive: true },
  { id: 2, name: '新泽西仓', code: 'WH-NJ', region: 'US', address: '456 Distribution Dr, Newark, NJ 07102', latitude: 40.7357, longitude: -74.1724, capacity: 40000, isActive: true },
  { id: 3, name: '鹿特丹仓', code: 'WH-RTM', region: 'EU', address: '789 Havenstraat, Rotterdam 3072 AP', latitude: 51.9244, longitude: 4.4777, capacity: 45000, isActive: true },
  { id: 4, name: '汉堡仓', code: 'WH-HAM', region: 'EU', address: '321 Hafenstraße, Hamburg 20359', latitude: 53.5511, longitude: 9.9937, capacity: 35000, isActive: true },
  { id: 5, name: '新加坡仓', code: 'WH-SG', region: 'SoutheastAsia', address: '654 Jurong Port Rd, Singapore 619158', latitude: 1.3048, longitude: 103.7189, capacity: 30000, isActive: true },
  { id: 6, name: '曼谷仓', code: 'WH-BKK', region: 'SoutheastAsia', address: '987 Logistics Park, Bangkok 10150', latitude: 13.7563, longitude: 100.5018, capacity: 25000, isActive: true },
  { id: 7, name: '深圳仓', code: 'WH-SZ', region: 'China', address: '147 深圳保税区', latitude: 22.5431, longitude: 114.0579, capacity: 60000, isActive: true },
];

export const mockProducts: Product[] = [
  { id: 1, sku: 'SKU-001', name: '智能无线耳机 Pro', category: '电子产品', weight: 0.15, volume: 0.001, declaredValue: 89.99, hsCode: '85176290', originCountry: 'China' },
  { id: 2, sku: 'SKU-002', name: '蓝牙音箱 Mini', category: '电子产品', weight: 0.3, volume: 0.003, declaredValue: 45.50, hsCode: '85181000', originCountry: 'China' },
  { id: 3, sku: 'SKU-003', name: '智能手表 S5', category: '智能穿戴', weight: 0.08, volume: 0.0008, declaredValue: 199.00, hsCode: '85171210', originCountry: 'China' },
  { id: 4, sku: 'SKU-004', name: 'USB-C 快充头 65W', category: '配件', weight: 0.12, volume: 0.0006, declaredValue: 29.99, hsCode: '85044090', originCountry: 'China' },
  { id: 5, sku: 'SKU-005', name: '机械键盘 RGB', category: '电脑配件', weight: 0.8, volume: 0.004, declaredValue: 79.00, hsCode: '84716060', originCountry: 'China' },
  { id: 6, sku: 'SKU-006', name: '无线鼠标 人体工学', category: '电脑配件', weight: 0.1, volume: 0.0005, declaredValue: 35.00, hsCode: '84716070', originCountry: 'China' },
  { id: 7, sku: 'SKU-007', name: '手机壳 透明防摔', category: '手机配件', weight: 0.03, volume: 0.0002, declaredValue: 15.99, hsCode: '39269090', originCountry: 'China' },
  { id: 8, sku: 'SKU-008', name: '数据线 编织 2米', category: '配件', weight: 0.05, volume: 0.0001, declaredValue: 12.99, hsCode: '85444290', originCountry: 'China' },
  { id: 9, sku: 'SKU-009', name: '运动蓝牙耳机', category: '电子产品', weight: 0.06, volume: 0.0007, declaredValue: 59.99, hsCode: '85176290', originCountry: 'China' },
  { id: 10, sku: 'SKU-010', name: '平板支架 可调节', category: '配件', weight: 0.25, volume: 0.002, declaredValue: 25.50, hsCode: '83024900', originCountry: 'China' },
  { id: 11, sku: 'SKU-011', name: '摄像头 1080P', category: '电子产品', weight: 0.2, volume: 0.0015, declaredValue: 49.99, hsCode: '85258013', originCountry: 'China' },
  { id: 12, sku: 'SKU-012', name: '移动电源 20000mAh', category: '配件', weight: 0.35, volume: 0.0025, declaredValue: 39.99, hsCode: '85076000', originCountry: 'China' },
];

export const mockUsers: User[] = [
  { id: 1, username: 'admin', realName: '系统管理员', role: 'admin', createdAt: '2025-01-01T00:00:00Z' },
  { id: 2, username: 'director', realName: '张总监', role: 'operation_director', createdAt: '2025-01-02T00:00:00Z' },
  { id: 3, username: 'customs1', realName: '李关务', role: 'customs_officer', createdAt: '2025-01-03T00:00:00Z' },
  { id: 4, username: 'wh_la', realName: '王主管', role: 'warehouse_manager', warehouseId: 1, createdAt: '2025-01-04T00:00:00Z' },
  { id: 5, username: 'wh_rtm', realName: 'Pierre', role: 'warehouse_manager', warehouseId: 3, createdAt: '2025-01-05T00:00:00Z' },
  { id: 6, username: 'consumer1', realName: '消费者小明', role: 'consumer', createdAt: '2025-01-06T00:00:00Z' },
];

function generateInventory(): Inventory[] {
  const inventory: Inventory[] = [];
  let id = 1;
  mockWarehouses.forEach(warehouse => {
    mockProducts.forEach(product => {
      const baseQuantity = Math.floor(Math.random() * 2000) + 200;
      const safetyStock = Math.floor(baseQuantity * 0.2);
      inventory.push({
        id: id++,
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: baseQuantity,
        reservedQuantity: Math.floor(baseQuantity * 0.1),
        safetyStock,
        lastUpdated: new Date().toISOString(),
      });
    });
  });
  return inventory;
}

export const mockInventory: Inventory[] = generateInventory();

const customerNames = ['John Smith', 'Emma Johnson', 'Michael Brown', 'Sarah Davis', 'David Wilson', 'Lisa Anderson', 'James Taylor', 'Anna Martinez', 'Robert Garcia', 'Jennifer Lee'];
const countries = ['United States', 'Germany', 'France', 'United Kingdom', 'Netherlands', 'Singapore', 'Thailand', 'Japan', 'Australia', 'Canada'];
const cities = ['New York', 'Los Angeles', 'Berlin', 'Paris', 'London', 'Rotterdam', 'Singapore', 'Bangkok', 'Tokyo', 'Sydney'];

function generateOrders(): Order[] {
  const orders: Order[] = [];
  const statuses = ['pending', 'processing', 'shipped', 'customs', 'delivered', 'cancelled'];
  for (let i = 1; i <= 100; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items: OrderItem[] = [];
    let totalAmount = 0;
    for (let j = 0; j < itemCount; j++) {
      const product = mockProducts[Math.floor(Math.random() * mockProducts.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      items.push({
        id: (i - 1) * 3 + j + 1,
        orderId: i,
        productId: product.id,
        quantity,
        unitPrice: product.declaredValue,
      });
      totalAmount += product.declaredValue * quantity;
    }
    const countryIdx = Math.floor(Math.random() * countries.length);
    orders.push({
      id: i,
      orderNo: `ORD-${String(i).padStart(6, '0')}`,
      userId: Math.random() > 0.7 ? 6 : undefined,
      customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
      shippingAddress: `${Math.floor(Math.random() * 999) + 1} Main Street`,
      shippingCountry: countries[countryIdx],
      shippingCity: cities[countryIdx],
      postalCode: String(Math.floor(Math.random() * 90000) + 10000),
      totalAmount: Math.round(totalAmount * 100) / 100,
      currency: 'USD',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      fulfilledWarehouseId: Math.random() > 0.3 ? mockWarehouses[Math.floor(Math.random() * mockWarehouses.length)].id : undefined,
      createdAt: date.toISOString(),
      items,
    });
  }
  return orders;
}

export const mockOrders: Order[] = generateOrders();

function generateTransferOrders(): TransferOrder[] {
  const orders: TransferOrder[] = [];
  const statuses = ['pending', 'approved', 'rejected', 'escalated'] as const;
  const transportModes = ['sea', 'air', 'rail'] as const;
  for (let i = 1; i <= 20; i++) {
    const sourceIdx = Math.floor(Math.random() * mockWarehouses.length);
    let targetIdx = Math.floor(Math.random() * mockWarehouses.length);
    while (targetIdx === sourceIdx) targetIdx = Math.floor(Math.random() * mockWarehouses.length);
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 20));
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items: TransferItem[] = [];
    for (let j = 0; j < itemCount; j++) {
      items.push({
        id: (i - 1) * 3 + j + 1,
        transferOrderId: i,
        productId: mockProducts[Math.floor(Math.random() * mockProducts.length)].id,
        quantity: Math.floor(Math.random() * 500) + 50,
      });
    }
    const mode = transportModes[Math.floor(Math.random() * transportModes.length)];
    const costMap = { sea: 0.5, air: 5, rail: 1.5 };
    const daysMap = { sea: 35, air: 7, rail: 21 };
    orders.push({
      id: i,
      orderNo: `TRF-${String(i).padStart(6, '0')}`,
      sourceWarehouseId: mockWarehouses[sourceIdx].id,
      targetWarehouseId: mockWarehouses[targetIdx].id,
      transportMode: mode,
      estimatedCost: Math.round((Math.random() * 5000 + 500) * 100) / 100,
      estimatedDays: daysMap[mode] + Math.floor(Math.random() * 5),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      approvedBy: Math.random() > 0.5 ? 2 : undefined,
      approvedAt: Math.random() > 0.5 ? date.toISOString() : undefined,
      createdAt: date.toISOString(),
      items,
    });
  }
  return orders;
}

export const mockTransferOrders: TransferOrder[] = generateTransferOrders();

function generateCustomsDeclarations(): CustomsDeclaration[] {
  const declarations: CustomsDeclaration[] = [];
  const ports = ['LA Port', 'NY Port', 'Rotterdam Port', 'Hamburg Port', 'Singapore Port', 'Shanghai Port'];
  const statuses = ['pending', 'declared', 'inspecting', 'detained', 'cleared', 'rejected'] as const;
  for (let i = 1; i <= 50; i++) {
    const order = mockOrders[i % mockOrders.length];
    const date = new Date(order.createdAt);
    date.setDate(date.getDate() + 1);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    declarations.push({
      id: i,
      declarationNo: `CUS-${String(i).padStart(6, '0')}`,
      orderId: order.id,
      port: ports[Math.floor(Math.random() * ports.length)],
      status,
      customsValue: Math.round(order.totalAmount * 1.1 * 100) / 100,
      taxAmount: Math.round(order.totalAmount * 0.15 * 100) / 100,
      declaredAt: date.toISOString(),
      clearedAt: status === 'cleared' ? new Date(date.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
    });
  }
  return declarations;
}

export const mockCustomsDeclarations: CustomsDeclaration[] = generateCustomsDeclarations();

function generateWorkOrders(): WorkOrder[] {
  const workOrders: WorkOrder[] = [];
  const types = ['inspection', 'detention', 'tax_dispute'] as const;
  const priorities = ['normal', 'high', 'urgent'] as const;
  const statuses = ['pending', 'approved', 'rejected', 'escalated'] as const;
  for (let i = 1; i <= 15; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 10));
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const level1Approved = status !== 'pending' && status !== 'escalated';
    const level2Approved = (status === 'approved' || status === 'rejected') && Math.random() > 0.3;
    workOrders.push({
      id: i,
      workOrderNo: `WO-${String(i).padStart(6, '0')}`,
      customsDeclarationId: (i % mockCustomsDeclarations.length) + 1,
      type: types[Math.floor(Math.random() * types.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      status,
      currentApprovalLevel: level2Approved ? 2 : level1Approved ? 2 : 1,
      level1ApproverId: level1Approved ? 3 : undefined,
      level1Comment: level1Approved ? '情况属实，已提交补充材料' : undefined,
      level1ApprovedAt: level1Approved ? new Date(date.getTime() + 3600000).toISOString() : undefined,
      level2ApproverId: level2Approved ? 2 : undefined,
      level2Comment: level2Approved ? '同意处理方案' : undefined,
      level2ApprovedAt: level2Approved ? new Date(date.getTime() + 7200000).toISOString() : undefined,
      isEscalated: status === 'escalated' || (Math.random() > 0.8 && status === 'pending'),
      createdAt: date.toISOString(),
    });
  }
  return workOrders;
}

export const mockWorkOrders: WorkOrder[] = generateWorkOrders();

function generateLogisticsTrackings(): LogisticsTracking[] {
  const trackings: LogisticsTracking[] = [];
  const carriers = ['DHL', 'FedEx', 'UPS', 'Maersk', 'COSCO', 'MSC'];
  const transportModes = ['sea', 'air', 'rail'] as const;
  for (let i = 1; i <= 80; i++) {
    const order = mockOrders[i % mockOrders.length];
    const trajectory: LogisticsTrajectoryPoint[] = [];
    const baseDate = new Date(order.createdAt);
    const locations = ['仓库出库', '国际机场/港口', '中转港', '目的国清关', '本地配送中心', '派送中'];
    for (let j = 0; j < locations.length; j++) {
      const pointDate = new Date(baseDate.getTime() + j * 24 * 60 * 60 * 1000 * (Math.random() * 0.5 + 0.5));
      trajectory.push({
        timestamp: pointDate.toISOString(),
        location: locations[j],
        status: j === locations.length - 1 ? 'delivered' : 'in_transit',
        description: `包裹${locations[j]}`,
      });
    }
    trackings.push({
      id: i,
      trackingNo: `TRK${String(Math.floor(Math.random() * 9000000000) + 1000000000)}`,
      orderId: order.id,
      carrier: carriers[Math.floor(Math.random() * carriers.length)],
      transportMode: transportModes[Math.floor(Math.random() * transportModes.length)],
      status: Math.random() > 0.2 ? 'delivered' : 'in_transit',
      trajectory,
      createdAt: order.createdAt,
    });
  }
  return trackings;
}

export const mockLogisticsTrackings: LogisticsTracking[] = generateLogisticsTrackings();

function generateLogisticsExceptions(): LogisticsException[] {
  const exceptions: LogisticsException[] = [];
  const types = ['delay', 'damage', 'lost'] as const;
  const descriptions = {
    delay: ['航班延误', '港口拥堵', '天气原因延误', '清关时间延长'],
    damage: ['外包装破损', '内物损坏', '浸水损坏', '挤压变形'],
    lost: ['包裹丢失', '扫描异常', '无法派送'],
  };
  for (let i = 1; i <= 25; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const descList = descriptions[type];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 15));
    exceptions.push({
      id: i,
      logisticsTrackingId: (i % mockLogisticsTrackings.length) + 1,
      type,
      description: descList[Math.floor(Math.random() * descList.length)],
      occurredAt: date.toISOString(),
      status: Math.random() > 0.5 ? 'resolved' : 'pending',
    });
  }
  return exceptions;
}

export const mockLogisticsExceptions: LogisticsException[] = generateLogisticsExceptions();

function generateCompensations(): Compensation[] {
  const compensations: Compensation[] = [];
  const statuses = ['pending', 'approved', 'rejected', 'escalated'] as const;
  for (let i = 1; i <= mockLogisticsExceptions.length; i++) {
    const exception = mockLogisticsExceptions[i - 1];
    const amount = Math.floor(Math.random() * 2000) + 100;
    compensations.push({
      id: i,
      exceptionId: exception.id,
      policyNo: `POL-${String(Math.floor(Math.random() * 900000) + 100000)}`,
      calculatedAmount: amount,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      approvedBy: Math.random() > 0.4 ? (amount > 500 ? 2 : 3) : undefined,
      approvedAt: Math.random() > 0.4 ? new Date().toISOString() : undefined,
      compensationType: amount > 500 ? 'refund_and_compensation' : 'refund',
      breakdown: [
        { item: '商品价值', amount: amount * 0.7, description: '订单商品金额' },
        { item: '运费', amount: amount * 0.2, description: '已支付运费' },
        { item: '补偿', amount: amount * 0.1, description: '额外补偿' },
      ],
    });
  }
  return compensations;
}

export const mockCompensations: Compensation[] = generateCompensations();

function generateReturns(): ReturnRecord[] {
  const returns: ReturnRecord[] = [];
  const reasons = ['商品质量问题', '尺寸不符', '与描述不符', '不想要了', '物流损坏'];
  const liabilities = ['customer', 'logistics', 'quality'] as const;
  const statuses = ['pending', 'processing', 'refunded', 'exchanged', 'scrapped'];
  for (let i = 1; i <= 30; i++) {
    const order = mockOrders[i % mockOrders.length];
    const item = order.items[0];
    const reason = reasons[Math.floor(Math.random() * reasons.length)];
    const liabilityIdx = reason === '商品质量问题' || reason === '与描述不符' ? 2 : reason === '物流损坏' ? 1 : 0;
    const date = new Date(order.createdAt);
    date.setDate(date.getDate() + Math.floor(Math.random() * 15) + 3);
    returns.push({
      id: i,
      orderId: order.id,
      returnNo: `RET-${String(i).padStart(6, '0')}`,
      productId: item.productId,
      quantity: item.quantity,
      reason,
      liability: Math.random() > 0.3 ? liabilities[liabilityIdx] : undefined,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt: date.toISOString(),
    });
  }
  return returns;
}

export const mockReturns: ReturnRecord[] = generateReturns();

function generateRefunds(): Refund[] {
  const refunds: Refund[] = [];
  for (let i = 1; i <= mockReturns.length; i++) {
    const ret = mockReturns[i - 1];
    if (ret.status === 'refunded') {
      const order = mockOrders.find(o => o.id === ret.orderId)!;
      const item = order.items.find(it => it.productId === ret.productId)!;
      const deductAmount = ret.liability === 'customer' ? 15 : 0;
      refunds.push({
        id: i,
        returnId: ret.id,
        amount: Math.round((item.unitPrice * ret.quantity - deductAmount) * 100) / 100,
        status: 'completed',
        processedAt: new Date(new Date(ret.createdAt).getTime() + 24 * 3600 * 1000).toISOString(),
      });
    }
  }
  return refunds;
}

export const mockRefunds: Refund[] = generateRefunds();

export const mockApprovalFlows: ApprovalFlow[] = [
  { id: 1, name: '清关查验工单审批', targetType: 'work_order', thresholdAmount: 0, level1Role: 'customs_officer', level2Role: 'operation_director', escalationHours: 24, isActive: true },
  { id: 2, name: '物流补偿审批', targetType: 'compensation', thresholdAmount: 500, level1Role: 'customs_officer', level2Role: 'operation_director', escalationHours: 24, isActive: true },
  { id: 3, name: '库存调拨审批', targetType: 'transfer_order', thresholdAmount: 10000, level1Role: 'warehouse_manager', level2Role: 'operation_director', escalationHours: 48, isActive: true },
];

export const mockSystemRules: SystemRule[] = [
  { id: 1, ruleKey: 'safety_stock_days_us', ruleValue: '30', description: '美国仓安全库存天数', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 2, ruleKey: 'safety_stock_days_eu', ruleValue: '45', description: '欧洲仓安全库存天数', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 3, ruleKey: 'safety_stock_days_asia', ruleValue: '20', description: '东南亚仓安全库存天数', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 4, ruleKey: 'transport_cost_sea', ruleValue: '0.5', description: '海运成本(美元/kg)', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 5, ruleKey: 'transport_cost_air', ruleValue: '5.0', description: '空运成本(美元/kg)', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 6, ruleKey: 'transport_cost_rail', ruleValue: '1.5', description: '铁路成本(美元/kg)', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 7, ruleKey: 'transport_days_sea', ruleValue: '35', description: '海运时效(天)', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 8, ruleKey: 'transport_days_air', ruleValue: '7', description: '空运时效(天)', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 9, ruleKey: 'transport_days_rail', ruleValue: '21', description: '铁路时效(天)', updatedAt: '2025-01-01T00:00:00Z' },
];

export function generateTransferSuggestions(
  inventoryList?: Inventory[],
  warehouseList?: Warehouse[],
  productList?: Product[]
): TransferSuggestion[] {
  const suggestions: TransferSuggestion[] = [];
  const inventory = inventoryList || mockInventory;
  const warehouses = warehouseList || mockWarehouses;
  const products = productList || mockProducts;

  const lowStockItems = inventory.filter(inv => inv.quantity < inv.safetyStock * 1.2);
  for (let i = 0; i < Math.min(lowStockItems.length, 10); i++) {
    const lowStock = lowStockItems[i];
    const targetWarehouse = warehouses.find(w => w.id === lowStock.warehouseId);
    if (!targetWarehouse) continue;

    const availableSources = inventory.filter(inv =>
      inv.productId === lowStock.productId &&
      inv.warehouseId !== lowStock.warehouseId &&
      inv.quantity > inv.safetyStock * 1.5
    );

    if (availableSources.length > 0) {
      const source = availableSources[Math.floor(Math.random() * availableSources.length)];
      const sourceWarehouse = warehouses.find(w => w.id === source.warehouseId);
      const product = products.find(p => p.id === lowStock.productId);
      if (!sourceWarehouse || !product) continue;

      const transportModes = ['sea', 'air', 'rail'] as const;
      const mode = transportModes[Math.floor(Math.random() * transportModes.length)];
      const costMap = { sea: 0.5, air: 5, rail: 1.5 };
      const daysMap = { sea: 35, air: 7, rail: 21 };
      const suggestedQty = Math.min(
        lowStock.safetyStock * 2 - lowStock.quantity,
        source.quantity - source.safetyStock
      );

      suggestions.push({
        id: `SUG-${String(i + 1).padStart(4, '0')}`,
        sourceWarehouse,
        targetWarehouse,
        product,
        suggestedQuantity: Math.max(Math.floor(suggestedQty), 50),
        recommendedTransportMode: mode,
        estimatedCost: Math.round(Math.max(suggestedQty, 50) * product.weight * costMap[mode] * 100) / 100,
        estimatedDays: daysMap[mode],
        urgencyScore: Math.max(0, Math.floor((lowStock.safetyStock - lowStock.quantity) / Math.max(1, lowStock.safetyStock) * 100)),
        reason: `${targetWarehouse.name}库存低于安全线，预计${daysMap[mode]}天可送达`,
      });
    }
  }

  if (suggestions.length === 0) {
    const sampleInv = inventory[0];
    const sampleProduct = products.find(p => p.id === sampleInv?.productId);
    const sampleSource = warehouses[0];
    const sampleTarget = warehouses[1];
    if (sampleProduct && sampleSource && sampleTarget) {
      suggestions.push({
        id: 'SUG-0001',
        sourceWarehouse: sampleSource,
        targetWarehouse: sampleTarget,
        product: sampleProduct,
        suggestedQuantity: 100,
        recommendedTransportMode: 'air',
        estimatedCost: Math.round(100 * sampleProduct.weight * 5 * 100) / 100,
        estimatedDays: 7,
        urgencyScore: 75,
        reason: `${sampleTarget.name}热销商品备货建议，预计7天可送达`,
      });
    }
  }

  return suggestions;
}

export function generateInventoryAlerts(
  inventoryList?: Inventory[],
  warehouseList?: Warehouse[],
  productList?: Product[]
): InventoryAlert[] {
  const alerts: InventoryAlert[] = [];
  const inventory = inventoryList || mockInventory;
  const warehouses = warehouseList || mockWarehouses;
  const products = productList || mockProducts;

  let id = 1;
  inventory.forEach(inv => {
    const product = products.find(p => p.id === inv.productId);
    const warehouse = warehouses.find(w => w.id === inv.warehouseId);
    if (!product || !warehouse) return;

    if (inv.quantity < inv.safetyStock * 0.5) {
      alerts.push({
        id: id++,
        warehouseId: inv.warehouseId,
        productId: inv.productId,
        type: 'low_stock',
        severity: 'high',
        currentStock: inv.quantity,
        recommendedAction: '紧急补货，建议空运',
        product,
        warehouse,
      });
    } else if (inv.quantity < inv.safetyStock) {
      alerts.push({
        id: id++,
        warehouseId: inv.warehouseId,
        productId: inv.productId,
        type: 'low_stock',
        severity: 'medium',
        currentStock: inv.quantity,
        recommendedAction: '尽快补货，建议海运',
        product,
        warehouse,
      });
    } else if (inv.quantity > inv.safetyStock * 4) {
      alerts.push({
        id: id++,
        warehouseId: inv.warehouseId,
        productId: inv.productId,
        type: 'overstock',
        severity: 'low',
        currentStock: inv.quantity,
        recommendedAction: '库存积压，建议促销或调拨',
        product,
        warehouse,
      });
    } else if (inv.quantity > inv.safetyStock * 3 && Math.random() > 0.7) {
      alerts.push({
        id: id++,
        warehouseId: inv.warehouseId,
        productId: inv.productId,
        type: 'slow_moving',
        severity: 'low',
        currentStock: inv.quantity,
        recommendedAction: '滞销预警，建议优化库存',
        product,
        warehouse,
      });
    }
  });

  return alerts;
}
