// src/components/layout/Sidebar.jsx
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Layers, Store, DollarSign,
  Brain, Zap, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import useAuthStore from '../../contexts/authStore';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/products', icon: Package, label: 'Products' },
  { path: '/listings', icon: Layers, label: 'Listings' },
  { path: '/marketplaces', icon: Store, label: 'Marketplaces' },
  { path: '/sales', icon: DollarSign, label: 'Sales' },
  { path: '/ai-pricing', icon: Brain, label: 'AI Pricing' },
  { path: '/automation', icon: Zap, label: 'Automation' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-40 flex flex-col
        bg-surface-50/95 backdrop-blur-xl border-r border-surface-300/40
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[72px]' : 'w-[240px]'}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-surface-300/30">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-display font-bold text-sm">R</span>
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-lg text-surface-900 tracking-tight">
            Reseller<span className="text-brand-500">OS</span>
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <NavLink
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 group relative
                ${isActive
                  ? 'bg-brand-600/15 text-brand-400'
                  : 'text-surface-600 hover:text-surface-900 hover:bg-surface-200/60'
                }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r-full" />
              )}
              <Icon size={20} className={isActive ? 'text-brand-400' : 'text-surface-500 group-hover:text-surface-700'} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-surface-300/30 p-3 space-y-1">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-200/60 transition-colors"
        >
          <Settings size={20} />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>

        {/* User info */}
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-xl bg-surface-100">
            <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center">
              <span className="text-brand-400 font-display font-semibold text-xs">
                {user.first_name?.[0]}{user.last_name?.[0]}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-surface-800 truncate">{user.display_name}</p>
              <p className="text-xs text-surface-500 truncate">{user.subscription?.plan || 'Free'} plan</p>
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-surface-200 border border-surface-300/60 rounded-full
          flex items-center justify-center text-surface-600 hover:text-surface-900 hover:bg-surface-300
          transition-colors shadow-sm z-50"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
