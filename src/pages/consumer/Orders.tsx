import { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  Package,
  Truck,
  CheckCircle,
  RefreshCw,
  Clock,
  Eye,
  FileText,
  Upload,
  X,
  Loader2,
  MapPin,
  User,
  AlertCircle,
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import {
  formatDate,
  formatCurrency,
  getStatusLabel,
  getStatusColor,
} from '../../utils/format';
import { getConsumerOrders, getOrderById, updateOrderStatus } from '../../api/orders';
import { createReturn } from '../../api/returns';
import type { Order, OrderItem } from '../../types';

type OrderStatusTab = 'all' | 'pending' | 'shipped' | 'customs' | 'delivered' | 'aftersale';

interface FilterState {
  status: string;
  startDate: string;
  endDate: string;
  orderNo: string;
}

const statusTabs: { id: OrderStatusTab; name: string; status: string; icon: React.ReactNode }[] = [
  { id: 'all', name: '全部', status: '', icon: <Package size={16} /> },
  { id: 'pending', name: '待发货', status: 'pending', icon: <Clock size={16} /> },
  { id: 'shipped', name: '已发货', status: 'shipped', icon: <Truck size={16} /> },
  { id: 'customs', name: '清关中', status: 'customs', icon: <FileText size={16} /> },
  { id: 'delivered', name: '已签收', status: 'delivered', icon: <CheckCircle size={16} /> },
  { id: 'aftersale', name: '售后中', status: 'aftersale', icon: <RefreshCw size={16} /> },
];

export default function ConsumerOrders() {
  const [activeTab, setActiveTab] = useState<OrderStatusTab>('all');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [filters, setFilters] = useState<FilterState>({
    status: '',
    startDate: '',
    endDate: '',
    orderNo: '',
  });

  const [detailModal, setDetailModal] = useState({
    isOpen: false,
    order: null as Order | null,
    loading: false,
  });

  const [afterSaleModal, setAfterSaleModal] = useState({
    isOpen: false,
    order: null as Order | null,
    type: 'return' as 'return' | 'exchange',
    description: '',
    images: [] as string[],
    submitting: false,
  });

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const statusMap: Record<OrderStatusTab, string> = {
        all: '',
        pending: 'pending',
        shipped: 'shipped',
        customs: 'customs',
        delivered: 'delivered',
        aftersale: 'aftersale',
      };

      const data = await getConsumerOrders({
        page,
        pageSize,
        status: statusMap[activeTab] || filters.status,
        ...(filters.orderNo && { orderNo: filters.orderNo }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      setOrders(data.items);
      setTotal(data.total);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载订单失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page]);

  const handleViewDetail = async (orderId: number) => {
    setDetailModal({ isOpen: true, order: null, loading: true });
    try {
      const order = await getOrderById(orderId);
      setDetailModal({ isOpen: true, order, loading: false });
    } catch (err) {
      console.error('Failed to fetch order detail:', err);
      setDetailModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleOpenAfterSale = (order: Order) => {
    setAfterSaleModal({
      isOpen: true,
      order,
      type: 'return',
      description: '',
      images: [],
      submitting: false,
    });
  };

  const handleSubmitAfterSale = async () => {
    if (!afterSaleModal.order || afterSaleModal.order.items.length === 0) return;
    setAfterSaleModal((prev) => ({ ...prev, submitting: true }));
    try {
      const firstItem = afterSaleModal.order.items[0];
      await createReturn({
        orderId: afterSaleModal.order.id,
        returnNo: `RET-${Date.now()}`,
        productId: firstItem.productId,
        quantity: firstItem.quantity,
        reason: afterSaleModal.description,
      });
      showToast('售后申请提交成功', 'success');
      setAfterSaleModal({
        isOpen: false,
        order: null,
        type: 'return',
        description: '',
        images: [],
        submitting: false,
      });
      fetchOrders();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '提交失败', 'error');
      setAfterSaleModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleConfirmReceive = async (orderId: number) => {
    try {
      await updateOrderStatus(orderId, 'delivered');
      showToast('确认收货成功', 'success');
      fetchOrders();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const handleImageUpload = () => {
    const newImage = `https://picsum.photos/200/200?random=${Date.now()}`;
    setAfterSaleModal((prev) => ({
      ...prev,
      images: [...prev.images, newImage].slice(0, 4),
    }));
  };

  const handleRemoveImage = (index: number) => {
    setAfterSaleModal((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  const handleReset = () => {
    setFilters({
      status: '',
      startDate: '',
      endDate: '',
      orderNo: '',
    });
    setPage(1);
    fetchOrders();
  };

  const getOrderStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: 'green' | 'amber' | 'red' | 'cyan' | 'blue' | 'muted' }> = {
      pending: { label: '待发货', color: 'amber' },
      processing: { label: '处理中', color: 'cyan' },
      shipped: { label: '已发货', color: 'blue' },
      customs: { label: '清关中', color: 'cyan' },
      'in-transit': { label: '运输中', color: 'cyan' },
      delivered: { label: '已签收', color: 'green' },
      aftersale: { label: '售后中', color: 'red' },
      completed: { label: '已完成', color: 'green' },
      cancelled: { label: '已取消', color: 'muted' },
    };

    const config = statusMap[status] || { label: getStatusLabel(status), color: getStatusColor(status) as 'green' | 'amber' | 'red' | 'cyan' | 'blue' | 'muted' };
    return <StatusBadge status={status} customLabel={config.label} customColor={config.color} />;
  };

  const productImage = (sku: string) => {
    return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`product photo of ${sku}, e-commerce product, white background, high quality`)}&image_size=square`;
  };

  const mockTrajectory = [
    { time: '2026-06-09 14:30:00', status: '签收', description: '包裹已签收，感谢您的购买', completed: true },
    { time: '2026-06-09 09:15:00', status: '派送中', description: '快递员正在派送，请保持电话畅通', completed: true },
    { time: '2026-06-08 18:45:00', status: '到达目的地', description: '包裹已到达目的地城市', completed: true },
    { time: '2026-06-07 10:20:00', status: '清关完成', description: '包裹已完成清关，正在转运', completed: true },
    { time: '2026-06-06 08:00:00', status: '清关中', description: '包裹正在海关清关，请耐心等待', completed: true },
    { time: '2026-06-05 16:30:00', status: '已发货', description: '包裹已从海外仓库发出', completed: true },
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
            <AlertCircle size={18} />
          )}
          {toast.message}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">我的订单</h1>
          <p className="text-text-muted text-sm mt-1">查看您的所有订单记录和物流信息</p>
        </div>
      </div>

      <div className="card bg-bg-dark/80 backdrop-blur-sm border-cyan/30">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search size={16} className="text-text-muted" />
            <input
              type="text"
              placeholder="输入订单号搜索..."
              value={filters.orderNo}
              onChange={(e) => setFilters({ ...filters, orderNo: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="input flex-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-text-muted" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="input-select w-36"
            />
            <span className="text-text-muted">至</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="input-select w-36"
            />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="btn btn-secondary">
              <X size={14} />
              重置
            </button>
            <button onClick={handleSearch} className="btn btn-cyan">
              <Search size={14} />
              搜索
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-cyan/20 to-primary/20 text-cyan-light border border-cyan/30'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
            }`}
          >
            {tab.icon}
            {tab.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="text-cyan animate-spin" />
            <p className="text-text-muted">加载订单中...</p>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20">
          <Package size={64} className="text-text-muted mb-4" />
          <p className="text-text-primary font-medium mb-2">暂无订单记录</p>
          <p className="text-text-muted text-sm">您还没有相关订单，快去选购心仪商品吧</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card card-hover">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-border-color">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-text-muted text-sm">订单号: </span>
                    <span className="text-text-primary font-mono font-medium">{order.orderNo}</span>
                  </div>
                  <div>
                    <span className="text-text-muted text-sm">下单时间: </span>
                    <span className="text-text-secondary">{formatDate(order.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getOrderStatusBadge(order.status)}
                </div>
              </div>

              <div className="space-y-4">
                {order.items.map((item: OrderItem, idx: number) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg bg-bg-dark border border-border-color overflow-hidden flex-shrink-0">
                      <img
                        src={productImage(item.product?.sku || 'product')}
                        alt={item.product?.name || '商品'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%2364748B" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 11 3 3 8-8"/><path d="M12 3v18"/></svg>';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-text-primary font-medium truncate">
                        {item.product?.name || `商品 ${item.productId}`}
                      </h4>
                      <p className="text-text-muted text-sm mt-1">
                        SKU: {item.product?.sku || '-'}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-text-secondary text-sm">x{item.quantity}</span>
                        <span className="text-cyan font-medium">
                          {formatCurrency(item.unitPrice, order.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-border-color">
                <div className="text-right">
                  <span className="text-text-muted text-sm">订单金额: </span>
                  <span className="text-xl font-bold text-cyan font-mono">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewDetail(order.id)}
                    className="btn btn-secondary"
                  >
                    <Eye size={14} />
                    查看详情
                  </button>
                  {(order.status === 'shipped' || order.status === 'in-transit' || order.status === 'customs') && (
                    <button
                      onClick={() => handleConfirmReceive(order.id)}
                      className="btn btn-cyan"
                    >
                      <CheckCircle size={14} />
                      确认收货
                    </button>
                  )}
                  {order.status === 'delivered' && (
                    <button
                      onClick={() => handleOpenAfterSale(order)}
                      className="btn btn-danger"
                    >
                      <RefreshCw size={14} />
                      申请售后
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {total > pageSize && (
            <div className="flex items-center justify-between mt-6 px-2">
              <div className="text-sm text-text-secondary">
                共 {total} 条记录，第 {page} / {Math.ceil(total / pageSize)} 页
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <span className="px-4 py-2 bg-bg-card rounded-lg text-sm">{page}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / pageSize)}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, order: null, loading: false })}
        title="订单详情"
        width="max-w-3xl"
      >
        {detailModal.loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-cyan animate-spin" />
          </div>
        ) : detailModal.order ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-primary font-mono text-lg">{detailModal.order.orderNo}</p>
                <p className="text-text-muted text-sm mt-1">{formatDate(detailModal.order.createdAt)}</p>
              </div>
              {getOrderStatusBadge(detailModal.order.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-bg-dark/50 rounded-lg border border-border-color">
                <h4 className="text-text-primary font-medium mb-3 flex items-center gap-2">
                  <User size={16} className="text-cyan" />
                  收货人信息
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-text-muted" />
                    <span className="text-text-secondary">收货人: </span>
                    <span className="text-text-primary">{detailModal.order.customerName}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-text-muted mt-0.5" />
                    <span className="text-text-secondary">地址: </span>
                    <span className="text-text-primary">
                      {detailModal.order.shippingCountry} {detailModal.order.shippingCity} {detailModal.order.shippingAddress} {detailModal.order.postalCode}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-bg-dark/50 rounded-lg border border-border-color">
                <h4 className="text-text-primary font-medium mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-cyan" />
                  清关状态
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <StatusBadge status="cleared" customLabel="已放行" customColor="green" />
                    <span className="text-text-muted">清关状态</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-secondary">申报口岸: </span>
                    <span className="text-text-primary">上海浦东机场</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-secondary">税额: </span>
                    <span className="text-text-primary">{formatCurrency(detailModal.order.totalAmount * 0.1, 'USD')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-bg-dark/50 rounded-lg border border-border-color">
              <h4 className="text-text-primary font-medium mb-4 flex items-center gap-2">
                <Package size={16} className="text-cyan" />
                商品明细
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-color">
                      <th className="table-header">商品</th>
                      <th className="table-header">SKU</th>
                      <th className="table-header text-center">单价</th>
                      <th className="table-header text-center">数量</th>
                      <th className="table-header text-right">小计</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailModal.order.items.map((item, idx) => (
                      <tr key={idx} className="table-row">
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-bg-card border border-border-color overflow-hidden">
                              <img
                                src={productImage(item.product?.sku || 'product')}
                                alt={item.product?.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%2364748B" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 11 3 3 8-8"/></svg>';
                                }}
                              />
                            </div>
                            <span className="text-text-primary">{item.product?.name}</span>
                          </div>
                        </td>
                        <td className="table-cell font-mono text-text-muted">{item.product?.sku}</td>
                        <td className="table-cell text-center text-cyan">{formatCurrency(item.unitPrice, detailModal.order.currency)}</td>
                        <td className="table-cell text-center text-text-secondary">x{item.quantity}</td>
                        <td className="table-cell text-right text-text-primary font-medium">
                          {formatCurrency(item.unitPrice * item.quantity, detailModal.order.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-4 pt-4 border-t border-border-color">
                <div className="text-right">
                  <p className="text-text-muted text-sm">订单总额</p>
                  <p className="text-2xl font-bold text-cyan font-mono">
                    {formatCurrency(detailModal.order.totalAmount, detailModal.order.currency)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-bg-dark/50 rounded-lg border border-border-color">
              <h4 className="text-text-primary font-medium mb-4 flex items-center gap-2">
                <Truck size={16} className="text-cyan" />
                物流轨迹
              </h4>
              <div className="relative">
                {mockTrajectory.map((point, idx) => (
                  <div key={idx} className="flex gap-4 pb-6 last:pb-0">
                    <div className="relative flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${point.completed ? 'bg-cyan' : 'bg-bg-hover'}`} />
                      {idx < mockTrajectory.length - 1 && (
                        <div className={`w-0.5 h-full ${point.completed ? 'bg-cyan/30' : 'bg-bg-hover'}`} style={{ position: 'absolute', top: '12px' }} />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium ${point.completed ? 'text-text-primary' : 'text-text-muted'}`}>
                          {point.status}
                        </p>
                        <span className="text-text-muted text-xs">{point.time}</span>
                      </div>
                      <p className="text-text-secondary text-sm mt-1">{point.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={afterSaleModal.isOpen}
        onClose={() => !afterSaleModal.submitting && setAfterSaleModal({ ...afterSaleModal, isOpen: false })}
        title="申请售后"
        width="max-w-lg"
        footer={
          <>
            <button
              onClick={() => setAfterSaleModal({ ...afterSaleModal, isOpen: false })}
              disabled={afterSaleModal.submitting}
              className="btn btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleSubmitAfterSale}
              disabled={afterSaleModal.submitting || !afterSaleModal.description.trim()}
              className="btn btn-cyan"
            >
              {afterSaleModal.submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  提交中...
                </>
              ) : (
                '提交申请'
              )}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {afterSaleModal.order && (
            <div className="p-4 bg-bg-dark/50 rounded-lg border border-border-color">
              <p className="text-text-primary font-medium mb-2">订单信息</p>
              <p className="text-text-muted text-sm font-mono">{afterSaleModal.order.orderNo}</p>
              <div className="flex items-center gap-3 mt-3">
                {afterSaleModal.order.items.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="w-14 h-14 rounded-lg bg-bg-card border border-border-color overflow-hidden">
                    <img
                      src={productImage(item.product?.sku || 'product')}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="%2364748B" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';
                      }}
                    />
                  </div>
                ))}
                {afterSaleModal.order.items.length > 2 && (
                  <span className="text-text-muted text-sm">+{afterSaleModal.order.items.length - 2} 件商品</span>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">售后类型</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAfterSaleModal({ ...afterSaleModal, type: 'return' })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  afterSaleModal.type === 'return'
                    ? 'border-cyan bg-cyan/10'
                    : 'border-border-color bg-bg-dark/30 hover:border-cyan/50'
                }`}
              >
                <RefreshCw size={20} className={afterSaleModal.type === 'return' ? 'text-cyan' : 'text-text-muted'} />
                <p className={`mt-2 font-medium ${afterSaleModal.type === 'return' ? 'text-cyan' : 'text-text-primary'}`}>退货退款</p>
                <p className="text-xs text-text-muted mt-1">退回商品，全额退款</p>
              </button>
              <button
                onClick={() => setAfterSaleModal({ ...afterSaleModal, type: 'exchange' })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  afterSaleModal.type === 'exchange'
                    ? 'border-cyan bg-cyan/10'
                    : 'border-border-color bg-bg-dark/30 hover:border-cyan/50'
                }`}
              >
                <Package size={20} className={afterSaleModal.type === 'exchange' ? 'text-cyan' : 'text-text-muted'} />
                <p className={`mt-2 font-medium ${afterSaleModal.type === 'exchange' ? 'text-cyan' : 'text-text-primary'}`}>换货</p>
                <p className="text-xs text-text-muted mt-1">更换同款商品</p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">问题描述</label>
            <textarea
              value={afterSaleModal.description}
              onChange={(e) => setAfterSaleModal({ ...afterSaleModal, description: e.target.value })}
              placeholder="请详细描述您遇到的问题，以便我们更好地为您处理..."
              rows={4}
              className="input resize-none"
              maxLength={500}
            />
            <p className="text-text-muted text-xs mt-2 text-right">
              {afterSaleModal.description.length}/500
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              上传图片 <span className="text-text-muted font-normal">(最多4张)</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {afterSaleModal.images.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg border border-border-color overflow-hidden">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red/90 text-white flex items-center justify-center hover:bg-red"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {afterSaleModal.images.length < 4 && (
                <button
                  onClick={handleImageUpload}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-border-color bg-bg-dark/30 flex flex-col items-center justify-center gap-1 hover:border-cyan/50 hover:bg-cyan/5 transition-all"
                >
                  <Upload size={20} className="text-text-muted" />
                  <span className="text-xs text-text-muted">添加</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-3 bg-amber/10 border border-amber/30 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-amber flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-amber font-medium">温馨提示</p>
              <p className="text-text-secondary mt-1">
                我们将在1-3个工作日内处理您的申请，请注意查收消息通知。如有疑问，请联系客服。
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
