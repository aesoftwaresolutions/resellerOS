// src/components/common/index.jsx
import { X, Inbox, Loader2, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { statusColors, marketplaceColors, formatCurrency, formatNumber } from '../../utils/helpers';

/* ─── Stat Card ─── */
export function StatCard({ label, value, change, icon: Icon, color = 'brand', prefix = '' }) {
  const colorMap = {
    brand: 'from-brand-600/20 to-brand-600/5 border-brand-500/20',
    coral: 'from-accent-coral/20 to-accent-coral/5 border-accent-coral/20',
    amber: 'from-accent-amber/20 to-accent-amber/5 border-accent-amber/20',
    violet: 'from-accent-violet/20 to-accent-violet/5 border-accent-violet/20',
    sky: 'from-accent-sky/20 to-accent-sky/5 border-accent-sky/20',
  };

  return (
    <div className={`glass-card p-5 bg-gradient-to-br ${colorMap[color]} glow-border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-surface-500 font-medium">{label}</p>
          <p className="text-2xl font-display font-bold text-surface-950 mt-1">
            {prefix}{typeof value === 'number' ? (prefix === '$' ? formatCurrency(value).replace('$', '') : formatNumber(value)) : value}
          </p>
          {change !== undefined && (
            <p className={`text-xs mt-1.5 font-medium ${change >= 0 ? 'text-emerald-400' : 'text-accent-coral'}`}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last period
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-surface-200/60 flex items-center justify-center">
            <Icon size={20} className="text-surface-600" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Status Badge ─── */
export function StatusBadge({ status }) {
  const cls = statusColors[status] || 'status-draft';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${cls}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

/* ─── Marketplace Badge ─── */
export function MarketplaceBadge({ marketplace, size = 'sm' }) {
  const colors = marketplaceColors[marketplace] || marketplaceColors.ebay;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span className={`inline-flex items-center rounded-lg font-medium border ${colors.bg} ${colors.text} ${colors.border} ${sizeClass}`}>
      {marketplace}
    </span>
  );
}

/* ─── Modal ─── */
export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  const sizeMap = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative ${sizeMap[size]} w-full glass-card p-6 animate-slide-up shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg text-surface-950">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-500 hover:text-surface-800 transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Empty State ─── */
export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-200/60 flex items-center justify-center mb-4">
        <Icon size={28} className="text-surface-500" />
      </div>
      <h3 className="font-display font-semibold text-surface-800 text-lg">{title}</h3>
      {description && <p className="text-sm text-surface-500 mt-1.5 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ─── Loading Spinner ─── */
export function LoadingSpinner({ size = 24 }) {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={size} className="animate-spin text-brand-500" />
    </div>
  );
}

/* ─── Page Loading ─── */
export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 size={32} className="animate-spin text-brand-500 mx-auto" />
        <p className="text-sm text-surface-500 mt-3">Loading…</p>
      </div>
    </div>
  );
}

/* ─── Pagination ─── */
export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-1 py-4">
      <p className="text-sm text-surface-500">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn-ghost btn-sm"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn-ghost btn-sm"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ─── Confirm Dialog ─── */
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', variant = 'danger' }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-surface-600 mb-6">{message}</p>
      <div className="flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
        <button onClick={onConfirm} className={`${variant === 'danger' ? 'btn-danger' : 'btn-primary'} btn-sm`}>
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
