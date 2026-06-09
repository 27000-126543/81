import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Home from './pages/Home';
import InventoryOverview from './pages/inventory/Overview';
import InventoryAlerts from './pages/inventory/Alerts';
import InventoryTransfers from './pages/inventory/Transfers';
import OrderList from './pages/orders/List';
import OrderFulfillment from './pages/orders/Fulfillment';
import CustomsTracking from './pages/customs/Tracking';
import CustomsWorkOrders from './pages/customs/WorkOrders';
import LogisticsTracking from './pages/logistics/Tracking';
import LogisticsExceptions from './pages/logistics/Exceptions';
import ReturnList from './pages/returns/List';
import ReportsAnalytics from './pages/reports/Analytics';
import SystemUsers from './pages/system/Users';
import SystemRules from './pages/system/Rules';
import ConsumerOrders from './pages/consumer/Orders';
import type { UserRole } from './types';

interface RouteConfig {
  path: string;
  element: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: string;
}

const ForbiddenPage = () => (
  <div className="min-h-screen bg-bg-dark flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-6xl font-bold gradient-text mb-4">403</h1>
      <p className="text-text-secondary text-xl mb-6">没有权限访问该页面</p>
      <button
        onClick={() => window.history.back()}
        className="btn btn-primary"
      >
        返回上一页
      </button>
    </div>
  </div>
);

const NotFoundPage = () => (
  <div className="min-h-screen bg-bg-dark flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-6xl font-bold gradient-text mb-4">404</h1>
      <p className="text-text-secondary text-xl mb-6">页面不存在</p>
      <button
        onClick={() => (window.location.href = '/dashboard')}
        className="btn btn-primary"
      >
        返回首页
      </button>
    </div>
  </div>
);

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="card">
    <h1 className="text-2xl font-bold text-text-primary mb-4">{title}</h1>
    <p className="text-text-muted">该页面正在开发中...</p>
  </div>
);

const consumerRoutes: RouteConfig[] = [
  {
    path: '/consumer/orders',
    element: <ConsumerOrders />,
    allowedRoles: ['consumer'],
  },
];

const internalRoutes: RouteConfig[] = [
  {
    path: '/dashboard',
    element: <Home />,
    allowedRoles: ['warehouse_manager', 'customs_officer', 'operation_director', 'admin'],
  },
  {
    path: '/inventory/overview',
    element: <InventoryOverview />,
    allowedRoles: ['warehouse_manager', 'operation_director', 'admin'],
  },
  {
    path: '/inventory/alerts',
    element: <InventoryAlerts />,
    allowedRoles: ['warehouse_manager', 'operation_director', 'admin'],
  },
  {
    path: '/inventory/transfers',
    element: <InventoryTransfers />,
    allowedRoles: ['warehouse_manager', 'operation_director', 'admin'],
  },
  {
    path: '/orders/list',
    element: <OrderList />,
    allowedRoles: ['warehouse_manager', 'operation_director', 'admin'],
  },
  {
    path: '/orders/fulfillment',
    element: <OrderFulfillment />,
    allowedRoles: ['warehouse_manager', 'operation_director', 'admin'],
  },
  {
    path: '/customs/tracking',
    element: <CustomsTracking />,
    allowedRoles: ['customs_officer', 'operation_director', 'admin'],
  },
  {
    path: '/customs/work-orders',
    element: <CustomsWorkOrders />,
    allowedRoles: ['customs_officer', 'operation_director', 'admin'],
  },
  {
    path: '/logistics/tracking',
    element: <LogisticsTracking />,
    allowedRoles: ['warehouse_manager', 'operation_director', 'admin'],
  },
  {
    path: '/logistics/exceptions',
    element: <LogisticsExceptions />,
    allowedRoles: ['warehouse_manager', 'operation_director', 'admin'],
  },
  {
    path: '/returns',
    element: <ReturnList />,
    allowedRoles: ['warehouse_manager', 'operation_director', 'admin'],
  },
  {
    path: '/reports',
    element: <ReportsAnalytics />,
    allowedRoles: ['operation_director', 'admin'],
  },
  {
    path: '/system/users',
    element: <SystemUsers />,
    allowedRoles: ['admin'],
  },
  {
    path: '/system/rules',
    element: <SystemRules />,
    allowedRoles: ['admin'],
  },
];

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage />} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route
          element={
            <ProtectedRoute
              allowedRoles={[
                'warehouse_manager',
                'customs_officer',
                'operation_director',
                'admin',
                'consumer',
              ]}
            >
              <Layout />
            </ProtectedRoute>
          }
        >
          {internalRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute
                  allowedRoles={route.allowedRoles}
                  requiredPermission={route.requiredPermission}
                >
                  {route.element}
                </ProtectedRoute>
              }
            />
          ))}

          {consumerRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute
                  allowedRoles={route.allowedRoles}
                  requiredPermission={route.requiredPermission}
                >
                  {route.element}
                </ProtectedRoute>
              }
            />
          ))}
        </Route>

        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Router>
  );
}
