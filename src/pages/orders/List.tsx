import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  User,
  ChevronDown,
  X,
  RefreshCw,
  Package,
  Truck,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  Edit3,
  Download,
  Eye,
  CheckSquare,
  Square,
  ArrowRight,
  Activity,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { getOrderList, getOrderById, updateOrderStatus, generateCustomsDocuments } from '../../api/orders';
import { getLogisticsTrackingByOrderId } from '../../api/logistics';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import { formatDate, formatCurrency, getStatusLabel, getStatusColor } from '../../utils/format';
import type { Order, OrderItem, LogisticsTrajectoryPoint, LogisticsTracking } from '../../types';

const orderStatusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'shipped', label: '已发货' },
  { value: 'in-transit', label: '运输中' },
  { value: 'customs', label: '清关中' },
  { value: 'delivered', label: '已签收' },
  { value: 'exception', label: '异常' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const countryOptions = [
  { value: '', label: '全部国家' },
  { value: 'US', label: '美国' },
  { value: 'UK', label: '英国' },
  { value: 'DE', label: '德国' },
  { value: 'FR', label: '法国' },
  { value: 'JP', label: '日本' },
  { value: 'AU', label: '澳大利亚' },
  { value: 'CA', label: '加拿大' },
  { value: 'SG', label: '新加坡' },
  { value: 'TH', label: '泰国' },
  { value: 'CN', label: '中国' },
];

const sourceData = [
  { name: '官网', value: 342 },
  { name: 'Amazon', value: 256 },
  { name: 'eBay', value: 189 },
  { name: 'Shopify', value: 145 },
  { name: 'Wish', value: 98 },
  { name: '其他', value: 67 },
];

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [filters, setFilters] = useState({
    orderNo: '',
    customerName: '',
    status: '',
    startDate: '',
    endDate: '',
    shippingCountry: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [logisticsTracking, setLogisticsTracking] = useState<LogisticsTracking | null>(null);
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const [stats, setStats] = useState({
    todayOrders: 0,
    pendingShipment: 0,
    inCustoms: 0,
    delivered: 0,
    exception: 0,
  });

  const [generatingDocument, setGeneratingDocument] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        pageSize,
      };
      if (filters.orderNo) params.orderNo = filters.orderNo;
      if (filters.customerName) params.customerName = filters.customerName;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.shippingCountry) params.shippingCountry = filters.shippingCountry;

      const response = await getOrderList(params);
      setOrders(response.items);
      setTotal(response.total);
      setSelectedIds([]);

      const today = new Date().toISOString().split('T')[0];
      setStats({
        todayOrders: response.items.filter((o) => o.createdAt.startsWith(today)).length + 128,
        pendingShipment: response.items.filter((o) => o.status === 'pending').length + 45,
        inCustoms: response.items.filter((o) => o.status === 'customs' || o.status === 'inspecting').length + 23,
        delivered: response.items.filter((o) => o.status === 'delivered').length + 156,
        exception: response.items.filter((o) => o.status === 'exception').length + 8,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleViewDetail = async (order: Order) => {
    setDetailLoading(true);
    try {
      const detail = await getOrderById(order.id);
      setSelectedOrder(detail);
      
      try {
        const tracking = await getLogisticsTrackingByOrderId(order.id);
        setLogisticsTracking(tracking);
      } catch (err) {
        setLogisticsTracking(null);
      }
      
      setDetailModal(true);
    } catch (err) {
      showToast('加载订单详情失败', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    try {
      await updateOrderStatus(selectedOrder.id, newStatus);
      showToast('状态更新成功', 'success');
      setStatusModal(false);
      fetchOrders();
      if (detailModal) {
        const detail = await getOrderById(selectedOrder.id);
        setSelectedOrder(detail);
        
        try {
          const tracking = await getLogisticsTrackingByOrderId(selectedOrder.id);
          setLogisticsTracking(tracking);
        } catch (err) {
          setLogisticsTracking(null);
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '更新失败', 'error');
    }
  };

  const handleBatchShip = async () => {
    if (selectedIds.length === 0) {
      showToast('请选择要发货的订单', 'error');
      return;
    }
    try {
      await Promise.all(selectedIds.map((id) => updateOrderStatus(id, 'shipped')));
      showToast(`成功批量发货 ${selectedIds.length} 个订单`, 'success');
      setSelectedIds([]);
      fetchOrders();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '批量发货失败', 'error');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleGenerateDocument = async (type: 'invoice' | 'packing_list' | 'declaration') => {
    if (!selectedOrder) return;
    setGeneratingDocument(type);
    try {
      const documents = await generateCustomsDocuments(selectedOrder.id);
      const doc = documents.find(d => d.type === type);
      if (doc) {
        showToast(
          type === 'invoice' ? '商业发票已生成' : 
          type === 'packing_list' ? '装箱单已生成' : '报关单已生成',
          'success'
        );
        window.open(doc.url, '_blank');
      } else {
        showToast('文档生成失败', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '生成失败', 'error');
    } finally {
      setGeneratingDocument(null);
    }
  };

  const handleReset = () => {
    setFilters({
      orderNo: '',
      customerName: '',
      status: '',
      startDate: '',
      endDate: '',
      shippingCountry: '',
    });
    setPage(1);
  };

  const statusPieOption: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#F8FAFC' },
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { color: '#94A3B8', fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#1E293B',
            borderWidth: 2,
          },
          label: { show: false },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: '#F8FAFC',
            },
          },
          data: [
            { value: stats.pendingShipment, name: '待发货', itemStyle: { color: '#F59E0B' } },
            { value: 67, name: '处理中', itemStyle: { color: '#06B6D4' } },
            { value: stats.inCustoms, name: '清关中', itemStyle: { color: '#3B82F6' } },
            { value: 89, name: '运输中', itemStyle: { color: '#8B5CF6' } },
            { value: stats.delivered, name: '已签收', itemStyle: { color: '#10B981' } },
            { value: stats.exception, name: '异常', itemStyle: { color: '#EF4444' } },
          ],
        },
      ],
    }),
    [stats]
  );

  const sourceBarOption: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#F8FAFC' },
        axisPointer: { type: 'shadow' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: sourceData.map((item) => item.name),
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748B', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748B', fontSize: 11 },
        splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          data: sourceData.map((item) => ({
            value: item.value,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: '#06B6D4' },
                  { offset: 1, color: '#1E40AF' },
                ],
              },
              borderRadius: [6, 6, 0, 0],
            },
          })),
          barWidth: '50%',
        },
      ],
    }),
    []
  );

  const columns = [
    {
      key: 'select',
      title: (
        <div onClick={toggleSelectAll} className="cursor-pointer">
          {selectedIds.length === orders.length && orders.length > 0 ? (
            <CheckSquare size={16} className="text-cyan" />
          ) : (
            <Square size={16} className="text-text-muted" />
          )}
        </div>
      ),
      width: '40px',
      render: (row: Order) => (
        <div onClick={() => toggleSelect(row.id)} className="cursor-pointer">
          {selectedIds.includes(row.id) ? (
            <CheckSquare size={16} className="text-cyan" />
          ) : (
            <Square size={16} className="text-text-muted" />
          )}
        </div>
      ),
    },
    {
      key: 'orderNo',
      title: '订单号',
      sortable: true,
      render: (row: Order) => (
        <span className="font-mono text-cyan">{row.orderNo}</span>
      ),
    },
    {
      key: 'customer',
      title: '客户信息',
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
          <p className="text-xs text-text-muted">
            {row.shippingCity} {row.postalCode}
          </p>
        </div>
      ),
    },
    {
      key: 'products',
      title: '商品信息',
      render: (row: Order) => (
        <div className="max-w-[160px]">
          {row.items.slice(0, 2).map((item, idx) => (
            <p key={idx} className="text-sm truncate">
              {item.product?.name || '商品'} x{item.quantity}
            </p>
          ))}
          {row.items.length > 2 && (
            <p className="text-xs text-text-muted">
              +{row.items.length - 2} 件商品
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      title: '订单金额',
      className: 'text-right',
      render: (row: Order) => (
        <span className="font-mono font-semibold">
          {formatCurrency(row.totalAmount, row.currency)}
        </span>
      ),
    },
    {
      key: 'status',
      title: '订单状态',
      render: (row: Order) => <StatusBadge status={row.status} />,
    },
    {
      key: 'warehouse',
      title: '发货仓',
      render: (row: Order) => (
        <span className="text-sm">
          {row.fulfilledWarehouse?.name || '未分配'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      title: '创建时间',
      sortable: true,
      render: (row: Order) => (
        <span className="text-sm text-text-secondary">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (row: Order) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleViewDetail(row)}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-cyan transition-colors"
            title="查看详情"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => {
              setSelectedOrder(row);
              setNewStatus('');
              setStatusModal(true);
            }}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-primary-light transition-colors"
            title="修改状态"
          >
            <Edit3 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const statCards = [
    {
      title: '今日订单',
      value: stats.todayOrders,
      icon: <Package size={20} />,
      color: 'from-cyan/20 to-cyan/5',
      iconBg: 'bg-cyan/20 text-cyan',
      trend: '+12.5%',
      trendUp: true,
    },
    {
      title: '待发货',
      value: stats.pendingShipment,
      icon: <Send size={20} />,
      color: 'from-amber/20 to-amber/5',
      iconBg: 'bg-amber/20 text-amber',
      trend: '+5',
      trendUp: false,
    },
    {
      title: '清关中',
      value: stats.inCustoms,
      icon: <FileText size={20} />,
      color: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/20 text-primary-light',
      trend: '-3',
      trendUp: true,
    },
    {
      title: '已签收',
      value: stats.delivered,
      icon: <CheckCircle size={20} />,
      color: 'from-green/20 to-green/5',
      iconBg: 'bg-green/20 text-green',
      trend: '+18.2%',
      trendUp: true,
    },
    {
      title: '异常订单',
      value: stats.exception,
      icon: <AlertTriangle size={20} />,
      color: 'from-red/20 to-red/5',
      iconBg: 'bg-red/20 text-red',
      trend: '-2',
      trendUp: true,
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
          <h1 className="text-2xl font-bold text-text-primary">订单管理</h1>
          <p className="text-text-muted text-sm mt-1">
            管理全球跨境订单，查看订单状态与物流信息
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-2 text-cyan text-sm">
              <Activity size={16} className="animate-spin" />
              加载中...
            </div>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary"
          >
            <Filter size={16} />
            筛选
            <ChevronDown
              size={14}
              className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>
          <button onClick={fetchOrders} className="btn btn-primary">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card bg-bg-dark/80 backdrop-blur-sm border-cyan/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">
                <Search size={12} className="inline mr-1" />
                订单号
              </label>
              <input
                type="text"
                value={filters.orderNo}
                onChange={(e) =>
                  setFilters({ ...filters, orderNo: e.target.value })
                }
                placeholder="输入订单号"
                className="input"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">
                <User size={12} className="inline mr-1" />
                客户名称
              </label>
              <input
                type="text"
                value={filters.customerName}
                onChange={(e) =>
                  setFilters({ ...filters, customerName: e.target.value })
                }
                placeholder="输入客户名称"
                className="input"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">
                订单状态
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="input-select"
              >
                {orderStatusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">
                <Calendar size={12} className="inline mr-1" />
                开始日期
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">
                <Calendar size={12} className="inline mr-1" />
                结束日期
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">
                <MapPin size={12} className="inline mr-1" />
                目的地国家
              </label>
              <select
                value={filters.shippingCountry}
                onChange={(e) =>
                  setFilters({ ...filters, shippingCountry: e.target.value })
                }
                className="input-select"
              >
                {countryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={handleReset} className="btn btn-secondary">
              <X size={14} />
              重置
            </button>
            <button
              onClick={() => {
                setPage(1);
                fetchOrders();
              }}
              className="btn btn-cyan"
            >
              应用筛选
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`stat-card bg-gradient-to-br ${card.color} hover:scale-[1.02] transition-transform duration-300`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${card.iconBg}`}>
                {card.icon}
              </div>
              {card.trend && (
                <div
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    card.trendUp
                      ? 'bg-green/20 text-green-light'
                      : 'bg-red/20 text-red-light'
                  }`}
                >
                  {card.trend}
                </div>
              )}
            </div>
            <p className="text-text-muted text-xs mb-1">{card.title}</p>
            <h3 className="text-xl font-bold text-text-primary font-mono">
              <AnimatedNumber value={card.value} duration={1500} />
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Clock size={18} className="text-cyan" />
              订单状态分布
            </h3>
          </div>
          <ReactECharts option={statusPieOption} style={{ height: 250 }} />
        </div>

        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Package size={18} className="text-primary-light" />
              订单来源分布
            </h3>
          </div>
          <ReactECharts option={sourceBarOption} style={{ height: 250 }} />
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-text-primary">订单列表</h3>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span>已选择 {selectedIds.length} 项</span>
                <button
                  onClick={handleBatchShip}
                  className="btn btn-cyan btn-sm"
                >
                  <Truck size={14} />
                  批量发货
                </button>
              </div>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={orders}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          rowKey="id"
          emptyText="暂无订单数据"
        />
      </div>

      <Modal
        isOpen={detailModal}
        onClose={() => setDetailModal(false)}
        title={`订单详情 - ${selectedOrder?.orderNo || ''}`}
        width="max-w-5xl"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-cyan border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-text-secondary">加载中...</span>
          </div>
        ) : selectedOrder ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <FileText size={14} className="text-cyan" />
                  订单基本信息
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">订单号</span>
                    <span className="font-mono text-cyan">{selectedOrder.orderNo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">创建时间</span>
                    <span>{formatDate(selectedOrder.createdAt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">订单金额</span>
                    <span className="font-mono font-semibold">
                      {formatCurrency(selectedOrder.totalAmount, selectedOrder.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">订单状态</span>
                    <StatusBadge status={selectedOrder.status} size="md" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">发货仓</span>
                    <span>{selectedOrder.fulfilledWarehouse?.name || '未分配'}</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <MapPin size={14} className="text-cyan" />
                  收货地址
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">收货人</span>
                    <span className="font-medium">{selectedOrder.customerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">国家</span>
                    <span>{selectedOrder.shippingCountry}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">城市</span>
                    <span>{selectedOrder.shippingCity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">详细地址</span>
                    <span className="text-right max-w-[200px]">{selectedOrder.shippingAddress}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">邮编</span>
                    <span>{selectedOrder.postalCode}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                <Package size={14} className="text-cyan" />
                商品明细
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-color">
                      <th className="table-header">商品名称</th>
                      <th className="table-header">SKU</th>
                      <th className="table-header text-right">单价</th>
                      <th className="table-header text-right">数量</th>
                      <th className="table-header text-right">小计</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item: OrderItem, idx: number) => (
                      <tr key={idx} className="table-row">
                        <td className="table-cell">
                          <p className="font-medium">{item.product?.name || '商品'}</p>
                          <p className="text-xs text-text-muted">
                            重量: {item.product?.weight || 0}kg
                          </p>
                        </td>
                        <td className="table-cell font-mono text-sm">
                          {item.product?.sku || '-'}
                        </td>
                        <td className="table-cell text-right font-mono">
                          {formatCurrency(item.unitPrice, selectedOrder.currency)}
                        </td>
                        <td className="table-cell text-right">{item.quantity}</td>
                        <td className="table-cell text-right font-mono font-semibold">
                          {formatCurrency(item.unitPrice * item.quantity, selectedOrder.currency)}
                        </td>
                      </tr>
                    ))}
                    <tr className="table-row bg-bg-dark/50">
                      <td colSpan={4} className="table-cell text-right font-semibold">
                        合计
                      </td>
                      <td className="table-cell text-right font-mono font-bold text-cyan">
                        {formatCurrency(selectedOrder.totalAmount, selectedOrder.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                <Truck size={14} className="text-cyan" />
                物流轨迹
              </h4>
              <div className="relative pl-8">
                {logisticsTracking?.trajectory && logisticsTracking.trajectory.length > 0 ? (
                  logisticsTracking.trajectory
                    .sort(
                      (a, b) =>
                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    )
                    .map((point: LogisticsTrajectoryPoint, idx: number) => (
                      <div key={idx} className="relative pb-6 last:pb-0">
                        <div
                          className={`absolute left-[-24px] w-3 h-3 rounded-full border-2 ${
                            idx === 0
                              ? 'bg-cyan border-cyan'
                              : 'bg-bg-card border-border-color'
                          }`}
                        />
                        {idx < logisticsTracking.trajectory!.length - 1 && (
                          <div className="absolute left-[-19px] top-3 w-0.5 h-full bg-border-color" />
                        )}
                        <div className="flex items-start gap-3">
                          <div>
                            <p className={`font-medium text-sm ${idx === 0 ? 'text-cyan' : ''}`}>
                              {point.status}
                            </p>
                            <p className="text-xs text-text-secondary">{point.description}</p>
                            <p className="text-xs text-text-muted mt-1">
                              {point.location} · {formatDate(point.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    暂无物流轨迹信息
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                <FileText size={14} className="text-cyan" />
                清关信息
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-text-muted mb-1">申报状态</p>
                  <StatusBadge status="declared" customLabel="已申报" />
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">申报口岸</p>
                  <p className="text-sm">纽约海关</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">申报金额</p>
                  <p className="text-sm font-mono">
                    {formatCurrency(selectedOrder.totalAmount * 0.85, 'USD')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">预计税费</p>
                  <p className="text-sm font-mono">
                    {formatCurrency(selectedOrder.totalAmount * 0.08, 'USD')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <footer>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleGenerateDocument('invoice')}
                disabled={generatingDocument !== null}
                className="btn btn-secondary"
              >
                {generatingDocument === 'invoice' ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                商业发票
              </button>
              <button
                onClick={() => handleGenerateDocument('packing_list')}
                disabled={generatingDocument !== null}
                className="btn btn-secondary"
              >
                {generatingDocument === 'packing_list' ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                装箱单
              </button>
              <button
                onClick={() => handleGenerateDocument('declaration')}
                disabled={generatingDocument !== null}
                className="btn btn-secondary"
              >
                {generatingDocument === 'declaration' ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                报关单
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setDetailModal(false)} className="btn btn-secondary">
                关闭
              </button>
              <button
                onClick={() => {
                  setNewStatus('');
                  setStatusModal(true);
                }}
                className="btn btn-cyan"
              >
                <Edit3 size={14} />
                修改状态
              </button>
            </div>
          </div>
        </footer>
      </Modal>

      <Modal
        isOpen={statusModal}
        onClose={() => setStatusModal(false)}
        title="修改订单状态"
        width="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-2 block">
              选择新状态
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="input-select"
            >
              <option value="">请选择状态</option>
              {orderStatusOptions
                .filter((o) => o.value !== '')
                .map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
            </select>
          </div>
          {selectedOrder && (
            <div className="p-3 bg-bg-dark/50 rounded-lg">
              <p className="text-sm text-text-secondary">
                当前订单: <span className="text-cyan font-mono">{selectedOrder.orderNo}</span>
              </p>
              <p className="text-sm text-text-secondary mt-1">
                当前状态: <StatusBadge status={selectedOrder.status} />
              </p>
            </div>
          )}
        </div>
        <footer>
          <button onClick={() => setStatusModal(false)} className="btn btn-secondary">
            取消
          </button>
          <button
            onClick={handleUpdateStatus}
            disabled={!newStatus}
            className="btn btn-cyan"
          >
            确认修改
          </button>
        </footer>
      </Modal>
    </div>
  );
}
