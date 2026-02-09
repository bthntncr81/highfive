import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WebSocketProvider } from './context/WebSocketContext';

// Pages
import Login from './pages/Login';
import PinLogin from './pages/PinLogin';
import Dashboard from './pages/Dashboard';
import Tables from './pages/Tables';
import Menu from './pages/Menu';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Users from './pages/Users';
import StockManagement from './pages/StockManagement';
import MenuManagement from './pages/MenuManagement';
import HappyHourManagement from './pages/HappyHourManagement';
import CampaignsLoyalty from './pages/CampaignsLoyalty';
import RawMaterialsManagement from './pages/RawMaterialsManagement';
import CourierDashboard from './pages/CourierDashboard';

// Components
import Layout from './components/Layout';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Kurye rolü ise direkt kurye paneline yönlendir
  if (user?.role === 'COURIER') {
    return <Navigate to="/courier" replace />;
  }
  
  return <>{children}</>;
}

// Admin Route wrapper
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

// Courier Route wrapper
function CourierRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Sadece kurye veya admin erişebilir
  if (user?.role !== 'COURIER' && user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <CartProvider>
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/pin" element={<PinLogin />} />
            
            {/* Courier route - standalone page */}
            <Route
              path="/courier"
              element={
                <CourierRoute>
                  <CourierDashboard />
                </CourierRoute>
              }
            />
            
            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="tables" element={<Tables />} />
              <Route path="menu" element={<Menu />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="stock" element={<StockManagement />} />
              
              {/* Admin routes */}
              <Route
                path="menu-management"
                element={
                  <AdminRoute>
                    <MenuManagement />
                  </AdminRoute>
                }
              />
              <Route
                path="happy-hour"
                element={
                  <AdminRoute>
                    <HappyHourManagement />
                  </AdminRoute>
                }
              />
              <Route
                path="raw-materials"
                element={
                  <AdminRoute>
                    <RawMaterialsManagement />
                  </AdminRoute>
                }
              />
              <Route
                path="campaigns"
                element={
                  <AdminRoute>
                    <CampaignsLoyalty />
                  </AdminRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <AdminRoute>
                    <Reports />
                  </AdminRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <AdminRoute>
                    <Settings />
                  </AdminRoute>
                }
              />
              <Route
                path="users"
                element={
                  <AdminRoute>
                    <Users />
                  </AdminRoute>
                }
              />
            </Route>
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </WebSocketProvider>
    </AuthProvider>
  );
}
