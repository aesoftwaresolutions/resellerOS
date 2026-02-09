// src/pages/AutomationPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap, Share2, RefreshCw, Send, Clock, CheckCircle2, XCircle,
  Loader2, Play, Pause, Settings, BarChart3, Calendar, Flame
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { StatCard, Modal, EmptyState, LoadingSpinner } from '../components/common';
import { listings } from '../api/endpoints';

// Demo data
const TASK_HISTORY = [
  { id: '1', type: 'share', marketplace_id: 'poshmark', status: 'completed', product_title: 'Lululemon Align 25"', completed_at: '2025-02-09T14:30:00Z' },
  { id: '2', type: 'share', marketplace_id: 'poshmark', status: 'completed', product_title: 'Nike Dunk Low Panda', completed_at: '2025-02-09T14:28:00Z' },
  { id: '3', type: 'send_offer', marketplace_id: 'poshmark', status: 'completed', product_title: 'Free People Thermal', payload: { offerPrice: 35 }, completed_at: '2025-02-09T12:00:00Z' },
  { id: '4', type: 'relist', marketplace_id: 'mercari', status: 'completed', product_title: 'Vintage Levi\'s 501', completed_at: '2025-02-09T03:15:00Z' },
  { id: '5', type: 'push_listing', marketplace_id: 'ebay', status: 'failed', product_title: 'Coach Crossbody Bag', error: 'Token expired', completed_at: '2025-02-09T02:45:00Z' },
  { id: '6', type: 'share', marketplace_id: 'poshmark', status: 'queued', product_title: 'Reformation Dress', scheduled_for: '2025-02-09T18:00:00Z' },
  { id: '7', type: 'send_offer', marketplace_id: 'poshmark', status: 'queued', product_title: 'Aritzia TNA Hoodie', payload: { offerPrice: 28 }, scheduled_for: '2025-02-09T19:30:00Z' },
];

const ACTIVITY_CHART = [
  { hour: '6am', shares: 2, offers: 0, relists: 0 },
  { hour: '8am', shares: 8, offers: 1, relists: 0 },
  { hour: '10am', shares: 12, offers: 2, relists: 1 },
  { hour: '12pm', shares: 15, offers: 3, relists: 0 },
  { hour: '2pm', shares: 10, offers: 1, relists: 0 },
  { hour: '4pm', shares: 6, offers: 0, relists: 2 },
  { hour: '6pm', shares: 18, offers: 4, relists: 0 },
  { hour: '8pm', shares: 22, offers: 6, relists: 1 },
  { hour: '10pm', shares: 14, offers: 3, relists: 0 },
];

const WEEKLY_STATS = [
  { day: 'Mon', shared: 42, offers: 8, relisted: 3, sold: 2 },
  { day: 'Tue', shared: 55, offers: 12, relisted: 5, sold: 3 },
  { day: 'Wed', shared: 38, offers: 6, relisted: 2, sold: 1 },
  { day: 'Thu', shared: 61, offers: 14, relisted: 4, sold: 4 },
  { day: 'Fri', shared: 48, offers: 10, relisted: 3, sold: 2 },
  { day: 'Sat', shared: 72, offers: 18, relisted: 6, sold: 5 },
  { day: 'Sun', shared: 58, offers: 15, relisted: 4, sold: 3 },
];

