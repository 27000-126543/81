import { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  Filter,
  RefreshCw,
  Package,
  MapPin,
  CheckCircle,
  X,
  Send,
  ChevronDown,
  FileText,
  Zap,
} from 'lucide-react';
import { getInventoryAlerts, createTransferOrder } from '../../api/inventory';
import DataTable from '../../components/ui/DataTable';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { formatDate, getTransportModeLabel } from '../../utils/format';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { InventoryAlert, Product, Warehouse, TransferOrder } from '../../types';

interface InventoryAlertWithDetails extends InventoryAlert {
  product: Product;
  warehouse: Warehouse;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<InventoryAlertWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState<number[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const [filters, setFilters] = useState({
    type: '',
    severity: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.type) params.type = filters.type;
      if (filters.severity) params.severity = filters.severity;

      const data = await getInventoryAlerts(params);
      setAlerts(data as InventoryAlertWithDetails[]);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.type, filters.severity]);

  const stats = useMemo(() => {
    const high = alerts.filter((a) => a.severity === 'high').length;
    const medium = alerts.filter((a) => a.severity === 'medium').length;
    const low = alerts.filter((a) => a.severity === 'low').length;
    return { high, medium, low };
  }, [alerts]);

  const alertDistribution = useMemo(() => {
    const lowStock = alerts.filter((a) => a.type === 'low_stock').length;
    const overstock = alerts.filter((a) => a.type === 'overstock').length;
    const slowMoving = alerts.filter((a) => a.type === 'slow_moving').length;
    return [
      { name: '库存不足', value: lowStock, color: '#EF4444' },
      { name: '库存积压', value: overstock, color: '#F59E0B' },
      { name: '滞销', value: slowMoving, color: '#64748B' },
    ];
  }, [alerts]);

