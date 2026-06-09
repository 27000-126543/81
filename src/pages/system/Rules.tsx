import { useEffect, useState } from 'react';
import {
  RefreshCw,
  Edit3,
  X,
  Plus,
  Trash2,
  Workflow,
  Settings,
  CheckCircle,
  AlertCircle,
  Activity,
  Clock,
  Shield,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Gauge,
} from 'lucide-react';
import {
  getApprovalFlows,
  createApprovalFlow,
  updateApprovalFlow,
  deleteApprovalFlow,
  getSystemRules,
  updateSystemRule,
} from '../../api/system';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import {
  formatDate,
  getRoleLabel,
} from '../../utils/format';
import type { ApprovalFlow, SystemRule, UserRole } from '../../types';

const targetTypeOptions = [
  { value: 'refund', label: '退款审批' },
  { value: 'exchange', label: '换货审批' },
  { value: 'transfer', label: '调拨审批' },
  { value: 'purchase', label: '采购审批' },
  { value: 'compensation', label: '赔付审批' },
];

const roleOptionsForApproval = [
  { value: 'warehouse_manager', label: '仓库管理员' },
  { value: 'customs_officer', label: '清关专员' },
  { value: 'operation_director', label: '运营总监' },
  { value: 'admin', label: '系统管理员' },
];

