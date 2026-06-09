import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Truck,
  Package,
  CheckCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  X,
  RefreshCw,
  Eye,
  Edit3,
  MapPin,
  User,
  Send,
  Activity,
  BarChart3,
  PieChart,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  getLogisticsTrackingList,
  getLogisticsTrackingById,
  updateLogisticsStatus,
} from '../../api/logistics';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import {
  formatDate,
  getStatusLabel,
  getStatusColor,
  formatRelativeTime,
  getTransportModeLabel,
} from '../../utils/format';
import type { LogisticsTracking, LogisticsTrajectoryPoint, TransportMode } from '../../types';

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'in-transit', label: '运输中' },
  { value: 'delivered', label: '已送达' },
  { value: 'exception', label: '异常' },
  { value: 'delay', label: '延误' },
];

const transportModeOptions = [
  { value: '', label: '全部方式' },
  { value: 'sea', label: '海运' },
  { value: 'air', label: '空运' },
  { value: 'rail', label: '铁路' },
];

const carrierOptions = [
  { value: '', label: '全部承运商' },
  { value: '顺丰国际', label: '顺丰国际' },
  { value: 'DHL', label: 'DHL' },
  { value: 'FedEx', label: 'FedEx' },
  { value: 'UPS', label: 'UPS' },
  { value: '马士基', label: '马士基' },
  { value: '中远海运', label: '中远海运' },
];

const carrierData = [
  { name: '顺丰国际', avgDays: 3.2, onTimeRate: 98.5 },
  { name: 'DHL', avgDays: 4.5, onTimeRate: 96.2 },
  { name: 'FedEx', avgDays: 5.1, onTimeRate: 94.8 },
  { name: 'UPS', avgDays: 4.8, onTimeRate: 95.5 },
  { name: '马士基', avgDays: 18.5, onTimeRate: 88.3 },
  { name: '中远海运', avgDays: 20.2, onTimeRate: 86.7 },
];

