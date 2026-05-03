import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './context/authStore';

// Layouts
import AdminLayout    from './components/layout/AdminLayout';
import OperatorLayout from './components/layout/OperatorLayout';
import SellerLayout   from './components/layout/SellerLayout';

// Auth pages
import LoginPage       from './pages/auth/LoginPage';
import SellerLoginPage from './pages/auth/SellerLoginPage';

// Admin pages
import AdminDashboard  from './pages/admin/AdminDashboard';
import ProductsPage    from './pages/ProductsPage';
import InventoryPage   from './pages/InventoryPage';
import TransactionsPage from './pages/TransactionsPage';
import ReportsPage     from './pages/ReportsPage';
import UsersPage       from './pages/admin/UsersPage';

// Operator pages
import OperatorDashboard from './pages/operator/OperatorDashboard';

// Seller pages
import SellerDashboard from './pages/seller/SellerDashboard';
import POSPage         from './pages/seller/POSPage';
import SellerSettings  from './pages/seller/SellerSettings';

// ── Route Guards ──────────────────────────────────────────────────────────────

const RequireAuth = ({ children }) => {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
};

const RequireRole = ({ roles, children }) => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { token, user } = useAuthStore();
  if (!token) return children;
  // Redirect based on role
  if (user?.role === 'SELLER')   return <Navigate to="/pos" replace />;
  if (user?.role === 'OPERATOR') return <Navigate to="/operator" replace />;
  return <Navigate to="/dashboard" replace />;
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1d26', color: '#e8eaf2',
            border: '1px solid #2a2e3d', fontFamily: 'DM Sans, sans-serif',
          },
        }}
      />
      <Routes>
        {/* ── Public ────────────────────────────────────────────────────── */}
        <Route path="/login"        element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/seller-login" element={<PublicRoute><SellerLoginPage /></PublicRoute>} />

        {/* ── Admin routes ──────────────────────────────────────────────── */}
        <Route path="/" element={
          <RequireAuth><RequireRole roles={['ADMIN']}><AdminLayout /></RequireRole></RequireAuth>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"    element={<AdminDashboard />} />
          <Route path="products"     element={<ProductsPage />} />
          <Route path="inventory"    element={<InventoryPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="reports"      element={<ReportsPage />} />
          <Route path="users"        element={<UsersPage />} />
        </Route>

        {/* ── Operator routes ───────────────────────────────────────────── */}
        <Route path="/operator" element={
          <RequireAuth><RequireRole roles={['OPERATOR']}><OperatorLayout /></RequireRole></RequireAuth>
        }>
          <Route index element={<OperatorDashboard />} />
          <Route path="inventory"    element={<InventoryPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="products"     element={<ProductsPage />} />
        </Route>

        {/* ── Seller routes ─────────────────────────────────────────────── */}
        <Route path="/pos" element={
          <RequireAuth><RequireRole roles={['SELLER']}><SellerLayout /></RequireRole></RequireAuth>
        }>
          <Route index element={<SellerDashboard />} />
          <Route path="sale"     element={<POSPage />} />
          <Route path="settings" element={<SellerSettings />} />
        </Route>

        {/* ── Fallbacks ─────────────────────────────────────────────────── */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<SmartRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

function SmartRedirect() {
  const { user, token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role === 'SELLER')   return <Navigate to="/pos" replace />;
  if (user?.role === 'OPERATOR') return <Navigate to="/operator" replace />;
  return <Navigate to="/dashboard" replace />;
}

function UnauthorizedPage() {
  const { logout } = useAuthStore();
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '1rem', background: 'var(--bg)', color: 'var(--text)',
    }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}>🚫 Нет доступа</h1>
      <p style={{ color: 'var(--text-3)' }}>У вас недостаточно прав для этой страницы.</p>
      <button onClick={logout} style={{
        padding: '0.6rem 1.4rem', background: 'var(--accent)', color: '#fff',
        border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600,
      }}>Выйти</button>
    </div>
  );
}
