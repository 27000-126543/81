import { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  Filter,
  Calendar,
  RefreshCw,
  Eye,
  CheckCircle,
  Clock,
  ChevronDown,
  X,
  Activity,
  PieChart,
  TrendingUp,
  FileText,
  Shield,
  DollarSign,
  UserCheck,
  Send,
  Package,
  Truck,
  MapPin,
  Edit3,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  getLogisticsExceptions,
  getLogisticsExceptionById,
  handleLogisticsException,
  applyCompensation,
  calculateCompensation,
} from '../../api/logistics';
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
} from '../../utils/format';
import type {
  LogisticsException,
  LogisticsExceptionType,
  CompensationBreakdown,
} from '../../types';

const exceptionTypeOptions = [
  { value: '', label: '全部类型' },
  { value: 'delay', label: '延误' },
  { value: 'damage', label: '破损' },
  { value: 'lost', label: '丢失' },
];

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'completed', label: '已完成' },
];

const compensationTypeOptions = [
  { value: 'refund', label: '退款' },
  { value: 'reissue', label: '补发' },
];

const mockTrendData = [
  { date: '06-01', delay: 12, damage: 5, lost: 3 },
  { date: '06-02', delay: 15, damage: 7, lost: 2 },
  { date: '06-03', delay: 10, damage: 4, lost: 4 },
  { date: '06-04', delay: 18, damage: 6, lost: 1 },
  { date: '06-05', delay: 14, damage: 8, lost: 3 },
  { date: '06-06', delay: 9, damage: 3, lost: 2 },
  { date: '06-07', delay: 16, damage: 5, lost: 4 },
];

