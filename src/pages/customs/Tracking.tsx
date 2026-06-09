import { useState, useEffect } from 'react';
import {
  FileScan,
  Filter,
  X,
  Search,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Upload,
  FileText,
  Package,
  ChevronRight,
  RefreshCw,
  Activity,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import { formatDate, formatCurrency, getStatusLabel, getStatusColor, formatRelativeTime } from '../../utils/format';
import {
  getCustomsDeclarations,
  getCustomsDeclarationById,
  getCustomsTrajectory,
  updateDeclarationStatus,
} from '../../api/customs';
import type { CustomsDeclaration, CustomsTrajectory, CustomsStatus } from '../../types';

export default function Tracking() {
  const [declarations, setDeclarations] = useState<CustomsDeclaration[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState<CustomsDeclaration | null>(null);
  const [trajectory, setTrajectory] = useState<CustomsTrajectory[]>([]);
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<CustomsStatus>('declared');
  const [statusLoading, setStatusLoading] = useState(false);
  const [filters, setFilters] = useState({
    declarationNo: '',
    port: '',
    status: '',
    startDate: '',
    endDate: '',
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize };
      if (filters.declarationNo) params.declarationNo = filters.declarationNo;
      if (filters.port) params.port = filters.port;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await getCustomsDeclarations(params);
      setDeclarations(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch declarations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, filters.status, filters.port]);

  const stats = {
    pending: declarations.filter((d) => d.status === 'pending').length,
    declared: declarations.filter((d) => d.status === 'declared').length,
    inspecting: declarations.filter((d) => d.status === 'inspecting').length,
    detained: declarations.filter((d) => d.status === 'detained').length,
    cleared: declarations.filter((d) => d.status === 'cleared').length,
    todayClearRate: declarations.length > 0
      ? Math.round((declarations.filter((d) => d.status === 'cleared').length / declarations.length) * 100)
      : 0,
  };

  const kpiCards = [
    { title: '待申报', value: stats.pending, icon: <Clock size={24} />, color: 'from-amber/20 to-amber/5', iconBg: 'bg-amber/20 text-amber' },
    { title: '申报中', value: stats.declared, icon: <FileScan size={24} />, color: 'from-cyan/20 to-cyan/5', iconBg: 'bg-cyan/20 text-cyan' },
    { title: '查验中', value: stats.inspecting, icon: <Search size={24} />, color: 'from-primary/20 to-primary/5', iconBg: 'bg-primary/20 text-primary-light' },
    { title: '已扣留', value: stats.detained, icon: <AlertTriangle size={24} />, color: 'from-red/20 to-red/5', iconBg: 'bg-red/20 text-red' },
    { title: '已放行', value: stats.cleared, icon: <CheckCircle size={24} />, color: 'from-green/20 to-green/5', iconBg: 'bg-green/20 text-green' },
    { title: '今日放行率', value: stats.todayClearRate, suffix: '%', icon: <Activity size={24} />, color: 'from-green/20 to-cyan/5', iconBg: 'bg-cyan/20 text-cyan' },
  ];

  const portClearanceOption: EChartsOption = {
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
      data: ['洛杉矶', '纽约', '鹿特丹', '汉堡', '新加坡', '上海'],
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748B', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '小时',
      nameTextStyle: { color: '#64748B' },
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748B', fontSize: 11 },
      splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        data: [8.5, 12.3, 6.8, 9.2, 15.6, 7.4],
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#06B6D4' },
              { offset: 1, color: '#1E40AF' },
            ],
          },
          borderRadius: [6, 6, 0, 0],
        },
        barWidth: 30,
      },
    ],
    animationDuration: 1200,
  };

  const statusDistributionOption: EChartsOption = {
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
        radius: ['45%', '75%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#1E293B',
          borderWidth: 3,
        },
        label: { show: false },
        data: [
          { value: stats.pending, name: '待申报', itemStyle: { color: '#F59E0B' } },
          { value: stats.declared, name: '申报中', itemStyle: { color: '#06B6D4' } },
          { value: stats.inspecting, name: '查验中', itemStyle: { color: '#3B82F6' } },
          { value: stats.detained, name: '已扣留', itemStyle: { color: '#EF4444' } },
          { value: stats.cleared, name: '已放行', itemStyle: { color: '#10B981' } },
        ],
      },
    ],
    animationDuration: 1200,
  };

  const handleViewDetail = async (declaration: CustomsDeclaration) => {
    setSelectedDeclaration(declaration);
    try {
      const [detail, trajectoryData] = await Promise.all([
        getCustomsDeclarationById(declaration.id),
        getCustomsTrajectory(declaration.id),
      ]);
      setSelectedDeclaration(detail);
      setTrajectory(trajectoryData);
    } catch (error) {
      console.error('Failed to fetch detail:', error);
    }
    setDetailModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedDeclaration) return;
    setStatusLoading(true);
    try {
      await updateDeclarationStatus(selectedDeclaration.id, newStatus);
      showToast('清关状态更新成功', 'success');
      setStatusModal(false);
      await fetchData();
      const [detail, trajectoryData] = await Promise.all([
        getCustomsDeclarationById(selectedDeclaration.id),
        getCustomsTrajectory(selectedDeclaration.id),
      ]);
      setSelectedDeclaration(detail);
      setTrajectory(trajectoryData);
    } catch (error) {
      console.error('Failed to update status:', error);
      showToast('更新失败，请重试', 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  const isAlertRow = (status: string) => status === 'inspecting' || status === 'detained';

  interface TableColumn {
    key: string;
    title: string;
    className?: string;
    render?: (row: CustomsDeclaration, index: number) => React.ReactNode;
  }

  const columns: TableColumn[] = [
    {
      key: 'declarationNo',
      title: '申报单号',
      render: (row: CustomsDeclaration) => (
        <div className="font-mono text-cyan">{row.declarationNo}</div>
      ),
    },
    {
      key: 'orderId',
      title: '关联订单',
      render: (row: CustomsDeclaration) => (
        <div>
          <p className="font-medium">{row.order?.orderNo || '-'}</p>
          <p className="text-xs text-text-muted">{row.order?.customerName || '-'}</p>
        </div>
      ),
    },
    {
      key: 'port',
      title: '口岸',
      render: (row: CustomsDeclaration) => (
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-text-muted" />
          {row.port}
        </div>
      ),
    },
    {
      key: 'customsValue',
      title: '申报价值',
      className: 'text-right font-mono',
      render: (row: CustomsDeclaration) => formatCurrency(row.customsValue, 'USD', 2),
    },
    {
      key: 'taxAmount',
      title: '税额',
      className: 'text-right font-mono',
      render: (row: CustomsDeclaration) => (
        <span className={row.taxAmount > 0 ? 'text-amber' : 'text-green'}>
          {formatCurrency(row.taxAmount, 'USD', 2)}
        </span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (row: CustomsDeclaration) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      key: 'declaredAt',
      title: '申报时间',
      render: (row: CustomsDeclaration) => formatDate(row.declaredAt),
    },
    {
      key: 'clearedAt',
      title: '放行时间',
      render: (row: CustomsDeclaration) => row.clearedAt ? formatDate(row.clearedAt) : '-',
    },
    {
      key: 'actions',
      title: '操作',
      render: (row: CustomsDeclaration) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewDetail(row)}
            className="btn btn-secondary text-xs px-2 py-1"
          >
            <Eye size={14} />
            详情
          </button>
        </div>
      ),
    },
  ];

  const documents = [
    { type: 'invoice', name: '商业发票', filename: 'INV-2024-00123.pdf' },
    { type: 'packing_list', name: '装箱单', filename: 'PL-2024-00123.pdf' },
    { type: 'declaration', name: '报关单', filename: 'CUS-2024-00123.pdf' },
  ];

  const trajectoryStatuses: CustomsStatus[] = ['pending', 'declared', 'inspecting', 'detained', 'cleared', 'rejected'];

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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">清关追踪</h1>
            {stats.detained > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red/10 border border-red/30 rounded-full animate-pulse">
                <div className="w-2 h-2 bg-red rounded-full" />
                <span className="text-xs text-red font-medium">{stats.detained} 票待处理</span>
              </div>
            )}
          </div>
          <p className="text-text-muted text-sm mt-1">全球各口岸清关状态实时监控与追踪</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-2 text-cyan text-sm">
              <Activity size={16} className="animate-spin" />
              数据更新中...
            </div>
          )}
          <button onClick={() => setShowFilters(!showFilters)} className="btn btn-secondary">
            <Filter size={16} />
            筛选
          </button>
          <button onClick={fetchData} className="btn btn-primary">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card bg-bg-dark/80 backdrop-blur-sm border-cyan/30">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <FileScan size={16} className="text-text-muted" />
              <span className="text-sm text-text-secondary">申报单号</span>
              <input
                type="text"
                value={filters.declarationNo}
                onChange={(e) => setFilters({ ...filters, declarationNo: e.target.value })}
                className="input w-40"
                placeholder="输入申报单号"
              />
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-text-muted" />
              <span className="text-sm text-text-secondary">口岸</span>
              <select
                value={filters.port}
                onChange={(e) => setFilters({ ...filters, port: e.target.value })}
                className="input-select w-32"
              >
                <option value="">全部口岸</option>
                <option value="洛杉矶">洛杉矶</option>
                <option value="纽约">纽约</option>
                <option value="鹿特丹">鹿特丹</option>
                <option value="汉堡">汉堡</option>
                <option value="新加坡">新加坡</option>
                <option value="上海">上海</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">清关状态</span>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="input-select w-28"
              >
                <option value="">全部状态</option>
                <option value="pending">待申报</option>
                <option value="declared">申报中</option>
                <option value="inspecting">查验中</option>
                <option value="detained">已扣留</option>
                <option value="cleared">已放行</option>
                <option value="rejected">已退回</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-text-muted" />
              <span className="text-sm text-text-secondary">日期范围</span>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="input w-36"
              />
              <span className="text-text-muted">至</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="input w-36"
              />
            </div>
            <div className="flex-1" />
            <button
              onClick={() => setFilters({ declarationNo: '', port: '', status: '', startDate: '', endDate: '' })}
              className="btn btn-secondary"
            >
              <X size={14} />
              重置
            </button>
            <button onClick={fetchData} className="btn btn-cyan">
              应用筛选
            </button>
          </div>
        </div>
      )}

      {stats.inspecting > 0 || stats.detained > 0 ? (
        <div className="card bg-gradient-to-r from-red/10 via-amber/5 to-transparent border-red/30 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red/20 border border-red/40 rounded-lg">
              <AlertTriangle size={16} className="text-red animate-pulse" />
              <span className="text-sm font-medium text-red">实时预警</span>
            </div>
            <div className="flex-1">
              <div className="flex gap-6">
                {stats.inspecting > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber rounded-full animate-pulse" />
                    <span className="text-sm text-text-primary">
                      <span className="font-bold text-amber">{stats.inspecting}</span> 票正在查验中
                    </span>
                  </div>
                )}
                {stats.detained > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red rounded-full animate-pulse" />
                    <span className="text-sm text-text-primary">
                      <span className="font-bold text-red">{stats.detained}</span> 票已被扣留，需立即处理
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((card, index) => (
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
              />
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2 card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Clock size={18} className="text-cyan" />
              各口岸清关时效对比
            </h3>
            <div className="text-xs text-text-muted">单位: 小时</div>
          </div>
          <ReactECharts option={portClearanceOption} style={{ height: 280 }} />
        </div>

        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <FileScan size={18} className="text-primary-light" />
              清关状态分布
            </h3>
          </div>
          <ReactECharts option={statusDistributionOption} style={{ height: 280 }} />
        </div>
      </div>

      <div className="card card-hover">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Package size={18} className="text-cyan" />
            清关申报列表
          </h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-amber rounded-full animate-pulse" />
              查验中
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red rounded-full animate-pulse" />
              已扣留
            </span>
          </div>
        </div>
        <div>
          {declarations.map((row, index) => (
            <div
              key={row.id}
              className={`border border-border-color rounded-xl mb-2 overflow-hidden transition-all duration-300 ${
                isAlertRow(row.status)
                  ? 'border-red/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                  : ''
              }`}
              style={{
                animation: isAlertRow(row.status) ? 'pulse-border 2s infinite' : 'none',
              }}
            >
              <table className="w-full">
                {index === 0 && (
                  <thead>
                    <tr className="bg-bg-card">
                      {columns.map((column) => (
                        <th
                          key={String(column.key)}
                          className={`table-header ${column.className || ''}`}
                        >
                          {column.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  <tr className={`table-row ${isAlertRow(row.status) ? 'bg-red/5' : ''}`}>
                    {columns.map((column) => (
                      <td key={String(column.key)} className={`table-cell ${column.className || ''}`}>
                        {column.render ? column.render(row, index) : String(row[column.key as keyof CustomsDeclaration] || '')}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
          {loading && (
            <div className="text-center py-8">
              <div className="flex items-center justify-center gap-2 text-text-muted">
                <div className="w-5 h-5 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
                加载中...
              </div>
            </div>
          )}
          {!loading && declarations.length === 0 && (
            <div className="text-center py-12 text-text-muted">
              暂无数据
            </div>
          )}
          {total > 0 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="text-sm text-text-secondary">
                共 {total} 条记录，第 {page} / {Math.ceil(total / pageSize)} 页
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-3 py-1 rounded-lg bg-bg-card hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  首页
                </button>
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 rounded-lg bg-bg-card hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  上一页
                </button>
                <div className="px-3 py-1 bg-bg-card rounded-lg text-sm">
                  {page}
                </div>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === Math.ceil(total / pageSize)}
                  className="px-3 py-1 rounded-lg bg-bg-card hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  下一页
                </button>
                <button
                  onClick={() => setPage(Math.ceil(total / pageSize))}
                  disabled={page === Math.ceil(total / pageSize)}
                  className="px-3 py-1 rounded-lg bg-bg-card hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  末页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={detailModal}
        onClose={() => setDetailModal(false)}
        title={`清关详情 - ${selectedDeclaration?.declarationNo}`}
        width="max-w-4xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-text-muted">
              创建时间: {selectedDeclaration ? formatDate(selectedDeclaration.declaredAt) : '-'}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setDetailModal(false)} className="btn btn-secondary">
                关闭
              </button>
              <button
                onClick={() => {
                  setNewStatus(selectedDeclaration?.status || 'declared');
                  setStatusModal(true);
                }}
                className="btn btn-cyan"
              >
                <Upload size={16} />
                更新状态
              </button>
            </div>
          </div>
        }
      >
        {selectedDeclaration && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-cyan" />
                  基本信息
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">申报单号</span>
                    <span className="font-mono text-cyan">{selectedDeclaration.declarationNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">关联订单</span>
                    <span>{selectedDeclaration.order?.orderNo || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">清关口岸</span>
                    <span>{selectedDeclaration.port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">申报价值</span>
                    <span className="font-mono">{formatCurrency(selectedDeclaration.customsValue, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">应缴税额</span>
                    <span className="font-mono text-amber">{formatCurrency(selectedDeclaration.taxAmount, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">当前状态</span>
                    <StatusBadge status={selectedDeclaration.status} size="md" />
                  </div>
                </div>
              </div>

              <div className="card">
                <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <Package size={16} className="text-primary-light" />
                  商品明细
                </h4>
                <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                  {selectedDeclaration.order?.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-border-color last:border-0">
                      <div>
                        <p className="font-medium">{item.product?.name}</p>
                        <p className="text-xs text-text-muted">HS: {item.product?.hsCode}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono">x{item.quantity}</p>
                        <p className="text-xs text-text-muted">{formatCurrency(item.unitPrice * item.quantity, 'USD')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Activity size={16} className="text-green" />
                清关轨迹
              </h4>
              <div className="relative pl-8">
                {trajectory.map((point, idx) => (
                  <div key={point.id} className="relative pb-6 last:pb-0">
                    {idx < trajectory.length - 1 && (
                      <div className="absolute left-[-24px] top-6 w-0.5 h-full bg-border-color" />
                    )}
                    <div className={`absolute left-[-28px] top-1 w-6 h-6 rounded-full flex items-center justify-center ${
                      point.status === 'cleared' ? 'bg-green' :
                      point.status === 'detained' ? 'bg-red' :
                      point.status === 'inspecting' ? 'bg-amber' :
                      'bg-cyan'
                    }`}>
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={point.status} size="sm" />
                          <span className="text-sm font-medium">{point.location}</span>
                        </div>
                        <p className="text-sm text-text-muted mt-1">{point.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono">{formatDate(point.timestamp)}</p>
                        <p className="text-xs text-text-muted">{formatRelativeTime(point.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {trajectory.length === 0 && (
                  <div className="text-center py-8 text-text-muted">
                    暂无清关轨迹数据
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <FileText size={16} className="text-amber" />
                清关文件
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-bg-dark/50 rounded-lg hover:bg-bg-dark/80 transition-colors cursor-pointer">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <FileText size={20} className="text-primary-light" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-text-muted truncate">{doc.filename}</p>
                    </div>
                    <Eye size={16} className="text-text-muted" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={statusModal}
        onClose={() => setStatusModal(false)}
        title="更新清关状态"
        width="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button 
              onClick={() => setStatusModal(false)} 
              className="btn btn-secondary"
              disabled={statusLoading}
            >
              取消
            </button>
            <button 
              onClick={handleUpdateStatus} 
              className="btn btn-cyan"
              disabled={statusLoading}
            >
              {statusLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 更新中...</>
              ) : '确认更新'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              当前申报单
            </label>
            <div className="p-3 bg-bg-dark/50 rounded-lg">
              <p className="font-mono text-cyan">{selectedDeclaration?.declarationNo}</p>
              <p className="text-sm text-text-muted mt-1">
                当前状态: <StatusBadge status={selectedDeclaration?.status || ''} />
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              新状态
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as CustomsStatus)}
              className="input-select w-full"
            >
              {trajectoryStatuses.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      <style>{`
        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
          }
        }
      `}</style>
    </div>
  );
}
