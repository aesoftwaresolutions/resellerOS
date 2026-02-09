// src/pages/SalesPage.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, ShoppingBag, Percent } from 'lucide-react';
import Header from '../components/layout/Header';
import { StatCard, StatusBadge, MarketplaceBadge, EmptyState, LoadingSpinner, Pagination } from '../components/common';
import { sales } from '../api/endpoints';
import { formatCurrency, formatDate } from '../utils/helpers';

export default function SalesPage() {
  const [page, setPage] = useState(1);

  const { data: summary } = useQuery({
    queryKey: ['salesSummary'],
    queryFn: () => sales.summary(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sales', { page }],
    queryFn: () => sales.list({ page, limit: 25 }),
  });

  const s = summary?.data || {};
  const saleList = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      <Header title="Sales" subtitle="Track revenue, profit, and order fulfillment" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Revenue" value={parseFloat(s.total_revenue) || 0} prefix="$" icon={DollarSign} color="amber" />
          <StatCard label="Total Profit" value={parseFloat(s.total_profit) || 0} prefix="$" icon={TrendingUp} color="brand" />
          <StatCard label="Items Sold" value={parseInt(s.total_sales) || 0} icon={ShoppingBag} color="violet" />
          <StatCard label="Avg Profit" value={parseFloat(s.avg_profit) || 0} prefix="$" icon={Percent} color="sky" />
        </div>

        {/* Sales table */}
        {isLoading ? <LoadingSpinner /> : saleList.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No sales yet" description="Sales will show up here as items sell on connected marketplaces" />
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-300/30">
                  <th className="text-left py-3 px-4 text-xs text-surface-500 font-medium">Product</th>
                  <th className="text-left py-3 px-4 text-xs text-surface-500 font-medium">Marketplace</th>
                  <th className="text-left py-3 px-4 text-xs text-surface-500 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-xs text-surface-500 font-medium">Sale Price</th>
                  <th className="text-right py-3 px-4 text-xs text-surface-500 font-medium">Fees</th>
                  <th className="text-right py-3 px-4 text-xs text-surface-500 font-medium">Profit</th>
                  <th className="text-left py-3 px-4 text-xs text-surface-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-300/15">
                {saleList.map(sale => (
                  <tr key={sale.id} className="hover:bg-surface-100/50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-surface-900 truncate max-w-xs">{sale.product_title}</p>
                      <p className="text-xs text-surface-500">{sale.product_brand}</p>
                    </td>
                    <td className="py-3 px-4"><MarketplaceBadge marketplace={sale.marketplace_id} /></td>
                    <td className="py-3 px-4"><StatusBadge status={sale.status} /></td>
                    <td className="py-3 px-4 text-right font-display font-semibold text-surface-900">{formatCurrency(sale.sale_price)}</td>
                    <td className="py-3 px-4 text-right text-sm text-surface-500">{formatCurrency(sale.marketplace_fee)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-display font-semibold ${parseFloat(sale.profit) >= 0 ? 'text-emerald-400' : 'text-accent-coral'}`}>
                        {formatCurrency(sale.profit)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-surface-500">{formatDate(sale.sold_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={pagination.totalPages || 1} onPageChange={setPage} />
      </div>
    </div>
  );
}
