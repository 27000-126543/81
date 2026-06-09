export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type UserRole = 'consumer' | 'warehouse_manager' | 'customs_officer' | 'operation_director' | 'admin';
export type Region = 'US' | 'EU' | 'SoutheastAsia' | 'China';
export type TransportMode = 'sea' | 'air' | 'rail';
export type CustomsStatus = 'pending' | 'declared' | 'inspecting' | 'detained' | 'cleared' | 'rejected';
export type LogisticsExceptionType = 'delay' | 'damage' | 'lost';
export type ReturnLiability = 'customer' | 'logistics' | 'quality';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated';
export type WorkOrderPriority = 'normal' | 'high' | 'urgent';
export type WorkOrderType = 'inspection' | 'detention' | 'tax_dispute';

export interface User {
  id: number;
  username: string;
  realName: string;
  role: UserRole;
  warehouseId?: number;
  createdAt: string;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  region: Region;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  isActive: boolean;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  weight: number;
  volume: number;
  declaredValue: number;
  hsCode: string;
  originCountry: string;
}

export interface Inventory {
  id: number;
  warehouseId: number;
  productId: number;
  quantity: number;
  reservedQuantity: number;
  safetyStock: number;
  lastUpdated: string;
  product?: Product;
  warehouse?: Warehouse;
}

export interface TransferOrder {
  id: number;
  orderNo: string;
  sourceWarehouseId: number;
  targetWarehouseId: number;
  transportMode: TransportMode;
  estimatedCost: number;
  estimatedDays: number;
  status: ApprovalStatus;
  approvedBy?: number;
  approvedAt?: string;
  createdAt: string;
  items: TransferItem[];
  sourceWarehouse?: Warehouse;
  targetWarehouse?: Warehouse;
}

export interface TransferItem {
  id: number;
  transferOrderId: number;
  productId: number;
  quantity: number;
  product?: Product;
}

export interface TransferSuggestion {
  id: string;
  sourceWarehouse: Warehouse;
  targetWarehouse: Warehouse;
  product: Product;
  suggestedQuantity: number;
  recommendedTransportMode: TransportMode;
  estimatedCost: number;
  estimatedDays: number;
  urgencyScore: number;
  reason: string;
}

export interface Order {
  id: number;
  orderNo: string;
  userId?: number;
  customerName: string;
  shippingAddress: string;
  shippingCountry: string;
  shippingCity: string;
  postalCode: string;
  totalAmount: number;
  currency: string;
  status: string;
  fulfilledWarehouseId?: number;
  createdAt: string;
  items: OrderItem[];
  fulfilledWarehouse?: Warehouse;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  product?: Product;
}

export interface WarehouseOption {
  warehouse: Warehouse;
  availableQuantity: number;
  estimatedDeliveryDays: number;
  shippingCost: number;
  customsRiskScore: number;
  congestionIndex: number;
  totalScore: number;
}

export interface FulfillmentRecommendation {
  orderId: number;
  options: WarehouseOption[];
  recommended: number;
}

export interface CustomsDeclaration {
  id: number;
  declarationNo: string;
  orderId: number;
  port: string;
  status: CustomsStatus;
  customsValue: number;
  taxAmount: number;
  declaredAt?: string;
  clearedAt?: string;
  order?: Order;
}

export interface CustomsTrajectory {
  id: number;
  declarationId: number;
  status: CustomsStatus;
  location: string;
  description: string;
  timestamp: string;
}

export interface WorkOrder {
  id: number;
  workOrderNo: string;
  customsDeclarationId: number;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  status: ApprovalStatus;
  currentApprovalLevel: number;
  level1ApproverId?: number;
  level1Comment?: string;
  level1ApprovedAt?: string;
  level2ApproverId?: number;
  level2Comment?: string;
  level2ApprovedAt?: string;
  isEscalated: boolean;
  createdAt: string;
  customsDeclaration?: CustomsDeclaration;
  level1Approver?: User;
  level2Approver?: User;
}

export interface LogisticsTracking {
  id: number;
  trackingNo: string;
  orderId: number;
  carrier: string;
  transportMode: TransportMode;
  status: string;
  trajectory: LogisticsTrajectoryPoint[];
  createdAt: string;
}

export interface LogisticsTrajectoryPoint {
  timestamp: string;
  location: string;
  status: string;
  description: string;
}

export interface LogisticsException {
  id: number;
  logisticsTrackingId: number;
  type: LogisticsExceptionType;
  description: string;
  occurredAt: string;
  status: string;
  tracking?: LogisticsTracking;
  compensation?: Compensation;
}

export interface Compensation {
  id: number;
  exceptionId: number;
  policyNo: string;
  calculatedAmount: number;
  status: ApprovalStatus;
  approvedBy?: number;
  approvedAt?: string;
  compensationType: string;
  breakdown: CompensationBreakdown[];
}

export interface CompensationBreakdown {
  item: string;
  amount: number;
  description: string;
}

export interface ReturnRecord {
  id: number;
  orderId: number;
  returnNo: string;
  productId: number;
  quantity: number;
  reason: string;
  liability?: ReturnLiability;
  status: string;
  createdAt: string;
  order?: Order;
  product?: Product;
  refund?: Refund;
}

export interface Refund {
  id: number;
  returnId: number;
  amount: number;
  status: string;
  processedAt?: string;
}

export interface ApprovalFlow {
  id: number;
  name: string;
  targetType: string;
  thresholdAmount: number;
  level1Role: UserRole;
  level2Role: UserRole;
  escalationHours: number;
  isActive: boolean;
}

export interface SystemRule {
  id: number;
  ruleKey: string;
  ruleValue: string;
  description: string;
  updatedAt: string;
}

export interface DashboardKPI {
  totalInventoryValue: number;
  inventoryTurnoverRate: number;
  orderFulfillmentRate: number;
  avgCustomsClearanceHours: number;
  dailySales: number;
  returnRate: number;
  pendingWorkOrders: number;
  logisticsExceptions: number;
}

export interface WarehouseTurnover {
  warehouseId: number;
  warehouseName: string;
  turnoverRate: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PortClearanceTime {
  port: string;
  avgHours: number;
  congestionIndex: number;
  data: number[];
}

export interface SalesTrendItem {
  date: string;
  sales: number;
  returns: number;
}

export interface LogisticsExceptionPoint {
  id: number;
  type: LogisticsExceptionType;
  location: string;
  coordinates: [number, number];
  count: number;
}

export interface InventoryAlert {
  id: number;
  warehouseId: number;
  productId: number;
  type: 'low_stock' | 'overstock' | 'slow_moving';
  severity: 'low' | 'medium' | 'high';
  currentStock: number;
  recommendedAction: string;
  product?: Product;
  warehouse?: Warehouse;
}

export interface SupplyChainMetrics {
  period: string;
  totalOrders: number;
  fulfilledOrders: number;
  fulfillmentRate: number;
  avgDeliveryDays: number;
  totalTransportCost: number;
  totalCustomsTax: number;
  totalCompensation: number;
  inventoryTurnover: number;
  returnRate: number;
}

export interface CustomsDocument {
  type: 'invoice' | 'packing_list' | 'declaration';
  url: string;
  filename: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userInfo: User;
  permissions: string[];
}
