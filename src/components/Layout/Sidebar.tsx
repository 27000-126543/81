import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileScan,
  Truck,
  RotateCcw,
  BarChart3,
  Settings,
  User,
  ChevronDown,
  ChevronRight,
  PackageOpen,
  AlertTriangle,
  ArrowLeftRight,
  ListChecks,
  Brain,
  MapPin,
  AlertCircle,
  Users,
  Sliders,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { usePermission } from '../../utils/permission';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  children?: MenuItem[];
  roles?: string[];
}

const menuItems: MenuItem[] = [
  {
    path: '/dashboard',
    label: '首页大屏',
    icon: <LayoutDashboard size={20} />,
    roles: ['warehouse_manager', 'customs_officer', 'operation_director', 'admin'],
  },
  {
    path: '/inventory',
    label: '库存管理',
    icon: <Package size={20} />,
    roles: ['warehouse_manager', 'operation_director', 'admin'],
    children: [
      { path: '/inventory/overview', label: '库存总览', icon: <PackageOpen size={18} /> },
      { path: '/inventory/alerts', label: '库存预警', icon: <AlertTriangle size={18} /> },
      { path: '/inventory/transfers', label: '库存调拨', icon: <ArrowLeftRight size={18} /> },
    ],
  },
  {
    path: '/orders',
    label: '订单管理',
    icon: <ShoppingCart size={20} />,
    roles: ['warehouse_manager', 'operation_director', 'admin'],
    children: [
      { path: '/orders/list', label: '订单列表', icon: <ListChecks size={18} /> },
      { path: '/orders/fulfillment', label: '智能分仓', icon: <Brain size={18} /> },
    ],
  },
  {
    path: '/customs',
    label: '清关管理',
    icon: <FileScan size={20} />,
    roles: ['customs_officer', 'operation_director', 'admin'],
    children: [
      { path: '/customs/tracking', label: '清关追踪', icon: <MapPin size={18} /> },
      { path: '/customs/work-orders', label: '应急工单', icon: <AlertCircle size={18} /> },
    ],
  },
  {
    path: '/logistics',
    label: '物流管理',
    icon: <Truck size={20} />,
    roles: ['warehouse_manager', 'operation_director', 'admin'],
    children: [
      { path: '/logistics/tracking', label: '物流追踪', icon: <MapPin size={18} /> },
      { path: '/logistics/exceptions', label: '异常处理', icon: <AlertCircle size={18} /> },
    ],
  },
  {
    path: '/returns',
    label: '退货管理',
    icon: <RotateCcw size={20} />,
    roles: ['warehouse_manager', 'operation_director', 'admin'],
  },
  {
    path: '/reports',
    label: '报表分析',
    icon: <BarChart3 size={20} />,
    roles: ['operation_director', 'admin'],
  },
  {
    path: '/system',
    label: '系统管理',
    icon: <Settings size={20} />,
    roles: ['admin'],
    children: [
      { path: '/system/users', label: '用户管理', icon: <Users size={18} /> },
      { path: '/system/rules', label: '规则配置', icon: <Sliders size={18} /> },
    ],
  },
  {
    path: '/consumer/orders',
    label: '我的订单',
    icon: <User size={20} />,
    roles: ['consumer'],
  },
];

export default function Sidebar() {
  const { sidebarCollapsed } = useUIStore();
  const { canAccessMenu } = usePermission();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['/inventory', '/orders', '/customs', '/logistics', '/system']);

  const toggleExpand = (path: string) => {
    setExpandedMenus((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const filteredMenuItems = menuItems.filter((item) => canAccessMenu(item.path));

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside
      className={`h-full bg-bg-card border-r border-border-color flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="h-16 flex items-center justify-center border-b border-border-color">
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan to-primary rounded-lg flex items-center justify-center">
              <LayoutDashboard size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">SCM Pro</span>
          </div>
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-cyan to-primary rounded-lg flex items-center justify-center">
            <LayoutDashboard size={18} className="text-white" />
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {filteredMenuItems.map((item) => (
          <div key={item.path}>
            {item.children ? (
            <>
              <div
                className={`sidebar-item ${
                  isActive(item.path) ? 'sidebar-item-active' : ''
                }`}
                onClick={() => toggleExpand(item.path)}
              >
                {item.icon}
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {expandedMenus.includes(item.path) ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </>
                )}
              </div>
              {!sidebarCollapsed && expandedMenus.includes(item.path) && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.children
                    .filter((child) => canAccessMenu(child.path))
                    .map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `sidebar-item text-sm ${isActive ? 'sidebar-item-active' : ''}`
                        }
                      >
                        {child.icon}
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                </div>
              )}
            </>
          ) : (
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
              }
            >
              {item.icon}
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
