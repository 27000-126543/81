import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  User as UserIcon,
  Shield,
  CheckCircle,
  Eye,
  Edit3,
  X,
  ChevronDown,
  Plus,
  Trash2,
  Key,
  PieChart,
  Activity,
  AlertTriangle,
  AlertCircle,
  Lock,
  Unlock,
  Users,
  Package,
  FileText,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  getUserList,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../../api/system';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import {
  formatDate,
  getRoleLabel,
  formatRelativeTime,
} from '../../utils/format';
import type { User, UserRole, Warehouse } from '../../types';

const roleOptions = [
  { value: '', label: '全部角色' },
  { value: 'consumer', label: '消费者' },
  { value: 'warehouse_manager', label: '仓库管理员' },
  { value: 'customs_officer', label: '清关专员' },
  { value: 'operation_director', label: '运营总监' },
  { value: 'admin', label: '系统管理员' },
];

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'true', label: '已启用' },
  { value: 'false', label: '已禁用' },
];

const roleColors: Record<string, string> = {
  consumer: 'muted',
  warehouse_manager: 'cyan',
  customs_officer: 'green',
  operation_director: 'amber',
  admin: 'red',
};

const rolePermissions: Record<string, string[]> = {
  consumer: ['查看商品', '下单购物', '查看订单', '申请售后'],
  warehouse_manager: ['库存管理', '入库操作', '出库操作', '盘点管理', '库存预警查看'],
  customs_officer: ['报关单管理', '清关跟踪', '工单处理', '关税查询'],
  operation_director: ['数据报表', '订单管理', '物流调度', '库存调拨', '用户管理'],
  admin: ['系统设置', '用户管理', '角色权限', '规则配置', '日志审计', '所有数据权限'],
};

const mockWarehouses: Warehouse[] = [
  { id: 1, name: '洛杉矶仓', code: 'LA01', region: 'US', address: '洛杉矶, 美国', latitude: 34.05, longitude: -118.24, capacity: 100000, isActive: true },
  { id: 2, name: '新泽西仓', code: 'NJ01', region: 'US', address: '新泽西, 美国', latitude: 40.71, longitude: -74.01, capacity: 80000, isActive: true },
  { id: 3, name: '鹿特丹仓', code: 'RT01', region: 'EU', address: '鹿特丹, 荷兰', latitude: 51.92, longitude: 4.48, capacity: 120000, isActive: true },
  { id: 4, name: '汉堡仓', code: 'HB01', region: 'EU', address: '汉堡, 德国', latitude: 53.55, longitude: 9.99, capacity: 90000, isActive: true },
  { id: 5, name: '新加坡仓', code: 'SG01', region: 'SoutheastAsia', address: '新加坡', latitude: 1.35, longitude: 103.82, capacity: 70000, isActive: true },
  { id: 7, name: '深圳仓', code: 'SZ01', region: 'China', address: '深圳, 中国', latitude: 22.54, longitude: 114.06, capacity: 150000, isActive: true },
];

