// src/pages/ProductsPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, LayoutGrid, List, MoreVertical,
  Trash2, Archive, Eye, EyeOff, Layers, Package
} from 'lucide-react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import {
  StatusBadge, MarketplaceBadge, EmptyState, LoadingSpinner, Pagination, ConfirmDialog
} from '../components/common';
import { products } from '../api/endpoints';
import { formatCurrency, truncate, conditionLabels, timeAgo } from '../utils/helpers';

export default function ProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selected, setSelected] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', { page, search, status: statusFilter }],
    queryFn: () => products.list({ page, limit: 24, search, status: statusFilter || undefined }),
  });

  const bulkMutation = useMutation({
    mutationFn: (data) => products.bulkStatus(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setSelected(new Set());
      toast.success('Products updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => products.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('Product deleted');
    },
  });

  const productList = data?.data || [];
  const pagination = data?.pagination || {};

  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === productList.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(productList.map((p) => p.id)));
    }
  };

  const handleBulkAction = (status) => {
    bulkMutation.mutate({ productIds: [...selected], status });
  };

  return (
    <div>
      <Header title="Products" subtitle={`${pagination.total || 0} total products`} />

      <div className="p-6">
        {/* ─── Toolbar ─── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by title, brand, SKU…"
                className="input-field pl-10"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="input-field w-auto"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="sold">Sold</option>
              <option value="not_for_sale">Not for Sale</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-surface-100 rounded-xl border border-surface-300/40 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-surface-300/60 text-surface-900' : 'text-surface-500'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-surface-300/60 text-surface-900' : 'text-surface-500'}`}
              >
                <List size={16} />
              </button>
            </div>

            <button onClick={() => navigate('/products/new')} className="btn-primary">
              <Plus size={16} /> Add Product
            </button>
          </div>
        </div>

        {/* ─── Bulk Actions Bar ─── */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-brand-600/10 border border-brand-500/20 rounded-xl animate-slide-up">
            <input
              type="checkbox"
              checked={selected.size === productList.length}
              onChange={selectAll}
              className="rounded"
            />
            <span className="text-sm text-brand-400 font-medium">{selected.size} selected</span>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={() => handleBulkAction('active')} className="btn-secondary btn-sm">
                <Eye size={14} /> Activate
              </button>
              <button onClick={() => handleBulkAction('not_for_sale')} className="btn-secondary btn-sm">
                <EyeOff size={14} /> Mark NFS
              </button>
              <button onClick={() => handleBulkAction('archived')} className="btn-secondary btn-sm">
                <Archive size={14} /> Archive
              </button>
              <button onClick={() => navigate('/listings/cross-list?ids=' + [...selected].join(','))} className="btn-primary btn-sm">
                <Layers size={14} /> Cross-List
              </button>
            </div>
          </div>
        )}

        {/* ─── Product Grid ─── */}
        {isLoading ? (
          <LoadingSpinner />
        ) : productList.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add your first product to start cross-listing across marketplaces"
            action={
              <button onClick={() => navigate('/products/new')} className="btn-primary">
                <Plus size={16} /> Add First Product
              </button>
            }
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {productList.map((product) => (
              <div
                key={product.id}
                className="glass-card overflow-hidden group cursor-pointer hover:border-surface-400/60 transition-all duration-200"
                onClick={() => navigate(`/products/${product.id}`)}
              >
                {/* Image */}
                <div className="relative aspect-square bg-surface-200/30">
                  {product.primary_image ? (
                    <img
                      src={product.primary_image.url}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={32} className="text-surface-400" />
                    </div>
                  )}
                  {/* Checkbox overlay */}
                  <div className="absolute top-3 left-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="w-4 h-4 rounded border-surface-400 bg-surface-200/80 opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity cursor-pointer"
                    />
                  </div>
                  <div className="absolute top-3 right-3">
                    <StatusBadge status={product.status} />
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <p className="font-medium text-surface-900 text-sm leading-snug line-clamp-2">{product.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {product.brand && (
                      <span className="text-xs text-surface-500">{product.brand}</span>
                    )}
                    {product.size && (
                      <span className="text-xs text-surface-500">· {product.size}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-300/20">
                    <span className="font-display font-bold text-surface-950">
                      {formatCurrency(product.base_price)}
                    </span>
                    <span className="text-xs text-surface-500 font-mono">
                      {product.sku}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-300/30">
                  <th className="text-left py-3 px-4 text-xs text-surface-500 font-medium w-8">
                    <input type="checkbox" checked={selected.size === productList.length} onChange={selectAll} className="rounded" />
                  </th>
                  <th className="text-left py-3 px-4 text-xs text-surface-500 font-medium">Product</th>
                  <th className="text-left py-3 px-4 text-xs text-surface-500 font-medium">SKU</th>
                  <th className="text-left py-3 px-4 text-xs text-surface-500 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-xs text-surface-500 font-medium">Price</th>
                  <th className="text-right py-3 px-4 text-xs text-surface-500 font-medium">Cost</th>
                  <th className="text-left py-3 px-4 text-xs text-surface-500 font-medium">Listed</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-300/15">
                {productList.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-surface-100/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-200/40 overflow-hidden flex-shrink-0">
                          {product.primary_image ? (
                            <img src={product.primary_image.thumbnail_url || product.primary_image.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={14} className="text-surface-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-surface-900 truncate max-w-xs">{product.title}</p>
                          <p className="text-xs text-surface-500">{product.brand} {product.size && `· ${product.size}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs text-surface-500">{product.sku}</span>
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={product.status} /></td>
                    <td className="py-3 px-4 text-right font-display font-semibold text-surface-900">{formatCurrency(product.base_price)}</td>
                    <td className="py-3 px-4 text-right text-sm text-surface-500">{formatCurrency(product.cost_price)}</td>
                    <td className="py-3 px-4 text-sm text-surface-500">{timeAgo(product.first_listed_at)}</td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setConfirmDelete(product.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-surface-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={pagination.totalPages || 1} onPageChange={setPage} />
      </div>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          deleteMutation.mutate(confirmDelete);
          setConfirmDelete(null);
        }}
        title="Delete Product"
        message="This will remove the product and delist it from all marketplaces. This cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}
