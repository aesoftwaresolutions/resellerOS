// src/pages/ListingsPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, RefreshCw, XCircle, ExternalLink, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { StatusBadge, MarketplaceBadge, EmptyState, LoadingSpinner, Pagination } from '../components/common';
import { listings } from '../api/endpoints';
import { formatCurrency, timeAgo } from '../utils/helpers';

export default function ListingsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [marketplaceFilter, setMarketplaceFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['listings', { page, status: statusFilter, marketplaceId: marketplaceFilter }],
    queryFn: () => listings.list({ page, limit: 25, status: statusFilter || undefined, marketplaceId: marketplaceFilter || undefined }),
  });

  const relistMut = useMutation({
    mutationFn: (id) => listings.relist(id),
    onSuccess: () => { queryClient.invalidateQueries(['listings']); toast.success('Relist queued'); },
  });

  const delistMut = useMutation({
    mutationFn: (id) => listings.delist(id),
    onSuccess: () => { queryClient.invalidateQueries(['listings']); toast.success('Delist queued'); },
  });

  const listingData = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      <Header title="Listings" subtitle={`${pagination.total || 0} listings across all marketplaces`} />

      <div className="p-6">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="sold">Sold</option>
            <option value="delisted">Delisted</option>
            <option value="error">Error</option>
          </select>
          <select value={marketplaceFilter} onChange={e => { setMarketplaceFilter(e.target.value); setPage(1); }} className="input-field w-auto">
            <option value="">All Marketplaces</option>
            <option value="ebay">eBay</option>
            <option value="poshmark">Poshmark</option>
            <option value="mercari">Mercari</option>
            <option value="depop">Depop</option>
            <option value="facebook">Facebook</option>
          </select>
        </div>

        {isLoading ? <LoadingSpinner /> : listingData.length === 0 ? (
          <EmptyState icon={Layers} title="No listings" description="Cross-list products from the Products page to see them here" />
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-300/30">
                  <th className="text-left py-3 px-4 text-xs text-surface-500 font-medium">Product</th>
                  <th className="text-left py-3 px-4 text-xs text-surface-500 font-medium">Marketplace</th>
                  <th className="text-left py-3 px-4 text-xs text-surface-500 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-xs text-surface-500 font-medium">Price</th>
                  <th className="text-right py-3 px-4 text-xs text-surface-500 font-medium">Est. Payout</th>
                  <th className="text-left py-3 px-4 text-xs text-surface-500 font-medium">Synced</th>
                  <th className="text-right py-3 px-4 text-xs text-surface-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-300/15">
                {listingData.map((listing) => (
                  <tr key={listing.id} className="hover:bg-surface-100/50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-surface-900 truncate max-w-xs">{listing.product_title}</p>
                      <p className="text-xs text-surface-500 font-mono">{listing.product_sku}</p>
                    </td>
                    <td className="py-3 px-4">
                      <MarketplaceBadge marketplace={listing.marketplace_id} />
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={listing.status} /></td>
                    <td className="py-3 px-4 text-right font-display font-semibold text-surface-900">{formatCurrency(listing.listed_price)}</td>
                    <td className="py-3 px-4 text-right text-sm text-surface-600">{formatCurrency(listing.estimated_payout)}</td>
                    <td className="py-3 px-4 text-xs text-surface-500">{listing.last_synced_at ? timeAgo(listing.last_synced_at) : '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {listing.external_url && (
                          <a href={listing.external_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-500 hover:text-brand-400 transition-colors">
                            <ExternalLink size={14} />
                          </a>
                        )}
                        {listing.status === 'active' && (
                          <>
                            <button onClick={() => relistMut.mutate(listing.id)} title="Relist" className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-500 hover:text-brand-400 transition-colors">
                              <RefreshCw size={14} />
                            </button>
                            <button onClick={() => delistMut.mutate(listing.id)} title="Delist" className="p-1.5 rounded-lg hover:bg-red-500/10 text-surface-500 hover:text-red-400 transition-colors">
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
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