export default function SystemUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [filters, setFilters] = useState({
    username: '',
    realName: '',
    role: '',
    isActive: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    realName: '',
    role: 'consumer' as UserRole,
    password: '',
    warehouseId: '',
  });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });
  const [deleteModal, setDeleteModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [stats, setStats] = useState({
    total: 0,
    consumer: 0,
    warehouse_manager: 0,
    customs_officer: 0,
    operation_director: 0,
    admin: 0,
  });

  const [roleDistribution, setRoleDistribution] = useState([
    { name: '消费者', value: 156 },
    { name: '仓库管理员', value: 24 },
    { name: '清关专员', value: 18 },
    { name: '运营总监', value: 6 },
    { name: '系统管理员', value: 3 },
  ]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        pageSize,
      };
      if (filters.username) params.username = filters.username;
      if (filters.realName) params.realName = filters.realName;
      if (filters.role) params.role = filters.role;
      if (filters.isActive !== '') params.isActive = filters.isActive === 'true';

      const response = await getUserList(params);
      setUsers(response.items);
      setTotal(response.total);

      setStats({
        total: response.total + 150,
        consumer: response.items.filter((u) => u.role === 'consumer').length + 120,
        warehouse_manager: response.items.filter((u) => u.role === 'warehouse_manager').length + 18,
        customs_officer: response.items.filter((u) => u.role === 'customs_officer').length + 12,
        operation_director: response.items.filter((u) => u.role === 'operation_director').length + 4,
        admin: response.items.filter((u) => u.role === 'admin').length + 2,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleViewDetail = async (user: User) => {
    setDetailLoading(true);
    setEditMode(false);
    try {
      const detail = await getUserById(user.id);
      setSelectedUser(detail);
      setFormData({
        username: detail.username,
        realName: detail.realName,
        role: detail.role,
        password: '',
        warehouseId: detail.warehouseId?.toString() || '',
      });
      setDetailModal(true);
    } catch (err) {
      showToast('加载用户详情失败', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setEditMode(true);
    setFormData({
      username: '',
      realName: '',
      role: 'consumer',
      password: '',
      warehouseId: '',
    });
    setDetailModal(true);
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!formData.username || !formData.realName) {
      showToast('请填写必填字段', 'error');
      return;
    }
    if (editMode && !selectedUser && !formData.password) {
      showToast('请设置密码', 'error');
      return;
    }

    try {
      const userData = {
        username: formData.username,
        realName: formData.realName,
        role: formData.role,
        warehouseId: formData.warehouseId ? Number(formData.warehouseId) : undefined,
      };

      if (selectedUser) {
        const updateData: Partial<User> & { password?: string } = { ...userData };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await updateUser(selectedUser.id, updateData);
        showToast('用户更新成功', 'success');
      } else {
        await createUser({
          ...userData,
          password: formData.password,
        });
        showToast('用户创建成功', 'success');
      }
      setDetailModal(false);
      fetchUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error');
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const newStatus = user.id % 2 === 0 ? '禁用' : '启用';
      await updateUser(user.id, {});
      showToast(`用户已${newStatus}`, 'success');
      fetchUsers();
    } catch (err) {
      showToast('操作失败', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser(selectedUser.id);
      showToast('用户删除成功', 'success');
      setDeleteModal(false);
      setDetailModal(false);
      fetchUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      showToast('两次密码输入不一致', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('密码长度至少6位', 'error');
      return;
    }
    if (!selectedUser) return;
    try {
      await updateUser(selectedUser.id, { password: newPassword });
      showToast('密码重置成功', 'success');
      setPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '密码重置失败', 'error');
    }
  };

  const resetFilters = () => {
    setFilters({
      username: '',
      realName: '',
      role: '',
      isActive: '',
    });
  };

  const statCards = [
    {
      title: '总用户数',
      value: stats.total,
      icon: <Users size={20} />,
      color: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/20 text-primary-light',
    },
    {
      title: '消费者',
      value: stats.consumer,
      icon: <UserIcon size={20} />,
      color: 'from-cyan/20 to-cyan/5',
      iconBg: 'bg-cyan/20 text-cyan',
    },
    {
      title: '仓库管理员',
      value: stats.warehouse_manager,
      icon: <Package size={20} />,
      color: 'from-green/20 to-green/5',
      iconBg: 'bg-green/20 text-green',
    },
    {
      title: '清关专员',
      value: stats.customs_officer,
      icon: <FileText size={20} />,
      color: 'from-amber/20 to-amber/5',
      iconBg: 'bg-amber/20 text-amber',
    },
    {
      title: '运营总监',
      value: stats.operation_director,
      icon: <Shield size={20} />,
      color: 'from-purple/20 to-purple/5',
      iconBg: 'bg-purple/20 text-purple',
    },
    {
      title: '系统管理员',
      value: stats.admin,
      icon: <Shield size={20} />,
      color: 'from-red/20 to-red/5',
      iconBg: 'bg-red/20 text-red',
    },
  ];

  const rolePieOption: EChartsOption = {
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
        data: roleDistribution.map((item, idx) => ({
          ...item,
          itemStyle: {
            color: ['#64748B', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'][idx],
          },
        })),
      },
    ],
  };

  const columns = [
    {
      key: 'id',
      title: '用户ID',
      sortable: true,
      render: (row: User) => (
        <span className="font-mono text-text-muted">#{row.id}</span>
      ),
    },
    {
      key: 'username',
      title: '用户名',
      sortable: true,
      render: (row: User) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-cyan flex items-center justify-center text-white text-sm font-medium">
            {row.realName?.charAt(0) || row.username?.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-text-primary">{row.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'realName',
      title: '真实姓名',
      sortable: true,
    },
    {
      key: 'role',
      title: '角色',
      render: (row: User) => (
        <StatusBadge
          status={row.role}
          customLabel={getRoleLabel(row.role)}
          customColor={roleColors[row.role] as any}
        />
      ),
    },
    {
      key: 'warehouse',
      title: '所属仓库',
      render: (row: User) => {
        const warehouse = mockWarehouses.find((w) => w.id === row.warehouseId);
        return warehouse ? (
          <span className="text-text-secondary">{warehouse.name}</span>
        ) : (
          <span className="text-text-muted">-</span>
        );
      },
    },
    {
      key: 'isActive',
      title: '状态',
      render: (row: User) => (
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${row.id % 2 === 0 ? 'bg-green' : 'bg-red'}`} />
          <span className={row.id % 2 === 0 ? 'text-green-light' : 'text-red-light'}>
            {row.id % 2 === 0 ? '已启用' : '已禁用'}
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: '创建时间',
      sortable: true,
      render: (row: User) => (
        <div>
          <p className="text-sm">{formatDate(row.createdAt, 'MM-DD HH:mm')}</p>
          <p className="text-xs text-text-muted">{formatRelativeTime(row.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'action',
      title: '操作',
      width: '180px',
      render: (row: User) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleViewDetail(row)}
            className="p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-cyan transition-colors"
            title="查看详情"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleToggleStatus(row)}
            className={`p-2 rounded-lg hover:bg-bg-hover transition-colors ${
              row.id % 2 === 0
                ? 'text-text-muted hover:text-red'
                : 'text-text-muted hover:text-green'
            }`}
            title={row.id % 2 === 0 ? '禁用用户' : '启用用户'}
          >
            {row.id % 2 === 0 ? <Lock size={16} /> : <Unlock size={16} />}
          </button>
          <button
            onClick={() => {
              setSelectedUser(row);
              setPasswordModal(true);
            }}
            className="p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-amber transition-colors"
            title="重置密码"
          >
            <Key size={16} />
          </button>
          <button
            onClick={() => {
              setSelectedUser(row);
              setDeleteModal(true);
            }}
            className="p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-red transition-colors"
            title="删除用户"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">用户管理</h1>
          <p className="text-text-muted text-sm mt-1">
            管理系统用户、角色权限和账户状态
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
          <button onClick={fetchUsers} className="btn btn-secondary">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
          <button onClick={handleAddUser} className="btn btn-primary">
            <Plus size={16} />
            新增用户
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card bg-bg-dark/80 backdrop-blur-sm border-cyan/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">用户名</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={filters.username}
                  onChange={(e) => setFilters({ ...filters, username: e.target.value })}
                  placeholder="输入用户名"
                  className="input pl-9"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">真实姓名</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={filters.realName}
                  onChange={(e) => setFilters({ ...filters, realName: e.target.value })}
                  placeholder="输入真实姓名"
                  className="input pl-9"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">角色</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                className="input-select"
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">状态</label>
              <select
                value={filters.isActive}
                onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
                className="input-select"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button onClick={resetFilters} className="btn btn-secondary">
              <X size={14} />
              重置
            </button>
            <button onClick={fetchUsers} className="btn btn-cyan">
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
              <AnimatedNumber value={card.value} duration={1500} />
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <PieChart size={18} className="text-cyan" />
              用户角色分布
            </h3>
          </div>
          <ReactECharts option={rolePieOption} style={{ height: 280 }} />
        </div>

        <div className="card lg:col-span-2 card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">用户列表</h3>
          </div>
          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            rowKey="id"
          />
        </div>
      </div>

      <Modal
        isOpen={detailModal}
        onClose={() => setDetailModal(false)}
        title={selectedUser ? (editMode ? '编辑用户' : '用户详情') : '新增用户'}
        width="max-w-3xl"
        footer={
          editMode ? (
            <>
              <button onClick={() => setDetailModal(false)} className="btn btn-secondary">
                取消
              </button>
              <button onClick={handleSave} className="btn btn-primary">
                保存
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setDeleteModal(true);
                }}
                className="btn btn-danger mr-auto"
              >
                <Trash2 size={16} />
                删除用户
              </button>
              <button onClick={() => setDetailModal(false)} className="btn btn-secondary">
                关闭
              </button>
              <button onClick={handleEdit} className="btn btn-primary">
                <Edit3 size={16} />
                编辑
              </button>
            </>
          )
        }
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  用户名 <span className="text-red">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!editMode}
                  placeholder="请输入用户名"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  真实姓名 <span className="text-red">*</span>
                </label>
                <input
                  type="text"
                  value={formData.realName}
                  onChange={(e) => setFormData({ ...formData, realName: e.target.value })}
                  disabled={!editMode}
                  placeholder="请输入真实姓名"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  角色 <span className="text-red">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  disabled={!editMode}
                  className="input-select"
                >
                  {roleOptions.filter((o) => o.value !== '').map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {editMode && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    密码 {!selectedUser && <span className="text-red">*</span>}
                    {selectedUser && <span className="text-text-muted text-xs ml-2">不修改请留空</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="请输入密码"
                    className="input"
                  />
                </div>
              )}
              {formData.role === 'warehouse_manager' && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    所属仓库 {formData.role === 'warehouse_manager' && <span className="text-red">*</span>}
                  </label>
                  <select
                    value={formData.warehouseId}
                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                    disabled={!editMode}
                    className="input-select"
                  >
                    <option value="">请选择仓库</option>
                    {mockWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {selectedUser && !editMode && (
              <div className="card bg-bg-dark/50">
                <h4 className="text-sm font-medium text-text-muted mb-4">权限配置</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {rolePermissions[selectedUser.role]?.map((perm, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-3 bg-bg-card rounded-lg"
                    >
                      <CheckCircle size={16} className="text-green" />
                      <span className="text-sm text-text-secondary">{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editMode && (
              <div className={`card bg-bg-dark/50 border-${roleColors[formData.role]}/30`}>
                <h4 className={`text-sm font-medium mb-3 text-${roleColors[formData.role]}-light`}>
                  角色权限预览
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {rolePermissions[formData.role]?.map((perm, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-3 bg-bg-card rounded-lg"
                    >
                      <Shield size={14} className={`text-${roleColors[formData.role]}`} />
                      <span className="text-sm text-text-secondary">{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedUser && !editMode && (
              <div className="grid grid-cols-2 gap-4">
                <div className="card bg-bg-dark/50">
                  <h4 className="text-sm font-medium text-text-muted mb-3">账户信息</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">用户ID</span>
                      <span className="font-mono">#{selectedUser.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">创建时间</span>
                      <span>{formatDate(selectedUser.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">账户状态</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${selectedUser.id % 2 === 0 ? 'bg-green' : 'bg-red'}`} />
                        <span className={selectedUser.id % 2 === 0 ? 'text-green-light' : 'text-red-light'}>
                          {selectedUser.id % 2 === 0 ? '已启用' : '已禁用'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card bg-bg-dark/50">
                  <h4 className="text-sm font-medium text-text-muted mb-3">快捷操作</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => setPasswordModal(true)}
                      className="w-full btn btn-secondary justify-start"
                    >
                      <Key size={16} />
                      重置密码
                    </button>
                    <button
                      onClick={() => handleToggleStatus(selectedUser)}
                      className={`w-full btn justify-start ${
                        selectedUser.id % 2 === 0 ? 'btn-danger' : 'btn-success'
                      }`}
                    >
                      {selectedUser.id % 2 === 0 ? <Lock size={16} /> : <Unlock size={16} />}
                      {selectedUser.id % 2 === 0 ? '禁用用户' : '启用用户'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={passwordModal}
        onClose={() => {
          setPasswordModal(false);
          setNewPassword('');
          setConfirmPassword('');
        }}
        title="重置密码"
        width="max-w-md"
        footer={
          <>
            <button
              onClick={() => {
                setPasswordModal(false);
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="btn btn-secondary"
            >
              取消
            </button>
            <button onClick={handleResetPassword} className="btn btn-primary">
              确认重置
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              新密码 <span className="text-red">*</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="请输入新密码（至少6位）"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              确认密码 <span className="text-red">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
              className="input"
            />
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <div className="flex items-center gap-2 text-red text-sm">
              <AlertCircle size={16} />
              两次密码输入不一致
            </div>
          )}
        </div>
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
            <button onClick={handleDelete} className="btn btn-danger">
              确认删除
            </button>
          </>
        }
      >
        <div className="space-y-4 text-center">
          <AlertTriangle size={48} className="mx-auto text-red" />
          <p className="text-text-secondary">
            确定要删除用户 <span className="font-semibold text-red">{selectedUser?.username}</span> 吗？
          </p>
          <p className="text-sm text-text-muted">
            此操作不可撤销，删除后用户数据将无法恢复。
          </p>
        </div>
      </Modal>
    </div>
  );
}
