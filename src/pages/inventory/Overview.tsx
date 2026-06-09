import { useEffect, useState, useMemo } from 'react';
import {
  Package,
  Layers,
  DollarSign,
  Activity,
  Filter,
  Search,
  ChevronDown,
  X,
  RefreshCw,
  Eye,
  TrendingUp,
  MapPin,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { getInventoryList } from '../../api/inventory';
import DataTable from '../../components/ui/DataTable';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/format';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { Inventory, Warehouse, Product } from '../../types';

interface InventoryWithDetails extends Inventory {
  product: Product;
  warehouse: Warehouse;
}

export default function Overview() {
  const [inventoryList, setInventoryList] = useState<InventoryWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    warehouseId: '',
    category: '',
    sku: '',
    status: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        pageSize,
      };
      if (filters.warehouseId) params.warehouseId = Number(filters.warehouseId);
      if (filters.sku) params.sku = filters.sku;
      if (filters.status) params.status = filters.status;

      const response = await getInventoryList(params);
      setInventoryList(response.items as InventoryWithDetails[]);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, filters.warehouseId, filters.status]);

  const stats = useMemo(() => {
    const uniqueSkus = new Set(inventoryList.map((item) => item.productId)).size;
    const totalQuantity = inventoryList.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = inventoryList.reduce(
      (sum, item) => sum + item.quantity * (item.product?.declaredValue || 0),
      0
    );

    const healthyItems = inventoryList.filter(
      (item) => item.quantity >= item.safetyStock && item.quantity > 0
    ).length;
    const healthScore = inventoryList.length > 0
      ? Math.round((healthyItems / inventoryList.length) * 100)
      : 0;

    return {
      totalSkus: uniqueSkus,
      totalQuantity,
      totalValue,
      healthScore,
    };
  }, [inventoryList]);

  const warehouseDistribution = useMemo(() => {
    const map = new Map<number, { name: string; quantity: number }>();
    inventoryList.forEach((item) => {
      if (!item.warehouse) return;
      const existing = map.get(item.warehouseId) || {
        name: item.warehouse.name,
        quantity: 0,
      };
      existing.quantity += item.quantity;
      map.set(item.warehouseId, existing);
    });
    return Array.from(map.values());
  }, [inventoryList]);

  const turnoverTrendData = useMemo(() => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
    return months.map((month, idx) => ({
      month,
      rate: 75 + Math.random() * 20,
    }));
  }, []);

  const warehouseChartOption: EChartsOption = {
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
        data: warehouseDistribution.map((item, idx) => ({
          value: item.quantity,
          name: item.name,
          itemStyle: {
            color: ['#06B6D4', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'][idx % 7],
          },
        })),
        animationType: 'scale',
        animationDuration: 1500,
      },
    ],
  };

  const turnoverChartOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#F8FAFC' },
      axisPointer: { type: 'cross' },
      formatter: '{b}<br/>周转率: {c}%',
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
      boundaryGap: false,
      data: turnoverTrendData.map((item) => item.month),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748B', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '周转率(%)',
      nameTextStyle: { color: '#64748B' },
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748B', fontSize: 11 },
      splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        data: turnoverTrendData.map((item) => item.rate.toFixed(1)),
        lineStyle: { color: '#06B6D4', width: 3 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(6, 182, 212, 0.4)' },
              { offset: 1, color: 'rgba(6, 182, 212, 0.02)' },
            ],
          },
        },
        itemStyle: { color: '#06B6D4', borderColor: '#0F172A', borderWidth: 2 },
      },
    ],
    animationDuration: 1500,
  };

  const getInventoryStatus = (item: InventoryWithDetails) => {
    if (item.quantity === 0) return { status: 'out_of_stock', label: '缺货', color: 'red' };
    if (item.quantity < item.safetyStock) return { status: 'low_stock', label: '库存不足', color: 'amber' };
    if (item.quantity > item.safetyStock * 3) return { status: 'overstock', label: '库存积压', color: 'muted' };
    return { status: 'normal', label: '正常', color: 'green' };
  };

  const columns = [
    {
      key: 'product',
      title: '商品信息',
      width: '20%',
      render: (row: InventoryWithDetails) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-cyan/20 rounded-lg flex items-center justify-center">
            <Package size={18} className="text-cyan" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{row.product?.name}</p>
            <p className="text-xs text-text-muted font-mono">{row.product?.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      title: '类别',
      width: '10%',
      render: (row: InventoryWithDetails) => (
        <span className="text-text-secondary">{row.product?.category}</span>
      ),
    },
    {
      key: 'warehouse',
      title: '仓库',
      width: '12%',
      render: (row: InventoryWithDetails) => (
        <div className="flex items-center gap-1.5">
          <MapPin size={14} className="text-text-muted" />
          <span className="text-text-secondary">{row.warehouse?.name}</span>
        </div>
      ),
    },
    {
      key: 'quantity',
      title: '当前库存',
      width: '10%',
      className: 'text-right font-mono',
      render: (row: InventoryWithDetails) => (
        <span className="font-semibold">{row.quantity.toLocaleString()}</span>
      ),
    },
    {
      key: 'reservedQuantity',
      title: '已预留',
      width: '8%',
      className: 'text-right font-mono',
      render: (row: InventoryWithDetails) => (
        <span className="text-text-muted">{row.reservedQuantity.toLocaleString()}</span>
      ),
    },
    {
      key: 'safetyStock',
      title: '安全库存',
      width: '10%',
      className: 'text-right font-mono',
      render: (row: InventoryWithDetails) => (
        <span className="text-text-secondary">{row.safetyStock.toLocaleString()}</span>
      ),
    },
    {
      key: 'value',
      title: '库存价值',
      width: '10%',
      className: 'text-right font-mono',
      render: (row: InventoryWithDetails) => (
        <span className="text-cyan">
          {formatCurrency(row.quantity * (row.product?.declaredValue || 0), 'USD', 0)}
        </span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: '10%',
      render: (row: InventoryWithDetails) => {
        const status = getInventoryStatus(row);
        return (
          <StatusBadge
            status={status.status}
            customLabel={status.label}
            customColor={status.color as 'green' | 'amber' | 'red' | 'muted'}
          />
        );
      },
    },
    {
      key: 'lastUpdated',
      title: '最后更新',
      width: '10%',
      render: (row: InventoryWithDetails) => (
        <span className="text-text-muted text-xs">{formatDate(row.lastUpdated, 'MM-DD HH:mm')}</span>
      ),
    },
    {
      key: 'action',
      title: '操作',
      width: '8%',
      render: () => (
        <button className="btn btn-secondary px-2 py-1 text-xs">
          <Eye size={14} />
          详情
        </button>
      ),
    },
  ];

  const statCards = [
    {
      title: '总SKU数',
      value: stats.totalSkus,
      icon: <Layers size={24} />,
      color: 'from-cyan/20 to-cyan/5',
      iconBg: 'bg-cyan/20 text-cyan',
      suffix: '个',
    },
    {
      title: '总库存数量',
      value: stats.totalQuantity,
      icon: <Package size={24} />,
      color: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/20 text-primary-light',
      suffix: '件',
    },
    {
      title: '库存总价值',
      value: stats.totalValue,
      icon: <DollarSign size={24} />,
      color: 'from-green/20 to-green/5',
      iconBg: 'bg-green/20 text-green',
      prefix: '$',
      formatFn: (v: number) => formatCurrency(v, 'USD', 0),
    },
    {
      title: '库存健康度',
      value: stats.healthScore,
      icon: <Activity size={24} />,
      color: stats.healthScore >= 80 ? 'from-green/20 to-green/5' : stats.healthScore >= 60 ? 'from-amber/20 to-amber/5' : 'from-red/20 to-red/5',
      iconBg: stats.healthScore >= 80 ? 'bg-green/20 text-green' : stats.healthScore >= 60 ? 'bg-amber/20 text-amber' : 'bg-red/20 text-red',
      suffix: '%',
    },
  ];

  const categories = ['电子产品', '服装鞋帽', '家居用品', '美妆护肤', '食品饮料', '母婴用品'];

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">库存总览</h1>
          <p className="text-text-muted text-sm mt-1">
            实时监控全球仓库库存状态，智能预警与优化建议
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary"
          >
            <Filter size={16} />
            筛选
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
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
              <MapPin size={16} className="text-text-muted" />
              <span className="text-sm text-text-secondary">仓库</span>
              <select
                value={filters.warehouseId}
                onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
                className="input-select w-36"
              >
                <option value="">全部仓库</option>
                <option value="1">洛杉矶仓</option>
                <option value="2">新泽西仓</option>
                <option value="3">鹿特丹仓</option>
                <option value="4">汉堡仓</option>
                <option value="5">新加坡仓</option>
                <option value="6">曼谷仓</option>
                <option value="7">深圳仓</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Package size={16} className="text-text-muted" />
              <span className="text-sm text-text-secondary">类别</span>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="input-select w-32"
              >
                <option value="">全部类别</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Search size={16} className="text-text-muted" />
              <span className="text-sm text-text-secondary">SKU</span>
              <input
                type="text"
                value={filters.sku}
                onChange={(e) => setFilters({ ...filters, sku: e.target.value })}
                placeholder="输入SKU搜索"
                className="input w-40"
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              />
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-text-muted" />
              <span className="text-sm text-text-secondary">状态</span>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="input-select w-32"
              >
                <option value="">全部状态</option>
                <option value="normal">正常</option>
                <option value="low_stock">库存不足</option>
                <option value="overstock">库存积压</option>
                <option value="out_of_stock">缺货</option>
              </select>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => {
                setFilters({ warehouseId: '', category: '', sku: '', status: '' });
                setPage(1);
              }}
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                prefix={card.prefix}
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
              <MapPin size={18} className="text-cyan" />
              各仓库库存分布
            </h3>
          </div>
          <ReactECharts option={warehouseChartOption} style={{ height: 280 }} />
        </div>

        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <TrendingUp size={18} className="text-green" />
              库存周转率趋势
            </h3>
            <div className="text-xs text-text-muted">近6个月</div>
          </div>
          <ReactECharts option={turnoverChartOption} style={{ height: 280 }} />
        </div>
      </div>

      <div className="card card-hover">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Layers size={18} className="text-primary-light" />
            库存明细列表
          </h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <CheckCircle size={12} className="text-green" /> 正常
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle size={12} className="text-amber" /> 库存不足
            </span>
            <span className="flex items-center gap-1">
              <X size={12} className="text-red" /> 缺货
            </span>
          </div>
        </div>
        <DataTable
          columns={columns as any}
          data={inventoryList as any[]}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          rowKey="id"
        />
      </div>
    </div>
  );
}
