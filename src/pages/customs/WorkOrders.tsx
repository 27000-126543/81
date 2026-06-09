import { useState, useEffect } from 'react';
import {
  AlertCircle,
  Filter,
  X,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  Eye,
  MessageSquare,
  RefreshCw,
  Activity,
  FileText,
  User,
  ChevronRight,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import { formatDate, formatRelativeTime, getStatusLabel, getStatusColor } from '../../utils/format';
import {
  getWorkOrders,
  getWorkOrderById,
  approveWorkOrder,
  rejectWorkOrder,
  escalateWorkOrder,
} from '../../api/customs';
import type { WorkOrder, WorkOrderType, WorkOrderPriority } from '../../types';

export default function WorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [actionModal, setActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'escalate'>('approve');
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({
    workOrderNo: '',
    type: '',
    priority: '',
    status: '',
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
      if (filters.workOrderNo) params.workOrderNo = filters.workOrderNo;
      if (filters.type) params.type = filters.type;
      if (filters.priority) params.priority = filters.priority;
      if (filters.status) params.status = filters.status;

      const response = await getWorkOrders(params);
      setWorkOrders(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, filters.type, filters.priority, filters.status]);

  const stats = {
    pending: workOrders.filter((w) => w.status === 'pending').length,
    processing: workOrders.filter((w) => w.status === 'approved' && w.currentApprovalLevel < 2).length,
    escalated: workOrders.filter((w) => w.isEscalated).length,
    completed: workOrders.filter((w) => w.status === 'approved' && w.currentApprovalLevel >= 2).length,
    avgDuration: workOrders.length > 0 ? 4.5 : 0,
  };

  const kpiCards = [
    { title: '待处理工单', value: stats.pending, icon: <Clock size={24} />, color: 'from-amber/20 to-amber/5', iconBg: 'bg-amber/20 text-amber' },
    { title: '处理中', value: stats.processing, icon: <Activity size={24} />, color: 'from-cyan/20 to-cyan/5', iconBg: 'bg-cyan/20 text-cyan' },
    { title: '已升级', value: stats.escalated, icon: <ArrowUp size={24} />, color: 'from-red/20 to-red/5', iconBg: 'bg-red/20 text-red' },
    { title: '今日完成', value: stats.completed, icon: <CheckCircle size={24} />, color: 'from-green/20 to-green/5', iconBg: 'bg-green/20 text-green' },
    { title: '平均处理时长', value: stats.avgDuration, suffix: 'h', icon: <Clock size={24} />, color: 'from-primary/20 to-primary/5', iconBg: 'bg-primary/20 text-primary-light' },
  ];

  const typeDistributionOption: EChartsOption = {
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
          { value: workOrders.filter((w) => w.type === 'inspection').length, name: '查验异常', itemStyle: { color: '#F59E0B' } },
          { value: workOrders.filter((w) => w.type === 'detention').length, name: '扣留处理', itemStyle: { color: '#EF4444' } },
          { value: workOrders.filter((w) => w.type === 'tax_dispute').length, name: '税费争议', itemStyle: { color: '#06B6D4' } },
        ],
      },
    ],
    animationDuration: 1200,
  };

  const getTypeLabel = (type: WorkOrderType): string => {
    const labels: Record<WorkOrderType, string> = {
      inspection: '查验异常',
      detention: '扣留处理',
      tax_dispute: '税费争议',
    };
    return labels[type] || type;
  };

  type BadgeColor = 'green' | 'amber' | 'red' | 'cyan' | 'blue' | 'muted';

  const getTypeColor = (type: WorkOrderType): BadgeColor => {
    const colors: Record<WorkOrderType, BadgeColor> = {
      inspection: 'amber',
      detention: 'red',
      tax_dispute: 'cyan',
    };
    return colors[type] || 'muted';
  };

  const getPriorityLabel = (priority: WorkOrderPriority): string => {
    const labels: Record<WorkOrderPriority, string> = {
      normal: '普通',
      high: '高',
      urgent: '紧急',
    };
    return labels[priority] || priority;
  };

  const getPriorityColor = (priority: WorkOrderPriority): BadgeColor => {
    const colors: Record<WorkOrderPriority, BadgeColor> = {
      normal: 'muted',
      high: 'amber',
      urgent: 'red',
    };
    return colors[priority] || 'muted';
  };

  const getApprovalLevelLabel = (level: number): string => {
    const labels: Record<number, string> = {
      0: '待提交',
      1: '关务主管审批',
      2: '运营总监审批',
      3: '已完成',
    };
    return labels[level] || `第${level}级`;
  };

  const calculateWaitHours = (createdAt: string): number => {
    const now = new Date().getTime();
    const created = new Date(createdAt).getTime();
    return Math.round((now - created) / (1000 * 60 * 60));
  };

  const isOverdue = (createdAt: string, level: number): boolean => {
    const waitHours = calculateWaitHours(createdAt);
    return waitHours > 24 && level < 2;
  };

  const handleViewDetail = async (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    try {
      const detail = await getWorkOrderById(workOrder.id);
      setSelectedWorkOrder(detail);
    } catch (error) {
      console.error('Failed to fetch detail:', error);
    }
    setDetailModal(true);
  };

  const handleAction = async () => {
    if (!selectedWorkOrder) return;
    
    if (actionType === 'reject' && !comment.trim()) {
      showToast('请填写驳回原因', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const currentLevel = selectedWorkOrder.currentApprovalLevel;
      const nextLevel = currentLevel === 0 ? 1 : Math.min(currentLevel + 1, 2);
      
      if (actionType === 'approve') {
        await approveWorkOrder(selectedWorkOrder.id, nextLevel, comment || '审批通过');
        showToast('审批成功', 'success');
      } else if (actionType === 'reject') {
        await rejectWorkOrder(selectedWorkOrder.id, nextLevel, comment);
        showToast('已驳回', 'success');
      } else if (actionType === 'escalate') {
        await escalateWorkOrder(selectedWorkOrder.id);
        showToast('工单已升级', 'success');
      }
      setActionModal(false);
      setComment('');
      await fetchData();
      if (selectedWorkOrder) {
        const detail = await getWorkOrderById(selectedWorkOrder.id);
        setSelectedWorkOrder(detail);
      }
    } catch (error) {
      console.error('Failed to process work order:', error);
      showToast('操作失败，请重试', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openActionModal = (type: 'approve' | 'reject' | 'escalate') => {
    setActionType(type);
    setComment('');
    setActionModal(true);
  };

  const canShowApprove = (workOrder: WorkOrder): boolean => {
    return workOrder.currentApprovalLevel < 2 && workOrder.status !== 'rejected';
  };

  const canShowReject = (workOrder: WorkOrder): boolean => {
    return workOrder.currentApprovalLevel < 2 && workOrder.status !== 'rejected';
  };

  const canShowEscalate = (workOrder: WorkOrder): boolean => {
    return workOrder.currentApprovalLevel === 1 && !workOrder.isEscalated && workOrder.status !== 'rejected';
  };

  interface TableColumn {
    key: string;
    title: string;
    className?: string;
    render?: (row: WorkOrder, index: number) => React.ReactNode;
  }

  const columns: TableColumn[] = [
    {
      key: 'workOrderNo',
      title: '工单号',
      render: (row: WorkOrder) => (
        <div className="font-mono text-cyan">{row.workOrderNo}</div>
      ),
    },
    {
      key: 'customsDeclarationId',
      title: '关联申报单',
      render: (row: WorkOrder) => (
        <div>
          <p className="font-medium">{row.customsDeclaration?.declarationNo || '-'}</p>
          <p className="text-xs text-text-muted">{row.customsDeclaration?.port || '-'}</p>
        </div>
      ),
    },
    {
      key: 'type',
      title: '类型',
      render: (row: WorkOrder) => (
        <StatusBadge
          status={row.type}
          customLabel={getTypeLabel(row.type)}
          customColor={getTypeColor(row.type)}
        />
      ),
    },
    {
      key: 'priority',
      title: '优先级',
      render: (row: WorkOrder) => (
        <StatusBadge
          status={row.priority}
          customLabel={getPriorityLabel(row.priority)}
          customColor={getPriorityColor(row.priority)}
        />
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (row: WorkOrder) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} />
          {row.isEscalated && (
            <span className="text-xs text-red font-medium">已升级</span>
          )}
        </div>
      ),
    },
    {
      key: 'currentApprovalLevel',
      title: '当前审批层级',
      render: (row: WorkOrder) => (
        <div className="text-sm">
          {getApprovalLevelLabel(row.currentApprovalLevel)}
          {isOverdue(row.createdAt, row.currentApprovalLevel) && (
            <div className="flex items-center gap-1 text-red mt-1">
              <AlertTriangle size={12} />
              <span className="text-xs">超时{calculateWaitHours(row.createdAt) - 24}小时</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: '创建时间',
      render: (row: WorkOrder) => formatDate(row.createdAt),
    },
    {
      key: 'waitTime',
      title: '等待时长',
      render: (row: WorkOrder) => {
        const hours = calculateWaitHours(row.createdAt);
        const isOverdueFlag = isOverdue(row.createdAt, row.currentApprovalLevel);
        return (
          <div className={`flex items-center gap-1 ${isOverdueFlag ? 'text-red' : 'text-text-primary'}`}>
            {isOverdueFlag && <AlertCircle size={14} className="animate-pulse" />}
            <span className="font-mono">{hours}小时</span>
            {hours >= 24 && <span className="text-xs text-red">⚠️</span>}
          </div>
        );
      },
    },
    {
      key: 'actions',
      title: '操作',
      render: (row: WorkOrder) => (
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

  const overdueCount = workOrders.filter((w) => isOverdue(w.createdAt, w.currentApprovalLevel)).length;

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
            <h1 className="text-2xl font-bold text-text-primary">应急工单</h1>
            {(overdueCount > 0 || stats.escalated > 0) && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red/10 border border-red/30 rounded-full animate-pulse">
                <div className="w-2 h-2 bg-red rounded-full" />
                <span className="text-xs text-red font-medium">
                  {overdueCount > 0 && `${overdueCount} 票超时`}
                  {overdueCount > 0 && stats.escalated > 0 && ' / '}
                  {stats.escalated > 0 && `${stats.escalated} 票已升级`}
                </span>
              </div>
            )}
          </div>
          <p className="text-text-muted text-sm mt-1">清关异常工单处理与二级审批管理</p>
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
              <Search size={16} className="text-text-muted" />
              <span className="text-sm text-text-secondary">工单号</span>
              <input
                type="text"
                value={filters.workOrderNo}
                onChange={(e) => setFilters({ ...filters, workOrderNo: e.target.value })}
                className="input w-40"
                placeholder="输入工单号"
              />
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-text-muted" />
              <span className="text-sm text-text-secondary">工单类型</span>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="input-select w-32"
              >
                <option value="">全部类型</option>
                <option value="inspection">查验异常</option>
                <option value="detention">扣留处理</option>
                <option value="tax_dispute">税费争议</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-text-muted" />
              <span className="text-sm text-text-secondary">优先级</span>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="input-select w-28"
              >
                <option value="">全部优先级</option>
                <option value="normal">普通</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-text-muted" />
              <span className="text-sm text-text-secondary">状态</span>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="input-select w-28"
              >
                <option value="">全部状态</option>
                <option value="pending">待处理</option>
                <option value="approved">审批中/已通过</option>
                <option value="rejected">已拒绝</option>
                <option value="escalated">已升级</option>
              </select>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => setFilters({ workOrderNo: '', type: '', priority: '', status: '' })}
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

      {overdueCount > 0 && (
        <div className="card bg-gradient-to-r from-red/10 via-amber/5 to-transparent border-red/30 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red/20 border border-red/40 rounded-lg">
              <AlertTriangle size={16} className="text-red animate-pulse" />
              <span className="text-sm font-medium text-red">超时警告</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red" />
                <span className="text-sm text-text-primary">
                  有 <span className="font-bold text-red">{overdueCount}</span> 票工单等待时长已超过24小时，请尽快处理！
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
                decimals={card.suffix === 'h' ? 1 : 0}
              />
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2 card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <AlertCircle size={18} className="text-cyan" />
              工单列表
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red rounded-full" />
                超时
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-amber rounded-full" />
                已升级
              </span>
            </div>
          </div>
          <div>
            {workOrders.map((row, index) => {
              const isOverdueFlag = isOverdue(row.createdAt, row.currentApprovalLevel);
              return (
                <div
                  key={row.id}
                  className={`border border-border-color rounded-xl mb-2 overflow-hidden transition-all duration-300 ${
                    isOverdueFlag
                      ? 'border-red/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                      : row.isEscalated
                      ? 'border-amber/50'
                      : ''
                  }`}
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
                      <tr className={`table-row ${isOverdueFlag ? 'bg-red/5' : row.isEscalated ? 'bg-amber/5' : ''}`}>
                        {columns.map((column) => (
                          <td key={String(column.key)} className={`table-cell ${column.className || ''}`}>
                            {column.render ? column.render(row, index) : String(row[column.key as keyof WorkOrder] || '')}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
            {loading && (
              <div className="text-center py-8">
                <div className="flex items-center justify-center gap-2 text-text-muted">
                  <div className="w-5 h-5 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
                  加载中...
                </div>
              </div>
            )}
            {!loading && workOrders.length === 0 && (
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

        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <FileText size={18} className="text-primary-light" />
              工单类型分布
            </h3>
          </div>
          <ReactECharts option={typeDistributionOption} style={{ height: 280 }} />
          <div className="grid grid-cols-1 gap-3 mt-2">
            {[
              { label: '查验异常', count: workOrders.filter((w) => w.type === 'inspection').length, color: 'text-amber' },
              { label: '扣留处理', count: workOrders.filter((w) => w.type === 'detention').length, color: 'text-red' },
              { label: '税费争议', count: workOrders.filter((w) => w.type === 'tax_dispute').length, color: 'text-cyan' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-bg-dark/50 rounded-lg">
                <span className="text-text-secondary text-sm">{item.label}</span>
                <span className={`font-bold font-mono ${item.color}`}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        isOpen={detailModal}
        onClose={() => setDetailModal(false)}
        title={`工单详情 - ${selectedWorkOrder?.workOrderNo}`}
        width="max-w-4xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sm">
              {selectedWorkOrder && isOverdue(selectedWorkOrder.createdAt, selectedWorkOrder.currentApprovalLevel) && (
                <span className="text-red flex items-center gap-1">
                  <AlertTriangle size={14} className="animate-pulse" />
                  已超时 {calculateWaitHours(selectedWorkOrder.createdAt) - 24} 小时
                </span>
              )}
              {selectedWorkOrder?.isEscalated && (
                <span className="text-amber flex items-center gap-1">
                  <ArrowUp size={14} />
                  已升级
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setDetailModal(false)} className="btn btn-secondary">
                关闭
              </button>
              {selectedWorkOrder && canShowEscalate(selectedWorkOrder) && (
                <button onClick={() => openActionModal('escalate')} className="btn btn-warning">
                  <ArrowUp size={16} />
                  升级
                </button>
              )}
              {selectedWorkOrder && canShowReject(selectedWorkOrder) && (
                <button onClick={() => openActionModal('reject')} className="btn btn-danger">
                  <X size={16} />
                  拒绝
                </button>
              )}
              {selectedWorkOrder && canShowApprove(selectedWorkOrder) && (
                <button onClick={() => openActionModal('approve')} className="btn btn-cyan">
                  <CheckCircle size={16} />
                  {selectedWorkOrder.currentApprovalLevel === 0 ? '提交审批' : '审批通过'}
                </button>
              )}
            </div>
          </div>
        }
      >
        {selectedWorkOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-cyan" />
                  基本信息
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">工单号</span>
                    <span className="font-mono text-cyan">{selectedWorkOrder.workOrderNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">关联申报单</span>
                    <span>{selectedWorkOrder.customsDeclaration?.declarationNo || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">工单类型</span>
                    <StatusBadge
                      status={selectedWorkOrder.type}
                      customLabel={getTypeLabel(selectedWorkOrder.type)}
                      customColor={getTypeColor(selectedWorkOrder.type)}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">优先级</span>
                    <StatusBadge
                      status={selectedWorkOrder.priority}
                      customLabel={getPriorityLabel(selectedWorkOrder.priority)}
                      customColor={getPriorityColor(selectedWorkOrder.priority)}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">当前状态</span>
                    <StatusBadge status={selectedWorkOrder.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">当前审批层级</span>
                    <span className="text-text-primary">{getApprovalLevelLabel(selectedWorkOrder.currentApprovalLevel)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">创建时间</span>
                    <span>{formatDate(selectedWorkOrder.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">等待时长</span>
                    <span className={isOverdue(selectedWorkOrder.createdAt, selectedWorkOrder.currentApprovalLevel) ? 'text-red font-medium' : ''}>
                      {calculateWaitHours(selectedWorkOrder.createdAt)} 小时
                      {isOverdue(selectedWorkOrder.createdAt, selectedWorkOrder.currentApprovalLevel) && ' (已超时)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber" />
                  问题描述
                </h4>
                <div className="p-3 bg-bg-dark/50 rounded-lg text-sm text-text-primary min-h-[120px]">
                  {selectedWorkOrder.type === 'inspection' &&
                    '该票货物在口岸被抽中查验，需要提供补充文件和说明。请尽快准备相关材料并提交，以免影响清关进度。'}
                  {selectedWorkOrder.type === 'detention' &&
                    '该票货物已被海关扣留，原因：申报价值与海关评估价值存在较大差异。需立即与海关沟通并提供相关证明材料。'}
                  {selectedWorkOrder.type === 'tax_dispute' &&
                    '税费计算存在争议，海关核定税额与申报税额相差较大。需要提供商品价值证明、交易合同等材料进行申诉。'}
                </div>

                <h4 className="text-sm font-semibold text-text-primary mb-3 mt-4 flex items-center gap-2">
                  <User size={16} className="text-primary-light" />
                  审批流程
                </h4>
                <div className="space-y-3">
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${
                    selectedWorkOrder.currentApprovalLevel >= 1 ? 'bg-green/10 border border-green/30' : 'bg-bg-dark/50'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      selectedWorkOrder.currentApprovalLevel >= 1 ? 'bg-green text-white' : 'bg-bg-card text-text-muted'
                    }`}>
                      1
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">关务主管审批</span>
                        {selectedWorkOrder.level1ApprovedAt && (
                          <CheckCircle size={16} className="text-green" />
                        )}
                      </div>
                      <p className="text-xs text-text-muted">
                        {selectedWorkOrder.level1Approver?.realName || '待处理'}
                        {selectedWorkOrder.level1ApprovedAt && ` · ${formatDate(selectedWorkOrder.level1ApprovedAt)}`}
                      </p>
                      {selectedWorkOrder.level1Comment && (
                        <p className="text-xs text-text-secondary mt-1">
                          意见: {selectedWorkOrder.level1Comment}
                        </p>
                      )}
                    </div>
                    {selectedWorkOrder.currentApprovalLevel === 0 && (
                      <ChevronRight size={16} className="text-cyan animate-pulse" />
                    )}
                  </div>

                  <div className={`flex items-center gap-3 p-3 rounded-lg ${
                    selectedWorkOrder.currentApprovalLevel >= 2 ? 'bg-green/10 border border-green/30' : 'bg-bg-dark/50'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      selectedWorkOrder.currentApprovalLevel >= 2 ? 'bg-green text-white' : 'bg-bg-card text-text-muted'
                    }`}>
                      2
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">运营总监审批</span>
                        {selectedWorkOrder.level2ApprovedAt && (
                          <CheckCircle size={16} className="text-green" />
                        )}
                      </div>
                      <p className="text-xs text-text-muted">
                        {selectedWorkOrder.level2Approver?.realName || '待处理'}
                        {selectedWorkOrder.level2ApprovedAt && ` · ${formatDate(selectedWorkOrder.level2ApprovedAt)}`}
                      </p>
                      {selectedWorkOrder.level2Comment && (
                        <p className="text-xs text-text-secondary mt-1">
                          意见: {selectedWorkOrder.level2Comment}
                        </p>
                      )}
                    </div>
                    {selectedWorkOrder.currentApprovalLevel === 1 && (
                      <ChevronRight size={16} className="text-cyan animate-pulse" />
                    )}
                  </div>

                  {selectedWorkOrder.isEscalated && (
                    <div className="flex items-center gap-2 p-2 bg-amber/10 border border-amber/30 rounded-lg text-amber text-sm">
                      <ArrowUp size={14} />
                      <span>该工单已自动升级（超过24小时未处理）</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <MessageSquare size={16} className="text-green" />
                处理记录
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-bg-dark/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-cyan/20 flex items-center justify-center">
                    <User size={16} className="text-cyan" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">系统</span>
                      <span className="text-xs text-text-muted">{formatDate(selectedWorkOrder.createdAt)}</span>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">
                      工单创建，类型：{getTypeLabel(selectedWorkOrder.type)}，优先级：{getPriorityLabel(selectedWorkOrder.priority)}
                    </p>
                  </div>
                </div>

                {selectedWorkOrder.level1ApprovedAt && (
                  <div className="flex items-start gap-3 p-3 bg-bg-dark/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-green/20 flex items-center justify-center">
                      <User size={16} className="text-green" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{selectedWorkOrder.level1Approver?.realName || '关务主管'}</span>
                        <span className="text-xs text-text-muted">{formatDate(selectedWorkOrder.level1ApprovedAt)}</span>
                      </div>
                      <StatusBadge status={selectedWorkOrder.status} className="mt-1" />
                      {selectedWorkOrder.level1Comment && (
                        <p className="text-sm text-text-secondary mt-1">
                          意见: {selectedWorkOrder.level1Comment}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {selectedWorkOrder.level2ApprovedAt && (
                  <div className="flex items-start gap-3 p-3 bg-bg-dark/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-green/20 flex items-center justify-center">
                      <User size={16} className="text-green" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{selectedWorkOrder.level2Approver?.realName || '运营总监'}</span>
                        <span className="text-xs text-text-muted">{formatDate(selectedWorkOrder.level2ApprovedAt)}</span>
                      </div>
                      <StatusBadge status={selectedWorkOrder.status} className="mt-1" />
                      {selectedWorkOrder.level2Comment && (
                        <p className="text-sm text-text-secondary mt-1">
                          意见: {selectedWorkOrder.level2Comment}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={actionModal}
        onClose={() => setActionModal(false)}
        title={
          actionType === 'approve' ? '审批通过' :
          actionType === 'reject' ? '拒绝申请' :
          '升级工单'
        }
        width="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button 
              onClick={() => setActionModal(false)} 
              className="btn btn-secondary"
              disabled={actionLoading}
            >
              取消
            </button>
            <button
              onClick={handleAction}
              disabled={actionLoading || (actionType === 'reject' && !comment.trim())}
              className={`btn ${
                actionType === 'approve' ? 'btn-cyan' :
                actionType === 'reject' ? 'btn-danger' :
                'btn-warning'
              }`}
            >
              {actionLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 处理中...</>
              ) : (
                actionType === 'approve' ? '确认通过' :
                actionType === 'reject' ? '确认拒绝' :
                '确认升级'
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              当前工单
            </label>
            <div className="p-3 bg-bg-dark/50 rounded-lg">
              <p className="font-mono text-cyan">{selectedWorkOrder?.workOrderNo}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge
                  status={selectedWorkOrder?.type || ''}
                  customLabel={selectedWorkOrder ? getTypeLabel(selectedWorkOrder.type) : ''}
                  customColor={selectedWorkOrder ? getTypeColor(selectedWorkOrder.type) : 'muted'}
                />
                <span className="text-xs text-text-muted">
                  {selectedWorkOrder ? getApprovalLevelLabel(selectedWorkOrder.currentApprovalLevel) : ''}
                </span>
              </div>
            </div>
          </div>

          {actionType !== 'escalate' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                审批意见
                {actionType === 'reject' && <span className="text-red"> *</span>}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="input w-full h-24 resize-none"
                placeholder={actionType === 'reject' ? '请填写拒绝原因...' : '请填写审批意见（选填）...'}
              />
            </div>
          )}

          {actionType === 'escalate' && (
            <div className="p-3 bg-amber/10 border border-amber/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber">确认升级此工单？</p>
                  <p className="text-xs text-text-secondary mt-1">
                    升级后将提升优先级，并通知更高层级管理人员处理。
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-text-muted">
            当前审批层级: 第 {selectedWorkOrder ? selectedWorkOrder.currentApprovalLevel + 1 : 1} 级
            {selectedWorkOrder && selectedWorkOrder.currentApprovalLevel === 0 ? ' (关务主管)' : ' (运营总监)'}
          </div>
        </div>
      </Modal>
    </div>
  );
}
