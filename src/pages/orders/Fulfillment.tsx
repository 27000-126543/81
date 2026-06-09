import { useEffect, useState } from 'react';
import {
  Package,
  MapPin,
  Truck,
  Clock,
  DollarSign,
  AlertTriangle,
  Activity,
  Award,
  CheckCircle,
  X,
  RefreshCw,
  Info,
  Zap,
  BarChart3,
  Box,
  ArrowRight,
  History,
  Star,
} from 'lucide-react';
import {
  getOrderList,
  getFulfillmentRecommendation,
  assignWarehouse,
} from '../../api/orders';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import { formatDate, formatCurrency, getStatusLabel } from '../../utils/format';
import type { Order, WarehouseOption, FulfillmentRecommendation } from '../../types';

interface AssignmentRecord {
  id: number;
  orderNo: string;
  customerName: string;
  warehouseName: string;
  assignedAt: string;
  score: number;
  status: string;
}

export default function Fulfillment() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [recommendation, setRecommendation] = useState<FulfillmentRecommendation | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);

  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentRecord[]>([
    {
      id: 1,
      orderNo: 'ORD-2024-001234',
      customerName: 'John Smith',
      warehouseName: '洛杉矶仓',
      assignedAt: '2024-01-15 14:30:00',
      score: 92.5,
      status: 'completed',
    },
    {
      id: 2,
      orderNo: 'ORD-2024-001235',
      customerName: 'Emma Wilson',
      warehouseName: '新泽西仓',
      assignedAt: '2024-01-15 13:15:00',
      score: 88.3,
      status: 'completed',
    },
    {
      id: 3,
      orderNo: 'ORD-2024-001236',
      customerName: 'Michael Chen',
      warehouseName: '新加坡仓',
      assignedAt: '2024-01-15 11:45:00',
      score: 95.1,
      status: 'in-transit',
    },
    {
      id: 4,
      orderNo: 'ORD-2024-001237',
      customerName: 'Sophie Martin',
      warehouseName: '鹿特丹仓',
      assignedAt: '2024-01-15 10:20:00',
      score: 89.7,
      status: 'completed',
    },
    {
      id: 5,
      orderNo: 'ORD-2024-001238',
      customerName: 'David Kim',
      warehouseName: '洛杉矶仓',
      assignedAt: '2024-01-15 09:00:00',
      score: 91.2,
      status: 'in-transit',
    },
  ]);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchPendingOrders = async () => {
    setLoading(true);
    try {
      const response = await getOrderList({ status: 'pending', pageSize: 20 });
      setPendingOrders(response.items);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const handleSelectOrder = async (order: Order) => {
    setSelectedOrder(order);
    setSelectedWarehouseId(null);
    setRecommendationLoading(true);
    try {
      const rec = await getFulfillmentRecommendation(order.id);
      setRecommendation(rec);
      if (rec.options.length > 0) {
        setSelectedWarehouseId(rec.options[rec.recommended].warehouse.id);
      }
    } catch (err) {
      showToast('获取分仓推荐失败', 'error');
    } finally {
      setRecommendationLoading(false);
    }
  };

  const handleAssignWarehouse = async () => {
    if (!selectedOrder || !selectedWarehouseId) return;
    setAssigning(true);
    try {
      await assignWarehouse(selectedOrder.id, selectedWarehouseId);
      showToast('仓库分配成功', 'success');
      
      const selectedOption = recommendation?.options.find(
        (opt) => opt.warehouse.id === selectedWarehouseId
      );
      
      setAssignmentHistory((prev) => [
        {
          id: Date.now(),
          orderNo: selectedOrder.orderNo,
          customerName: selectedOrder.customerName,
          warehouseName: selectedOption?.warehouse.name || '',
          assignedAt: formatDate(new Date()),
          score: selectedOption?.totalScore || 0,
          status: 'processing',
        },
        ...prev,
      ]);
      
      setSelectedOrder(null);
      setRecommendation(null);
      setSelectedWarehouseId(null);
      
      await fetchPendingOrders();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '分配失败', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green';
    if (score >= 80) return 'text-cyan';
    if (score >= 70) return 'text-amber';
    return 'text-red';
  };

  const getRiskColor = (score: number) => {
    if (score <= 20) return 'badge-green';
    if (score <= 40) return 'badge-cyan';
    if (score <= 60) return 'badge-amber';
    return 'badge-red';
  };

  const getRiskLabel = (score: number) => {
    if (score <= 20) return '低风险';
    if (score <= 40) return '较低风险';
    if (score <= 60) return '中等风险';
    if (score <= 80) return '较高风险';
    return '高风险';
  };

  const getCongestionColor = (index: number) => {
    if (index <= 30) return 'text-green';
    if (index <= 60) return 'text-amber';
    return 'text-red';
  };

  const orderColumns = [
    {
      key: 'orderNo',
      title: '订单号',
      render: (row: Order) => (
        <span className="font-mono text-cyan">{row.orderNo}</span>
      ),
    },
    {
      key: 'customer',
      title: '客户',
      render: (row: Order) => (
        <div>
          <p className="font-medium">{row.customerName}</p>
          <p className="text-xs text-text-muted">{row.shippingCountry}</p>
        </div>
      ),
    },
    {
      key: 'address',
      title: '收货地址',
      render: (row: Order) => (
        <div className="max-w-[180px]">
          <p className="text-sm truncate">{row.shippingAddress}</p>
          <p className="text-xs text-text-muted">{row.shippingCity}</p>
        </div>
      ),
    },
    {
      key: 'products',
      title: '商品',
      render: (row: Order) => (
        <div className="max-w-[140px]">
          {row.items.slice(0, 1).map((item, idx) => (
            <p key={idx} className="text-sm truncate">
              {item.product?.name || '商品'} x{item.quantity}
            </p>
          ))}
          {row.items.length > 1 && (
            <p className="text-xs text-text-muted">+{row.items.length - 1} 件</p>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      title: '金额',
      className: 'text-right',
      render: (row: Order) => (
        <span className="font-mono font-semibold">
          {formatCurrency(row.totalAmount, row.currency)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (row: Order) => (
        <button
          onClick={() => handleSelectOrder(row)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            selectedOrder?.id === row.id
              ? 'bg-cyan/20 text-cyan border border-cyan/50'
              : 'bg-bg-card text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-border-color'
          }`}
        >
          {selectedOrder?.id === row.id ? '已选择' : '智能分仓'}
          <ArrowRight size={12} className="inline ml-1" />
        </button>
      ),
    },
  ];

  const historyColumns = [
    {
      key: 'orderNo',
      title: '订单号',
      render: (row: AssignmentRecord) => (
        <span className="font-mono text-cyan text-sm">{row.orderNo}</span>
      ),
    },
    {
      key: 'customerName',
      title: '客户',
      render: (row: AssignmentRecord) => (
        <span className="text-sm">{row.customerName}</span>
      ),
    },
    {
      key: 'warehouseName',
      title: '分配仓库',
      render: (row: AssignmentRecord) => (
        <span className="text-sm">{row.warehouseName}</span>
      ),
    },
    {
      key: 'score',
      title: '综合得分',
      render: (row: AssignmentRecord) => (
        <span className={`font-mono font-semibold ${getScoreColor(row.score)}`}>
          {row.score.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'assignedAt',
      title: '分配时间',
      render: (row: AssignmentRecord) => (
        <span className="text-sm text-text-secondary">{row.assignedAt}</span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (row: AssignmentRecord) => (
        <StatusBadge status={row.status} />
      ),
    },
  ];

  return (
    <div className="space-y-5 pb-8">
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-green/90 text-white'
              : 'bg-red/90 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          {toast.message}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">智能分仓</h1>
          <p className="text-text-muted text-sm mt-1">
            基于AI算法的智能仓库分配，优化配送效率与成本
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-2 text-cyan text-sm">
              <Activity size={16} className="animate-spin" />
              加载中...
            </div>
          )}
          <button onClick={fetchPendingOrders} className="btn btn-primary">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card bg-gradient-to-br from-cyan/20 to-cyan/5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-cyan/20 text-cyan">
              <Package size={20} />
            </div>
            <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green/20 text-green-light">
              +8
            </div>
          </div>
          <p className="text-text-muted text-xs mb-1">待分配订单</p>
          <h3 className="text-xl font-bold text-text-primary font-mono">
            <AnimatedNumber value={pendingOrders.length} duration={1500} />
          </h3>
        </div>

        <div className="stat-card bg-gradient-to-br from-green/20 to-green/5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-green/20 text-green">
              <CheckCircle size={20} />
            </div>
            <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green/20 text-green-light">
              +12
            </div>
          </div>
          <p className="text-text-muted text-xs mb-1">今日已分配</p>
          <h3 className="text-xl font-bold text-text-primary font-mono">
            <AnimatedNumber value={47} duration={1500} />
          </h3>
        </div>

        <div className="stat-card bg-gradient-to-br from-primary/20 to-primary/5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-primary/20 text-primary-light">
              <Zap size={20} />
            </div>
            <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green/20 text-green-light">
              +2.3%
            </div>
          </div>
          <p className="text-text-muted text-xs mb-1">平均分配效率</p>
          <h3 className="text-xl font-bold text-text-primary font-mono">
            <AnimatedNumber value={94.7} duration={1500} suffix="%" />
          </h3>
        </div>

        <div className="stat-card bg-gradient-to-br from-amber/20 to-amber/5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-amber/20 text-amber">
              <DollarSign size={20} />
            </div>
            <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green/20 text-green-light">
              -5.8%
            </div>
          </div>
          <p className="text-text-muted text-xs mb-1">平均物流成本</p>
          <h3 className="text-xl font-bold text-text-primary font-mono">
            <AnimatedNumber value={12.5} duration={1500} prefix="$" />
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Package size={18} className="text-cyan" />
              待分配订单
            </h3>
            <span className="text-xs text-text-muted">
              共 {pendingOrders.length} 单
            </span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-text-secondary text-sm">加载中...</span>
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Box size={48} className="mx-auto mb-3 opacity-50" />
              <p>暂无待分配订单</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedOrder?.id === order.id
                      ? 'bg-cyan/10 border-cyan/50 shadow-lg shadow-cyan/10'
                      : 'bg-bg-dark/50 border-border-color hover:border-primary/50 hover:bg-bg-hover/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`font-mono text-sm ${
                      selectedOrder?.id === order.id ? 'text-cyan' : 'text-cyan/80'
                    }`}>
                      {order.orderNo}
                    </span>
                    <span className="font-mono font-semibold text-sm">
                      {formatCurrency(order.totalAmount, order.currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <span className="font-medium">{order.customerName}</span>
                    <span className="text-text-muted">·</span>
                    <span className="text-text-muted">{order.shippingCountry}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                      <Box size={12} />
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} 件商品
                    </div>
                    <span className="text-xs text-text-muted">
                      {formatDate(order.createdAt, 'MM-DD HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          {selectedOrder ? (
            <>
              <div className="card bg-gradient-to-br from-cyan/10 to-primary/10 border-cyan/30">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <Zap size={18} className="text-cyan" />
                      智能分仓推荐
                    </h3>
                    <p className="text-sm text-text-secondary mt-1">
                      正在为订单 <span className="text-cyan font-mono">{selectedOrder.orderNo}</span> 推荐最优仓库
                    </p>
                  </div>
                  {recommendation && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green/20 border border-green/30 rounded-full">
                      <Star size={14} className="text-amber" />
                      <span className="text-sm text-green font-medium">
                        推荐 {recommendation.options[recommendation.recommended]?.warehouse.name}
                      </span>
                    </div>
                  )}
                </div>

                <div className="card bg-bg-dark/60 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-cyan/20 text-cyan shrink-0">
                      <Info size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary mb-1">
                        推荐算法说明
                      </p>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        综合考虑 <span className="text-cyan">库存可用性(30%)</span>、
                        <span className="text-primary-light">配送距离(25%)</span>、
                        <span className="text-amber">清关拥堵指数(20%)</span>、
                        <span className="text-green">物流成本(25%)</span> 等多维度因素，
                        通过加权评分模型计算出最优仓库分配方案。
                      </p>
                    </div>
                  </div>
                </div>

                {recommendationLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-3 border-cyan border-t-transparent rounded-full animate-spin" />
                    <span className="ml-3 text-text-secondary">AI正在计算最优方案...</span>
                  </div>
                ) : recommendation ? (
                  <div className="space-y-3">
                    {recommendation.options
                      .sort((a, b) => b.totalScore - a.totalScore)
                      .map((option, idx) => {
                        const isRecommended = option.warehouse.id === recommendation.options[recommendation.recommended]?.warehouse.id;
                        const isSelected = selectedWarehouseId === option.warehouse.id;
                        return (
                          <div
                            key={option.warehouse.id}
                            onClick={() => setSelectedWarehouseId(option.warehouse.id)}
                            className={`card p-4 cursor-pointer transition-all ${
                              isRecommended ? 'border-cyan/50 bg-cyan/5' : ''
                            } ${
                              isSelected
                                ? 'ring-2 ring-cyan bg-cyan/10'
                                : 'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  isRecommended ? 'bg-cyan/20 text-cyan' : 'bg-bg-dark text-text-secondary'
                                }`}>
                                  {idx === 0 ? (
                                    <Award size={20} />
                                  ) : (
                                    <BarChart3 size={20} />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-text-primary">
                                      {option.warehouse.name}
                                    </h4>
                                    {isRecommended && (
                                      <span className="px-2 py-0.5 bg-cyan/20 text-cyan text-xs font-medium rounded-full border border-cyan/30">
                                        最优推荐
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-text-muted mt-0.5">
                                    <MapPin size={10} className="inline mr-1" />
                                    {option.warehouse.address}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-text-muted mb-1">综合得分</p>
                                <p className={`text-2xl font-bold font-mono ${getScoreColor(option.totalScore)}`}>
                                  {option.totalScore.toFixed(1)}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              <div className="bg-bg-dark/50 rounded-lg p-2.5">
                                <div className="flex items-center gap-1 text-xs text-text-muted mb-1">
                                  <Box size={12} />
                                  可用库存
                                </div>
                                <p className={`font-mono font-semibold ${
                                  option.availableQuantity >= 100 ? 'text-green' :
                                  option.availableQuantity >= 50 ? 'text-cyan' : 'text-amber'
                                }`}>
                                  {option.availableQuantity.toLocaleString()}
                                </p>
                              </div>

                              <div className="bg-bg-dark/50 rounded-lg p-2.5">
                                <div className="flex items-center gap-1 text-xs text-text-muted mb-1">
                                  <Clock size={12} />
                                  配送天数
                                </div>
                                <p className="font-mono font-semibold text-text-primary">
                                  {option.estimatedDeliveryDays} 天
                                </p>
                              </div>

                              <div className="bg-bg-dark/50 rounded-lg p-2.5">
                                <div className="flex items-center gap-1 text-xs text-text-muted mb-1">
                                  <DollarSign size={12} />
                                  运费
                                </div>
                                <p className="font-mono font-semibold text-green">
                                  ${option.shippingCost.toFixed(2)}
                                </p>
                              </div>

                              <div className="bg-bg-dark/50 rounded-lg p-2.5">
                                <div className="flex items-center gap-1 text-xs text-text-muted mb-1">
                                  <AlertTriangle size={12} />
                                  清关风险
                                </div>
                                <span className={`badge ${getRiskColor(option.customsRiskScore)}`}>
                                  {getRiskLabel(option.customsRiskScore)}
                                </span>
                              </div>

                              <div className="bg-bg-dark/50 rounded-lg p-2.5">
                                <div className="flex items-center gap-1 text-xs text-text-muted mb-1">
                                  <Activity size={12} />
                                  拥堵指数
                                </div>
                                <p className={`font-mono font-semibold ${getCongestionColor(option.congestionIndex)}`}>
                                  {option.congestionIndex}%
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-border-color">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-text-muted">评分详情</span>
                                <span className="text-text-secondary">
                                  库存 {option.totalScore * 0.3 > 27 ? '✓' : '○'} · 
                                  距离 {option.totalScore * 0.25 > 22.5 ? '✓' : '○'} · 
                                  清关 {option.totalScore * 0.2 > 18 ? '✓' : '○'} · 
                                  成本 {option.totalScore * 0.25 > 22.5 ? '✓' : '○'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => {
                          setSelectedOrder(null);
                          setRecommendation(null);
                          setSelectedWarehouseId(null);
                        }}
                        className="btn btn-secondary"
                      >
                        <X size={14} />
                        取消
                      </button>
                      <button
                        onClick={handleAssignWarehouse}
                        disabled={!selectedWarehouseId || assigning}
                        className="btn btn-cyan"
                      >
                        {assigning ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            分配中...
                          </>
                        ) : (
                          <>
                            <Truck size={14} />
                            确认分配
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="card flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-cyan/10 flex items-center justify-center mb-4">
                <Truck size={36} className="text-cyan/50" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                选择待分配订单
              </h3>
              <p className="text-sm text-text-muted max-w-xs">
                请从左侧列表中选择一个待分配的订单，系统将为您智能推荐最优的发货仓库
              </p>
            </div>
          )}

          <div className="card">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <History size={18} className="text-primary-light" />
              分配历史记录
            </h3>
            <DataTable
              columns={historyColumns}
              data={assignmentHistory}
              total={assignmentHistory.length}
              pageSize={5}
              showPagination={false}
              rowKey="id"
              emptyText="暂无分配记录"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
