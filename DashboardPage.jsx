// src/pages/DashboardPage.jsx
import { useQuery } from '@tanstack/react-query';
import {
  Package, Layers, DollarSign, TrendingUp, ShoppingBag, Eye, Heart, RotateCcw
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import Header from '../components/layout/Header';
import { StatCard, StatusBadge, MarketplaceBadge, LoadingSpinner, EmptyState } from '../components/common';
import { products, sales, listings } from '../api/endpoints';
import { formatCurrency, formatDate, marketplaceColors } from '../utils/helpers';

// Demo data for charts (replace with real API data)
const revenueData = [
  { date: 'Mon', revenue: 145, sales: 3 },
  { date: 'Tue', revenue: 220, sales: 5 },
  { date: 'Wed', revenue: 89, sales: 2 },
  { date: 'Thu', revenue: 310, sales: 7 },
  { date: 'Fri', revenue: 195, sales: 4 },
  { date: 'Sat', revenue: 420, sales: 9 },
  { date: 'Sun', revenue: 280, sales: 6 },
];

const marketplaceData = [
  { name: 'eBay', value: 42, color: '#3b82f6' },
  { name: 'Poshmark', value: 28, color: '#ef4444' },
  { name: 'Mercari', value: 18, color: '#fb7185' },
  { name: 'Depop', value: 12, color: '#f97316' },
];

export default function DashboardPage() {
  const { data: productStats, isLoading: loadingProducts } = useQuery({
    queryKey: ['productStats'],
    queryFn: () => products.stats(),
  });

  const { data: salesSummary, isLoading: loadingSales } = useQuery({
    queryKey: ['salesSummary'],
    queryFn: () => sales.summary(),
  });

  const { data: recentSales, isLoading: loadingRecent } = useQuery({
    queryKey: ['recentSales'],
    queryFn: () => sales.list({ limit: 5 }),
  });

  const stats = productStats?.data || {};
  const summary = salesSummary?.data || {};

  return (
    <div>
      <Header title="Dashboard" subtitle="Your reselling command center" />

      <div className="p-6 space-y-6">
        {/* ─── Top Stats ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Listings"
            value={parseInt(stats.active_count) || 0}
            icon={Layers}
            color="brand"
            change={12}
          />
          <StatCard
            label="Total Revenue"
            value={parseFloat(summary.total_revenue) || 0}
            prefix="$"
            icon={DollarSign}
            color="amber"
            change={8}
          />
          <StatCard
            label="Items Sold"
            value={parseInt(summary.total_sales) || 0}
            icon={ShoppingBag}
            color="violet"
            change={15}
          />
          <StatCard
            label="Total Profit"
            value={parseFloat(summary.total_profit) || 0}
            prefix="$"
            icon={TrendingUp}
            color="coral"
            change={-3}
          />
        </div>

        {/* ─── Charts Row ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 glass-card p-5">
            <h3 className="font-display font-semibold text-surface-900 mb-4">Revenue This Week</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22a899" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22a899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#718096', fontSize: 12, fontFamily: 'IBM Plex Sans' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#718096', fontSize: 12, fontFamily: 'IBM Plex Sans' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#171d2b',
                      border: '1px solid rgba(49,59,82,0.6)',
                      borderRadius: '0.75rem',
                      fontSize: '0.8rem',
                      fontFamily: 'IBM Plex Sans',
                      color: '#e2e8f0',
                    }}
                    formatter={(value) => [`$${value}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#22a899"
                    strokeWidth={2.5}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Marketplace Breakdown */}
          <div className="glass-card p-5">
            <h3 className="font-display font-semibold text-surface-900 mb-4">By Marketplace</h3>
            <div className="h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={marketplaceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {marketplaceData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#171d2b',
                      border: '1px solid rgba(49,59,82,0.6)',
                      borderRadius: '0.75rem',
                      fontSize: '0.8rem',
                      color: '#e2e8f0',
                    }}
                    formatter={(value) => [`${value}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {marketplaceData.map((m) => (
                <div key={m.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
                    <span className="text-surface-700">{m.name}</span>
                  </div>
                  <span className="text-surface-500 font-mono text-xs">{m.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Quick Stats Row ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-200/50 flex items-center justify-center">
              <Package size={18} className="text-surface-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Drafts</p>
              <p className="font-display font-bold text-surface-900">{parseInt(stats.draft_count) || 0}</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-200/50 flex items-center justify-center">
              <Eye size={18} className="text-surface-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Avg Days Listed</p>
              <p className="font-display font-bold text-surface-900">{Math.round(stats.avg_days_listed || 0)}</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-200/50 flex items-center justify-center">
              <DollarSign size={18} className="text-surface-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Avg Sale Price</p>
              <p className="font-display font-bold text-surface-900">{formatCurrency(summary.avg_sale_price)}</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-200/50 flex items-center justify-center">
              <TrendingUp size={18} className="text-surface-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Inventory Value</p>
              <p className="font-display font-bold text-surface-900">{formatCurrency(stats.active_value)}</p>
            </div>
          </div>
        </div>

        {/* ─── Recent Sales ─── */}
        <div className="glass-card">
          <div className="px-5 py-4 border-b border-surface-300/30">
            <h3 className="font-display font-semibold text-surface-900">Recent Sales</h3>
          </div>
          {loadingRecent ? (
            <LoadingSpinner />
          ) : (recentSales?.data?.data || []).length === 0 ? (
            <EmptyState title="No sales yet" description="Your sales will appear here once items sell" />
          ) : (
            <div className="divide-y divide-surface-300/20">
              {(recentSales?.data?.data || []).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-100/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-surface-200/50 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag size={16} className="text-brand-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-900 truncate">{sale.product_title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <MarketplaceBadge marketplace={sale.marketplace_id} />
                        <span className="text-xs text-surface-500">{formatDate(sale.sold_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="font-display font-bold text-surface-900">{formatCurrency(sale.sale_price)}</p>
                    <p className={`text-xs font-medium ${sale.profit >= 0 ? 'text-emerald-400' : 'text-accent-coral'}`}>
                      {sale.profit >= 0 ? '+' : ''}{formatCurrency(sale.profit)} profit
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