  const pieChartOption: EChartsOption = {
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
          borderRadius: 8,
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
        data: alertDistribution.map((item) => ({
          value: item.value,
          name: item.name,
          itemStyle: { color: item.color },
        })),
        animationType: 'scale',
        animationDuration: 1500,
      },
    ],
  };

  const getSeverityInfo = (severity: string) => {
    switch (severity) {
      case 'high':
        return { label: '紧急', color: 'red' as const, icon: <AlertTriangle size={14} /> };
      case 'medium':
        return { label: '中等', color: 'amber' as const, icon: <AlertTriangle size={14} /> };
      default:
        return { label: '一般', color: 'muted' as const, icon: <AlertTriangle size={14} /> };
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'low_stock':
        return { label: '库存不足', color: 'red' as const };
      case 'overstock':
        return { label: '库存积压', color: 'amber' as const };
      default:
        return { label: '滞销', color: 'muted' as const };
    }
  };

  const handleSelectAlert = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedAlerts([...selectedAlerts, id]);
    } else {
      setSelectedAlerts(selectedAlerts.filter((aid) => aid !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAlerts(alerts.map((a) => a.id));
    } else {
      setSelectedAlerts([]);
    }
  };

  const handleBatchTransfer = async () => {
    setTransferLoading(true);
    try {
      const selectedAlertItems = alerts.filter((a) => selectedAlerts.includes(a.id));
      if (selectedAlertItems.length === 0) return;

      for (const alert of selectedAlertItems) {
        await createTransferOrder({
          orderNo: `TR${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
          sourceWarehouseId: 1,
          targetWarehouseId: alert.warehouseId,
          transportMode: 'sea',
          estimatedCost: 500,
          estimatedDays: 15,
          items: [
            {
              id: 0,
              transferOrderId: 0,
              productId: alert.productId,
              quantity: Math.max(100, alert.currentStock * 2),
            },
          ],
        });
      }
      setShowTransferModal(false);
      setSelectedAlerts([]);
      showToast(`成功生成 ${selectedAlertItems.length} 张调拨单`, 'success');
      await fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '生成调拨单失败', 'error');
    } finally {
      setTransferLoading(false);
    }
  };

  const columns = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          checked={selectedAlerts.length === alerts.length && alerts.length > 0}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="w-4 h-4 rounded border-border-color bg-bg-card text-cyan focus:ring-cyan"
        />
      ),
      width: '5%',
      render: (row: InventoryAlertWithDetails) => (
        <input
          type="checkbox"
          checked={selectedAlerts.includes(row.id)}
          onChange={(e) => handleSelectAlert(row.id, e.target.checked)}
          className="w-4 h-4 rounded border-border-color bg-bg-card text-cyan focus:ring-cyan"
        />
      ),
    },
    {
      key: 'product',
      title: '商品信息',
      width: '18%',
      render: (row: InventoryAlertWithDetails) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber/20 to-red/20 rounded-lg flex items-center justify-center">
            <Package size={18} className="text-amber" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{row.product?.name}</p>
            <p className="text-xs text-text-muted font-mono">{row.product?.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'warehouse',
      title: '仓库',
      width: '12%',
      render: (row: InventoryAlertWithDetails) => (
        <div className="flex items-center gap-1.5">
          <MapPin size={14} className="text-text-muted" />
          <span className="text-text-secondary">{row.warehouse?.name}</span>
        </div>
      ),
    },
    {
      key: 'type',
      title: '预警类型',
      width: '10%',
      render: (row: InventoryAlertWithDetails) => {
        const type = getTypeInfo(row.type);
        return (
          <StatusBadge
            status={row.type}
            customLabel={type.label}
            customColor={type.color}
          />
        );
      },
    },
    {
      key: 'currentStock',
      title: '当前库存',
      width: '10%',
      className: 'text-right font-mono',
      render: (row: InventoryAlertWithDetails) => (
        <span className={`font-semibold ${row.currentStock === 0 ? 'text-red' : 'text-text-primary'}`}>
          {row.currentStock.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'safetyStock',
      title: '安全库存',
      width: '10%',
      className: 'text-right font-mono',
      render: (row: InventoryAlertWithDetails) => (
        <span className="text-text-secondary">
          {Math.floor((row.product?.declaredValue || 0) * 10).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'severity',
      title: '严重程度',
      width: '10%',
      render: (row: InventoryAlertWithDetails) => {
        const severity = getSeverityInfo(row.severity);
        return (
          <div className="flex items-center gap-1.5">
            {severity.icon}
            <StatusBadge
              status={row.severity}
              customLabel={severity.label}
              customColor={severity.color}
            />
          </div>
        );
      },
    },
    {
      key: 'recommendedAction',
      title: '建议措施',
      width: '18%',
      render: (row: InventoryAlertWithDetails) => (
        <div className="flex items-start gap-2">
          <Zap size={14} className="text-cyan mt-0.5 flex-shrink-0" />
          <span className="text-sm text-text-secondary line-clamp-2">{row.recommendedAction}</span>
        </div>
      ),
    },
    {
      key: 'action',
      title: '操作',
      width: '7%',
      render: (row: InventoryAlertWithDetails) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedAlerts([row.id]);
              setShowTransferModal(true);
            }}
            className="btn btn-cyan px-2 py-1 text-xs"
            title="生成调拨单"
          >
            <Send size={14} />
          </button>
        </div>
      ),
    },
  ];

  const statCards = [
    {
      title: '紧急预警',
      value: stats.high,
      color: 'from-red/20 to-red/5',
      iconBg: 'bg-red/20 text-red',
      icon: <AlertTriangle size={24} />,
      suffix: '条',
    },
    {
      title: '中等预警',
      value: stats.medium,
      color: 'from-amber/20 to-amber/5',
      iconBg: 'bg-amber/20 text-amber',
      icon: <AlertTriangle size={24} />,
      suffix: '条',
    },
    {
      title: '一般预警',
      value: stats.low,
      color: 'from-muted/20 to-muted/5',
      iconBg: 'bg-bg-hover text-text-muted',
      icon: <AlertTriangle size={24} />,
      suffix: '条',
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
          <h1 className="text-2xl font-bold text-text-primary">库存预警</h1>
          <p className="text-text-muted text-sm mt-1">
            智能监控库存异常，及时预警并提供优化建议
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedAlerts.length > 0 && (
            <button
              onClick={() => setShowTransferModal(true)}
              className="btn btn-cyan"
            >
              <FileText size={16} />
              一键生成调拨单 ({selectedAlerts.length})
            </button>
          )}
          <button onClick={fetchData} className="btn btn-primary">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      <div className="card bg-bg-dark/80 backdrop-blur-sm border-cyan/30">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-text-muted" />
            <span className="text-sm text-text-secondary">预警类型</span>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="input-select w-32"
            >
              <option value="">全部</option>
              <option value="low_stock">库存不足</option>
              <option value="overstock">库存积压</option>
              <option value="slow_moving">滞销</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-text-muted" />
            <span className="text-sm text-text-secondary">严重程度</span>
            <select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              className="input-select w-32"
            >
              <option value="">全部</option>
              <option value="high">紧急</option>
              <option value="medium">中等</option>
              <option value="low">一般</option>
            </select>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setFilters({ type: '', severity: '' })}
            className="btn btn-secondary"
          >
            <X size={14} />
            重置
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`stat-card bg-gradient-to-br ${card.color} hover:scale-[1.02] transition-transform duration-300`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${card.iconBg}`}>
                {card.icon}
              </div>
              <div>
                <p className="text-text-muted text-xs mb-1">{card.title}</p>
                <h3 className="text-2xl font-bold text-text-primary font-mono">
                  <AnimatedNumber
                    value={card.value}
                    duration={1500}
                    suffix={card.suffix}
                  />
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <PieChartIcon size={18} className="text-cyan" />
              预警类型分布
            </h3>
          </div>
          <ReactECharts option={pieChartOption} style={{ height: 280 }} />
        </div>

        <div className="card lg:col-span-2 card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber" />
              预警列表
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red rounded-full" /> 紧急
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-amber rounded-full" /> 中等
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-text-muted rounded-full" /> 一般
              </span>
            </div>
          </div>
          <DataTable
            columns={columns as any}
            data={alerts as any[]}
            loading={loading}
            total={alerts.length}
            page={1}
            pageSize={alerts.length}
            showPagination={false}
            rowKey="id"
          />
        </div>
      </div>

      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="生成调拨单"
        width="max-w-3xl"
        footer={
          <>
            <button
              onClick={() => setShowTransferModal(false)}
              className="btn btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleBatchTransfer}
              disabled={transferLoading || selectedAlerts.length === 0}
              className="btn btn-cyan"
            >
              {transferLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  确认生成 {selectedAlerts.length} 张调拨单
                </>
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-cyan/10 border border-cyan/30 rounded-lg">
            <p className="text-sm text-cyan">
              将为选中的 {selectedAlerts.length} 条预警记录生成调拨单，系统将自动推荐最优运输方案。
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2">
            {alerts
              .filter((a) => selectedAlerts.includes(a.id))
              .map((alert) => {
                const type = getTypeInfo(alert.type);
                return (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 bg-bg-card rounded-lg border border-border-color"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-cyan/20 rounded-lg flex items-center justify-center">
                        <Package size={14} className="text-cyan" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary text-sm">
                          {alert.product?.name}
                        </p>
                        <p className="text-xs text-text-muted">
                          {alert.warehouse?.name} · {alert.product?.sku}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge
                        status={alert.type}
                        customLabel={type.label}
                        customColor={type.color}
                        size="sm"
                      />
                      <span className="text-sm font-mono text-text-secondary">
                        当前库存: {alert.currentStock}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-2">运输方式</label>
              <select className="input-select w-full">
                <option value="sea">{getTransportModeLabel('sea')}</option>
                <option value="air">{getTransportModeLabel('air')}</option>
                <option value="rail">{getTransportModeLabel('rail')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">预计到货天数</label>
              <input
                type="number"
                defaultValue={15}
                className="input w-full"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PieChartIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}
