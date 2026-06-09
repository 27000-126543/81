import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  RefreshCw,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Edit3,
  X,
  ChevronDown,
  TrendingUp,
  BarChart3,
  PieChart,
  User,
  Truck,
  AlertCircle,
  ArrowRight,
  CheckSquare,
  Square,
  Upload,
  Image,
  Activity,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  getReturnList,
  getReturnById,
  updateReturnLiability,
  updateReturnStatus,
  processRefund,
  processExchange,
  processScrap,
} from '../../api/returns';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import {
  formatDate,
  formatCurrency,
  getStatusLabel,
  getStatusColor,
  formatRelativeTime,
  truncateText,
} from '../../utils/format';
import type { ReturnRecord, Product, Order, ReturnLiability, InventoryChange, ReturnRecordWithInventory } from '../../types';

const returnStatusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'inspecting', label: '质检中' },
  { value: 'refunded', label: '已退款' },
  { value: 'exchanged', label: '已换货' },
  { value: 'scrapped', label: '已报废' },
  { value: 'rejected', label: '已拒绝' },
];

const liabilityOptions = [
  { value: '', label: '全部责任' },
  { value: 'customer', label: '用户责任' },
  { value: 'logistics', label: '物流责任' },
  { value: 'quality', label: '品质问题' },
];

const liabilityColorMap: Record<string, string> = {
  customer: 'amber',
  logistics: 'cyan',
  quality: 'red',
};

const liabilityLabelMap: Record<string, string> = {
  customer: '用户责任',
  logistics: '物流责任',
  quality: '品质问题',
};

interface ProcessRecord {
  id: number;
  action: string;
  operator: string;
  timestamp: string;
  remark: string;
}

const mockProcessRecords: ProcessRecord[] = [
  { id: 1, action: '提交退货申请', operator: '张三', timestamp: '2024-01-15 10:30:00', remark: '商品外观有划痕' },
  { id: 2, action: '收货确认', operator: '李四', timestamp: '2024-01-16 14:20:00', remark: '已收到退回商品' },
  { id: 3, action: '开始质检', operator: '王五', timestamp: '2024-01-16 15:00:00', remark: '质检人员已分配' },
];

