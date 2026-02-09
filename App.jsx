// src/App.jsx
import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from './contexts/authStore';
import AppShell from './components/layout/AppShell';
import { PageLoading } from './components/common';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ProductFormPage from './pages/ProductFormPage';
import ListingsPage from './pages/ListingsPage';
import MarketplacesPage from './pages/MarketplacesPage';
import SalesPage from './pages/SalesPage';
import AIPricingPage from './pages/AIPricingPage';
import AutomationPage from './pages/AutomationPage';

// Auth guard
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  const location = useLocation();

  if (isLoading) return <PageLoading />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function GuestRoute({ children }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);

  if (isLoading) return <PageLoading />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

// Placeholder pages for features not yet built
function PlaceholderPage({ title, description }) {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center">
        <h2 className="font-display font-bold text-2xl text-surface-900">{title}</h2>
        <p className="text-surface-500 mt-2">{description}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-600/10 border border-brand-500/20 rounded-xl text-brand-400 text-sm font-medium">
          Coming Soon
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const init = useAuthStore(s => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

      {/* Protected routes inside AppShell */}
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:id" element={<ProductFormPage />} />
        <Route path="listings" element={<ListingsPage />} />
        <Route path="marketplaces" element={<MarketplacesPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="ai-pricing" element={<AIPricingPage />} />
        <Route path="automation" element={<AutomationPage />} />
        <Route path="analytics" element={<PlaceholderPage title="Analytics" description="Revenue charts, sell-through rates, marketplace performance, and more" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" description="Account settings, billing, team management, and preferences" />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
