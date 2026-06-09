import { useEffect, useState, useMemo, useRef } from 'react';
import {
  DollarSign,
  TrendingUp,
  Package,
  Clock,
  ShoppingCart,
  RefreshCw,
  AlertTriangle,
  Truck,
  Activity,
  Filter,
  MapPin,
  ChevronDown,
  X,
  Gauge,
  Zap,
  Bell,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import StatusBadge from '../components/ui/StatusBadge';
import { formatCurrency, formatPercent, formatDuration, formatDate } from '../utils/format';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { LogisticsExceptionPoint, Region, TransportMode } from '../types';

export default function Home() {
  const {
    kpiData,
    warehouseTurnover,
    portClearanceTime,
    salesTrend,
    logisticsExceptions,
    inventoryAlerts,
    loading,
    error,
    lastUpdated,
    fetchData,
    startAutoRefresh,
    stopAutoRefresh,
  } = useDashboardStore();

  const [filters, setFilters] = useState({
    warehouseId: '',
    region: '' as Region | '',
    transportMode: '' as TransportMode | '',
    dateRange: '30days',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [alertIndex, setAlertIndex] = useState(0);
  const alertScrollRef = useRef<number>(null);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    fetchData();
    startAutoRefresh(fetchData);
    return () => stopAutoRefresh();
  }, []);

  useEffect(() => {
    alertScrollRef.current = window.setInterval(() => {
      setAlertIndex((prev) => (prev + 1) % Math.max(inventoryAlerts.length, 1));
    }, 3000);
    return () => {
      if (alertScrollRef.current) {
        clearInterval(alertScrollRef.current);
      }
    };
  }, [inventoryAlerts.length]);

  const displayAlerts = useMemo(() => {
    if (inventoryAlerts.length === 0) return [];
    const result = [];
    for (let i = 0; i < 3; i++) {
      const idx = (alertIndex + i) % inventoryAlerts.length;
      result.push(inventoryAlerts[idx]);
    }
    return result;
  }, [inventoryAlerts, alertIndex]);

  const kpiCards = [
    {
      title: '库存总价值',
      value: kpiData?.totalInventoryValue || 0,
      prefix: '$',
      icon: <DollarSign size={24} />,
      color: 'from-cyan/20 to-cyan/5',
      iconBg: 'bg-cyan/20 text-cyan',
      formatFn: (v: number) => formatCurrency(v, 'USD', 0),
      trend: '+12.5%',
      trendUp: true,
    },
    {
      title: '库存周转率',
      value: kpiData?.inventoryTurnoverRate || 0,
      suffix: '%',
      icon: <TrendingUp size={24} />,
      color: 'from-green/20 to-green/5',
      iconBg: 'bg-green/20 text-green',
      formatFn: (v: number) => formatPercent(v, 2, false),
      trend: '+3.2%',
      trendUp: true,
    },
    {
      title: '订单履约率',
      value: kpiData?.orderFulfillmentRate || 0,
      suffix: '%',
      icon: <Package size={24} />,
      color: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/20 text-primary-light',
      formatFn: (v: number) => formatPercent(v, 2, false),
      trend: '+1.8%',
      trendUp: true,
    },
    {
      title: '平均清关时间',
      value: kpiData?.avgCustomsClearanceHours || 0,
      icon: <Clock size={24} />,
      color: 'from-amber/20 to-amber/5',
      iconBg: 'bg-amber/20 text-amber',
      formatFn: (v: number) => formatDuration(v),
      trend: '-2.1h',
      trendUp: true,
    },
    {
      title: '日均销售额',
      value: kpiData?.dailySales || 0,
      prefix: '$',
      icon: <ShoppingCart size={24} />,
      color: 'from-cyan/20 to-cyan/5',
      iconBg: 'bg-cyan/20 text-cyan',
      formatFn: (v: number) => formatCurrency(v, 'USD', 0),
      trend: '+8.7%',
      trendUp: true,
    },
    {
      title: '退货率',
      value: kpiData?.returnRate || 0,
      suffix: '%',
      icon: <RefreshCw size={24} />,
      color: 'from-red/20 to-red/5',
      iconBg: 'bg-red/20 text-red',
      formatFn: (v: number) => formatPercent(v, 2, false),
      trend: '-0.5%',
      trendUp: true,
    },
    {
      title: '待处理工单',
      value: kpiData?.pendingWorkOrders || 0,
      icon: <AlertTriangle size={24} />,
      color: 'from-amber/20 to-amber/5',
      iconBg: 'bg-amber/20 text-amber',
      trend: '+2',
      trendUp: false,
    },
    {
      title: '物流异常',
      value: kpiData?.logisticsExceptions || 0,
      icon: <Truck size={24} />,
      color: 'from-red/20 to-red/5',
      iconBg: 'bg-red/20 text-red',
      trend: '-3',
      trendUp: true,
    },
  ];

  const salesTrendOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#F8FAFC' },
      axisPointer: { type: 'cross' },
    },
    legend: {
      data: ['销售额', '退货数'],
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
      data: salesTrend.map((item) => item.date.substring(5)),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748B', fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        name: '销售额($)',
        nameTextStyle: { color: '#64748B' },
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748B', fontSize: 11 },
        splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
      },
      {
        type: 'value',
        name: '退货数',
        nameTextStyle: { color: '#64748B' },
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748B', fontSize: 11 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '销售额',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: salesTrend.map((item) => item.sales),
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
        name: '退货数',
        type: 'bar',
        yAxisIndex: 1,
        data: salesTrend.map((item) => item.returns),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(239, 68, 68, 0.6)' },
              { offset: 1, color: 'rgba(239, 68, 68, 0.2)' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: 8,
      },
    ],
    animationDuration: 1500,
    animationEasing: 'cubicOut',
  };

  const fulfillmentRateOption: EChartsOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#F8FAFC' },
      formatter: `{b}: {c}%`,
    },
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        pointer: { show: false },
        progress: {
          show: true,
          overlap: false,
          roundCap: true,
          clip: false,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#06B6D4' },
                { offset: 1, color: '#10B981' },
              ],
            },
          },
        },
        axisLine: {
          lineStyle: {
            width: 16,
            color: [[1, 'rgba(51, 65, 85, 0.5)']],
          },
        },
        splitLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        data: [
          {
            value: kpiData?.orderFulfillmentRate || 0,
            detail: {
              offsetCenter: ['0%', '0%'],
              fontSize: 36,
              fontWeight: 'bold',
              formatter: `{value}%`,
              color: '#F8FAFC',
            },
          },
        ],
        title: {
          offsetCenter: ['0%', '70%'],
          fontSize: 13,
          color: '#94A3B8',
        },
      },
    ],
  };

  const warehouseTurnoverOption: EChartsOption = {
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
      axisLabel: { color: '#64748B', fontSize: 11 },
      splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: warehouseTurnover.map((item) => item.warehouseName),
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94A3B8', fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: warehouseTurnover.map((item) => ({
          value: item.turnoverRate,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: item.trend === 'up'
                ? [{ offset: 0, color: '#10B981' }, { offset: 1, color: '#34D399' }]
                : item.trend === 'down'
                ? [{ offset: 0, color: '#EF4444' }, { offset: 1, color: '#F87171' }]
                : [{ offset: 0, color: '#F59E0B' }, { offset: 1, color: '#FBBF24' }],
            },
          },
        })),
        barWidth: 14,
        itemStyle: { borderRadius: [0, 6, 6, 0] },
        label: {
          show: true,
          position: 'right',
          color: '#94A3B8',
          fontSize: 11,
          formatter: '{c}%',
        },
      },
    ],
    animationDuration: 1200,
    animationEasing: 'elasticOut',
    animationDelay: (_idx: number) => _idx * 100,
  };

  const portClearanceOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#F8FAFC' },
    },
    legend: {
      data: ['近7天趋势'],
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
      data: ['7天前', '6天前', '5天前', '4天前', '3天前', '2天前', '昨天'],
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748B', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: '小时',
      nameTextStyle: { color: '#64748B' },
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748B', fontSize: 11 },
      splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
    },
    series: portClearanceTime.slice(0, 4).map((port, idx) => ({
      name: port.port,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      data: port.data,
      lineStyle: {
        width: 2,
        color: ['#06B6D4', '#10B981', '#F59E0B', '#1E40AF'][idx],
      },
      itemStyle: {
        color: ['#06B6D4', '#10B981', '#F59E0B', '#1E40AF'][idx],
        borderColor: '#0F172A',
        borderWidth: 2,
      },
    })),
    animationDuration: 1500,
  };

  const worldMapOption: EChartsOption = useMemo(() => {
    const convertToCoord = (lng: number, lat: number) => [lng, lat];

    const typeColors: Record<string, string> = {
      delay: '#F59E0B',
      damage: '#EF4444',
      lost: '#EF4444',
    };

    const typeNames: Record<string, string> = {
      delay: '延误',
      damage: '破损',
      lost: '丢失',
    };

    const seriesData = logisticsExceptions.map((p: LogisticsExceptionPoint) => ({
      name: `${p.location} - ${typeNames[p.type]}`,
      value: [...convertToCoord(p.coordinates[1], p.coordinates[0]), p.count],
      itemStyle: { color: typeColors[p.type] },
    }));

    const portData = [
      { name: '洛杉矶', value: [-118.24, 34.05, 120] },
      { name: '纽约', value: [-74.01, 40.71, 95] },
      { name: '鹿特丹', value: [4.48, 51.92, 110] },
      { name: '汉堡', value: [9.99, 53.55, 85] },
      { name: '新加坡', value: [103.82, 1.35, 130] },
      { name: '上海', value: [121.47, 31.23, 150] },
    ];

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: '#334155',
        textStyle: { color: '#F8FAFC' },
        formatter: (params: any) => {
          return `${params.name}<br/>异常数: ${params.value[2]} 起`;
        },
      },
      geo: {
        map: 'world',
        roam: true,
        zoom: 1.2,
        center: [20, 25],
        label: { show: false },
        itemStyle: {
          areaColor: '#1E293B',
          borderColor: '#334155',
          borderWidth: 0.5,
        },
        emphasis: {
          label: { show: false },
          itemStyle: { areaColor: '#334155' },
        },
        silent: true,
      },
      visualMap: {
        show: true,
        min: 1,
        max: 10,
        left: 'left',
        bottom: '5%',
        text: ['高', '低'],
        textStyle: { color: '#94A3B8', fontSize: 10 },
        inRange: {
          color: ['#334155', '#F59E0B', '#EF4444'],
        },
        calculable: true,
      },
      series: [
        {
          name: '口岸吞吐量',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: portData,
          symbolSize: (val: number[]) => Math.max(6, val[2] / 15),
          rippleEffect: {
            brushType: 'stroke',
            scale: 3,
          },
          itemStyle: {
            color: '#06B6D4',
            shadowBlur: 10,
            shadowColor: '#06B6D4',
          },
          zlevel: 1,
        },
        {
          name: '物流异常',
          type: 'scatter',
          coordinateSystem: 'geo',
          data: seriesData,
          symbolSize: (val: number[]) => 10 + val[2] * 3,
          itemStyle: {
            shadowBlur: 15,
            shadowColor: 'rgba(239, 68, 68, 0.5)',
          },
          zlevel: 2,
        },
      ],
    };
  }, [logisticsExceptions]);

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

      {error && (
        <div className="card bg-red/10 border-red/30">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-red flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red font-medium">数据加载出错</p>
              <p className="text-sm text-text-secondary">{error}</p>
            </div>
            <button
              onClick={fetchData}
              className="btn btn-danger btn-sm"
            >
              <RefreshCw size={14} />
              重试
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">全球供应链智能调度中心</h1>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green/10 border border-green/30 rounded-full">
              <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
              <span className="text-xs text-green font-medium">实时监控中</span>
            </div>
          </div>
          <p className="text-text-muted text-sm mt-1">
            最后更新: {lastUpdated ? formatDate(lastUpdated, 'YYYY-MM-DD HH:mm:ss') : '加载中...'}
            {' · '}
            数据每 5 秒自动刷新
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
          <button onClick={fetchData} className="btn btn-primary">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新数据
          </button>
        </div>
      </div>

      {/* Filter Panel */}
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
              <span className="text-sm text-text-secondary">区域</span>
              <select
                value={filters.region}
                onChange={(e) => setFilters({ ...filters, region: e.target.value as Region | '' })}
                className="input-select w-32"
              >
                <option value="">全部区域</option>
                <option value="US">美国</option>
                <option value="EU">欧洲</option>
                <option value="SoutheastAsia">东南亚</option>
                <option value="China">中国</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-text-muted" />
              <span className="text-sm text-text-secondary">运输方式</span>
              <select
                value={filters.transportMode}
                onChange={(e) => setFilters({ ...filters, transportMode: e.target.value as TransportMode | '' })}
                className="input-select w-28"
              >
                <option value="">全部</option>
                <option value="sea">海运</option>
                <option value="air">空运</option>
                <option value="rail">铁路</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-text-muted" />
              <span className="text-sm text-text-secondary">时间范围</span>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                className="input-select w-28"
              >
                <option value="7days">近7天</option>
                <option value="30days">近30天</option>
                <option value="90days">近90天</option>
                <option value="1year">近1年</option>
              </select>
            </div>
            <div className="flex-1" />
            <button onClick={() => setFilters({ warehouseId: '', region: '', transportMode: '', dateRange: '30days' })} className="btn btn-secondary">
              <X size={14} />
              重置
            </button>
            <button onClick={fetchData} className="btn btn-cyan">
              应用筛选
            </button>
          </div>
        </div>
      )}

      {/* Real-time Alert Bar */}
      <div className="card bg-gradient-to-r from-amber/10 via-amber/5 to-transparent border-amber/30 overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber/20 border border-amber/40 rounded-lg">
            <Bell size={16} className="text-amber animate-pulse" />
            <span className="text-sm font-medium text-amber">实时预警</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-4 transition-transform duration-500" style={{ transform: `translateX(-${alertIndex * 100}%)` }}>
              {displayAlerts.map((alert) => (
                <div key={alert.id} className="flex-shrink-0 w-full flex items-center gap-3">
                  <AlertTriangle
                    size={16}
                    className={
                      alert.severity === 'high' ? 'text-red' :
                      alert.severity === 'medium' ? 'text-amber' : 'text-text-muted'
                    }
                  />
                  <span className="text-text-primary text-sm">
                    <span className="font-medium">{alert.warehouse?.name}</span>
                    {' · '}
                    {alert.product?.name}
                    {' · '}
                    <span className={
                      alert.severity === 'high' ? 'text-red' :
                      alert.severity === 'medium' ? 'text-amber' : 'text-text-secondary'
                    }>
                      {alert.type === 'low_stock' ? '库存不足' : alert.type === 'overstock' ? '库存积压' : '滞销预警'}
                    </span>
                    {' · '}
                    当前库存: {alert.currentStock}
                  </span>
                  <span className="text-cyan text-sm flex items-center gap-1 ml-auto">
                    查看详情 <ArrowRight size={12} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {kpiCards.map((card, index) => (
          <div
            key={index}
            className={`stat-card bg-gradient-to-br ${card.color} hover:scale-[1.02] transition-transform duration-300`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${card.iconBg}`}>
                {card.icon}
              </div>
              {card.trend && (
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  card.trendUp ? 'bg-green/20 text-green-light' : 'bg-red/20 text-red-light'
                }`}>
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
                suffix={card.suffix}
                formatFn={card.formatFn}
              />
            </h3>
          </div>
        ))}
      </div>

      {/* Row 1: Sales Trend + Fulfillment Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2 card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Zap size={18} className="text-cyan" />
              销售额与退货率趋势
            </h3>
            <div className="text-xs text-text-muted">近30天数据</div>
          </div>
          <ReactECharts option={salesTrendOption} style={{ height: 300 }} />
        </div>

        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Gauge size={18} className="text-green" />
              订单履约率
            </h3>
          </div>
          <ReactECharts option={fulfillmentRateOption} style={{ height: 260 }} />
          <div className="grid grid-cols-3 gap-3 mt-2 text-center">
            <div>
              <p className="text-xl font-bold text-cyan font-mono">
                <AnimatedNumber value={98.5} duration={1500} suffix="%" />
              </p>
              <p className="text-xs text-text-muted">准时率</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green font-mono">
                <AnimatedNumber value={99.2} duration={1500} suffix="%" />
              </p>
              <p className="text-xs text-text-muted">准确率</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber font-mono">
                <AnimatedNumber value={1.3} duration={1500} suffix="%" />
              </p>
              <p className="text-xs text-text-muted">异常率</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Warehouse Turnover + Port Clearance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <TrendingUp size={18} className="text-primary-light" />
              各仓库库存周转率
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green rounded-full" />上升</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber rounded-full" />持平</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red rounded-full" />下降</span>
            </div>
          </div>
          <ReactECharts option={warehouseTurnoverOption} style={{ height: 300 }} />
        </div>

        <div className="card card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Clock size={18} className="text-amber" />
              主要口岸清关时效趋势
            </h3>
            <div className="text-xs text-text-muted">单位: 小时</div>
          </div>
          <ReactECharts option={portClearanceOption} style={{ height: 300 }} />
        </div>
      </div>

      {/* Row 3: World Map */}
      <div className="card card-hover">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <MapPin size={18} className="text-cyan" />
            全球物流网络与异常分布
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-cyan rounded-full animate-pulse" /> 主要口岸</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber rounded-full" /> 延误</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red rounded-full" /> 破损/丢失</span>
          </div>
        </div>
        <ReactECharts
          option={worldMapOption}
          style={{ height: 450 }}
          onChartReady={(chart) => {
            fetch('https://cdn.jsdelivr.net/npm/echarts@5/map/json/world.json')
              .then(res => res.json())
              .then(worldJson => {
                (chart as any).registerMap('world', worldJson);
                chart.setOption(worldMapOption);
              })
              .catch(() => {
                console.log('Map data loading skipped');
              });
          }}
        />
      </div>

      {/* Row 4: Inventory Alerts + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2 card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber" />
              库存预警列表
            </h3>
            <button className="text-sm text-cyan hover:text-cyan-light flex items-center gap-1">
              查看全部 <ArrowRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-color">
                  <th className="table-header">商品</th>
                  <th className="table-header">仓库</th>
                  <th className="table-header">预警类型</th>
                  <th className="table-header">当前库存</th>
                  <th className="table-header">安全库存</th>
                  <th className="table-header">严重程度</th>
                  <th className="table-header">建议措施</th>
                </tr>
              </thead>
              <tbody>
                {inventoryAlerts.slice(0, 5).map((alert) => (
                  <tr key={alert.id} className="table-row">
                    <td className="table-cell">
                      <div>
                        <p className="font-medium">{alert.product?.name}</p>
                        <p className="text-xs text-text-muted">{alert.product?.sku}</p>
                      </div>
                    </td>
                    <td className="table-cell">{alert.warehouse?.name}</td>
                    <td className="table-cell">
                      <StatusBadge
                        status={alert.type}
                        customLabel={alert.type === 'low_stock' ? '缺货预警' : alert.type === 'overstock' ? '库存积压' : '滞销预警'}
                        customColor={alert.type === 'low_stock' ? 'red' : alert.type === 'overstock' ? 'amber' : 'muted'}
                      />
                    </td>
                    <td className="table-cell font-mono text-right">{alert.currentStock}</td>
                    <td className="table-cell font-mono text-right text-text-muted">
                      {alert.product && inventoryAlerts[0]?.product ? Math.floor((alert.product?.declaredValue || 0) * 10) : 0}
                    </td>
                    <td className="table-cell">
                      <StatusBadge
                        status={alert.severity}
                        customLabel={alert.severity === 'high' ? '紧急' : alert.severity === 'medium' ? '中等' : '一般'}
                        customColor={alert.severity === 'high' ? 'red' : alert.severity === 'medium' ? 'amber' : 'muted'}
                      />
                    </td>
                    <td className="table-cell text-sm text-text-secondary">{alert.recommendedAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card card-hover">
          <h3 className="text-lg font-semibold text-text-primary mb-4">今日概览</h3>
          <div className="space-y-4">
            {[
              { label: '新增订单', value: 1286, change: '+12.5%', color: 'text-cyan', icon: <ShoppingCart size={20} /> },
              { label: '已发货', value: 892, change: '+8.3%', color: 'text-green', icon: <Truck size={20} /> },
              { label: '清关中', value: 345, change: '-3.2%', color: 'text-amber', icon: <Gauge size={20} /> },
              { label: '已签收', value: 1024, change: '+15.7%', color: 'text-primary-light', icon: <Package size={20} /> },
              { label: '待处理售后', value: 23, change: '+2', color: 'text-red', icon: <RefreshCw size={20} /> },
            ].map((stat, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-bg-dark/50 rounded-lg hover:bg-bg-dark/80 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-bg-card ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <span className="text-text-secondary text-sm">{stat.label}</span>
                </div>
                <div className="text-right">
                  <p className={`font-bold font-mono ${stat.color}`}>{stat.value.toLocaleString()}</p>
                  <p className={`text-xs ${stat.change.startsWith('+') ? 'text-green' : 'text-red'}`}>{stat.change}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