export default function ReturnList() {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [filters, setFilters] = useState({
    returnNo: '',
    orderNo: '',
    liability: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecordWithInventory | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [liabilityModal, setLiabilityModal] = useState(false);
  const [selectedLiability, setSelectedLiability] = useState<ReturnLiability | ''>('');
  const [liabilityRemark, setLiabilityRemark] = useState('');
  const [liabilityEvidence, setLiabilityEvidence] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });
  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; title: string }>({ type: '', title: '' });
  const [refundAmount, setRefundAmount] = useState(0);
  const [inventoryChange, setInventoryChange] = useState<InventoryChange | null>(null);
  const [processRecords, setProcessRecords] = useState<ProcessRecord[]>([]);

  const [stats, setStats] = useState({
    pending: 0,
    inspecting: 0,
    refunded: 0,
    exchanged: 0,
    scrapped: 0,
    todayReturnRate: 0,
  });

  const [liabilityData, setLiabilityData] = useState([
    { name: '用户责任', value: 45 },
    { name: '物流责任', value: 30 },
    { name: '品质问题', value: 25 },
  ]);

  const [reasonData, setReasonData] = useState([
    { name: '外观瑕疵', value: 28 },
    { name: '功能故障', value: 22 },
    { name: '尺寸不符', value: 18 },
    { name: '物流破损', value: 15 },
    { name: '描述不符', value: 12 },
    { name: '其他原因', value: 5 },
  ]);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        pageSize,
      };
      if (filters.returnNo) params.returnNo = filters.returnNo;
      if (filters.orderNo) params.orderNo = filters.orderNo;
      if (filters.liability) params.liability = filters.liability;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await getReturnList(params);
      setReturns(response.items);
      setTotal(response.total);
      setSelectedIds([]);

      setStats({
        pending: response.items.filter((r) => r.status === 'pending').length + 12,
        inspecting: response.items.filter((r) => r.status === 'inspecting').length + 8,
        refunded: response.items.filter((r) => r.status === 'refunded').length + 45,
        exchanged: response.items.filter((r) => r.status === 'exchanged').length + 23,
        scrapped: response.items.filter((r) => r.status === 'scrapped').length + 15,
        todayReturnRate: 2.35,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.returnNo, filters.orderNo, filters.liability, filters.status, filters.startDate, filters.endDate]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleViewDetail = async (returnRecord: ReturnRecord) => {
    setDetailLoading(true);
    setInventoryChange(null);
    try {
      const detail = await getReturnById(returnRecord.id);
      setSelectedReturn(detail);
      setRefundAmount(detail.product?.declaredValue || 0);

      const records: ProcessRecord[] = [
        { id: 1, action: '提交退货申请', operator: detail.order?.customerName || '用户', timestamp: detail.createdAt, remark: detail.reason },
      ];
      if (detail.status !== 'pending') {
        records.push({ id: 2, action: '收货确认', operator: '系统', timestamp: detail.createdAt, remark: '已收到退回商品' });
      }
      if (detail.liability) {
        records.push({ id: 3, action: '责任判定', operator: '管理员', timestamp: detail.createdAt, remark: `判定为${liabilityLabelMap[detail.liability]}` });
      }
      if (detail.status === 'refunded') {
        records.push({ id: 4, action: '退款处理', operator: '财务', timestamp: detail.createdAt, remark: '退款已完成' });
      } else if (detail.status === 'exchanged') {
        records.push({ id: 4, action: '换货处理', operator: '仓库', timestamp: detail.createdAt, remark: '换货已完成' });
      } else if (detail.status === 'scrapped') {
        records.push({ id: 4, action: '报废处理', operator: '仓库', timestamp: detail.createdAt, remark: '商品已报废' });
      }
      setProcessRecords(records);

      setDetailModal(true);
    } catch (err) {
      showToast('加载退货详情失败', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenLiability = () => {
    if (selectedReturn?.liability) {
      setSelectedLiability(selectedReturn.liability);
    }
    setLiabilityModal(true);
  };

  const handleConfirmLiability = async () => {
    if (!selectedReturn || !selectedLiability) return;
    try {
      const result = await updateReturnLiability(selectedReturn.id, selectedLiability, liabilityRemark) as ReturnRecordWithInventory;
      showToast('责任判定成功', 'success');
      setLiabilityModal(false);
      setSelectedLiability('');
      setLiabilityRemark('');
      setLiabilityEvidence('');
      setSelectedReturn(result);
      await fetchReturns();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '责任判定失败', 'error');
    }
  };

  const handleOpenConfirm = (type: string, title: string) => {
    setConfirmAction({ type, title });
    setConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedReturn) return;

    if ((confirmAction.type === 'refund' || confirmAction.type === 'exchange' || confirmAction.type === 'scrap') && !selectedReturn.order?.fulfilledWarehouseId) {
      showToast('该订单尚未分配发货仓，请先到订单管理确认发货仓', 'error');
      return;
    }

    try {
      let result: ReturnRecordWithInventory | null = null;
      if (confirmAction.type === 'refund') {
        result = await processRefund(selectedReturn.id) as ReturnRecordWithInventory;
        showToast('退款确认成功，库存已更新', 'success');
      } else if (confirmAction.type === 'exchange') {
        result = await processExchange(selectedReturn.id) as ReturnRecordWithInventory;
        showToast('换货确认成功，库存已更新', 'success');
      } else if (confirmAction.type === 'scrap') {
        result = await processScrap(selectedReturn.id) as ReturnRecordWithInventory;
        showToast('报废确认成功', 'success');
      }
      setConfirmModal(false);
      if (result && result.inventoryChange) {
        setInventoryChange(result.inventoryChange);
        setSelectedReturn(result);
      }
      await fetchReturns();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || '操作失败', 'error');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === returns.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(returns.map((r) => r.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const resetFilters = () => {
    setFilters({
      returnNo: '',
      orderNo: '',
      liability: '',
      status: '',
      startDate: '',
      endDate: '',
    });
  };

  const statCards = [
    {
      title: '待处理',
      value: stats.pending,
      icon: <Clock size={20} />,
      color: 'from-amber/20 to-amber/5',
      iconBg: 'bg-amber/20 text-amber',
    },
    {
      title: '质检中',
      value: stats.inspecting,
      icon: <Activity size={20} />,
      color: 'from-cyan/20 to-cyan/5',
      iconBg: 'bg-cyan/20 text-cyan',
    },
    {
      title: '已退款',
      value: stats.refunded,
      icon: <CheckCircle size={20} />,
      color: 'from-green/20 to-green/5',
      iconBg: 'bg-green/20 text-green',
    },
    {
      title: '已换货',
      value: stats.exchanged,
      icon: <Package size={20} />,
      color: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/20 text-primary-light',
    },
    {
      title: '已报废',
      value: stats.scrapped,
      icon: <AlertTriangle size={20} />,
      color: 'from-red/20 to-red/5',
      iconBg: 'bg-red/20 text-red',
    },
    {
      title: '今日退货率',
      value: stats.todayReturnRate,
      suffix: '%',
      icon: <TrendingUp size={20} />,
      color: 'from-cyan/20 to-cyan/5',
      iconBg: 'bg-cyan/20 text-cyan',
      formatFn: (v: number) => v.toFixed(2),
    },
  ];

  const liabilityPieOption: EChartsOption = {
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
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            color: '#F8FAFC',
          },
        },
        labelLine: {
          show: false,
        },
        data: liabilityData.map((item, idx) => ({
          ...item,
          itemStyle: {
            color: ['#F59E0B', '#06B6D4', '#EF4444'][idx],
          },
        })),
      },
    ],
  };

  const reasonBarOption: EChartsOption = {
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
      data: reasonData.map((item) => item.name),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748B', fontSize: 11, rotate: 0 },
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
        data: reasonData.map((item, idx) => ({
          value: item.value,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: ['#06B6D4', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#64748B'][idx] },
                { offset: 1, color: ['#06B6D480', '#3B82F680', '#10B98180', '#F59E0B80', '#8B5CF680', '#64748B80'][idx] },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barWidth: 24,
      },
    ],
    animationDuration: 1200,
  };

  const columns = [
    {
      key: 'select',
      title: (
        <div className="flex items-center gap-2">
          <button onClick={toggleSelectAll} className="text-text-muted hover:text-text-primary">
            {selectedIds.length === returns.length && returns.length > 0 ? (
              <CheckSquare size={16} className="text-cyan" />
            ) : (
              <Square size={16} />
            )}
          </button>
        </div>
      ),
      width: '50px',
      render: (row: ReturnRecord) => (
        <button onClick={() => toggleSelect(row.id)} className="text-text-muted hover:text-text-primary">
          {selectedIds.includes(row.id) ? (
            <CheckSquare size={16} className="text-cyan" />
          ) : (
            <Square size={16} />
          )}
        </button>
      ),
    },
    {
      key: 'returnNo',
      title: '退货单号',
      sortable: true,
      render: (row: ReturnRecord) => (
        <span className="font-mono text-cyan">{row.returnNo}</span>
      ),
    },
    {
      key: 'order',
      title: '关联订单',
      render: (row: ReturnRecord) => (
        <div>
          <p className="font-mono text-text-primary">{row.order?.orderNo}</p>
          <p className="text-xs text-text-muted">{row.order?.customerName}</p>
        </div>
      ),
    },
    {
      key: 'product',
      title: '商品信息',
      render: (row: ReturnRecord) => (
        <div>
          <p className="font-medium">{truncateText(row.product?.name || '-', 20)}</p>
          <p className="text-xs text-text-muted font-mono">{row.product?.sku}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      title: '退货数量',
      className: 'text-center',
      render: (row: ReturnRecord) => (
        <span className="font-mono font-semibold">{row.quantity}</span>
      ),
    },
    {
      key: 'reason',
      title: '退货原因',
      render: (row: ReturnRecord) => (
        <span className="text-text-secondary">{truncateText(row.reason, 15)}</span>
      ),
    },
    {
      key: 'liability',
      title: '责任判定',
      render: (row: ReturnRecord) =>
        row.liability ? (
          <StatusBadge
            status={row.liability}
            customLabel={liabilityLabelMap[row.liability]}
            customColor={liabilityColorMap[row.liability] as any}
          />
        ) : (
          <span className="text-text-muted">待判定</span>
        ),
    },
    {
      key: 'status',
      title: '状态',
      render: (row: ReturnRecord) => (
        <StatusBadge
          status={row.status}
          customLabel={getStatusLabel(row.status)}
          customColor={getStatusColor(row.status) as any}
        />
      ),
    },
    {
      key: 'createdAt',
      title: '申请时间',
      sortable: true,
      render: (row: ReturnRecord) => (
        <div>
          <p className="text-sm">{formatDate(row.createdAt, 'MM-DD HH:mm')}</p>
          <p className="text-xs text-text-muted">{formatRelativeTime(row.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'action',
      title: '操作',
      width: '120px',
      render: (row: ReturnRecord) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleViewDetail(row)}
            className="p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-cyan transition-colors"
            title="查看详情"
          >
            <Eye size={16} />
          </button>
          {row.status === 'pending' && (
            <button
              onClick={() => {
                setSelectedReturn(row);
                handleOpenLiability();
              }}
              className="p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-amber transition-colors"
              title="责任判定"
            >
              <Edit3 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const getProcessingFlow = () => {
    if (!selectedLiability) return null;

    const flows: Record<string, { title: string; rules: string[]; color: string }> = {
      customer: {
        title: '用户责任处理流程',
        rules: ['仅退款（不包邮）', '不支持换货', '运费由用户承担'],
        color: 'amber',
      },
      logistics: {
        title: '物流责任处理流程',
        rules: ['全额退款或免费换货', '物流补偿最高 ¥200', '运费由物流公司承担'],
        color: 'cyan',
      },
      quality: {
        title: '品质问题处理流程',
        rules: ['全额退款 + 运费补偿', '免费换货或退款', '运费由商家承担'],
        color: 'red',
      },
    };

    return flows[selectedLiability];
  };

  const processingFlow = getProcessingFlow();

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">退货管理</h1>
          <p className="text-text-muted text-sm mt-1">
            管理所有退货申请，进行责任判定和售后处理
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-2 text-cyan text-sm">
              <Activity size={16} className="animate-spin" />
              数据更新中...
            </div>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary"
          >
            <Filter size={16} />
            筛选
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={fetchReturns} className="btn btn-primary">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新数据
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card bg-bg-dark/80 backdrop-blur-sm border-cyan/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">退货单号</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={filters.returnNo}
                  onChange={(e) => setFilters({ ...filters, returnNo: e.target.value })}
                  placeholder="输入退货单号"
                  className="input pl-9"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">订单号</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={filters.orderNo}
                  onChange={(e) => setFilters({ ...filters, orderNo: e.target.value })}
                  placeholder="输入订单号"
                  className="input pl-9"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">责任判定</label>
              <select
                value={filters.liability}
                onChange={(e) => setFilters({ ...filters, liability: e.target.value })}
                className="input-select"
              >
                {liabilityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">状态</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="input-select"
              >
                {returnStatusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">开始日期</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="input pl-9"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">结束日期</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="input pl-9"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button onClick={resetFilters} className="btn btn-secondary">
              <X size={14} />
              重置
            </button>
            <button onClick={fetchReturns} className="btn btn-cyan">
              应用筛选
            </button>
          </div>
        </div>
      )}

      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse ${
            toast.type === 'success'
              ? 'bg-green/20 border border-green/30 text-green-light'
              : 'bg-red/20 border border-red/30 text-red-light'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`stat-card bg-gradient-to-br ${card.color} hover:scale-[1.02] transition-transform duration-300`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${card.iconBg}`}>
                {card.icon}
              </div>
            </div>
            <p className="text-text-muted text-xs mb-1">{card.title}</p>
            <h3 className="text-xl font-bold text-text-primary font-mono">
              <AnimatedNumber
                value={card.value}
                duration={1500}
                suffix={card.suffix}
                formatFn={card.formatFn}
              />
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <PieChart size={18} className="text-cyan" />
              责任分布
            </h3>
          </div>
          <ReactECharts option={liabilityPieOption} style={{ height: 250 }} />
        </div>

        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <BarChart3 size={18} className="text-primary-light" />
              退货原因分布
            </h3>
          </div>
          <ReactECharts option={reasonBarOption} style={{ height: 250 }} />
        </div>
      </div>

      <div className="card card-hover">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">退货列表</h3>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <span className="text-sm text-text-muted">
                已选择 <span className="text-cyan font-medium">{selectedIds.length}</span> 项
              </span>
            )}
          </div>
        </div>
        <DataTable
          columns={columns}
          data={returns}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          rowKey="id"
        />
      </div>

      <Modal
        isOpen={detailModal}
        onClose={() => setDetailModal(false)}
        title="退货详情"
        width="max-w-4xl"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : selectedReturn ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card bg-bg-dark/50">
                <h4 className="text-sm font-medium text-text-muted mb-3">基本信息</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">退货单号</span>
                    <span className="font-mono text-cyan">{selectedReturn.returnNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">关联订单</span>
                    <span className="font-mono">{selectedReturn.order?.orderNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">申请人</span>
                    <span>{selectedReturn.order?.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">申请时间</span>
                    <span>{formatDate(selectedReturn.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">状态</span>
                    <StatusBadge
                      status={selectedReturn.status}
                      customLabel={getStatusLabel(selectedReturn.status)}
                      customColor={getStatusColor(selectedReturn.status) as any}
                    />
                  </div>
                  {selectedReturn.liability && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary">责任判定</span>
                      <StatusBadge
                        status={selectedReturn.liability}
                        customLabel={liabilityLabelMap[selectedReturn.liability]}
                        customColor={liabilityColorMap[selectedReturn.liability] as any}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="card bg-bg-dark/50">
                <h4 className="text-sm font-medium text-text-muted mb-3">退货商品</h4>
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 bg-bg-card rounded-lg flex items-center justify-center">
                    <Package size={28} className="text-text-muted" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-text-primary">{selectedReturn.product?.name}</p>
                    <p className="text-xs text-text-muted font-mono mt-1">SKU: {selectedReturn.product?.sku}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div>
                        <span className="text-xs text-text-muted">退货数量</span>
                        <p className="font-mono font-semibold">{selectedReturn.quantity}</p>
                      </div>
                      <div>
                        <span className="text-xs text-text-muted">单价</span>
                        <p className="font-mono text-cyan">
                          {formatCurrency(selectedReturn.product?.declaredValue || 0)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-text-muted">小计</span>
                        <p className="font-mono font-semibold text-amber">
                          {formatCurrency(
                            (selectedReturn.product?.declaredValue || 0) * selectedReturn.quantity
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-bg-card rounded-lg">
                  <p className="text-xs text-text-muted">退货原因</p>
                  <p className="text-sm text-text-secondary mt-1">{selectedReturn.reason}</p>
                </div>
              </div>
            </div>

            <div className="card bg-bg-dark/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-text-muted">责任判定</h4>
                {selectedReturn.status === 'pending' && !selectedReturn.liability && (
                  <button onClick={handleOpenLiability} className="btn btn-cyan btn-sm">
                    <Edit3 size={14} />
                    进行判定
                  </button>
                )}
              </div>
              {selectedReturn.liability ? (
                <div className="p-4 bg-bg-card rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <StatusBadge
                      status={selectedReturn.liability}
                      customLabel={liabilityLabelMap[selectedReturn.liability]}
                      customColor={liabilityColorMap[selectedReturn.liability] as any}
                      size="md"
                    />
                  </div>
                  <div className={`p-3 rounded-lg border-l-4 ${
                    selectedReturn.liability === 'customer' ? 'bg-amber/10 border-amber' :
                    selectedReturn.liability === 'logistics' ? 'bg-cyan/10 border-cyan' :
                    'bg-red/10 border-red'
                  }`}>
                    <p className="text-xs text-text-muted mb-1">判定说明</p>
                    <p className="text-sm">
                      {selectedReturn.liability === 'customer' && '商品因用户使用不当造成损坏，非质量问题。'}
                      {selectedReturn.liability === 'logistics' && '商品在运输过程中因物流操作不当造成破损。'}
                      {selectedReturn.liability === 'quality' && '经检测确认为生产制造缺陷，属于品质问题。'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-text-muted">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p>暂未进行责任判定</p>
                </div>
              )}
            </div>

            {selectedReturn.liability && (
              <div className={`card bg-bg-dark/50 border-${liabilityColorMap[selectedReturn.liability]}/30`}>
                <h4 className={`text-sm font-medium mb-3 text-${liabilityColorMap[selectedReturn.liability]}-light`}>
                  {getProcessingFlow()?.title}
                </h4>
                <div className="space-y-2">
                  {getProcessingFlow()?.rules.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle size={14} className={`text-${liabilityColorMap[selectedReturn.liability]}`} />
                      <span className="text-sm text-text-secondary">{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inventoryChange && (
              <div className="card bg-bg-dark/50 border-cyan/30">
                <h4 className="text-sm font-medium text-cyan-light mb-3">库存变化记录</h4>
                <div className="flex items-center justify-center gap-8 py-4">
                  <div className="text-center">
                    <p className="text-xs text-text-muted mb-1">更新前库存</p>
                    <p className="text-2xl font-bold font-mono text-text-secondary">{inventoryChange.before}</p>
                  </div>
                  <div className="text-cyan">
                    <ArrowRight size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-text-muted mb-1">更新后库存</p>
                    <p className="text-2xl font-bold font-mono text-green">{inventoryChange.after}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-text-muted mb-1">变化量</p>
                    <p className={`text-2xl font-bold font-mono ${
                      inventoryChange.change === 0 ? 'text-text-muted' :
                      inventoryChange.change > 0 ? 'text-cyan' : 'text-red'
                    }`}>
                      {inventoryChange.change === 0 ? '不变' :
                       inventoryChange.change > 0 ? `+${inventoryChange.change}` :
                       inventoryChange.change}
                    </p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-bg-card rounded-lg">
                  <p className="text-xs text-text-muted mb-1">变化原因</p>
                  <p className="text-sm text-text-secondary">{inventoryChange.reason}</p>
                </div>
              </div>
            )}

            {(selectedReturn.status === 'inspecting' || selectedReturn.status === 'processing') && selectedReturn.liability && !inventoryChange && (
              <div className="card bg-bg-dark/50">
                <h4 className="text-sm font-medium text-text-muted mb-3">预期库存变化</h4>
                <div className="p-3 bg-bg-card rounded-lg">
                  <p className="text-sm text-text-secondary">
                    {selectedReturn.liability === 'customer' && '用户责任：退款后库存不变，换货后库存减少退货数量'}
                    {selectedReturn.liability === 'logistics' && '物流责任：退款后库存增加退货数量，换货后库存不变'}
                    {selectedReturn.liability === 'quality' && '品质问题：退款后库存不变，换货后库存减少退货数量，报废后库存不变'}
                  </p>
                </div>
              </div>
            )}

            <div className="card bg-bg-dark/50">
              <h4 className="text-sm font-medium text-text-muted mb-4">处理记录</h4>
              <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border-color" />
                <div className="space-y-4">
                  {processRecords.map((record, idx) => (
                    <div key={record.id} className="relative pl-8">
                      <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                        idx === 0 ? 'bg-cyan border-cyan' :
                        idx === processRecords.length - 1 ? 'bg-green border-green' :
                        'bg-amber border-amber'
                      }`} />
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-text-primary">{record.action}</p>
                          <p className="text-sm text-text-muted mt-0.5">
                            操作人: {record.operator}
                          </p>
                          {record.remark && (
                            <p className="text-sm text-text-secondary mt-1">{record.remark}</p>
                          )}
                        </div>
                        <span className="text-xs text-text-muted font-mono">
                          {formatDate(record.timestamp, 'MM-DD HH:mm')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {(selectedReturn.status === 'inspecting' || selectedReturn.status === 'processing') && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleOpenConfirm('refund', '确认退款')}
                  className="btn btn-success flex-1"
                >
                  <CheckCircle size={16} />
                  确认退款
                </button>
                <button
                  onClick={() => handleOpenConfirm('exchange', '确认换货')}
                  className="btn btn-primary flex-1"
                >
                  <Package size={16} />
                  确认换货
                </button>
                <button
                  onClick={() => handleOpenConfirm('scrap', '确认报废')}
                  className="btn btn-danger flex-1"
                >
                  <AlertTriangle size={16} />
                  确认报废
                </button>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={liabilityModal}
        onClose={() => setLiabilityModal(false)}
        title="责任判定"
        width="max-w-2xl"
        footer={
          <>
            <button onClick={() => setLiabilityModal(false)} className="btn btn-secondary">
              取消
            </button>
            <button
              onClick={handleConfirmLiability}
              disabled={!selectedLiability}
              className="btn btn-primary"
            >
              确认判定
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              选择责任类型
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['customer', 'logistics', 'quality'] as ReturnLiability[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedLiability(type)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedLiability === type
                      ? type === 'customer'
                        ? 'border-amber bg-amber/10'
                        : type === 'logistics'
                        ? 'border-cyan bg-cyan/10'
                        : 'border-red bg-red/10'
                      : 'border-border-color bg-bg-card hover:border-bg-hover'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    {type === 'customer' && <User size={24} className={selectedLiability === type ? 'text-amber' : 'text-text-muted'} />}
                    {type === 'logistics' && <Truck size={24} className={selectedLiability === type ? 'text-cyan' : 'text-text-muted'} />}
                    {type === 'quality' && <AlertCircle size={24} className={selectedLiability === type ? 'text-red' : 'text-text-muted'} />}
                    <span className={`font-medium ${
                      selectedLiability === type
                        ? type === 'customer'
                          ? 'text-amber'
                          : type === 'logistics'
                          ? 'text-cyan'
                          : 'text-red'
                        : 'text-text-secondary'
                    }`}>
                      {liabilityLabelMap[type]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {processingFlow && (
            <div className={`p-4 rounded-xl border ${
              selectedLiability === 'customer' ? 'bg-amber/10 border-amber/30' :
              selectedLiability === 'logistics' ? 'bg-cyan/10 border-cyan/30' :
              'bg-red/10 border-red/30'
            }`}>
              <h4 className={`font-medium mb-2 ${
                selectedLiability === 'customer' ? 'text-amber' :
                selectedLiability === 'logistics' ? 'text-cyan' :
                'text-red'
              }`}>
                {processingFlow.title}
              </h4>
              <ul className="space-y-1">
                {processingFlow.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-text-secondary">
                    <CheckCircle size={14} className={
                      selectedLiability === 'customer' ? 'text-amber' :
                      selectedLiability === 'logistics' ? 'text-cyan' :
                      'text-red'
                    } />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              判定说明
            </label>
            <textarea
              value={liabilityRemark}
              onChange={(e) => setLiabilityRemark(e.target.value)}
              placeholder="请输入判定说明..."
              rows={3}
              className="input resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              判定依据
            </label>
            <div className="flex gap-3">
              <button className="flex-1 p-6 border-2 border-dashed border-border-color rounded-xl hover:border-cyan/50 hover:bg-cyan/5 transition-colors">
                <div className="flex flex-col items-center gap-2 text-text-muted">
                  <Upload size={24} />
                  <span className="text-sm">上传图片凭证</span>
                </div>
              </button>
              <div className="flex-1">
                <textarea
                  value={liabilityEvidence}
                  onChange={(e) => setLiabilityEvidence(e.target.value)}
                  placeholder="或输入文字描述说明..."
                  rows={4}
                  className="input resize-none h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        title={confirmAction.title}
        width="max-w-md"
        footer={
          <>
            <button onClick={() => setConfirmModal(false)} className="btn btn-secondary">
              取消
            </button>
            <button onClick={handleConfirmAction} className="btn btn-primary">
              确认
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <AlertTriangle size={48} className="mx-auto text-amber" />
          <p className="text-center text-text-secondary">
            确定要执行此操作吗？此操作不可撤销。
          </p>
          {confirmAction.type === 'refund' && (
            <div className="p-4 bg-bg-dark rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">退款金额</span>
                <div className="flex items-center gap-2">
                  <span className="text-cyan">¥</span>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="w-24 input text-right text-lg font-bold font-mono"
                  />
                </div>
              </div>
            </div>
          )}
          {confirmAction.type === 'refund' && selectedReturn?.liability && (
            <div className="p-4 bg-bg-dark rounded-xl">
              {selectedReturn.liability === 'logistics' ? (
                <>
                  <p className="text-sm text-cyan mb-2">物流责任：库存将增加 {selectedReturn.quantity} 件</p>
                  <p className="text-xs text-text-muted">原因：商品退回后可重新销售</p>
                </>
              ) : selectedReturn.liability === 'customer' ? (
                <>
                  <p className="text-sm text-amber mb-2">用户责任：库存不变</p>
                  <p className="text-xs text-text-muted">原因：用户原因，不影响销售库存</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-red mb-2">品质问题：库存不变</p>
                  <p className="text-xs text-text-muted">原因：品质问题，商品报废处理</p>
                </>
              )}
            </div>
          )}
          {confirmAction.type === 'exchange' && selectedReturn?.liability && (
            <div className="p-4 bg-bg-dark rounded-xl">
              {selectedReturn.liability === 'logistics' ? (
                <>
                  <p className="text-sm text-cyan mb-2">物流责任：库存不变</p>
                  <p className="text-xs text-text-muted">原因：发出新商品扣减库存，退回商品重新入库</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-red mb-2">{selectedReturn.liability === 'customer' ? '用户责任' : '品质问题'}：库存将减少 {selectedReturn.quantity} 件</p>
                  <p className="text-xs text-text-muted">原因：发出新商品扣减库存，退回商品不入库</p>
                </>
              )}
            </div>
          )}
          {confirmAction.type === 'scrap' && (
            <div className="p-4 bg-bg-dark rounded-xl">
              <p className="text-sm text-amber mb-2">报废处理：库存不变</p>
              <p className="text-xs text-text-muted">原因：商品报废处理，不进入库存</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