interface TabType {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabType[] = [
  { key: 'approval', label: '审批流程', icon: <Workflow size={18} /> },
  { key: 'system', label: '系统规则', icon: <Settings size={18} /> },
];

export default function SystemRules() {
  const [activeTab, setActiveTab] = useState('approval');

  const [approvalFlows, setApprovalFlows] = useState<ApprovalFlow[]>([]);
  const [systemRules, setSystemRules] = useState<SystemRule[]>([]);
  const [loading, setLoading] = useState(false);

  const [approvalModal, setApprovalModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ApprovalFlow | null>(null);
  const [flowForm, setFlowForm] = useState({
    name: '',
    targetType: 'refund',
    thresholdAmount: 1000,
    level1Role: 'warehouse_manager' as UserRole,
    level2Role: 'operation_director' as UserRole,
    escalationHours: 24,
    isActive: true,
  });

  const [ruleModal, setRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<SystemRule | null>(null);
  const [ruleValue, setRuleValue] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');

  const [deleteModal, setDeleteModal] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const fetchApprovalFlows = async () => {
    setLoading(true);
    try {
      const data = await getApprovalFlows();
      setApprovalFlows(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载审批流程失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemRules = async () => {
    setLoading(true);
    try {
      const data = await getSystemRules();
      setSystemRules(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载系统规则失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'approval') {
      fetchApprovalFlows();
    } else {
      fetchSystemRules();
    }
  }, [activeTab]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleAddFlow = () => {
    setEditingFlow(null);
    setFlowForm({
      name: '',
      targetType: 'refund',
      thresholdAmount: 1000,
      level1Role: 'warehouse_manager',
      level2Role: 'operation_director',
      escalationHours: 24,
      isActive: true,
    });
    setApprovalModal(true);
  };

  const handleEditFlow = (flow: ApprovalFlow) => {
    setEditingFlow(flow);
    setFlowForm({
      name: flow.name,
      targetType: flow.targetType,
      thresholdAmount: flow.thresholdAmount,
      level1Role: flow.level1Role,
      level2Role: flow.level2Role,
      escalationHours: flow.escalationHours,
      isActive: flow.isActive,
    });
    setApprovalModal(true);
  };

  const handleSaveFlow = async () => {
    if (!flowForm.name) {
      showToast('请输入流程名称', 'error');
      return;
    }
    if (flowForm.thresholdAmount <= 0) {
      showToast('阈值金额必须大于0', 'error');
      return;
    }

    try {
      if (editingFlow) {
        await updateApprovalFlow(editingFlow.id, flowForm);
        showToast('审批流程更新成功', 'success');
      } else {
        await createApprovalFlow(flowForm);
        showToast('审批流程创建成功', 'success');
      }
      setApprovalModal(false);
      fetchApprovalFlows();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error');
    }
  };

  const handleToggleFlowStatus = async (flow: ApprovalFlow) => {
    try {
      await updateApprovalFlow(flow.id, { isActive: !flow.isActive });
      showToast(`流程已${flow.isActive ? '禁用' : '启用'}`, 'success');
      fetchApprovalFlows();
    } catch (err) {
      showToast('操作失败', 'error');
    }
  };

  const handleDeleteFlow = async () => {
    if (!editingFlow) return;
    try {
      await deleteApprovalFlow(editingFlow.id);
      showToast('审批流程删除成功', 'success');
      setDeleteModal(false);
      setApprovalModal(false);
      fetchApprovalFlows();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const handleEditRule = (rule: SystemRule) => {
    setEditingRule(rule);
    setRuleValue(rule.ruleValue);
    setRuleDescription(rule.description);
    setRuleModal(true);
  };

  const handleSaveRule = async () => {
    if (!editingRule || !ruleValue) {
      showToast('请输入规则值', 'error');
      return;
    }
    try {
      await updateSystemRule(editingRule.id, ruleValue, ruleDescription);
      showToast('规则更新成功', 'success');
      setRuleModal(false);
      fetchSystemRules();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error');
    }
  };

  const getRuleIcon = (ruleKey: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      safety_stock_coefficient: <Shield size={18} className="text-cyan" />,
      transfer_urgent_threshold: <TrendingUp size={18} className="text-amber" />,
      customs_congestion_weight: <Gauge size={18} className="text-red" />,
      logistics_compensation_max: <DollarSign size={18} className="text-green" />,
      auto_escalation_hours: <Clock size={18} className="text-primary-light" />,
    };
    return iconMap[ruleKey] || <Settings size={18} className="text-text-muted" />;
  };

  const approvalColumns = [
    {
      key: 'name',
      title: '流程名称',
      render: (row: ApprovalFlow) => (
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan/10">
            <Workflow size={16} className="text-cyan" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{row.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'targetType',
      title: '适用类型',
      render: (row: ApprovalFlow) => {
        const type = targetTypeOptions.find((t) => t.value === row.targetType);
        return <span className="text-text-secondary">{type?.label || row.targetType}</span>;
      },
    },
    {
      key: 'thresholdAmount',
      title: '阈值金额',
      render: (row: ApprovalFlow) => (
        <span className="font-mono font-semibold text-amber">¥{row.thresholdAmount.toLocaleString()}</span>
      ),
    },
    {
      key: 'level1Role',
      title: '一级审批角色',
      render: (row: ApprovalFlow) => (
        <StatusBadge
          status={row.level1Role}
          customLabel={getRoleLabel(row.level1Role)}
          customColor="cyan"
        />
      ),
    },
    {
      key: 'level2Role',
      title: '二级审批角色',
      render: (row: ApprovalFlow) => (
        <StatusBadge
          status={row.level2Role}
          customLabel={getRoleLabel(row.level2Role)}
          customColor="amber"
        />
      ),
    },
    {
      key: 'escalationHours',
      title: '升级时效',
      render: (row: ApprovalFlow) => (
        <div className="flex items-center gap-1">
          <Clock size={14} className="text-text-muted" />
          <span className="text-text-secondary">{row.escalationHours} 小时</span>
        </div>
      ),
    },
    {
      key: 'isActive',
      title: '状态',
      render: (row: ApprovalFlow) => (
        <StatusBadge
          status={row.isActive ? 'active' : 'inactive'}
          customLabel={row.isActive ? '已启用' : '已禁用'}
          customColor={row.isActive ? 'green' : 'muted'}
        />
      ),
    },
    {
      key: 'action',
      title: '操作',
      width: '150px',
      render: (row: ApprovalFlow) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleEditFlow(row)}
            className="p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-cyan transition-colors"
            title="编辑"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={() => handleToggleFlowStatus(row)}
            className={`p-2 rounded-lg hover:bg-bg-hover transition-colors ${
              row.isActive
                ? 'text-text-muted hover:text-red'
                : 'text-text-muted hover:text-green'
            }`}
            title={row.isActive ? '禁用' : '启用'}
          >
            {row.isActive ? <X size={16} /> : <CheckCircle size={16} />}
          </button>
          <button
            onClick={() => {
              setEditingFlow(row);
              setDeleteModal(true);
            }}
            className="p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-red transition-colors"
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const systemRuleColumns = [
    {
      key: 'name',
      title: '规则名称',
      render: (row: SystemRule) => {
        const nameMap: Record<string, string> = {
          safety_stock_coefficient: '安全库存系数',
          transfer_urgent_threshold: '调拨紧急阈值',
          customs_congestion_weight: '清关拥堵指数权重',
          logistics_compensation_max: '物流补偿上限',
          auto_escalation_hours: '自动升级时效',
        };
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-bg-card">
              {getRuleIcon(row.ruleKey)}
            </div>
            <div>
              <p className="font-medium text-text-primary">{nameMap[row.ruleKey] || row.ruleKey}</p>
              <p className="text-xs text-text-muted font-mono">{row.ruleKey}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'ruleKey',
      title: '规则键名',
      render: (row: SystemRule) => (
        <span className="font-mono text-text-muted">{row.ruleKey}</span>
      ),
    },
    {
      key: 'ruleValue',
      title: '当前值',
      render: (row: SystemRule) => {
        const unitMap: Record<string, string> = {
          safety_stock_coefficient: '',
          transfer_urgent_threshold: ' 件',
          customs_congestion_weight: '',
          logistics_compensation_max: ' 元',
          auto_escalation_hours: ' 小时',
        };
        return (
          <span className="font-mono font-semibold text-cyan">
            {row.ruleValue}{unitMap[row.ruleKey] || ''}
          </span>
        );
      },
    },
    {
      key: 'description',
      title: '描述',
      render: (row: SystemRule) => (
        <span className="text-text-secondary text-sm">{row.description}</span>
      ),
    },
    {
      key: 'updatedAt',
      title: '更新时间',
      sortable: true,
      render: (row: SystemRule) => (
        <div>
          <p className="text-sm text-text-secondary">{formatDate(row.updatedAt, 'MM-DD HH:mm')}</p>
        </div>
      ),
    },
    {
      key: 'action',
      title: '操作',
      width: '100px',
      render: (row: SystemRule) => (
        <button
          onClick={() => handleEditRule(row)}
          className="p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-cyan transition-colors"
          title="编辑"
        >
          <Edit3 size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">规则配置</h1>
          <p className="text-text-muted text-sm mt-1">
            配置审批流程和系统运行规则
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
            onClick={() => activeTab === 'approval' ? fetchApprovalFlows() : fetchSystemRules()}
            className="btn btn-secondary"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
          {activeTab === 'approval' && (
            <button onClick={handleAddFlow} className="btn btn-primary">
              <Plus size={16} />
              新增流程
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-border-color pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-bg-card text-cyan border-t border-x border-cyan/50 -mb-px'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

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

      {activeTab === 'approval' ? (
        <div className="grid grid-cols-1 gap-4">
          {approvalFlows.length === 0 ? (
            <div className="card text-center py-16">
              <Workflow size={48} className="mx-auto text-text-muted mb-4 opacity-50" />
              <p className="text-text-muted">暂无审批流程</p>
              <button onClick={handleAddFlow} className="btn btn-primary mt-4">
                <Plus size={16} />
                创建第一个审批流程
              </button>
            </div>
          ) : (
            approvalFlows.map((flow) => (
              <div key={flow.id} className="card card-hover">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-lg bg-cyan/10">
                        <Workflow size={20} className="text-cyan" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary">{flow.name}</h3>
                        <p className="text-sm text-text-muted">
                          {targetTypeOptions.find((t) => t.value === flow.targetType)?.label}
                        </p>
                      </div>
                      <StatusBadge
                        status={flow.isActive ? 'active' : 'inactive'}
                        customLabel={flow.isActive ? '已启用' : '已禁用'}
                        customColor={flow.isActive ? 'green' : 'muted'}
                        className="ml-4"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-bg-dark/50 rounded-lg">
                        <p className="text-xs text-text-muted mb-1">阈值金额</p>
                        <p className="font-mono font-bold text-amber">
                          ¥{flow.thresholdAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-3 bg-bg-dark/50 rounded-lg">
                        <p className="text-xs text-text-muted mb-1">一级审批</p>
                        <StatusBadge
                          status={flow.level1Role}
                          customLabel={getRoleLabel(flow.level1Role)}
                          customColor="cyan"
                        />
                      </div>
                      <div className="p-3 bg-bg-dark/50 rounded-lg">
                        <p className="text-xs text-text-muted mb-1">二级审批</p>
                        <StatusBadge
                          status={flow.level2Role}
                          customLabel={getRoleLabel(flow.level2Role)}
                          customColor="amber"
                        />
                      </div>
                      <div className="p-3 bg-bg-dark/50 rounded-lg">
                        <p className="text-xs text-text-muted mb-1">自动升级时效</p>
                        <div className="flex items-center gap-1">
                          <Clock size={14} className="text-primary-light" />
                          <span className="font-mono font-semibold text-primary-light">
                            {flow.escalationHours} 小时
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:flex-col">
                    <button
                      onClick={() => handleEditFlow(flow)}
                      className="btn btn-secondary flex-1 md:w-full"
                    >
                      <Edit3 size={16} />
                      编辑
                    </button>
                    <button
                      onClick={() => handleToggleFlowStatus(flow)}
                      className={`btn flex-1 md:w-full ${flow.isActive ? 'btn-secondary' : 'btn-success'}`}
                    >
                      {flow.isActive ? <X size={16} /> : <CheckCircle size={16} />}
                      {flow.isActive ? '禁用' : '启用'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingFlow(flow);
                        setDeleteModal(true);
                      }}
                      className="btn btn-danger flex-1 md:w-full"
                    >
                      <Trash2 size={16} />
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">系统规则列表</h3>
          </div>
          <DataTable
            columns={systemRuleColumns}
            data={systemRules}
            loading={loading}
            total={systemRules.length}
            page={1}
            pageSize={systemRules.length}
            showPagination={false}
            rowKey="id"
          />
        </div>
      )}

      <Modal
        isOpen={approvalModal}
        onClose={() => setApprovalModal(false)}
        title={editingFlow ? '编辑审批流程' : '新增审批流程'}
        width="max-w-2xl"
        footer={
          <>
            {editingFlow && (
              <button
                onClick={() => {
                  setDeleteModal(true);
                }}
                className="btn btn-danger mr-auto"
              >
                <Trash2 size={16} />
                删除
              </button>
            )}
            <button onClick={() => setApprovalModal(false)} className="btn btn-secondary">
              取消
            </button>
            <button onClick={handleSaveFlow} className="btn btn-primary">
              保存
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              流程名称 <span className="text-red">*</span>
            </label>
            <input
              type="text"
              value={flowForm.name}
              onChange={(e) => setFlowForm({ ...flowForm, name: e.target.value })}
              placeholder="请输入流程名称"
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                适用类型 <span className="text-red">*</span>
              </label>
              <select
                value={flowForm.targetType}
                onChange={(e) => setFlowForm({ ...flowForm, targetType: e.target.value })}
                className="input-select"
              >
                {targetTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                阈值金额 (元) <span className="text-red">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan">¥</span>
                <input
                  type="number"
                  value={flowForm.thresholdAmount}
                  onChange={(e) => setFlowForm({ ...flowForm, thresholdAmount: Number(e.target.value) })}
                  placeholder="1000"
                  className="input pl-8"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                一级审批角色 <span className="text-red">*</span>
              </label>
              <select
                value={flowForm.level1Role}
                onChange={(e) => setFlowForm({ ...flowForm, level1Role: e.target.value as UserRole })}
                className="input-select"
              >
                {roleOptionsForApproval.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                二级审批角色 <span className="text-red">*</span>
              </label>
              <select
                value={flowForm.level2Role}
                onChange={(e) => setFlowForm({ ...flowForm, level2Role: e.target.value as UserRole })}
                className="input-select"
              >
                {roleOptionsForApproval.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                自动升级时效 (小时) <span className="text-red">*</span>
              </label>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="number"
                  value={flowForm.escalationHours}
                  onChange={(e) => setFlowForm({ ...flowForm, escalationHours: Number(e.target.value) })}
                  placeholder="24"
                  className="input pl-9"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                状态
              </label>
              <div className="flex items-center gap-3 h-10">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flowForm.isActive}
                    onChange={(e) => setFlowForm({ ...flowForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-border-color bg-bg-card text-cyan focus:ring-cyan"
                  />
                  <span className="text-text-secondary">启用此流程</span>
                </label>
              </div>
            </div>
          </div>

          <div className="p-4 bg-cyan/5 border border-cyan/20 rounded-xl">
            <h4 className="text-sm font-medium text-cyan mb-2 flex items-center gap-2">
              <AlertTriangle size={16} />
              审批流程说明
            </h4>
            <ul className="text-sm text-text-secondary space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-cyan">•</span>
                金额低于阈值：仅需一级审批
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan">•</span>
                金额高于阈值：需要二级审批
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan">•</span>
                超过升级时效未处理：自动升级至上一级
              </li>
            </ul>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={ruleModal}
        onClose={() => setRuleModal(false)}
        title="编辑系统规则"
        width="max-w-md"
        footer={
          <>
            <button onClick={() => setRuleModal(false)} className="btn btn-secondary">
              取消
            </button>
            <button onClick={handleSaveRule} className="btn btn-primary">
              保存
            </button>
          </>
        }
      >
        {editingRule && (
          <div className="space-y-5">
            <div className="p-4 bg-bg-dark/50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-bg-card">
                  {getRuleIcon(editingRule.ruleKey)}
                </div>
                <div>
                  <p className="font-medium text-text-primary">
                    {editingRule.ruleKey === 'safety_stock_coefficient' && '安全库存系数'}
                    {editingRule.ruleKey === 'transfer_urgent_threshold' && '调拨紧急阈值'}
                    {editingRule.ruleKey === 'customs_congestion_weight' && '清关拥堵指数权重'}
                    {editingRule.ruleKey === 'logistics_compensation_max' && '物流补偿上限'}
                    {editingRule.ruleKey === 'auto_escalation_hours' && '自动升级时效'}
                  </p>
                  <p className="text-xs text-text-muted font-mono">{editingRule.ruleKey}</p>
                </div>
              </div>
              <p className="text-sm text-text-secondary">{editingRule.description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                规则值 <span className="text-red">*</span>
              </label>
              <input
                type="text"
                value={ruleValue}
                onChange={(e) => setRuleValue(e.target.value)}
                placeholder="请输入规则值"
                className="input"
              />
              {editingRule.ruleKey === 'safety_stock_coefficient' && (
                <p className="text-xs text-text-muted mt-1">建议范围：0.5 - 2.0</p>
              )}
              {editingRule.ruleKey === 'transfer_urgent_threshold' && (
                <p className="text-xs text-text-muted mt-1">单位：件，低于此值将触发紧急调拨</p>
              )}
              {editingRule.ruleKey === 'customs_congestion_weight' && (
                <p className="text-xs text-text-muted mt-1">建议范围：0.1 - 1.0</p>
              )}
              {editingRule.ruleKey === 'logistics_compensation_max' && (
                <p className="text-xs text-text-muted mt-1">单位：元，物流赔付最高金额</p>
              )}
              {editingRule.ruleKey === 'auto_escalation_hours' && (
                <p className="text-xs text-text-muted mt-1">单位：小时，超时自动升级审批</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                规则描述
              </label>
              <textarea
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                placeholder="请输入规则描述（可选）"
                rows={3}
                className="input resize-none"
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="确认删除"
        width="max-w-md"
        footer={
          <>
            <button onClick={() => setDeleteModal(false)} className="btn btn-secondary">
              取消
            </button>
            <button onClick={handleDeleteFlow} className="btn btn-danger">
              确认删除
            </button>
          </>
        }
      >
        <div className="space-y-4 text-center">
          <AlertTriangle size={48} className="mx-auto text-red" />
          <p className="text-text-secondary">
            确定要删除审批流程 <span className="font-semibold text-red">{editingFlow?.name}</span> 吗？
          </p>
          <p className="text-sm text-text-muted">
            此操作不可撤销，删除后流程配置将无法恢复。
          </p>
        </div>
      </Modal>
    </div>
  );
}
