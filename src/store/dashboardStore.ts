import { create } from 'zustand';
import { getAllDashboardData } from '../api/dashboard';
import type {
  DashboardKPI,
  WarehouseTurnover,
  PortClearanceTime,
  SalesTrendItem,
  LogisticsExceptionPoint,
  InventoryAlert,
} from '../types';

interface DashboardState {
  kpiData: DashboardKPI | null;
  warehouseTurnover: WarehouseTurnover[];
  portClearanceTime: PortClearanceTime[];
  salesTrend: SalesTrendItem[];
  logisticsExceptions: LogisticsExceptionPoint[];
  inventoryAlerts: InventoryAlert[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  autoRefreshInterval: number;
  refreshTimer: ReturnType<typeof setInterval> | null;
  setKpiData: (data: DashboardKPI) => void;
  setWarehouseTurnover: (data: WarehouseTurnover[]) => void;
  setPortClearanceTime: (data: PortClearanceTime[]) => void;
  setSalesTrend: (data: SalesTrendItem[]) => void;
  setLogisticsExceptions: (data: LogisticsExceptionPoint[]) => void;
  setInventoryAlerts: (data: InventoryAlert[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  startAutoRefresh: (callback: () => Promise<void>) => void;
  stopAutoRefresh: () => void;
  updateAutoRefreshInterval: (interval: number) => void;
  fetchData: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  kpiData: null,
  warehouseTurnover: [],
  portClearanceTime: [],
  salesTrend: [],
  logisticsExceptions: [],
  inventoryAlerts: [],
  loading: false,
  error: null,
  lastUpdated: null,
  autoRefreshInterval: 5000,
  refreshTimer: null,

  setKpiData: (data) => set({ kpiData: data, lastUpdated: Date.now() }),
  setWarehouseTurnover: (data) => set({ warehouseTurnover: data }),
  setPortClearanceTime: (data) => set({ portClearanceTime: data }),
  setSalesTrend: (data) => set({ salesTrend: data }),
  setLogisticsExceptions: (data) => set({ logisticsExceptions: data }),
  setInventoryAlerts: (data) => set({ inventoryAlerts: data }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  startAutoRefresh: (callback) => {
    const { refreshTimer, autoRefreshInterval } = get();
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
    const timer = setInterval(async () => {
      try {
        await callback();
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '刷新失败' });
      }
    }, autoRefreshInterval);
    set({ refreshTimer: timer });
  },

  stopAutoRefresh: () => {
    const { refreshTimer } = get();
    if (refreshTimer) {
      clearInterval(refreshTimer);
      set({ refreshTimer: null });
    }
  },

  updateAutoRefreshInterval: (interval) => {
    const { refreshTimer } = get();
    set({ autoRefreshInterval: interval });
    if (refreshTimer) {
      get().stopAutoRefresh();
    }
  },

  fetchData: async () => {
    const { setLoading, setError, setKpiData, setWarehouseTurnover, setPortClearanceTime, setSalesTrend, setLogisticsExceptions, setInventoryAlerts } = get();
    setLoading(true);
    setError(null);
    try {
      const data = await getAllDashboardData();
      setKpiData(data.kpi);
      setWarehouseTurnover(data.warehouseTurnover);
      setPortClearanceTime(data.portClearance);
      setSalesTrend(data.salesTrend);
      setLogisticsExceptions(data.logisticsExceptions);
      setInventoryAlerts(data.inventoryAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据加载失败');
    } finally {
      setLoading(false);
    }
  },
}));
