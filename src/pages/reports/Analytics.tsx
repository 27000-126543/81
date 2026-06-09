import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Warehouse,
  Truck,
  MapPin,
  Filter,
  X,
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  DollarSign,
  Package,
  Clock,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  PieChart,
  LineChart,
  ChevronDown,
  Check,
  Loader2,
  Layers,
  ShoppingCart,
  Gauge,
  Activity,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import {
  formatDate,
  formatCurrency,
  formatPercent,
  formatDuration,
} from '../../utils/format';
import {
  getSupplyChainMetrics,
  getInventoryReport,
  getOrderReport,
  getCustomsReport,
  getLogisticsReport,
  exportReport,
} from '../../api/reports';
import type { SupplyChainMetrics } from '../../types';

type TabType = 'supply-chain' | 'inventory' | 'orders' | 'customs' | 'logistics';

interface FilterState {
  timeRange: string;
  startDate: string;
  endDate: string;
  warehouses: string[];
  transportModes: string[];
  destinations: string[];
}

interface ExportState {
  showConfirm: boolean;
  showProgress: boolean;
  progress: number;
  format: 'xlsx' | 'pdf' | null;
}

const warehouses = [
  { id: '1', name: '洛杉矶仓' },
  { id: '2', name: '新泽西仓' },
  { id: '3', name: '鹿特丹仓' },
  { id: '4', name: '汉堡仓' },
  { id: '5', name: '新加坡仓' },
  { id: '6', name: '曼谷仓' },
  { id: '7', name: '深圳仓' },
];

const transportModes = [
  { id: 'sea', name: '海运' },
  { id: 'air', name: '空运' },
  { id: 'rail', name: '铁路' },
];

const destinations = [
  { id: 'US', name: '美国' },
  { id: 'EU', name: '欧洲' },
  { id: 'SoutheastAsia', name: '东南亚' },
  { id: 'China', name: '中国' },
];

const timeRanges = [
  { id: '7days', name: '近7天' },
  { id: '30days', name: '近30天' },
  { id: '90days', name: '近90天' },
  { id: '1year', name: '近1年' },
  { id: 'custom', name: '自定义' },
];

