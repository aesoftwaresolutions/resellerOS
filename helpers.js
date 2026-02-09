// src/utils/helpers.js
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export const formatCurrency = (value) => {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value) => {
  if (value == null) return '0';
  return new Intl.NumberFormat('en-US').format(value);
};

export const formatDate = (date) => {
  if (!date) return '—';
  return dayjs(date).format('MMM D, YYYY');
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return dayjs(date).format('MMM D, YYYY h:mm A');
};

export const timeAgo = (date) => {
  if (!date) return '';
  return dayjs(date).fromNow();
};

export const statusColors = {
  active: 'status-active',
  sold: 'status-sold',
  draft: 'status-draft',
  pending: 'status-pending',
  error: 'status-error',
  delisted: 'status-delisted',
  not_for_sale: 'status-draft',
  archived: 'status-delisted',
  connected: 'status-active',
  disconnected: 'status-error',
};

export const marketplaceColors = {
  ebay: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', solid: '#3b82f6' },
  poshmark: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', solid: '#ef4444' },
  mercari: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', solid: '#fb7185' },
  depop: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', solid: '#f97316' },
  facebook: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30', solid: '#6366f1' },
  grailed: { bg: 'bg-stone-500/15', text: 'text-stone-400', border: 'border-stone-500/30', solid: '#78716c' },
};

export const conditionLabels = {
  new_with_tags: 'New with Tags',
  new_without_tags: 'New without Tags',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export const truncate = (str, len = 60) => {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '…' : str;
};

export const classNames = (...classes) => classes.filter(Boolean).join(' ');