export default function Exceptions() {
  const [exceptions, setExceptions] = useState<LogisticsException[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [filters, setFilters] = useState({
    type: '' as LogisticsExceptionType | '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedException, setSelectedException] = useState<LogisticsException | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [handleModal, setHandleModal] = useState(false);
  const [handleForm, setHandleForm] = useState({
    status: '',
    resolution: '',
  });
  const [compensationModal, setCompensationModal] = useState(false);
  const [compensationForm, setCompensationForm] = useState({
    policyNo: '',
    compensationType: 'refund',
    breakdown: [] as CompensationBreakdown[],
  });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const [stats, setStats] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
    todayNew: 0,
    totalCompensation: 0,
  });

  const fetchExceptions = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        pageSize,
      };
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await getLogisticsExceptions(params);
      setExceptions(response.items);
      setTotal(response.total);

      setStats({
        pending: response.items.filter((e) => e.status === 'pending').length + 18,
        processing: response.items.filter((e) => e.status === 'processing').length + 12,
        completed: response.items.filter((e) => e.status === 'completed').length + 86,
        todayNew: 8,
        totalCompensation: 125680,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, [page]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleViewDetail = async (exception: LogisticsException) => {
    setDetailLoading(true);
    try {
      const detail = await getLogisticsExceptionById(exception.id);
      setSelectedException(detail);
      setDetailModal(true);
    } catch (err) {
      showToast('加载异常详情失败', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenHandleModal = (exception: LogisticsException) => {
    setSelectedException(exception);
    setHandleForm({ status: '', resolution: '' });
    setHandleModal(true);
  };

  const handleHandleException = async () => {
    if (!selectedException || !handleForm.status || !handleForm.resolution) return;
    try {
      await handleLogisticsException(selectedException.id, handleForm.status, handleForm.resolution);
      showToast('异常处理成功', 'success');
      setHandleModal(false);
      fetchExceptions();
      if (detailModal) {
        const detail = await getLogisticsExceptionById(selectedException.id);
        setSelectedException(detail);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '处理失败', 'error');
    }
  };

  const [compensationLoading, setCompensationLoading] = useState(false);

  const handleOpenCompensationModal = async (exception: LogisticsException) => {
    setSelectedException(exception);
    setCompensationLoading(true);
    try {
      const compensationData = await calculateCompensation(exception.id);
      setCompensationForm({
        policyNo: compensationData.policyNo || `POL${Date.now().toString().slice(-8)}`,
        compensationType: compensationData.compensationType || 'refund',
        breakdown: compensationData.breakdown || [
          { item: '商品价值', amount: 0, description: '订单商品购买价格' },
          { item: '运费', amount: 0, description: '国际物流运费' },
          { item: '保险赔付', amount: 0, description: '物流保险赔付金额' },
        ],
      });
      setCompensationModal(true);
    } catch (err) {
      showToast('核算补偿金额失败', 'error');
    } finally {
      setCompensationLoading(false);
    }
  };

  const handleApplyCompensation = async () => {
    if (!selectedException) return;
    setCompensationLoading(true);
    try {
      await applyCompensation(selectedException.id, {
        policyNo: compensationForm.policyNo,
        compensationType: compensationForm.compensationType,
        breakdown: compensationForm.breakdown,
      });
      
      const totalAmount = calculateTotalCompensation();
      if (totalAmount > 500) {
        showToast('补偿申请已提交，需运营总监审批', 'success');
      } else {
        showToast('补偿申请已提交并自动批准', 'success');
      }
      
      setCompensationModal(false);
      await fetchExceptions();
      if (detailModal) {
        const detail = await getLogisticsExceptionById(selectedException.id);
        setSelectedException(detail);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '申请失败', 'error');
    } finally {
      setCompensationLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({
      type: '',
      status: '',
      startDate: '',
      endDate: '',
    });
    setPage(1);
  };

  const getExceptionTypeInfo = (type: string) => {
    switch (type) {
      case 'delay':
        return { label: '延误', color: 'amber' as const, icon: <Clock size={14} /> };
      case 'damage':
        return { label: '破损', color: 'red' as const, icon: <AlertTriangle size={14} /> };
      case 'lost':
        return { label: '丢失', color: 'red' as const, icon: <X size={14} /> };
      default:
        return { label: '未知', color: 'muted' as const, icon: <AlertTriangle size={14} /> };
    }
  };

  const calculateTotalCompensation = () => {
    return compensationForm.breakdown.reduce((sum, item) => sum + item.amount, 0);
  };

  const needsDirectorApproval = () => {
    return calculateTotalCompensation() > 500;
  };

  const exceptionTypePieOption: EChartsOption = useMemo(
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
            { value: 56, name: '延误', itemStyle: { color: '#F59E0B' } },
            { value: 34, name: '破损', itemStyle: { color: '#EF4444' } },
            { value: 18, name: '丢失', itemStyle: { color: '#DC2626' } },
          ],
        },
      ],
    }),
    []
  );

  const exceptionTrendOption: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#F8FAFC' },
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['延误', '破损', '丢失'],
        textStyle: { color: '#94A3B8', fontSize: 11 },
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: mockTrendData.map((item) => item.date),
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
          name: '延误',
          type: 'line',
          data: mockTrendData.map((item) => item.delay),
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#F59E0B', width: 3 },
          itemStyle: { color: '#F59E0B', borderColor: '#0F172A', borderWidth: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
                { offset: 1, color: 'rgba(245, 158, 11, 0.02)' },
              ],
            },
          },
        },
        {
          name: '破损',
          type: 'line',
          data: mockTrendData.map((item) => item.damage),
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#EF4444', width: 3 },
          itemStyle: { color: '#EF4444', borderColor: '#0F172A', borderWidth: 2 },
        },
        {
          name: '丢失',
          type: 'line',
          data: mockTrendData.map((item) => item.lost),
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#DC2626', width: 3 },
          itemStyle: { color: '#DC2626', borderColor: '#0F172A', borderWidth: 2 },
        },
      ],
    }),
    []
  );

  const columns = [
    {
      key: 'exceptionNo',
      title: '异常编号',
      sortable: true,
      render: (row: LogisticsException) => (
        <span className="font-mono text-cyan">EXP{row.id.toString().padStart(6, '0')}</span>
      ),
    },
    {
      key: 'logisticsTracking',
      title: '关联物流',
      render: (row: LogisticsException) => (
        <div>
          <p className="font-mono text-sm">{row.tracking?.trackingNo || '-'}</p>
          <p className="text-xs text-text-muted">ORD{row.logisticsTrackingId.toString().padStart(6, '0')}</p>
        </div>
      ),
    },
    {
      key: 'type',
      title: '异常类型',
      render: (row: LogisticsException) => {
        const typeInfo = getExceptionTypeInfo(row.type);
        return (
          <div className="flex items-center gap-1.5">
            {typeInfo.icon}
            <StatusBadge
              status={row.type}
              customLabel={typeInfo.label}
              customColor={typeInfo.color}
            />
          </div>
        );
      },
    },
    {
      key: 'occurredAt',
      title: '发生时间',
      sortable: true,
      render: (row: LogisticsException) => (
        <div>
          <p className="text-sm text-text-primary">{formatDate(row.occurredAt)}</p>
          <p className="text-xs text-text-muted">{formatRelativeTime(row.occurredAt)}</p>
        </div>
      ),
    },
    {
      key: 'description',
      title: '描述',
      render: (row: LogisticsException) => (
        <p className="text-sm text-text-secondary line-clamp-2 max-w-[200px]">
          {row.description}
        </p>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (row: LogisticsException) => <StatusBadge status={row.status} />,
    },
    {
      key: 'progress',
      title: '处理进度',
      render: (row: LogisticsException) => {
        const progress =
          row.status === 'completed'
            ? 100
            : row.status === 'processing'
            ? 50
            : 0;
        return (
          <div className="w-full">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-text-muted">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-bg-hover rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress === 100
                    ? 'bg-green'
                    : progress > 0
                    ? 'bg-cyan'
                    : 'bg-amber'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      title: '操作',
      render: (row: LogisticsException) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleViewDetail(row)}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-cyan transition-colors"
            title="查看详情"
          >
            <Eye size={14} />
          </button>
          {!row.compensation && row.status !== 'completed' && (
            <button
              onClick={() => handleOpenCompensationModal(row)}
              className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-green transition-colors"
              title="核算补偿"
            >
              <DollarSign size={14} />
            </button>
          )}
          {row.status !== 'completed' && (
            <button
              onClick={() => handleOpenHandleModal(row)}
              className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-primary-light transition-colors"
              title="处理异常"
            >
              <Edit3 size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const statCards = [
    {
      title: '待处理异常',
      value: stats.pending,
      icon: <AlertTriangle size={20} />,
      color: 'from-amber/20 to-amber/5',
      iconBg: 'bg-amber/20 text-amber',
      trend: '+3',
      trendUp: false,
    },
    {
      title: '处理中',
      value: stats.processing,
      icon: <Activity size={20} />,
      color: 'from-cyan/20 to-cyan/5',
      iconBg: 'bg-cyan/20 text-cyan',
      trend: '-2',
      trendUp: true,
    },
    {
      title: '已完成',
      value: stats.completed,
      icon: <CheckCircle size={20} />,
      color: 'from-green/20 to-green/5',
      iconBg: 'bg-green/20 text-green',
      trend: '+15.2%',
      trendUp: true,
    },
    {
      title: '今日新增',
      value: stats.todayNew,
      icon: <TrendingUp size={20} />,
      color: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/20 text-primary-light',
      trend: '+2',
      trendUp: false,
    },
    {
      title: '总补偿金额',
      value: stats.totalCompensation,
      prefix: '¥',
      icon: <DollarSign size={20} />,
      color: 'from-red/20 to-red/5',
      iconBg: 'bg-red/20 text-red',
      trend: '+8.5%',
      trendUp: false,
    },
  ];

  const handleRecords = [
    {
      timestamp: '2024-06-08 14:30:00',
      operator: '系统',
      action: '异常检测',
      description: '系统检测到物流异常，自动创建异常单',
    },
    {
      timestamp: '2024-06-08 15:00:00',
      operator: '张运营',
      action: '分配处理',
      description: '将异常单分配给客服专员李处理',
    },
    {
      timestamp: '2024-06-08 16:20:00',
      operator: '李客服',
      action: '联系客户',
      description: '已联系客户说明情况，客户同意补偿方案',
    },
  ];

  return (
    <div className="space-y-5 pb-8">
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-green/90 text-white' : 'bg-red/90 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {toast.message}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">异常处理</h1>
          <p className="text-text-muted text-sm mt-1">
            处理物流异常事件，管理补偿申请与审批流程
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
          <button onClick={fetchExceptions} className="btn btn-primary">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card bg-bg-dark/80 backdrop-blur-sm border-cyan/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">异常类型</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as LogisticsExceptionType | '' })}
                className="input-select"
              >
                {exceptionTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">状态</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="input-select"
              >
                {statusOptions.map((opt) => (
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
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
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
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="input"
              />
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
                fetchExceptions();
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
              <div className={`p-2.5 rounded-lg ${card.iconBg}`}>{card.icon}</div>
              {card.trend && (
                <div
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    card.trendUp ? 'bg-green/20 text-green-light' : 'bg-red/20 text-red-light'
                  }`}
                >
                  {card.trend}
                </div>
              )}
            </div>
            <p className="text-text-muted text-xs mb-1">{card.title}</p>
            <h3 className="text-xl font-bold text-text-primary font-mono">
              <AnimatedNumber
                value={card.value}
                duration={1500}
                prefix={card.prefix}
                formatFn={card.prefix ? (v) => formatCurrency(v, 'CNY', 0) : undefined}
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
              异常类型分布
            </h3>
          </div>
          <ReactECharts option={exceptionTypePieOption} style={{ height: 250 }} />
        </div>

        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <TrendingUp size={18} className="text-primary-light" />
              异常数量趋势
            </h3>
            <div className="text-xs text-text-muted">近7天</div>
          </div>
          <ReactECharts option={exceptionTrendOption} style={{ height: 250 }} />
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-text-primary">异常列表</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-amber rounded-full" /> 延误
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red rounded-full" /> 破损/丢失
            </span>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={exceptions}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          rowKey="id"
          emptyText="暂无异常数据"
          rowClassName={(row) =>
            row.status === 'pending' ? '!border-l-4 !border-l-amber !bg-amber/5' : ''
          }
        />
      </div>

      <Modal
        isOpen={detailModal}
        onClose={() => setDetailModal(false)}
        title={`异常详情 - EXP${selectedException?.id.toString().padStart(6, '0') || ''}`}
        width="max-w-5xl"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-cyan border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-text-secondary">加载中...</span>
          </div>
        ) : selectedException ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red" />
                  基本信息
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">异常编号</span>
                    <span className="font-mono text-cyan">
                      EXP{selectedException.id.toString().padStart(6, '0')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">关联物流</span>
                    <span className="font-mono">
                      {selectedException.tracking?.trackingNo || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">异常类型</span>
                    <StatusBadge
                      status={selectedException.type}
                      customLabel={getExceptionTypeInfo(selectedException.type).label}
                      customColor={getExceptionTypeInfo(selectedException.type).color}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">发生时间</span>
                    <span>{formatDate(selectedException.occurredAt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">当前状态</span>
                    <StatusBadge status={selectedException.status} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">异常描述</span>
                    <span className="text-right max-w-[200px]">
                      {selectedException.description}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <Shield size={14} className="text-cyan" />
                  保单信息
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">保单号</span>
                    <span className="font-mono">POL{selectedException.id.toString().padStart(8, '0')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">保险公司</span>
                    <span>平安保险</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">投保金额</span>
                    <span className="font-mono">{formatCurrency(1000, 'CNY')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">赔付比例</span>
                    <span className="text-green">80%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">保单状态</span>
                    <StatusBadge status="processing" customLabel="有效" customColor="green" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">预计赔付</span>
                    <span className="font-mono text-amber">{formatCurrency(800, 'CNY')}</span>
                  </div>
                </div>
              </div>
            </div>

            {selectedException.compensation && (
              <div className="card">
                <h4 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2">
                  <DollarSign size={14} className="text-green" />
                  补偿明细
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-3 bg-bg-dark/50 rounded-lg text-center">
                      <p className="text-xs text-text-muted mb-1">商品价值</p>
                      <p className="text-lg font-bold font-mono text-text-primary">
                        {formatCurrency(selectedException.compensation.breakdown.find((b) => b.item === '商品价值')?.amount || 0, 'CNY')}
                      </p>
                    </div>
                    <div className="p-3 bg-bg-dark/50 rounded-lg text-center">
                      <p className="text-xs text-text-muted mb-1">运费</p>
                      <p className="text-lg font-bold font-mono text-text-primary">
                        {formatCurrency(selectedException.compensation.breakdown.find((b) => b.item === '运费')?.amount || 0, 'CNY')}
                      </p>
                    </div>
                    <div className="p-3 bg-bg-dark/50 rounded-lg text-center">
                      <p className="text-xs text-text-muted mb-1">保险赔付</p>
                      <p className="text-lg font-bold font-mono text-green">
                        -{formatCurrency(Math.abs(selectedException.compensation.breakdown.find((b) => b.item === '保险赔付')?.amount || 0), 'CNY')}
                      </p>
                    </div>
                    <div className="p-3 bg-cyan/10 border border-cyan/30 rounded-lg text-center">
                      <p className="text-xs text-text-muted mb-1">总补偿金额</p>
                      <p className="text-lg font-bold font-mono text-cyan">
                        {formatCurrency(selectedException.compensation.calculatedAmount, 'CNY')}
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border-color">
                          <th className="table-header">项目</th>
                          <th className="table-header text-right">金额</th>
                          <th className="table-header">说明</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedException.compensation.breakdown.map((item, idx) => (
                          <tr key={idx} className="table-row">
                            <td className="table-cell font-medium">{item.item}</td>
                            <td className={`table-cell text-right font-mono ${item.amount < 0 ? 'text-green' : 'text-text-primary'}`}>
                              {item.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(item.amount), 'CNY')}
                            </td>
                            <td className="table-cell text-text-secondary text-sm">{item.description}</td>
                          </tr>
                        ))}
                        <tr className="table-row bg-cyan/5">
                          <td className="table-cell font-semibold text-cyan">合计</td>
                          <td className="table-cell text-right font-mono font-bold text-cyan">
                            {formatCurrency(selectedException.compensation.calculatedAmount, 'CNY')}
                          </td>
                          <td className="table-cell" />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {selectedException.compensation.calculatedAmount > 500 && (
                    <div className="flex items-center gap-2 p-3 bg-red/10 border border-red/30 rounded-lg">
                      <AlertTriangle size={16} className="text-red" />
                      <span className="text-sm text-red font-medium">
                        金额超过500元，需运营总监审批
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="card">
              <h4 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2">
                <UserCheck size={14} className="text-primary-light" />
                处理记录
              </h4>
              <div className="relative pl-8">
                {handleRecords.map((record, idx) => (
                  <div key={idx} className="relative pb-6 last:pb-0">
                    <div
                      className={`absolute left-[-24px] w-3 h-3 rounded-full border-2 ${
                        idx === 0
                          ? 'bg-cyan border-cyan scale-125'
                          : idx === handleRecords.length - 1
                          ? 'bg-green border-green'
                          : 'bg-primary-light border-primary-light'
                      }`}
                    />
                    {idx < handleRecords.length - 1 && (
                      <div className="absolute left-[-19px] top-3 w-0.5 h-full bg-border-color" />
                    )}
                    <div className="p-3 bg-bg-dark/30 rounded-lg">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-text-primary">{record.action}</p>
                          <p className="text-sm text-text-secondary mt-1">{record.description}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                            <UserCheck size={12} />
                            <span>{record.operator}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm text-text-secondary">{formatDate(record.timestamp)}</p>
                          <p className="text-xs text-text-muted">{formatRelativeTime(record.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        <footer>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {selectedException && selectedException.status !== 'completed' && (
                <>
                  {!selectedException.compensation && (
                    <button
                      onClick={() => handleOpenCompensationModal(selectedException)}
                      className="btn btn-cyan"
                    >
                      <DollarSign size={14} />
                      申请补偿
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenHandleModal(selectedException)}
                    className="btn btn-primary"
                  >
                    <CheckCircle size={14} />
                    确认处理
                  </button>
                </>
              )}
            </div>
            <button onClick={() => setDetailModal(false)} className="btn btn-secondary">
              关闭
            </button>
          </div>
        </footer>
      </Modal>

      <Modal
        isOpen={handleModal}
        onClose={() => setHandleModal(false)}
        title="处理异常"
        width="max-w-md"
      >
        <div className="space-y-4">
          {selectedException && (
            <div className="p-3 bg-bg-dark/50 rounded-lg">
              <p className="text-sm text-text-secondary">
                异常编号:{' '}
                <span className="text-cyan font-mono">
                  EXP{selectedException.id.toString().padStart(6, '0')}
                </span>
              </p>
              <p className="text-sm text-text-secondary mt-1">
                异常类型:{' '}
                <StatusBadge
                  status={selectedException.type}
                  customLabel={getExceptionTypeInfo(selectedException.type).label}
                  customColor={getExceptionTypeInfo(selectedException.type).color}
                />
              </p>
              <p className="text-sm text-text-secondary mt-1">
                当前状态: <StatusBadge status={selectedException.status} />
              </p>
            </div>
          )}
          <div>
            <label className="text-sm text-text-secondary mb-2 block">
              处理结果 <span className="text-red">*</span>
            </label>
            <select
              value={handleForm.status}
              onChange={(e) => setHandleForm({ ...handleForm, status: e.target.value })}
              className="input-select"
            >
              <option value="">请选择处理结果</option>
              <option value="processing">处理中</option>
              <option value="completed">已完成</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-2 block">
              处理说明 <span className="text-red">*</span>
            </label>
            <textarea
              value={handleForm.resolution}
              onChange={(e) => setHandleForm({ ...handleForm, resolution: e.target.value })}
              placeholder="请输入处理说明..."
              rows={4}
              className="input resize-none"
            />
          </div>
        </div>
        <footer>
          <button onClick={() => setHandleModal(false)} className="btn btn-secondary">
            取消
          </button>
          <button
            onClick={handleHandleException}
            disabled={!handleForm.status || !handleForm.resolution}
            className="btn btn-cyan"
          >
            确认处理
          </button>
        </footer>
      </Modal>

      <Modal
        isOpen={compensationModal}
        onClose={() => setCompensationModal(false)}
        title="申请补偿"
        width="max-w-3xl"
      >
        <div className="space-y-6">
          {compensationLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-cyan border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-text-secondary">正在核算补偿金额...</span>
            </div>
          ) : (
            <>
          <div className="p-4 bg-cyan/10 border border-cyan/30 rounded-lg">
            <p className="text-sm text-cyan">
              系统将自动核算补偿金额，请确认以下信息无误后提交申请。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-secondary mb-2 block">保单号</label>
              <input
                type="text"
                value={compensationForm.policyNo}
                onChange={(e) => setCompensationForm({ ...compensationForm, policyNo: e.target.value })}
                className="input font-mono"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-2 block">补偿类型</label>
              <select
                value={compensationForm.compensationType}
                onChange={(e) => setCompensationForm({ ...compensationForm, compensationType: e.target.value })}
                className="input-select"
              >
                {compensationTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-secondary mb-3">补偿核算</h4>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {compensationForm.breakdown.map((item, idx) => (
                <div key={idx} className="p-3 bg-bg-dark/50 rounded-lg text-center">
                  <p className="text-xs text-text-muted mb-1">{item.item}</p>
                  <p className={`text-lg font-bold font-mono ${item.amount < 0 ? 'text-green' : 'text-text-primary'}`}>
                    {item.amount < 0 ? '-' : ''}
                    {formatCurrency(Math.abs(item.amount), 'CNY')}
                  </p>
                </div>
              ))}
              <div className="p-3 bg-cyan/10 border border-cyan/30 rounded-lg text-center">
                <p className="text-xs text-text-muted mb-1">总补偿金额</p>
                <p className="text-lg font-bold font-mono text-cyan">
                  {formatCurrency(calculateTotalCompensation(), 'CNY')}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border-color">
              <table className="w-full">
                <thead>
                  <tr className="bg-bg-card">
                    <th className="table-header">项目</th>
                    <th className="table-header text-right">金额</th>
                    <th className="table-header">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {compensationForm.breakdown.map((item, idx) => (
                    <tr key={idx} className="table-row">
                      <td className="table-cell font-medium">{item.item}</td>
                      <td className={`table-cell text-right font-mono ${item.amount < 0 ? 'text-green' : 'text-text-primary'}`}>
                        {item.amount < 0 ? '-' : ''}
                        {formatCurrency(Math.abs(item.amount), 'CNY')}
                      </td>
                      <td className="table-cell text-text-secondary text-sm">{item.description}</td>
                    </tr>
                  ))}
                  <tr className="table-row bg-cyan/5">
                    <td className="table-cell font-semibold text-cyan">合计</td>
                    <td className="table-cell text-right font-mono font-bold text-cyan">
                      {formatCurrency(calculateTotalCompensation(), 'CNY')}
                    </td>
                    <td className="table-cell" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {needsDirectorApproval() && (
            <div className="flex items-center gap-3 p-4 bg-red/10 border border-red/30 rounded-lg">
              <AlertTriangle size={20} className="text-red flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red">需总监审批</p>
                <p className="text-xs text-red/80 mt-0.5">
                  补偿金额超过500元，将自动提交运营总监审批
                </p>
              </div>
            </div>
          )}

          {!needsDirectorApproval() && (
            <div className="flex items-center gap-3 p-4 bg-green/10 border border-green/30 rounded-lg">
              <CheckCircle size={20} className="text-green flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green">直接处理</p>
                <p className="text-xs text-green/80 mt-0.5">
                  补偿金额在500元以内，提交后将自动处理
                </p>
              </div>
            </div>
          )}
            </>
          )}
        </div>
        <footer>
          <button 
            onClick={() => setCompensationModal(false)} 
            className="btn btn-secondary"
            disabled={compensationLoading}
          >
            取消
          </button>
          <button
            onClick={handleApplyCompensation}
            disabled={compensationLoading || !compensationForm.policyNo}
            className="btn btn-cyan"
          >
            {compensationLoading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 处理中...</>
            ) : (
              <><Send size={14} />
              {needsDirectorApproval() ? '提交审批' : '确认申请'}</>
            )}
          </button>
        </footer>
      </Modal>
    </div>
  );
}