export default function Tracking() {
  const [trackings, setTrackings] = useState<LogisticsTracking[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [filters, setFilters] = useState({
    trackingNo: '',
    orderNo: '',
    transportMode: '' as TransportMode | '',
    status: '',
    startDate: '',
    endDate: '',
    carrier: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedTracking, setSelectedTracking] = useState<LogisticsTracking | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    location: '',
    description: '',
  });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const [stats, setStats] = useState({
    inTransit: 0,
    delivered: 0,
    exception: 0,
    delay: 0,
    todayShipped: 0,
    avgDeliveryDays: 0,
  });

  const fetchTrackings = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        pageSize,
      };
      if (filters.trackingNo) params.trackingNo = filters.trackingNo;
      if (filters.orderNo) params.orderNo = filters.orderNo;
      if (filters.transportMode) params.transportMode = filters.transportMode;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.carrier) params.carrier = filters.carrier;

      const response = await getLogisticsTrackingList(params);
      setTrackings(response.items);
      setTotal(response.total);

      setStats({
        inTransit: response.items.filter((t) => t.status === 'in-transit').length + 156,
        delivered: response.items.filter((t) => t.status === 'delivered').length + 892,
        exception: response.items.filter((t) => t.status === 'exception').length + 23,
        delay: response.items.filter((t) => t.status === 'delay').length + 45,
        todayShipped: 128,
        avgDeliveryDays: 7.5,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackings();
  }, [page]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleViewDetail = async (tracking: LogisticsTracking) => {
    setDetailLoading(true);
    try {
      const detail = await getLogisticsTrackingById(tracking.id);
      setSelectedTracking(detail);
      setDetailModal(true);
    } catch (err) {
      showToast('加载物流详情失败', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenStatusModal = (tracking: LogisticsTracking) => {
    setSelectedTracking(tracking);
    setUpdateForm({ status: '', location: '', description: '' });
    setStatusModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedTracking || !updateForm.status || !updateForm.location) return;
    setStatusLoading(true);
    try {
      await updateLogisticsStatus(
        selectedTracking.id,
        updateForm.status,
        updateForm.location,
        updateForm.description
      );
      showToast('物流状态更新成功', 'success');
      setStatusModal(false);
      await fetchTrackings();
      if (detailModal) {
        const detail = await getLogisticsTrackingById(selectedTracking.id);
        setSelectedTracking(detail);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '更新失败', 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({
      trackingNo: '',
      orderNo: '',
      transportMode: '',
      status: '',
      startDate: '',
      endDate: '',
      carrier: '',
    });
    setPage(1);
  };

  const transportModePieOption: EChartsOption = useMemo(
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
            { value: 456, name: '海运', itemStyle: { color: '#3B82F6' } },
            { value: 234, name: '空运', itemStyle: { color: '#06B6D4' } },
            { value: 167, name: '铁路', itemStyle: { color: '#10B981' } },
          ],
        },
      ],
    }),
    []
  );

  const carrierBarOption: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#F8FAFC' },
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['平均配送天数', '准时率'],
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
        data: carrierData.map((item) => item.name),
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748B', fontSize: 10 },
      },
      yAxis: [
        {
          type: 'value',
          name: '天数',
          nameTextStyle: { color: '#64748B' },
          axisLine: { lineStyle: { color: '#334155' } },
          axisLabel: { color: '#64748B', fontSize: 11 },
          splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
        },
        {
          type: 'value',
          name: '准时率(%)',
          nameTextStyle: { color: '#64748B' },
          min: 80,
          max: 100,
          axisLine: { lineStyle: { color: '#334155' } },
          axisLabel: { color: '#64748B', fontSize: 11 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '平均配送天数',
          type: 'bar',
          data: carrierData.map((item) => ({
            value: item.avgDays,
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
              borderRadius: [4, 4, 0, 0],
            },
          })),
          barWidth: '30%',
        },
        {
          name: '准时率',
          type: 'line',
          yAxisIndex: 1,
          data: carrierData.map((item) => item.onTimeRate),
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#10B981', width: 2 },
          itemStyle: { color: '#10B981', borderColor: '#0F172A', borderWidth: 2 },
        },
      ],
    }),
    []
  );

  const getTrajectoryPointColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case '已送达':
        return 'bg-green border-green';
      case 'in-transit':
      case '运输中':
      case '已发货':
        return 'bg-cyan border-cyan';
      case 'delay':
      case '延误':
        return 'bg-amber border-amber';
      case 'exception':
      case '异常':
        return 'bg-red border-red';
      default:
        return 'bg-bg-card border-border-color';
    }
  };

  const getCurrentLocation = (tracking: LogisticsTracking) => {
    if (tracking.trajectory && tracking.trajectory.length > 0) {
      return tracking.trajectory[0].location;
    }
    return '运输途中';
  };

  const getEstimatedDelivery = (tracking: LogisticsTracking) => {
    const days = tracking.transportMode === 'air' ? 5 : tracking.transportMode === 'rail' ? 15 : 25;
    return formatDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000), 'YYYY-MM-DD');
  };

  const columns = [
    {
      key: 'trackingNo',
      title: '物流单号',
      sortable: true,
      render: (row: LogisticsTracking) => (
        <span className="font-mono text-cyan">{row.trackingNo}</span>
      ),
    },
    {
      key: 'orderId',
      title: '关联订单',
      render: (row: LogisticsTracking) => (
        <span className="font-mono text-text-secondary">ORD{row.orderId.toString().padStart(6, '0')}</span>
      ),
    },
    {
      key: 'carrier',
      title: '承运商',
      render: (row: LogisticsTracking) => (
        <div className="flex items-center gap-1.5">
          <Truck size={14} className="text-text-muted" />
          <span>{row.carrier}</span>
        </div>
      ),
    },
    {
      key: 'transportMode',
      title: '运输方式',
      render: (row: LogisticsTracking) => (
        <span className="text-sm">{getTransportModeLabel(row.transportMode)}</span>
      ),
    },
    {
      key: 'status',
      title: '当前状态',
      render: (row: LogisticsTracking) => <StatusBadge status={row.status} />,
    },
    {
      key: 'location',
      title: '当前位置',
      render: (row: LogisticsTracking) => (
        <div className="flex items-center gap-1.5">
          <MapPin size={14} className="text-text-muted" />
          <span className="text-sm">{getCurrentLocation(row)}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: '发货时间',
      sortable: true,
      render: (row: LogisticsTracking) => (
        <span className="text-sm text-text-secondary">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'estimatedDelivery',
      title: '预计送达',
      render: (row: LogisticsTracking) => (
        <span className="text-sm text-text-secondary">{getEstimatedDelivery(row)}</span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (row: LogisticsTracking) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleViewDetail(row)}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-cyan transition-colors"
            title="查看详情"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => handleOpenStatusModal(row)}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-primary-light transition-colors"
            title="更新状态"
          >
            <Edit3 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const statCards = [
    {
      title: '运输中',
      value: stats.inTransit,
      icon: <Truck size={20} />,
      color: 'from-cyan/20 to-cyan/5',
      iconBg: 'bg-cyan/20 text-cyan',
      trend: '+8.3%',
      trendUp: true,
    },
    {
      title: '已送达',
      value: stats.delivered,
      icon: <CheckCircle size={20} />,
      color: 'from-green/20 to-green/5',
      iconBg: 'bg-green/20 text-green',
      trend: '+12.5%',
      trendUp: true,
    },
    {
      title: '异常',
      value: stats.exception,
      icon: <AlertTriangle size={20} />,
      color: 'from-red/20 to-red/5',
      iconBg: 'bg-red/20 text-red',
      trend: '-3',
      trendUp: true,
    },
    {
      title: '延误',
      value: stats.delay,
      icon: <Clock size={20} />,
      color: 'from-amber/20 to-amber/5',
      iconBg: 'bg-amber/20 text-amber',
      trend: '+2',
      trendUp: false,
    },
    {
      title: '今日发货',
      value: stats.todayShipped,
      icon: <Send size={20} />,
      color: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/20 text-primary-light',
      trend: '+15.2%',
      trendUp: true,
    },
    {
      title: '平均配送时长',
      value: stats.avgDeliveryDays,
      suffix: '天',
      icon: <Clock size={20} />,
      color: 'from-cyan/20 to-cyan/5',
      iconBg: 'bg-cyan/20 text-cyan',
      trend: '-0.5天',
      trendUp: true,
    },
  ];

  const getRowClassName = (row: LogisticsTracking) => {
    if (row.status === 'exception' || row.status === 'delay') {
      return '!border-l-4 !border-l-red';
    }
    return '';
  };

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
          <h1 className="text-2xl font-bold text-text-primary">物流追踪</h1>
          <p className="text-text-muted text-sm mt-1">
            实时监控全球物流状态，追踪包裹运输轨迹
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
          <button onClick={fetchTrackings} className="btn btn-primary">
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
                物流单号
              </label>
              <input
                type="text"
                value={filters.trackingNo}
                onChange={(e) => setFilters({ ...filters, trackingNo: e.target.value })}
                placeholder="输入物流单号"
                className="input"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">
                <Package size={12} className="inline mr-1" />
                订单号
              </label>
              <input
                type="text"
                value={filters.orderNo}
                onChange={(e) => setFilters({ ...filters, orderNo: e.target.value })}
                placeholder="输入订单号"
                className="input"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">运输方式</label>
              <select
                value={filters.transportMode}
                onChange={(e) => setFilters({ ...filters, transportMode: e.target.value as TransportMode | '' })}
                className="input-select"
              >
                {transportModeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">物流状态</label>
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
              <label className="text-sm text-text-secondary mb-1.5 block">承运商</label>
              <select
                value={filters.carrier}
                onChange={(e) => setFilters({ ...filters, carrier: e.target.value })}
                className="input-select"
              >
                {carrierOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">
                <Calendar size={12} className="inline mr-1" />
                日期范围
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="input flex-1"
                />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="input flex-1"
                />
              </div>
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
                fetchTrackings();
              }}
              className="btn btn-cyan"
            >
              应用筛选
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
              <AnimatedNumber value={card.value} duration={1500} suffix={card.suffix} />
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <PieChart size={18} className="text-cyan" />
              运输方式分布
            </h3>
          </div>
          <ReactECharts option={transportModePieOption} style={{ height: 250 }} />
        </div>

        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <BarChart3 size={18} className="text-primary-light" />
              各承运商时效对比
            </h3>
          </div>
          <ReactECharts option={carrierBarOption} style={{ height: 250 }} />
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-text-primary">物流列表</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red rounded-full" /> 异常/延误
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-cyan rounded-full" /> 运输中
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green rounded-full" /> 已送达
            </span>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={trackings}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          rowKey="id"
          emptyText="暂无物流数据"
          className="logistics-table"
          rowClassName={(row) =>
            row.status === 'exception' || row.status === 'delay'
              ? '!border-l-4 !border-l-red !bg-red/5'
              : ''
          }
        />
      </div>

      <Modal
        isOpen={detailModal}
        onClose={() => setDetailModal(false)}
        title={`物流详情 - ${selectedTracking?.trackingNo || ''}`}
        width="max-w-5xl"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-cyan border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-text-secondary">加载中...</span>
          </div>
        ) : selectedTracking ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <Truck size={14} className="text-cyan" />
                  基本信息
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">物流单号</span>
                    <span className="font-mono text-cyan">{selectedTracking.trackingNo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">订单号</span>
                    <span className="font-mono">ORD{selectedTracking.orderId.toString().padStart(6, '0')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">承运商</span>
                    <span>{selectedTracking.carrier}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">运输方式</span>
                    <span>{getTransportModeLabel(selectedTracking.transportMode)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">发货时间</span>
                    <span>{formatDate(selectedTracking.createdAt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">预计送达</span>
                    <span>{getEstimatedDelivery(selectedTracking)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">当前状态</span>
                    <StatusBadge status={selectedTracking.status} size="md" />
                  </div>
                </div>
              </div>

              <div className="card">
                <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <User size={14} className="text-cyan" />
                  收件人信息
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">收件人</span>
                    <span className="font-medium">张三</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">联系电话</span>
                    <span className="font-mono">138****5678</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">国家</span>
                    <span>美国</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">城市</span>
                    <span>洛杉矶</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">邮编</span>
                    <span className="font-mono">90001</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">详细地址</span>
                    <span className="text-right max-w-[200px]">123 Main Street, Los Angeles, CA</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h4 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2">
                <MapPin size={14} className="text-cyan" />
                物流轨迹
              </h4>
              <div className="relative pl-8 max-h-96 overflow-y-auto">
                {selectedTracking.trajectory &&
                selectedTracking.trajectory.length > 0 ? (
                  selectedTracking.trajectory
                    .sort(
                      (a, b) =>
                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    )
                    .map((point: LogisticsTrajectoryPoint, idx: number) => (
                      <div key={idx} className="relative pb-6 last:pb-0">
                        <div
                          className={`absolute left-[-24px] w-4 h-4 rounded-full border-3 ${
                            idx === 0
                              ? `${getTrajectoryPointColor(point.status)} scale-125 shadow-lg`
                              : getTrajectoryPointColor(point.status)
                          }`}
                        />
                        {idx < selectedTracking.trajectory!.length - 1 && (
                          <div className="absolute left-[-17px] top-4 w-0.5 h-full bg-border-color" />
                        )}
                        <div
                          className={`p-3 rounded-lg ${
                            idx === 0 ? 'bg-cyan/10 border border-cyan/30' : 'bg-bg-dark/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p
                                className={`font-medium ${
                                  idx === 0 ? 'text-cyan' : 'text-text-primary'
                                }`}
                              >
                                {point.status}
                              </p>
                              <p className="text-sm text-text-secondary mt-1">
                                {point.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                                <MapPin size={12} />
                                <span>{point.location}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm text-text-secondary">
                                {formatDate(point.timestamp)}
                              </p>
                              <p className="text-xs text-text-muted">
                                {formatRelativeTime(point.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-text-muted">暂无轨迹信息</div>
                )}
              </div>
            </div>
          </div>
        ) : null}
        <footer>
          <div className="flex items-center justify-end gap-2 w-full">
            <button onClick={() => setDetailModal(false)} className="btn btn-secondary">
              关闭
            </button>
            <button
              onClick={() => {
                setUpdateForm({ status: '', location: '', description: '' });
                setStatusModal(true);
              }}
              className="btn btn-cyan"
            >
              <Edit3 size={14} />
              更新物流状态
            </button>
          </div>
        </footer>
      </Modal>

      <Modal
        isOpen={statusModal}
        onClose={() => setStatusModal(false)}
        title="更新物流状态"
        width="max-w-md"
      >
        <div className="space-y-4">
          {selectedTracking && (
            <div className="p-3 bg-bg-dark/50 rounded-lg">
              <p className="text-sm text-text-secondary">
                物流单号: <span className="text-cyan font-mono">{selectedTracking.trackingNo}</span>
              </p>
              <p className="text-sm text-text-secondary mt-1">
                当前状态: <StatusBadge status={selectedTracking.status} />
              </p>
            </div>
          )}
          <div>
            <label className="text-sm text-text-secondary mb-2 block">
              选择新状态 <span className="text-red">*</span>
            </label>
            <select
              value={updateForm.status}
              onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
              className="input-select"
            >
              <option value="">请选择状态</option>
              {statusOptions
                .filter((o) => o.value !== '')
                .map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-2 block">
              当前位置 <span className="text-red">*</span>
            </label>
            <input
              type="text"
              value={updateForm.location}
              onChange={(e) => setUpdateForm({ ...updateForm, location: e.target.value })}
              placeholder="输入当前位置"
              className="input"
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-2 block">状态描述</label>
            <textarea
              value={updateForm.description}
              onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
              placeholder="输入状态描述（可选）"
              rows={3}
              className="input resize-none"
            />
          </div>
        </div>
        <footer>
          <button 
            onClick={() => setStatusModal(false)} 
            className="btn btn-secondary"
            disabled={statusLoading}
          >
            取消
          </button>
          <button
            onClick={handleUpdateStatus}
            disabled={statusLoading || !updateForm.status || !updateForm.location}
            className="btn btn-cyan"
          >
            {statusLoading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 更新中...</>
            ) : '确认更新'}
          </button>
        </footer>
      </Modal>
    </div>
  );
}