type InventoryItem = Awaited<ReturnType<typeof getInventoryReport>>[number];
type OrderItem = Awaited<ReturnType<typeof getOrderReport>>[number];
type CustomsItem = Awaited<ReturnType<typeof getCustomsReport>>[number];
type LogisticsItem = Awaited<ReturnType<typeof getLogisticsReport>>[number];

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<TabType>('supply-chain');
  const [showFilters, setShowFilters] = useState(true);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    timeRange: '30days',
    startDate: '',
    endDate: '',
    warehouses: [],
    transportModes: [],
    destinations: [],
  });

  const [exportState, setExportState] = useState<ExportState>({
    showConfirm: false,
    showProgress: false,
    progress: 0,
    format: null,
  });

  const [supplyChainData, setSupplyChainData] = useState<SupplyChainMetrics[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [orderData, setOrderData] = useState<OrderItem[]>([]);
  const [customsData, setCustomsData] = useState<CustomsItem[]>([]);
  const [logisticsData, setLogisticsData] = useState<LogisticsItem[]>([]);

  const getDateRange = () => {
    const today = new Date();
    let startDate = '';
    let endDate = today.toISOString().split('T')[0];

    switch (filters.timeRange) {
      case '7days':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '30days':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '90days':
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '1year':
        startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'custom':
        startDate = filters.startDate;
        endDate = filters.endDate;
        break;
      default:
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    return { startDate, endDate };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const warehouseId = filters.warehouses.length > 0 ? Number(filters.warehouses[0]) : undefined;
      const carrier = filters.transportModes.length > 0 ? filters.transportModes[0] : undefined;

      const [sc, inv, ord, cst, log] = await Promise.all([
        getSupplyChainMetrics({ startDate, endDate }),
        getInventoryReport({ warehouseId }),
        getOrderReport({ period: filters.timeRange, warehouseId }),
        getCustomsReport({ period: filters.timeRange }),
        getLogisticsReport({ period: filters.timeRange, carrier }),
      ]);

      setSupplyChainData(sc);
      setInventoryData(inv);
      setOrderData(ord);
      setCustomsData(cst);
      setLogisticsData(log);
    } catch (err) {
      console.error('Failed to fetch report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.timeRange, filters.startDate, filters.endDate, filters.warehouses, filters.transportModes, filters.destinations]);

  const summaryMetrics = useMemo(() => {
    if (supplyChainData.length === 0) {
      return {
        totalOrders: 0,
        fulfillmentRate: 0,
        avgDeliveryDays: 0,
        totalTransportCost: 0,
        totalCustomsTax: 0,
        totalCompensation: 0,
        inventoryTurnover: 0,
        returnRate: 0,
      };
    }

    const totalOrders = supplyChainData.reduce((sum, item) => sum + item.totalOrders, 0);
    const totalFulfilled = supplyChainData.reduce((sum, item) => sum + item.fulfilledOrders, 0);
    const totalTransportCost = supplyChainData.reduce((sum, item) => sum + item.totalTransportCost, 0);
    const totalCustomsTax = supplyChainData.reduce((sum, item) => sum + item.totalCustomsTax, 0);
    const totalCompensation = supplyChainData.reduce((sum, item) => sum + item.totalCompensation, 0);
    const avgDeliveryDays = supplyChainData.reduce((sum, item) => sum + item.avgDeliveryDays, 0) / supplyChainData.length;
    const inventoryTurnover = supplyChainData.reduce((sum, item) => sum + item.inventoryTurnover, 0) / supplyChainData.length;
    const returnRate = supplyChainData.reduce((sum, item) => sum + item.returnRate, 0) / supplyChainData.length;

    return {
      totalOrders,
      fulfillmentRate: totalOrders > 0 ? (totalFulfilled / totalOrders) * 100 : 0,
      avgDeliveryDays,
      totalTransportCost,
      totalCustomsTax,
      totalCompensation,
      inventoryTurnover,
      returnRate,
    };
  }, [supplyChainData]);

  const kpiCards = [
    {
      title: '总订单数',
      value: summaryMetrics.totalOrders,
      icon: <ShoppingCart size={24} />,
      color: 'from-cyan/20 to-cyan/5',
      iconBg: 'bg-cyan/20 text-cyan',
      formatFn: (v: number) => v.toLocaleString(),
    },
    {
      title: '履约率',
      value: summaryMetrics.fulfillmentRate,
      suffix: '%',
      icon: <Check size={24} />,
      color: 'from-green/20 to-green/5',
      iconBg: 'bg-green/20 text-green',
      formatFn: (v: number) => formatPercent(v, 2, false),
    },
    {
      title: '平均配送天数',
      value: summaryMetrics.avgDeliveryDays,
      icon: <Clock size={24} />,
      color: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/20 text-primary-light',
      formatFn: (v: number) => `${v.toFixed(1)}天`,
    },
    {
      title: '总运输成本',
      value: summaryMetrics.totalTransportCost,
      prefix: '$',
      icon: <Truck size={24} />,
      color: 'from-amber/20 to-amber/5',
      iconBg: 'bg-amber/20 text-amber',
      formatFn: (v: number) => formatCurrency(v, 'USD', 0),
    },
    {
      title: '总关税',
      value: summaryMetrics.totalCustomsTax,
      prefix: '$',
      icon: <BarChart3 size={24} />,
      color: 'from-cyan/20 to-cyan/5',
      iconBg: 'bg-cyan/20 text-cyan',
      formatFn: (v: number) => formatCurrency(v, 'USD', 0),
    },
    {
      title: '总补偿金额',
      value: summaryMetrics.totalCompensation,
      prefix: '$',
      icon: <DollarSign size={24} />,
      color: 'from-red/20 to-red/5',
      iconBg: 'bg-red/20 text-red',
      formatFn: (v: number) => formatCurrency(v, 'USD', 0),
    },
    {
      title: '库存周转率',
      value: summaryMetrics.inventoryTurnover,
      suffix: '%',
      icon: <TrendingUp size={24} />,
      color: 'from-green/20 to-green/5',
      iconBg: 'bg-green/20 text-green',
      formatFn: (v: number) => formatPercent(v, 2, false),
    },
    {
      title: '退货率',
      value: summaryMetrics.returnRate,
      suffix: '%',
      icon: <RefreshCw size={24} />,
      color: 'from-red/20 to-red/5',
      iconBg: 'bg-red/20 text-red',
      formatFn: (v: number) => formatPercent(v, 2, false),
    },
  ];

  const supplyChainTrendOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#F8FAFC' },
      axisPointer: { type: 'cross' },
    },
    legend: {
      data: ['订单数', '履约率', '配送天数', '退货率'],
      textStyle: { color: '#94A3B8' },
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
      data: supplyChainData.map((item) => item.period),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748B', fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        name: '订单数/天数',
        nameTextStyle: { color: '#64748B' },
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748B', fontSize: 11 },
        splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
      },
      {
        type: 'value',
        name: '百分比(%)',
        nameTextStyle: { color: '#64748B' },
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748B', fontSize: 11 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '订单数',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: supplyChainData.map((item) => item.totalOrders),
        lineStyle: { color: '#06B6D4', width: 3 },
        itemStyle: { color: '#06B6D4', borderColor: '#0F172A', borderWidth: 2 },
      },
      {
        name: '履约率',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: supplyChainData.map((item) => item.fulfillmentRate * 100),
        lineStyle: { color: '#10B981', width: 3 },
        itemStyle: { color: '#10B981', borderColor: '#0F172A', borderWidth: 2 },
      },
      {
        name: '配送天数',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: supplyChainData.map((item) => item.avgDeliveryDays),
        lineStyle: { color: '#F59E0B', width: 3 },
        itemStyle: { color: '#F59E0B', borderColor: '#0F172A', borderWidth: 2 },
      },
      {
        name: '退货率',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: supplyChainData.map((item) => item.returnRate * 100),
        lineStyle: { color: '#EF4444', width: 3 },
        itemStyle: { color: '#EF4444', borderColor: '#0F172A', borderWidth: 2 },
      },
    ],
    animationDuration: 1500,
  };

  const costCompositionOption: EChartsOption = {
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
      textStyle: { color: '#94A3B8', fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
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
        labelLine: { show: false },
        data: [
          { value: summaryMetrics.totalTransportCost, name: '运输成本', itemStyle: { color: '#06B6D4' } },
          { value: summaryMetrics.totalCustomsTax, name: '关税', itemStyle: { color: '#10B981' } },
          { value: summaryMetrics.totalCompensation, name: '补偿', itemStyle: { color: '#EF4444' } },
          { value: summaryMetrics.totalTransportCost * 0.3, name: '仓储', itemStyle: { color: '#F59E0B' } },
        ],
      },
    ],
    animationDuration: 1200,
  };

  const inventoryValueOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#F8FAFC' },
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const param = Array.isArray(params) ? params[0] : params;
        return `${param.name}<br/>库存价值: $${param.value.toLocaleString()}`;
      },
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
      data: [...new Set(inventoryData.map((item) => item.warehouseName))],
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748B', fontSize: 11, rotate: 30 },
    },
    yAxis: {
      type: 'value',
      name: '价值($)',
      nameTextStyle: { color: '#64748B' },
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: {
        color: '#64748B',
        fontSize: 11,
        formatter: (value: number) => `$${(value / 1000).toFixed(0)}K`,
      },
      splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        data: [...new Set(inventoryData.map((item) => item.warehouseName))].map((wh) => {
          const total = inventoryData
            .filter((item) => item.warehouseName === wh)
            .reduce((sum, item) => sum + item.value, 0);
          return {
            value: total,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: '#06B6D4' },
                  { offset: 1, color: '#0891B2' },
                ],
              },
              borderRadius: [6, 6, 0, 0],
            },
          };
        }),
        barWidth: 30,
      },
    ],
    animationDuration: 1200,
  };

  const inventoryTurnoverOption: EChartsOption = {
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
      type: 'value',
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748B', fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: inventoryData.slice(0, 10).map((item) => item.sku),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94A3B8', fontSize: 10 },
    },
    series: [
      {
        type: 'bar',
        data: inventoryData.slice(0, 10).map((item) => ({
          value: item.turnoverRate * 100,
          itemStyle: {
            color: item.turnoverRate > 0.5
              ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#10B981' }, { offset: 1, color: '#34D399' }] }
              : item.turnoverRate > 0.3
              ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#F59E0B' }, { offset: 1, color: '#FBBF24' }] }
              : { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#EF4444' }, { offset: 1, color: '#F87171' }] },
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: 12,
        label: {
          show: true,
          position: 'right',
          color: '#94A3B8',
          fontSize: 10,
          formatter: '{c}%',
        },
      },
    ],
    animationDuration: 1200,
  };

  const orderTrendOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#F8FAFC' },
      axisPointer: { type: 'cross' },
    },
    legend: {
      data: ['订单量', '已履约'],
      textStyle: { color: '#94A3B8' },
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
      boundaryGap: false,
      data: orderData.map((item) => item.date.substring(5)),
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
        name: '订单量',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: orderData.map((item) => item.totalOrders),
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
      {
        name: '已履约',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: orderData.map((item) => item.fulfilledOrders),
        lineStyle: { color: '#10B981', width: 3 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.02)' },
            ],
          },
        },
        itemStyle: { color: '#10B981', borderColor: '#0F172A', borderWidth: 2 },
      },
    ],
    animationDuration: 1500,
  };

  const warehouseOrderRatioOption: EChartsOption = {
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
      textStyle: { color: '#94A3B8', fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['35%', '50%'],
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
        data: warehouses.map((wh, idx) => ({
          value: Math.floor(Math.random() * 5000) + 1000,
          name: wh.name,
          itemStyle: {
            color: ['#06B6D4', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899'][idx],
          },
        })),
      },
    ],
    animationDuration: 1200,
  };

  const portClearanceRateOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#F8FAFC' },
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const param = Array.isArray(params) ? params[0] : params;
        return `${param.name}<br/>放行率: ${param.value}%`;
      },
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
      data: customsData.map((item) => item.port),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748B', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '放行率(%)',
      nameTextStyle: { color: '#64748B' },
      min: 80,
      max: 100,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748B', fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        data: customsData.map((item) => ({
          value: (item.clearanceRate * 100).toFixed(1),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: item.clearanceRate >= 0.95
                ? [{ offset: 0, color: '#10B981' }, { offset: 1, color: '#34D399' }]
                : item.clearanceRate >= 0.9
                ? [{ offset: 0, color: '#06B6D4' }, { offset: 1, color: '#22D3EE' }]
                : [{ offset: 0, color: '#F59E0B' }, { offset: 1, color: '#FBBF24' }],
              borderRadius: [6, 6, 0, 0],
            },
          },
        })),
        barWidth: 35,
        label: {
          show: true,
          position: 'top',
          color: '#94A3B8',
          fontSize: 11,
          formatter: '{c}%',
        },
      },
    ],
    animationDuration: 1200,
  };

  const clearanceTimeTrendOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#F8FAFC' },
      formatter: (params: any) => {
        const paramArray = Array.isArray(params) ? params : [params];
        let result = `${paramArray[0].axisValue}<br/>`;
        paramArray.forEach((p: any) => {
          result += `${p.marker} ${p.seriesName}: ${p.value}小时<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: customsData.slice(0, 4).map((item) => item.port),
      textStyle: { color: '#94A3B8' },
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
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
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
    series: customsData.slice(0, 4).map((item, idx) => ({
      name: item.port,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      data: Array.from({ length: 7 }, () => Math.max(4, item.avgClearanceHours + (Math.random() - 0.5) * 8)),
      lineStyle: {
        width: 2,
        color: ['#06B6D4', '#10B981', '#F59E0B', '#3B82F6'][idx],
      },
      itemStyle: {
        color: ['#06B6D4', '#10B981', '#F59E0B', '#3B82F6'][idx],
        borderColor: '#0F172A',
        borderWidth: 2,
      },
    })),
    animationDuration: 1500,
  };

  const carrierOnTimeOption: EChartsOption = {
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
      data: logisticsData.map((item) => item.carrier),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748B', fontSize: 10, rotate: 15 },
    },
    yAxis: {
      type: 'value',
      name: '准时率(%)',
      nameTextStyle: { color: '#64748B' },
      min: 85,
      max: 100,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748B', fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        data: logisticsData.map((item) => ({
          value: (item.onTimeRate * 100).toFixed(1),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: item.onTimeRate >= 0.95
                ? [{ offset: 0, color: '#10B981' }, { offset: 1, color: '#34D399' }]
                : item.onTimeRate >= 0.9
                ? [{ offset: 0, color: '#06B6D4' }, { offset: 1, color: '#22D3EE' }]
                : [{ offset: 0, color: '#EF4444' }, { offset: 1, color: '#F87171' }],
              borderRadius: [6, 6, 0, 0],
            },
          },
        })),
        barWidth: 30,
        label: {
          show: true,
          position: 'top',
          color: '#94A3B8',
          fontSize: 11,
          formatter: '{c}%',
        },
      },
    ],
    animationDuration: 1200,
  };

  const exceptionDistributionOption: EChartsOption = {
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
      textStyle: { color: '#94A3B8', fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        itemStyle: {
          borderRadius: 8,
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
          { value: 156, name: '清关延误', itemStyle: { color: '#F59E0B' } },
          { value: 89, name: '天气延误', itemStyle: { color: '#3B82F6' } },
          { value: 67, name: '包裹破损', itemStyle: { color: '#EF4444' } },
          { value: 45, name: '地址错误', itemStyle: { color: '#8B5CF6' } },
          { value: 32, name: '包裹丢失', itemStyle: { color: '#EC4899' } },
          { value: 28, name: '其他', itemStyle: { color: '#64748B' } },
        ],
      },
    ],
    animationDuration: 1200,
  };

  const supplyChainColumns = [
    { key: 'period', title: '期间' },
    { key: 'totalOrders', title: '总订单', render: (row: SupplyChainMetrics) => row.totalOrders.toLocaleString() },
    { key: 'fulfilledOrders', title: '已履约', render: (row: SupplyChainMetrics) => row.fulfilledOrders.toLocaleString() },
    { key: 'fulfillmentRate', title: '履约率', render: (row: SupplyChainMetrics) => formatPercent(row.fulfillmentRate) },
    { key: 'avgDeliveryDays', title: '平均配送天数', render: (row: SupplyChainMetrics) => `${row.avgDeliveryDays.toFixed(1)}天` },
    { key: 'totalTransportCost', title: '总运输成本', render: (row: SupplyChainMetrics) => formatCurrency(row.totalTransportCost, 'USD', 0) },
    { key: 'totalCustomsTax', title: '总关税', render: (row: SupplyChainMetrics) => formatCurrency(row.totalCustomsTax, 'USD', 0) },
    { key: 'totalCompensation', title: '总补偿', render: (row: SupplyChainMetrics) => formatCurrency(row.totalCompensation, 'USD', 0) },
    { key: 'inventoryTurnover', title: '库存周转率', render: (row: SupplyChainMetrics) => formatPercent(row.inventoryTurnover) },
    { key: 'returnRate', title: '退货率', render: (row: SupplyChainMetrics) => formatPercent(row.returnRate) },
  ];

  const inventoryColumns = [
    { key: 'sku', title: '商品SKU' },
    { key: 'productName', title: '商品名称' },
    { key: 'warehouseName', title: '仓库' },
    { key: 'quantity', title: '库存数量', render: (row: InventoryItem) => row.quantity.toLocaleString() },
    { key: 'value', title: '库存价值', render: (row: InventoryItem) => formatCurrency(row.value, 'USD', 0) },
    { key: 'turnoverRate', title: '周转率', render: (row: InventoryItem) => formatPercent(row.turnoverRate) },
  ];

  const orderColumns = [
    { key: 'date', title: '日期', render: (row: OrderItem) => formatDate(row.date, 'YYYY-MM-DD') },
    { key: 'totalOrders', title: '总订单', render: (row: OrderItem) => row.totalOrders.toLocaleString() },
    { key: 'fulfilledOrders', title: '已履约', render: (row: OrderItem) => row.fulfilledOrders.toLocaleString() },
    { key: 'fulfillmentRate', title: '履约率', render: (row: OrderItem) => formatPercent(row.fulfillmentRate) },
    { key: 'totalAmount', title: '总金额', render: (row: OrderItem) => formatCurrency(row.totalAmount, 'USD', 0) },
  ];

  const customsColumns = [
    { key: 'port', title: '口岸' },
    { key: 'totalDeclarations', title: '总申报', render: (row: CustomsItem) => row.totalDeclarations.toLocaleString() },
    { key: 'clearedCount', title: '已放行', render: (row: CustomsItem) => row.clearedCount.toLocaleString() },
    { key: 'clearanceRate', title: '放行率', render: (row: CustomsItem) => formatPercent(row.clearanceRate) },
    { key: 'avgClearanceHours', title: '平均清关时间', render: (row: CustomsItem) => formatDuration(row.avgClearanceHours) },
    { key: 'totalTax', title: '总税额', render: (row: CustomsItem) => formatCurrency(row.totalTax, 'USD', 0) },
  ];

  const logisticsColumns = [
    { key: 'carrier', title: '承运商' },
    { key: 'totalShipments', title: '总发货', render: (row: LogisticsItem) => row.totalShipments.toLocaleString() },
    { key: 'onTimeDelivery', title: '准时送达', render: (row: LogisticsItem) => row.onTimeDelivery.toLocaleString() },
    { key: 'onTimeRate', title: '准时率', render: (row: LogisticsItem) => formatPercent(row.onTimeRate) },
    { key: 'avgDeliveryDays', title: '平均配送天数', render: (row: LogisticsItem) => `${row.avgDeliveryDays.toFixed(1)}天` },
    { key: 'exceptionCount', title: '异常数', render: (row: LogisticsItem) => row.exceptionCount.toLocaleString() },
    { key: 'exceptionRate', title: '异常率', render: (row: LogisticsItem) => formatPercent(row.exceptionRate) },
  ];

  const tabs = [
    { id: 'supply-chain' as TabType, name: '供应链效能', icon: <Activity size={18} /> },
    { id: 'inventory' as TabType, name: '库存分析', icon: <Layers size={18} /> },
    { id: 'orders' as TabType, name: '订单分析', icon: <ShoppingCart size={18} /> },
    { id: 'customs' as TabType, name: '清关分析', icon: <Gauge size={18} /> },
    { id: 'logistics' as TabType, name: '物流分析', icon: <Truck size={18} /> },
  ];

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    setExportState({ showConfirm: false, showProgress: true, progress: 0, format });

    const progressInterval = setInterval(() => {
      setExportState((prev) => ({
        ...prev,
        progress: Math.min(prev.progress + Math.random() * 15, 95),
      }));
    }, 300);

    try {
      const { startDate, endDate } = getDateRange();
      const warehouseId = filters.warehouses.length > 0 ? Number(filters.warehouses[0]) : undefined;
      const carrier = filters.transportModes.length > 0 ? filters.transportModes[0] : undefined;

      const { blob, filename } = await exportReport(activeTab, format, {
        startDate,
        endDate,
        warehouseId,
        carrier,
        period: filters.timeRange,
      });

      clearInterval(progressInterval);
      setExportState((prev) => ({ ...prev, progress: 100 }));

      const downloadFilename = filename || `${activeTab}_报告_${formatDate(new Date(), 'YYYYMM')}.${format}`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setTimeout(() => {
        setExportState({ showConfirm: false, showProgress: false, progress: 0, format: null });
      }, 1500);
    } catch (err) {
      clearInterval(progressInterval);
      setExportState({ showConfirm: false, showProgress: false, progress: 0, format: null });
      console.error('Export failed:', err);
    }
  };

  const toggleFilterItem = (type: 'warehouses' | 'transportModes' | 'destinations', id: string) => {
    setFilters((prev) => ({
      ...prev,
      [type]: prev[type].includes(id) ? prev[type].filter((i) => i !== id) : [...prev[type], id],
    }));
  };

  const resetFilters = () => {
    setFilters({
      timeRange: '30days',
      startDate: '',
      endDate: '',
      warehouses: [],
      transportModes: [],
      destinations: [],
    });
  };

  const getExportRangeText = () => {
    const range = timeRanges.find((r) => r.id === filters.timeRange)?.name || '自定义';
    if (filters.timeRange === 'custom' && filters.startDate && filters.endDate) {
      return `${formatDate(filters.startDate)} 至 ${formatDate(filters.endDate)}`;
    }
    return range;
  };

  const getExportContentText = () => {
    const contents: string[] = [];
    if (filters.warehouses.length > 0) {
      contents.push(`仓库: ${filters.warehouses.map((id) => warehouses.find((w) => w.id === id)?.name).join(', ')}`);
    }
    if (filters.transportModes.length > 0) {
      contents.push(`运输方式: ${filters.transportModes.map((id) => transportModes.find((t) => t.id === id)?.name).join(', ')}`);
    }
    if (filters.destinations.length > 0) {
      contents.push(`目的地: ${filters.destinations.map((id) => destinations.find((d) => d.id === id)?.name).join(', ')}`);
    }
    return contents.length > 0 ? contents.join('; ') : '全部数据';
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">报表分析中心</h1>
          <p className="text-text-muted text-sm mt-1">
            全面的供应链数据分析，支持多维度筛选与导出
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className="btn btn-secondary">
            <Filter size={16} />
            筛选
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => setExportState({ showConfirm: true, showProgress: false, progress: 0, format: null })}
            className="btn bg-gradient-to-r from-cyan to-primary text-white hover:from-cyan/90 hover:to-primary/90 shadow-lg shadow-cyan/20"
          >
            <Download size={16} />
            导出报表
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card bg-bg-dark/80 backdrop-blur-sm border-cyan/30">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex flex-col gap-2 min-w-[180px]">
                <label className="text-sm text-text-secondary flex items-center gap-2">
                  <Calendar size={14} className="text-text-muted" />
                  时间范围
                </label>
                <div className="flex flex-wrap gap-2">
                  {timeRanges.map((range) => (
                    <button
                      key={range.id}
                      onClick={() => setFilters({ ...filters, timeRange: range.id })}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        filters.timeRange === range.id
                          ? 'bg-cyan/20 text-cyan border border-cyan/50'
                          : 'bg-bg-card text-text-secondary border border-border-color hover:border-cyan/30'
                      }`}
                    >
                      {range.name}
                    </button>
                  ))}
                </div>
                {filters.timeRange === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="input-select text-sm"
                    />
                    <span className="text-text-muted">至</span>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="input-select text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-text-secondary flex items-center gap-2">
                  <Warehouse size={14} className="text-text-muted" />
                  仓库筛选
                </label>
                <div className="flex flex-wrap gap-2 max-w-xl">
                  {warehouses.map((wh) => (
                    <button
                      key={wh.id}
                      onClick={() => toggleFilterItem('warehouses', wh.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1.5 ${
                        filters.warehouses.includes(wh.id)
                          ? 'bg-primary/20 text-primary-light border border-primary/50'
                          : 'bg-bg-card text-text-secondary border border-border-color hover:border-primary/30'
                      }`}
                    >
                      {filters.warehouses.includes(wh.id) && <Check size={12} />}
                      {wh.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-text-secondary flex items-center gap-2">
                  <Truck size={14} className="text-text-muted" />
                  运输方式
                </label>
                <div className="flex flex-wrap gap-2">
                  {transportModes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => toggleFilterItem('transportModes', mode.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1.5 ${
                        filters.transportModes.includes(mode.id)
                          ? 'bg-green/20 text-green-light border border-green/50'
                          : 'bg-bg-card text-text-secondary border border-border-color hover:border-green/30'
                      }`}
                    >
                      {filters.transportModes.includes(mode.id) && <Check size={12} />}
                      {mode.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm text-text-secondary flex items-center gap-2">
                  <MapPin size={14} className="text-text-muted" />
                  目的地
                </label>
                <div className="flex flex-wrap gap-2">
                  {destinations.map((dest) => (
                    <button
                      key={dest.id}
                      onClick={() => toggleFilterItem('destinations', dest.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1.5 ${
                        filters.destinations.includes(dest.id)
                          ? 'bg-amber/20 text-amber-light border border-amber/50'
                          : 'bg-bg-card text-text-secondary border border-border-color hover:border-amber/30'
                      }`}
                    >
                      {filters.destinations.includes(dest.id) && <Check size={12} />}
                      {dest.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-color">
              <button onClick={resetFilters} className="btn btn-secondary">
                <X size={14} />
                重置
              </button>
              <button onClick={fetchData} className="btn btn-cyan">
                应用筛选
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {kpiCards.map((card, index) => (
          <div
            key={index}
            className={`stat-card bg-gradient-to-br ${card.color} hover:scale-[1.02] transition-transform duration-300`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${card.iconBg}`}>{card.icon}</div>
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

      <div className="flex items-center gap-1 p-1 bg-bg-card rounded-xl border border-border-color">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-cyan/20 to-primary/20 text-cyan-light border border-cyan/30 shadow-inner'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            {tab.icon}
            {tab.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="text-cyan animate-spin" />
            <p className="text-text-muted">数据加载中...</p>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'supply-chain' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="card lg:col-span-2 card-hover">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <LineChart size={18} className="text-cyan" />
                      供应链效能趋势
                    </h3>
                  </div>
                  <ReactECharts option={supplyChainTrendOption} style={{ height: 320 }} />
                </div>
                <div className="card card-hover">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <PieChart size={18} className="text-amber" />
                      成本构成分析
                    </h3>
                  </div>
                  <ReactECharts option={costCompositionOption} style={{ height: 320 }} />
                </div>
              </div>
              <div className="card card-hover">
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <BarChart3 size={18} className="text-primary-light" />
                  供应链效能报表
                </h3>
                <DataTable
                  columns={supplyChainColumns}
                  data={supplyChainData}
                  rowKey="period"
                  showPagination={false}
                />
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="card card-hover">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <BarChart3 size={18} className="text-cyan" />
                      各仓库库存价值
                    </h3>
                  </div>
                  <ReactECharts option={inventoryValueOption} style={{ height: 320 }} />
                </div>
                <div className="card card-hover">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <TrendingUp size={18} className="text-green" />
                      库存周转率对比
                    </h3>
                  </div>
                  <ReactECharts option={inventoryTurnoverOption} style={{ height: 320 }} />
                </div>
              </div>
              <div className="card card-hover">
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Package size={18} className="text-primary-light" />
                  库存报表
                </h3>
                <DataTable
                  columns={inventoryColumns}
                  data={inventoryData}
                  rowKey="sku"
                  total={inventoryData.length}
                  pageSize={10}
                />
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="card lg:col-span-2 card-hover">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <LineChart size={18} className="text-cyan" />
                      订单量趋势
                    </h3>
                  </div>
                  <ReactECharts option={orderTrendOption} style={{ height: 320 }} />
                </div>
                <div className="card card-hover">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <PieChart size={18} className="text-amber" />
                      各仓库订单占比
                    </h3>
                  </div>
                  <ReactECharts option={warehouseOrderRatioOption} style={{ height: 320 }} />
                </div>
              </div>
              <div className="card card-hover">
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <ShoppingCart size={18} className="text-primary-light" />
                  订单报表
                </h3>
                <DataTable
                  columns={orderColumns}
                  data={orderData}
                  rowKey="date"
                  showPagination={false}
                />
              </div>
            </div>
          )}

          {activeTab === 'customs' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="card card-hover">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <BarChart3 size={18} className="text-cyan" />
                      各口岸放行率
                    </h3>
                  </div>
                  <ReactECharts option={portClearanceRateOption} style={{ height: 320 }} />
                </div>
                <div className="card card-hover">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <LineChart size={18} className="text-green" />
                      清关时效趋势
                    </h3>
                  </div>
                  <ReactECharts option={clearanceTimeTrendOption} style={{ height: 320 }} />
                </div>
              </div>
              <div className="card card-hover">
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Gauge size={18} className="text-primary-light" />
                  清关报表
                </h3>
                <DataTable
                  columns={customsColumns}
                  data={customsData}
                  rowKey="port"
                  showPagination={false}
                />
              </div>
            </div>
          )}

          {activeTab === 'logistics' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="card card-hover">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <BarChart3 size={18} className="text-cyan" />
                      各承运商准时率
                    </h3>
                  </div>
                  <ReactECharts option={carrierOnTimeOption} style={{ height: 320 }} />
                </div>
                <div className="card card-hover">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <PieChart size={18} className="text-amber" />
                      异常类型分布
                    </h3>
                  </div>
                  <ReactECharts option={exceptionDistributionOption} style={{ height: 320 }} />
                </div>
              </div>
              <div className="card card-hover">
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Truck size={18} className="text-primary-light" />
                  物流报表
                </h3>
                <DataTable
                  columns={logisticsColumns}
                  data={logisticsData}
                  rowKey="carrier"
                  showPagination={false}
                />
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={exportState.showConfirm}
        onClose={() => setExportState({ ...exportState, showConfirm: false })}
        title="导出确认"
        width="max-w-lg"
        footer={
          <>
            <button
              onClick={() => setExportState({ ...exportState, showConfirm: false })}
              className="btn btn-secondary"
            >
              取消
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              className="btn bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700"
            >
              <FileSpreadsheet size={16} />
              导出 Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="btn bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-600 hover:to-red-700"
            >
              <FileText size={16} />
              导出 PDF
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-bg-dark/50 rounded-lg border border-cyan/30">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-amber" />
              <span className="font-medium text-text-primary">即将导出以下数据</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">报表类型</span>
                <span className="text-text-primary font-medium">
                  {tabs.find((t) => t.id === activeTab)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">时间范围</span>
                <span className="text-text-primary font-medium">{getExportRangeText()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">数据内容</span>
                <span className="text-text-primary font-medium text-right max-w-[200px]">{getExportContentText()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">数据条数</span>
                <span className="text-text-primary font-medium">
                  {activeTab === 'supply-chain' && supplyChainData.length}
                  {activeTab === 'inventory' && inventoryData.length}
                  {activeTab === 'orders' && orderData.length}
                  {activeTab === 'customs' && customsData.length}
                  {activeTab === 'logistics' && logisticsData.length}
                  {' '}条
                </span>
              </div>
            </div>
          </div>
          <p className="text-text-muted text-sm">请选择导出格式，系统将自动处理并下载文件。</p>
        </div>
      </Modal>

      <Modal
        isOpen={exportState.showProgress}
        onClose={() => {}}
        title="正在导出"
        width="max-w-md"
        closeOnOverlayClick={false}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {exportState.progress < 100 ? (
              <Loader2 size={24} className="text-cyan animate-spin" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-green/20 flex items-center justify-center">
                <Check size={16} className="text-green" />
              </div>
            )}
            <div>
              <p className="font-medium text-text-primary">
                {exportState.progress < 100 ? '正在生成报表...' : '导出完成'}
              </p>
              <p className="text-sm text-text-muted">
                {exportState.progress < 100
                  ? `正在处理数据，请稍候 (${Math.round(exportState.progress)}%)`
                  : `报表已成功导出，文件将自动下载`}
              </p>
            </div>
          </div>
          <div className="w-full h-2 bg-bg-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan to-primary transition-all duration-300 rounded-full"
              style={{ width: `${exportState.progress}%` }}
            />
          </div>
          {exportState.progress >= 100 && (
            <div className="flex items-center justify-center gap-2 text-green text-sm">
              <Check size={14} />
              文件下载已开始
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