// ─── Task type config ───
const TASK_CONFIG = {
  share: { icon: Share2, label: 'Share', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  send_offer: { icon: Send, label: 'Offer', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  relist: { icon: RefreshCw, label: 'Relist', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  push_listing: { icon: Zap, label: 'List', color: 'text-brand-400', bg: 'bg-brand-500/10' },
  delist: { icon: XCircle, label: 'Delist', color: 'text-red-400', bg: 'bg-red-500/10' },
  price_update: { icon: BarChart3, label: 'Price', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

const STATUS_ICON = {
  completed: <CheckCircle2 size={14} className="text-emerald-400" />,
  failed: <XCircle size={14} className="text-red-400" />,
  queued: <Clock size={14} className="text-amber-400" />,
  running: <Loader2 size={14} className="text-brand-400 animate-spin" />,
};

// ─── Automation Toggle Card ───
function AutoToggleCard({ icon: Icon, title, description, enabled, onToggle, stats, color = 'brand' }) {
  const colorClasses = {
    brand: 'border-brand-500/30 bg-brand-600/5',
    blue: 'border-blue-500/30 bg-blue-600/5',
    amber: 'border-amber-500/30 bg-amber-600/5',
    violet: 'border-violet-500/30 bg-violet-600/5',
  };

  return (
    <div className={`glass-card p-5 transition-all duration-200 ${enabled ? colorClasses[color] : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? `bg-${color === 'brand' ? 'brand' : color}-500/15` : 'bg-surface-200/50'}`}>
            <Icon size={20} className={enabled ? `text-${color === 'brand' ? 'brand' : color}-400` : 'text-surface-500'} />
          </div>
          <div>
            <h4 className="font-display font-semibold text-surface-900 text-sm">{title}</h4>
            <p className="text-xs text-surface-500 mt-0.5">{description}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-brand-600' : 'bg-surface-400'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {stats && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-surface-300/20">
          {stats.map((s, i) => (
            <div key={i}>
              <p className="text-lg font-display font-bold text-surface-900">{s.value}</p>
              <p className="text-xs text-surface-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings Modal ───
function AutomationSettingsModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState({
    shareInterval: 4,
    offerDiscount: 10,
    offerMinLikes: 1,
    relistInterval: 14,
    peakHoursOnly: true,
    maxSharesPerDay: 100,
    maxOffersPerDay: 20,
  });
  const u = (k, v) => setSettings(p => ({ ...p, [k]: v }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Automation Settings" size="md">
      <div className="space-y-5">
        {/* Sharing */}
        <div>
          <h4 className="font-display font-semibold text-surface-900 text-sm mb-3">Closet Sharing</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Share interval (hours)</label>
              <input type="number" min="1" max="24" value={settings.shareInterval} onChange={e => u('shareInterval', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="input-label">Max shares / day</label>
              <input type="number" min="10" max="500" value={settings.maxSharesPerDay} onChange={e => u('maxSharesPerDay', e.target.value)} className="input-field" />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input type="checkbox" checked={settings.peakHoursOnly} onChange={e => u('peakHoursOnly', e.target.checked)} className="rounded" />
            <span className="text-sm text-surface-700">Only share during peak engagement hours</span>
          </label>
        </div>

        {/* Offers */}
        <div>
          <h4 className="font-display font-semibold text-surface-900 text-sm mb-3">Offers to Likers</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Discount %</label>
              <input type="number" min="5" max="50" value={settings.offerDiscount} onChange={e => u('offerDiscount', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="input-label">Min likes to trigger</label>
              <input type="number" min="1" max="20" value={settings.offerMinLikes} onChange={e => u('offerMinLikes', e.target.value)} className="input-field" />
            </div>
          </div>
        </div>

        {/* Relisting */}
        <div>
          <h4 className="font-display font-semibold text-surface-900 text-sm mb-3">Auto Relist</h4>
          <div>
            <label className="input-label">Relist every (days)</label>
            <input type="number" min="7" max="90" value={settings.relistInterval} onChange={e => u('relistInterval', e.target.value)} className="input-field w-32" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
        <button onClick={() => { onClose(); toast.success('Settings saved'); }} className="btn-primary btn-sm">Save Settings</button>
      </div>
    </Modal>
  );
}

// ─── Main Page ───
export default function AutomationPage() {
  const [showSettings, setShowSettings] = useState(false);
  const [autoShare, setAutoShare] = useState(true);
  const [autoOffer, setAutoOffer] = useState(true);
  const [autoRelist, setAutoRelist] = useState(false);

  const completedToday = TASK_HISTORY.filter(t => t.status === 'completed').length;
  const queuedCount = TASK_HISTORY.filter(t => t.status === 'queued').length;
  const failedCount = TASK_HISTORY.filter(t => t.status === 'failed').length;

  return (
    <div>
      <Header title="Automation" subtitle="Auto-share, send offers, and relist on autopilot" />

      <div className="p-6 space-y-6">
        {/* ─── Top Stats ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Tasks Today" value={completedToday + queuedCount} icon={Zap} color="brand" />
          <StatCard label="Shares Today" value={142} icon={Share2} color="sky" change={18} />
          <StatCard label="Offers Sent" value={24} icon={Send} color="amber" change={12} />
          <StatCard label="Items Relisted" value={8} icon={RefreshCw} color="violet" change={-5} />
        </div>

        {/* ─── Automation Toggles ─── */}
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-surface-900 text-lg">Automation Controls</h3>
          <button onClick={() => setShowSettings(true)} className="btn-ghost btn-sm">
            <Settings size={14} /> Settings
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AutoToggleCard
            icon={Share2}
            title="Auto Share"
            description="Share your closet to followers on schedule"
            enabled={autoShare}
            onToggle={() => { setAutoShare(!autoShare); toast.success(autoShare ? 'Sharing paused' : 'Sharing enabled'); }}
            color="blue"
            stats={[
              { value: '142', label: 'today' },
              { value: '4h', label: 'interval' },
              { value: '98%', label: 'success' },
            ]}
          />
          <AutoToggleCard
            icon={Send}
            title="Auto Offers"
            description="Send offers to likers at optimal times"
            enabled={autoOffer}
            onToggle={() => { setAutoOffer(!autoOffer); toast.success(autoOffer ? 'Offers paused' : 'Offers enabled'); }}
            color="amber"
            stats={[
              { value: '24', label: 'today' },
              { value: '10%', label: 'discount' },
              { value: '32%', label: 'accepted' },
            ]}
          />
          <AutoToggleCard
            icon={RefreshCw}
            title="Auto Relist"
            description="Periodically delete & relist for fresh visibility"
            enabled={autoRelist}
            onToggle={() => { setAutoRelist(!autoRelist); toast.success(autoRelist ? 'Relisting paused' : 'Relisting enabled'); }}
            color="violet"
            stats={[
              { value: '8', label: 'today' },
              { value: '14d', label: 'interval' },
              { value: '↑ 23%', label: 'views boost' },
            ]}
          />
        </div>

        {/* ─── Charts ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's activity by hour */}
          <div className="glass-card p-5">
            <h3 className="font-display font-semibold text-surface-900 mb-4">Today's Activity</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ACTIVITY_CHART} barCategoryGap="20%">
                  <XAxis dataKey="hour" tick={{ fill: '#718096', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#718096', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#171d2b', border: '1px solid rgba(49,59,82,0.6)', borderRadius: '0.75rem', color: '#e2e8f0', fontSize: '0.8rem' }}
                  />
                  <Bar dataKey="shares" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} name="Shares" />
                  <Bar dataKey="offers" fill="#FFAB4C" stackId="a" name="Offers" />
                  <Bar dataKey="relists" fill="#a78bfa" stackId="a" radius={[4, 4, 0, 0]} name="Relists" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly trend */}
          <div className="glass-card p-5">
            <h3 className="font-display font-semibold text-surface-900 mb-4">Weekly Automation Trend</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={WEEKLY_STATS}>
                  <XAxis dataKey="day" tick={{ fill: '#718096', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#718096', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#171d2b', border: '1px solid rgba(49,59,82,0.6)', borderRadius: '0.75rem', color: '#e2e8f0', fontSize: '0.8rem' }}
                  />
                  <Line type="monotone" dataKey="shared" stroke="#3b82f6" strokeWidth={2} dot={false} name="Shares" />
                  <Line type="monotone" dataKey="offers" stroke="#FFAB4C" strokeWidth={2} dot={false} name="Offers" />
                  <Line type="monotone" dataKey="sold" stroke="#22a899" strokeWidth={2.5} dot={{ r: 3, fill: '#22a899' }} name="Sold" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ─── Task Queue / History ─── */}
        <div className="glass-card">
          <div className="px-5 py-4 border-b border-surface-300/30 flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold text-surface-900">Task Queue & History</h3>
              <p className="text-xs text-surface-500 mt-0.5">
                {queuedCount} queued · {completedToday} completed · {failedCount} failed
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-xs text-surface-500"><span className="w-2 h-2 rounded-full bg-amber-400" /> Queued</span>
              <span className="flex items-center gap-1 text-xs text-surface-500 ml-3"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Done</span>
              <span className="flex items-center gap-1 text-xs text-surface-500 ml-3"><span className="w-2 h-2 rounded-full bg-red-400" /> Failed</span>
            </div>
          </div>

          <div className="divide-y divide-surface-300/15">
            {TASK_HISTORY.map((task) => {
              const cfg = TASK_CONFIG[task.type] || TASK_CONFIG.share;
              const TaskIcon = cfg.icon;
              const time = task.completed_at || task.scheduled_for;
              const timeStr = time ? new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

              return (
                <div key={task.id} className="flex items-center justify-between px-5 py-3 hover:bg-surface-100/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                      <TaskIcon size={14} className={cfg.color} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-xs text-surface-400">·</span>
                        <span className="text-xs text-surface-500">{task.marketplace_id}</span>
                      </div>
                      <p className="text-sm text-surface-800 truncate">{task.product_title}</p>
                      {task.error && <p className="text-xs text-red-400 mt-0.5">{task.error}</p>}
                      {task.payload?.offerPrice && <p className="text-xs text-surface-500">Offer: ${task.payload.offerPrice}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className="text-xs text-surface-500 font-mono">{timeStr}</span>
                    {STATUS_ICON[task.status]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AutomationSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
