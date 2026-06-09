import { useEffect, useState, useMemo } from 'react';
import {
  RefreshCw,
  Filter,
  Ship,
  Plane,
  Train,
  ArrowRight,
  CheckCircle,
  X,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Package,
  MapPin,
  DollarSign,
  Clock,
  AlertTriangle,
  ChevronDown,
  Calendar,
  FileText,
  User,
  MessageSquare,
  Send,
  Play,
} from 'lucide-react';
import {
  getTransferSuggestions,
  createTransferOrder,
  getTransferOrders,
  getTransferOrderById,
  approveTransferOrder,
  rejectTransferOrder,
  executeTransferOrder,
} from '../../api/inventory';
import DataTable from '../../components/ui/DataTable';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { formatCurrency, formatDate, getTransportModeLabel, getStatusLabel, getStatusColor } from '../../utils/format';
import type { TransferSuggestion, TransferOrder, TransportMode, ApprovalStatus, TransferItem, Product } from '../../types';

type TabType = 'suggestions' | 'orders';

interface TransferOrderWithDetails extends TransferOrder {
  items: (TransferItem & { product: Product })[];
}

export default function Transfers() {
  const [activeTab, setActiveTab] = useState<TabType>('suggestions');

  const [suggestions, setSuggestions] = useState<TransferSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [creatingTransfer, setCreatingTransfer] = useState<string | null>(null);

  const [orders, setOrders] = useState<TransferOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<TransferOrderWithDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const [orderFilters, setOrderFilters] = useState({
    status: '',
    transportMode: '',
    startDate: '',
    endDate: '',
  });

  const fetchSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const data = await getTransferSuggestions();
      setSuggestions(data);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        pageSize,
      };
      if (orderFilters.status) params.status = orderFilters.status;
      if (orderFilters.transportMode) params.transportMode = orderFilters.transportMode;
      if (orderFilters.startDate) params.startDate = orderFilters.startDate;
      if (orderFilters.endDate) params.endDate = orderFilters.endDate;

      const response = await getTransferOrders(params);
      setOrders(response.items);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'suggestions') {
      fetchSuggestions();
    } else {
      fetchOrders();
    }
  }, [activeTab, page, orderFilters.status, orderFilters.transportMode, orderFilters.startDate, orderFilters.endDate]);

  const handleCreateTransfer = async (suggestion: TransferSuggestion) => {
    setCreatingTransfer(suggestion.id);
    try {
      await createTransferOrder({
        orderNo: `TR${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        sourceWarehouseId: suggestion.sourceWarehouse.id,
        targetWarehouseId: suggestion.targetWarehouse.id,
        transportMode: suggestion.recommendedTransportMode,
        estimatedCost: suggestion.estimatedCost,
        estimatedDays: suggestion.estimatedDays,
        items: [
          {
            id: 0,
            transferOrderId: 0,
            productId: suggestion.product.id,
            quantity: suggestion.suggestedQuantity,
          },
        ],
      });
      setSuggestions(suggestions.filter((s) => s.id !== suggestion.id));
      showToast('调拨单创建成功', 'success');
      fetchOrders();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '创建调拨单失败', 'error');
    } finally {
      setCreatingTransfer(null);
    }
  };

  const handleViewDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const data = await getTransferOrderById(id);
      setSelectedOrder(data as TransferOrderWithDetails);
      setDetailModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch order detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      await approveTransferOrder(selectedOrder.id);
      setDetailModalOpen(false);
      showToast('审批通过', 'success');
      fetchOrders();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '审批失败', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await rejectTransferOrder(selectedOrder.id, rejectReason);
      setRejectModalOpen(false);
      setDetailModalOpen(false);
      setRejectReason('');
      showToast('已拒绝调拨单', 'success');
      fetchOrders();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      await executeTransferOrder(selectedOrder.id);
      setDetailModalOpen(false);
      showToast('调拨执行成功，库存已更新', 'success');
      fetchOrders();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '执行失败', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getTransportIcon = (mode: TransportMode) => {
    switch (mode) {
      case 'sea':
        return <Ship size={16} />;
      case 'air':
        return <Plane size={16} />;
      case 'rail':
        return <Train size={16} />;
    }
  };

  const getUrgencyColor = (score: number) => {
    if (score >= 80) return 'text-red';
    if (score >= 50) return 'text-amber';
    return 'text-green';
  };

  const getUrgencyBg = (score: number) => {
    if (score >= 80) return 'from-red/20 to-red/5';
    if (score >= 50) return 'from-amber/20 to-amber/5';
    return 'from-green/20 to-green/5';
  };

  const suggestionColumns = [
    {
      key: 'sourceWarehouse',
      title: '来源仓',
      width: '15%',
      render: (row: TransferSuggestion) => (
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-cyan" />
          <span className="text-text-secondary">{row.sourceWarehouse.name}</span>
        </div>
      ),
    },
    {
      key: 'arrow',
      title: '',
      width: '5%',
      render: () => (
        <div className="flex justify-center">
          <ArrowRight size={16} className="text-cyan" />
        </div>
      ),
    },
    {
      key: 'targetWarehouse',
      title: '目标仓',
      width: '15%',
      render: (row: TransferSuggestion) => (
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-green" />
          <span className="text-text-secondary">{row.targetWarehouse.name}</span>
        </div>
      ),
    },
    {
      key: 'product',
      title: '商品',
      width: '20%',
      render: (row: TransferSuggestion) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-cyan/20 rounded-lg flex items-center justify-center">
            <Package size={14} className="text-cyan" />
          </div>
          <div>
            <p className="font-medium text-text-primary text-sm">{row.product.name}</p>
            <p className="text-xs text-text-muted font-mono">{row.product.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'suggestedQuantity',
      title: '建议数量',
      width: '10%',
      className: 'text-right font-mono',
      render: (row: TransferSuggestion) => (
        <span className="font-semibold text-cyan">{row.suggestedQuantity.toLocaleString()}</span>
      ),
    },
    {
      key: 'recommendedTransportMode',
      title: '运输方式',
      width: '10%',
      render: (row: TransferSuggestion) => (
        <div className="flex items-center gap-1.5">
          {getTransportIcon(row.recommendedTransportMode)}
          <span className="text-text-secondary">{getTransportModeLabel(row.recommendedTransportMode)}</span>
        </div>
      ),
    },
    {
      key: 'estimatedCost',
      title: '预估成本',
      width: '10%',
      className: 'text-right font-mono',
      render: (row: TransferSuggestion) => (
        <span className="text-text-primary">{formatCurrency(row.estimatedCost, 'USD', 0)}</span>
      ),
    },
    {
      key: 'estimatedDays',
      title: '预估天数',
      width: '8%',
      className: 'text-center',
      render: (row: TransferSuggestion) => (
        <span className="text-text-secondary">{row.estimatedDays}天</span>
      ),
    },
    {
      key: 'urgencyScore',
      title: '紧急程度',
      width: '8%',
      render: (row: TransferSuggestion) => (
        <div className="flex items-center gap-1">
          <AlertTriangle size={14} className={getUrgencyColor(row.urgencyScore)} />
          <span className={`font-semibold ${getUrgencyColor(row.urgencyScore)}`}>
            {row.urgencyScore}
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      title: '操作',
      width: '8%',
      render: (row: TransferSuggestion) => (
        <button
          onClick={() => handleCreateTransfer(row)}
          disabled={creatingTransfer === row.id}
          className="btn btn-cyan px-2 py-1 text-xs"
        >
          {creatingTransfer === row.id ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <>
              <Send size={14} />
              生成
            </>
          )}
        </button>
      ),
    },
  ];

  const orderColumns = [
    {
      key: 'orderNo',
      title: '调拨单号',
      width: '15%',
      render: (row: TransferOrder) => (
        <span className="font-mono font-medium text-cyan">{row.orderNo}</span>
      ),
    },
    {
      key: 'sourceWarehouse',
      title: '来源仓',
      width: '12%',
      render: (row: TransferOrder) => (
        <div className="flex items-center gap-1.5">
          <MapPin size={14} className="text-cyan" />
          <span className="text-text-secondary">{row.sourceWarehouse?.name}</span>
        </div>
      ),
    },
    {
      key: 'targetWarehouse',
      title: '目标仓',
      width: '12%',
      render: (row: TransferOrder) => (
        <div className="flex items-center gap-1.5">
          <MapPin size={14} className="text-green" />
          <span className="text-text-secondary">{row.targetWarehouse?.name}</span>
        </div>
      ),
    },
    {
      key: 'transportMode',
      title: '运输方式',
      width: '10%',
      render: (row: TransferOrder) => (
        <div className="flex items-center gap-1.5">
          {getTransportIcon(row.transportMode)}
          <span className="text-text-secondary">{getTransportModeLabel(row.transportMode)}</span>
        </div>
      ),
    },
    {
      key: 'itemCount',
      title: '商品数量',
      width: '8%',
      className: 'text-right font-mono',
      render: (row: TransferOrder) => (
        <span className="font-semibold">
          {row.items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'estimatedCost',
      title: '预估成本',
      width: '10%',
      className: 'text-right font-mono',
      render: (row: TransferOrder) => (
        <span className="text-cyan">{formatCurrency(row.estimatedCost, 'USD', 0)}</span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: '8%',
      render: (row: TransferOrder) => (
        <StatusBadge
          status={row.status}
          customLabel={getStatusLabel(row.status)}
          customColor={getStatusColor(row.status) as 'green' | 'amber' | 'red' | 'cyan' | 'muted'}
        />
      ),
    },
    {
      key: 'approvalStatus',
      title: '审批状态',
      width: '8%',
      render: (row: TransferOrder) => (
        <StatusBadge
          status={row.status}
          customLabel={getStatusLabel(row.status)}
          customColor={getStatusColor(row.status) as 'green' | 'amber' | 'red' | 'cyan' | 'muted'}
        />
      ),
    },
    {
      key: 'createdAt',
      title: '创建时间',
      width: '12%',
      render: (row: TransferOrder) => (
        <span className="text-text-muted text-sm">{formatDate(row.createdAt, 'MM-DD HH:mm')}</span>
      ),
    },
    {
      key: 'action',
      title: '操作',
      width: '5%',
      render: (row: TransferOrder) => (
        <button
          onClick={() => handleViewDetail(row.id)}
          className="btn btn-secondary px-2 py-1 text-xs"
        >
          <Eye size={14} />
        </button>
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
          <h1 className="text-2xl font-bold text-text-primary">库存调拨</h1>
          <p className="text-text-muted text-sm mt-1">
            AI智能调拨建议与调拨单全流程管理
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={activeTab === 'suggestions' ? fetchSuggestions : fetchOrders}
            className="btn btn-primary"
          >
            <RefreshCw
              size={16}
              className={suggestionsLoading || ordersLoading ? 'animate-spin' : ''}
            />
            刷新
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-bg-card rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'suggestions'
              ? 'bg-cyan text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Zap size={16} />
          AI调拨建议
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-cyan text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <FileText size={16} />
          调拨单列表
        </button>
      </div>

      {activeTab === 'suggestions' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {suggestionsLoading ? (
              <div className="card flex items-center justify-center py-12">
                <div className="flex items-center gap-2 text-text-muted">
                  <div className="w-5 h-5 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
                  加载中...
                </div>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="card flex items-center justify-center py-12">
                <div className="text-center">
                  <CheckCircle size={48} className="text-green mx-auto mb-3 opacity-50" />
                  <p className="text-text-muted">暂无调拨建议，库存状态良好</p>
                </div>
              </div>
            ) : (
              <div className="card card-hover overflow-hidden">
                <div className="px-4 py-3 bg-bg-dark/50 border-b border-border-color">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <Zap size={18} className="text-cyan" />
                      智能调拨建议
                      <span className="ml-2 px-2 py-0.5 bg-cyan/20 text-cyan text-xs rounded-full">
                        {suggestions.length} 条建议
                      </span>
                    </h3>
                  </div>
                </div>
                <div className="p-0">
                  <DataTable
                    columns={suggestionColumns as any}
                    data={suggestions as any[]}
                    loading={suggestionsLoading}
                    total={suggestions.length}
                    page={1}
                    pageSize={suggestions.length}
                    showPagination={false}
                    rowKey="id"
                  />
                </div>
              </div>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`card card-hover bg-gradient-to-br ${getUrgencyBg(suggestion.urgencyScore)}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-bg-card rounded-lg">
                        {getTransportIcon(suggestion.recommendedTransportMode)}
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{suggestion.product.name}</p>
                        <p className="text-xs text-text-muted font-mono">
                          {suggestion.product.sku}
                        </p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      suggestion.urgencyScore >= 80
                        ? 'bg-red/20 text-red'
                        : suggestion.urgencyScore >= 50
                        ? 'bg-amber/20 text-amber'
                        : 'bg-green/20 text-green'
                    }`}>
                      紧急度 {suggestion.urgencyScore}
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <MapPin size={14} className="text-cyan" />
                        <span className="text-sm text-text-secondary">
                          {suggestion.sourceWarehouse.name}
                        </span>
                      </div>
                      <ArrowRight size={16} className="text-cyan" />
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-sm text-text-secondary">
                          {suggestion.targetWarehouse.name}
                        </span>
                        <MapPin size={14} className="text-green" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-bg-card rounded-lg">
                        <p className="text-xs text-text-muted mb-1">建议数量</p>
                        <p className="font-bold text-cyan font-mono">
                          {suggestion.suggestedQuantity.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2 bg-bg-card rounded-lg">
                        <p className="text-xs text-text-muted mb-1">预估成本</p>
                        <p className="font-bold text-green font-mono">
                          {formatCurrency(suggestion.estimatedCost, 'USD', 0)}
                        </p>
                      </div>
                      <div className="p-2 bg-bg-card rounded-lg">
                        <p className="text-xs text-text-muted mb-1">预估天数</p>
                        <p className="font-bold text-amber font-mono">
                          {suggestion.estimatedDays}天
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 bg-bg-card rounded-lg">
                      {getTransportIcon(suggestion.recommendedTransportMode)}
                      <span className="text-sm text-text-secondary">
                        推荐运输方式:{' '}
                        <span className="text-text-primary font-medium">
                          {getTransportModeLabel(suggestion.recommendedTransportMode)}
                        </span>
                      </span>
                    </div>

                    <p className="text-xs text-text-muted line-clamp-2">
                      <Zap size={12} className="inline mr-1 text-cyan" />
                      {suggestion.reason}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCreateTransfer(suggestion)}
                    disabled={creatingTransfer === suggestion.id}
                    className="w-full btn btn-cyan"
                  >
                    {creatingTransfer === suggestion.id ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        一键生成调拨单
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card bg-bg-dark/80 backdrop-blur-sm border-cyan/30">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-text-muted" />
                <span className="text-sm text-text-secondary">状态</span>
                <select
                  value={orderFilters.status}
                  onChange={(e) => {
                    setOrderFilters({ ...orderFilters, status: e.target.value });
                    setPage(1);
                  }}
                  className="input-select w-32"
                >
                  <option value="">全部</option>
                  <option value="pending">待审批</option>
                  <option value="approved">已通过</option>
                  <option value="rejected">已拒绝</option>
                  <option value="processing">处理中</option>
                  <option value="completed">已完成</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Ship size={16} className="text-text-muted" />
                <span className="text-sm text-text-secondary">运输方式</span>
                <select
                  value={orderFilters.transportMode}
                  onChange={(e) => {
                    setOrderFilters({ ...orderFilters, transportMode: e.target.value });
                    setPage(1);
                  }}
                  className="input-select w-28"
                >
                  <option value="">全部</option>
                  <option value="sea">海运</option>
                  <option value="air">空运</option>
                  <option value="rail">铁路</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-text-muted" />
                <span className="text-sm text-text-secondary">日期范围</span>
                <input
                  type="date"
                  value={orderFilters.startDate}
                  onChange={(e) => setOrderFilters({ ...orderFilters, startDate: e.target.value })}
                  className="input w-32 text-sm"
                />
                <span className="text-text-muted">至</span>
                <input
                  type="date"
                  value={orderFilters.endDate}
                  onChange={(e) => setOrderFilters({ ...orderFilters, endDate: e.target.value })}
                  className="input w-32 text-sm"
                />
              </div>
              <div className="flex-1" />
              <button
                onClick={() => {
                  setOrderFilters({ status: '', transportMode: '', startDate: '', endDate: '' });
                  setPage(1);
                }}
                className="btn btn-secondary"
              >
                <X size={14} />
                重置
              </button>
              <button onClick={fetchOrders} className="btn btn-cyan">
                应用筛选
              </button>
            </div>
          </div>

          <div className="card card-hover">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <FileText size={18} className="text-primary-light" />
                调拨单列表
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-amber rounded-full" /> 待审批
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green rounded-full" /> 已通过
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-red rounded-full" /> 已拒绝
                </span>
              </div>
            </div>
            <DataTable
              columns={orderColumns as any}
              data={orders as any[]}
              loading={ordersLoading}
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              rowKey="id"
            />
          </div>
        </div>
      )}

      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="调拨单详情"
        width="max-w-4xl"
        footer={
          selectedOrder?.status === 'pending' ? (
            <>
              <button
                onClick={() => setRejectModalOpen(true)}
                disabled={actionLoading}
                className="btn btn-danger"
              >
                <ThumbsDown size={16} />
                拒绝
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="btn btn-success"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    审批中...
                  </>
                ) : (
                  <>
                    <ThumbsUp size={16} />
                    通过
                  </>
                )}
              </button>
            </>
          ) : selectedOrder?.status === 'approved' ? (
            <button
              onClick={handleExecute}
              disabled={actionLoading}
              className="btn btn-cyan"
            >
              {actionLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  执行中...
                </>
              ) : (
                <>
                  <Play size={16} />
                  执行调拨
                </>
              )}
            </button>
          ) : null
        }
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-text-muted">
              <div className="w-5 h-5 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
              加载中...
            </div>
          </div>
        ) : selectedOrder ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-bg-dark/50 rounded-lg">
                <p className="text-xs text-text-muted mb-1">调拨单号</p>
                <p className="font-mono font-semibold text-cyan">{selectedOrder.orderNo}</p>
              </div>
              <div className="p-3 bg-bg-dark/50 rounded-lg">
                <p className="text-xs text-text-muted mb-1">状态</p>
                <StatusBadge
                  status={selectedOrder.status}
                  customLabel={getStatusLabel(selectedOrder.status)}
                  customColor={getStatusColor(selectedOrder.status) as 'green' | 'amber' | 'red' | 'cyan' | 'muted'}
                />
              </div>
              <div className="p-3 bg-bg-dark/50 rounded-lg">
                <p className="text-xs text-text-muted mb-1">运输方式</p>
                <div className="flex items-center gap-1.5">
                  {getTransportIcon(selectedOrder.transportMode)}
                  <span className="text-text-primary">
                    {getTransportModeLabel(selectedOrder.transportMode)}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-bg-dark/50 rounded-lg">
                <p className="text-xs text-text-muted mb-1">创建时间</p>
                <p className="text-text-primary text-sm">
                  {formatDate(selectedOrder.createdAt, 'YYYY-MM-DD HH:mm')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-bg-dark/50 rounded-lg border border-cyan/20">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={16} className="text-cyan" />
                  <span className="text-sm font-medium text-text-secondary">来源仓</span>
                </div>
                <p className="text-lg font-semibold text-text-primary">
                  {selectedOrder.sourceWarehouse?.name}
                </p>
                <p className="text-sm text-text-muted">
                  {selectedOrder.sourceWarehouse?.address}
                </p>
              </div>
              <div className="p-4 bg-bg-dark/50 rounded-lg border border-green/20">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={16} className="text-green" />
                  <span className="text-sm font-medium text-text-secondary">目标仓</span>
                </div>
                <p className="text-lg font-semibold text-text-primary">
                  {selectedOrder.targetWarehouse?.name}
                </p>
                <p className="text-sm text-text-muted">
                  {selectedOrder.targetWarehouse?.address}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-bg-dark/50 rounded-lg text-center">
                <DollarSign size={20} className="text-cyan mx-auto mb-2" />
                <p className="text-xs text-text-muted mb-1">预估成本</p>
                <p className="text-xl font-bold text-cyan font-mono">
                  {formatCurrency(selectedOrder.estimatedCost, 'USD', 0)}
                </p>
              </div>
              <div className="p-4 bg-bg-dark/50 rounded-lg text-center">
                <Clock size={20} className="text-amber mx-auto mb-2" />
                <p className="text-xs text-text-muted mb-1">预估天数</p>
                <p className="text-xl font-bold text-amber font-mono">
                  {selectedOrder.estimatedDays}天
                </p>
              </div>
              <div className="p-4 bg-bg-dark/50 rounded-lg text-center">
                <Package size={20} className="text-green mx-auto mb-2" />
                <p className="text-xs text-text-muted mb-1">商品总数</p>
                <p className="text-xl font-bold text-green font-mono">
                  {selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-md font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Package size={16} className="text-cyan" />
                商品明细
              </h4>
              <div className="overflow-x-auto rounded-xl border border-border-color">
                <table className="w-full">
                  <thead>
                    <tr className="bg-bg-dark/50">
                      <th className="table-header">商品信息</th>
                      <th className="table-header">SKU</th>
                      <th className="table-header text-right">单价</th>
                      <th className="table-header text-right">数量</th>
                      <th className="table-header text-right">总价</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, idx) => (
                      <tr key={idx} className="table-row">
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-cyan/20 rounded-lg flex items-center justify-center">
                              <Package size={14} className="text-cyan" />
                            </div>
                            <span className="font-medium">{item.product?.name}</span>
                          </div>
                        </td>
                        <td className="table-cell font-mono text-text-muted">{item.product?.sku}</td>
                        <td className="table-cell text-right font-mono">
                          {formatCurrency(item.product?.declaredValue || 0, 'USD', 2)}
                        </td>
                        <td className="table-cell text-right font-mono font-semibold">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="table-cell text-right font-mono text-cyan">
                          {formatCurrency(item.quantity * (item.product?.declaredValue || 0), 'USD', 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="text-md font-semibold text-text-primary mb-3 flex items-center gap-2">
                <User size={16} className="text-cyan" />
                审批流程
              </h4>
              <div className="relative pl-8 space-y-4">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border-color" />
                <div className="relative">
                  <div className="absolute -left-5 w-4 h-4 bg-green rounded-full border-2 border-bg-card" />
                  <div className="p-3 bg-bg-dark/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-text-primary">创建调拨单</span>
                      <span className="text-xs text-text-muted">
                        {formatDate(selectedOrder.createdAt, 'YYYY-MM-DD HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">
                      系统自动创建调拨单，等待审批
                    </p>
                  </div>
                </div>
                {selectedOrder.approvedAt && (
                  <div className="relative">
                    <div className={`absolute -left-5 w-4 h-4 ${
                      selectedOrder.status === 'approved' ? 'bg-green' : 'bg-red'
                    } rounded-full border-2 border-bg-card`} />
                    <div className="p-3 bg-bg-dark/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-text-primary">
                          {selectedOrder.status === 'approved' ? '审批通过' : '审批拒绝'}
                        </span>
                        <span className="text-xs text-text-muted">
                          {formatDate(selectedOrder.approvedAt, 'YYYY-MM-DD HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary">
                        审批人: {selectedOrder.approvedBy || '系统管理员'}
                      </p>
                    </div>
                  </div>
                )}
                {selectedOrder.status === 'pending' && (
                  <div className="relative">
                    <div className="absolute -left-5 w-4 h-4 bg-amber rounded-full border-2 border-bg-card animate-pulse" />
                    <div className="p-3 bg-amber/10 rounded-lg border border-amber/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-amber">待审批</span>
                      </div>
                      <p className="text-sm text-text-secondary">
                        请尽快处理该调拨单的审批
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="拒绝调拨单"
        width="max-w-md"
        footer={
          <>
            <button
              onClick={() => setRejectModalOpen(false)}
              className="btn btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading || !rejectReason.trim()}
              className="btn btn-danger"
            >
              {actionLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <ThumbsDown size={16} />
                  确认拒绝
                </>
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-red/10 border border-red/30 rounded-lg">
            <p className="text-sm text-red flex items-center gap-2">
              <AlertTriangle size={16} />
              拒绝后将无法恢复，请谨慎操作
            </p>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-2 flex items-center gap-2">
              <MessageSquare size={16} />
              拒绝原因
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请输入拒绝原因..."
              className="input min-h-[120px] resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
