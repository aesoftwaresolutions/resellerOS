// src/components/layout/Header.jsx
import { Search, Bell, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header({ title, subtitle }) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-surface-0/80 backdrop-blur-xl border-b border-surface-300/20">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Title */}
        <div>
          <h1 className="font-display font-bold text-xl text-surface-950">{title}</h1>
          {subtitle && <p className="text-sm text-surface-500 mt-0.5">{subtitle}</p>}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, listings…"
              className="w-64 bg-surface-100 border border-surface-300/40 rounded-xl pl-10 pr-4 py-2
                text-sm text-surface-900 placeholder-surface-500
                focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20
                transition-all duration-200"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-surface-500 bg-surface-200 px-1.5 py-0.5 rounded font-mono">
              ⌘K
            </kbd>
          </div>

          {/* Notifications */}
          <button className="relative p-2.5 rounded-xl bg-surface-100 border border-surface-300/40
            text-surface-600 hover:text-surface-900 hover:bg-surface-200 transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-coral rounded-full" />
          </button>

          {/* Quick add */}
          <button
            onClick={() => navigate('/products/new')}
            className="btn-primary btn-sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Product</span>
          </button>
        </div>
      </div>
    </header>
  );
}
