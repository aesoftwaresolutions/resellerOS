// src/pages/AIPricingPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Brain, TrendingUp, TrendingDown, Minus, DollarSign, Zap,
  BarChart3, Target, AlertTriangle, Plus, Trash2, ToggleLeft, ToggleRight,
  Sparkles, ArrowRight, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { StatCard, Modal, LoadingSpinner, EmptyState } from '../components/common';
import { products, ai } from '../api/endpoints';
import { formatCurrency } from '../utils/helpers';

// ─── Demand Score Gauge ───
function DemandGauge({ score, label }) {
  const color = score >= 70 ? '#22a899' : score >= 40 ? '#FFAB4C' : '#FF6B6B';
  const data = [{ name: 'score', value: score, fill: color }];
  return (
    <div className="flex flex-col items-center">
      <div className="w-32 h-20 relative">
        <ResponsiveContainer width="100%" height={80}>
          <RadialBarChart
            cx="50%" cy="100%" innerRadius="70%" outerRadius="100%"
            startAngle={180} endAngle={0} data={data}
          >
            <RadialBar background={{ fill: '#1e2536' }} dataKey="value" cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <span className="font-display font-bold text-xl" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-xs text-surface-500 mt-1">{label}</span>
    </div>
  );
}

// ─── Price Suggestion Card ───
function PriceSuggestionCard({ product, onApply }) {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSuggestion = async () => {
    setLoading(true);
    try {
      const res = await ai.suggestedPrice(product.id);
      setSuggestion(res.data);
    } catch { /* handled */ }
    setLoading(false);
  };

  const trend = suggestion?.demandScore >= 70 ? 'hot' : suggestion?.demandScore >= 40 ? 'warm' : 'cold';
  const trendConfig = {
    hot: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'High Demand' },
    warm: { icon: Minus, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Moderate' },
    cold: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Low Demand' },
  };
  const t = trendConfig[trend];

  return (
    <div className="glass-card p-5 glow-border">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-surface-900 truncate">{product.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-surface-500">{product.brand}</span>
            {product.size && <span className="text-xs text-surface-500">· {product.size}</span>}
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <p className="text-xs text-surface-500">Current</p>
          <p className="font-display font-bold text-surface-900">{formatCurrency(product.base_price)}</p>
        </div>
      </div>

      {suggestion ? (
        <div className="space-y-3 animate-fade-in">
          {/* Suggestion */}
          <div className="flex items-center gap-4 p-3 bg-brand-600/10 border border-brand-500/20 rounded-xl">
            <div>
              <p className="text-xs text-brand-400 font-medium">AI Suggested Price</p>
              <p className="text-2xl font-display font-bold text-surface-950">{formatCurrency(suggestion.suggestedPrice)}</p>
            </div>
            <ArrowRight size={16} className="text-surface-500" />
            <div>
              <p className="text-xs text-surface-500">Range</p>
              <p className="text-sm font-mono text-surface-700">
                {formatCurrency(suggestion.priceRange?.low)} – {formatCurrency(suggestion.priceRange?.high)}
              </p>
            </div>
          </div>

          {/* Demand + confidence */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${t.bg} ${t.color}`}>
              <t.icon size={14} /> {t.label}
            </div>
            <span className="text-xs text-surface-500">
              {suggestion.confidence} confidence · {suggestion.comparablesCount} comps
            </span>
          </div>

          {suggestion.reasoning && (
            <p className="text-xs text-surface-600 italic">{suggestion.reasoning}</p>
          )}

          <button
            onClick={() => onApply(product.id, suggestion.suggestedPrice)}
            className="btn-primary btn-sm w-full"
          >
            Apply {formatCurrency(suggestion.suggestedPrice)}
          </button>
        </div>
      ) : (
        <button onClick={fetchSuggestion} disabled={loading} className="btn-secondary btn-sm w-full mt-2">
          {loading ? <><RefreshCw size={14} className="animate-spin" /> Analyzing…</> : <><Brain size={14} /> Get AI Price</>}
        </button>
      )}
    </div>
  );
}

// ─── Markdown Rule Row ───
function MarkdownRuleCard({ rule, onToggle, onDelete }) {
  const triggerLabels = {
    days_listed: 'After days listed',
    no_likes: 'No engagement',
    scheduled: 'Scheduled date',
    demand_drop: 'Demand drops',
    competitor_price: 'Competitor undercuts',
  };
  const actionLabels = {
    percentage_off: `${rule.action_value}% off`,
    fixed_reduction: `$${rule.action_value} off`,
    set_price: `Set to $${rule.action_value}`,
    match_lowest: 'Match lowest',
  };

  return (
    <div className="flex items-center justify-between p-4 bg-surface-100/50 rounded-xl border border-surface-300/30 hover:border-surface-400/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full ${rule.active ? 'bg-emerald-400' : 'bg-surface-500'}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-surface-900 truncate">{rule.name}</p>
          <p className="text-xs text-surface-500 mt-0.5">
            {triggerLabels[rule.trigger_type] || rule.trigger_type} → {actionLabels[rule.action_type] || rule.action_type}
            {rule.price_floor && ` · Floor: ${formatCurrency(rule.price_floor)}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <span className="text-xs text-surface-500 font-mono">{rule.times_applied || 0}x applied</span>
        <button onClick={() => onToggle(rule)} className="p-1.5 rounded-lg hover:bg-surface-200 transition-colors">
          {rule.active
            ? <ToggleRight size={20} className="text-brand-400" />
            : <ToggleLeft size={20} className="text-surface-500" />
          }
        </button>
        <button onClick={() => onDelete(rule.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-surface-500 hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function AIPricingPage() {
  const queryClient = useQueryClient();
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '', triggerType: 'days_listed', triggerDays: 30,
    actionType: 'percentage_off', actionValue: 10, priceFloor: '',
  });

  // Load products that need pricing
  const { data: productData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products', { status: 'active', limit: 12, sortBy: 'days_listed', sortOrder: 'desc' }],
    queryFn: () => products.list({ status: 'active', limit: 12, sortBy: 'days_listed', sortOrder: 'desc' }),
  });

  // Load pricing rules (mock for now — would be a real endpoint)
  const { data: rulesData } = useQuery({
    queryKey: ['pricingRules'],
    queryFn: async () => {
      // In production this hits /api/v1/pricing-rules
      // For now return demo data
      return {
        data: [
          { id: '1', name: '30-day markdown', trigger_type: 'days_listed', trigger_conditions: { days: 30 }, action_type: 'percentage_off', action_value: 10, price_floor: 15, active: true, times_applied: 23, scope: 'all_listings' },
          { id: '2', name: 'No engagement after 7 days', trigger_type: 'no_likes', trigger_conditions: { days: 7 }, action_type: 'percentage_off', action_value: 15, price_floor: 10, active: true, times_applied: 8, scope: 'all_listings' },
          { id: '3', name: '60-day clearance', trigger_type: 'days_listed', trigger_conditions: { days: 60 }, action_type: 'percentage_off', action_value: 25, price_floor: 8, active: false, times_applied: 5, scope: 'all_listings' },
        ],
      };
    },
  });

  const applyMarkdownsMut = useMutation({
    mutationFn: () => ai.applyMarkdowns(),
    onSuccess: (res) => {
      toast.success(`Applied ${res.data?.pricesUpdated || 0} price updates`);
      queryClient.invalidateQueries(['products']);
    },
  });

  const handleApplyPrice = async (productId, price) => {
    try {
      await products.update(productId, { basePrice: price });
      toast.success('Price updated');
      queryClient.invalidateQueries(['products']);
    } catch { /* handled */ }
  };

  const productList = productData?.data || [];
  const rules = rulesData?.data || [];

  // Demo analytics data
  const weeklyMarkdowns = [
    { day: 'Mon', count: 3, savings: 45 },
    { day: 'Tue', count: 7, savings: 112 },
    { day: 'Wed', count: 2, savings: 28 },
    { day: 'Thu', count: 5, savings: 73 },
    { day: 'Fri', count: 8, savings: 145 },
    { day: 'Sat', count: 12, savings: 198 },
    { day: 'Sun', count: 6, savings: 89 },
  ];

  return (
    <div>
      <Header title="AI Pricing" subtitle="Smart pricing suggestions, demand analysis, and automated markdowns" />

      <div className="p-6 space-y-6">
        {/* ─── Top Stats ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="AI Priced Items" value={47} icon={Brain} color="brand" />
          <StatCard label="Auto Markdowns" value={23} icon={TrendingDown} color="amber" change={15} />
          <StatCard label="Avg. Days to Sell" value={12} icon={Target} color="violet" change={-8} />
          <StatCard label="Revenue Recovered" value={1340} prefix="$" icon={DollarSign} color="coral" change={22} />
        </div>

        {/* ─── Markdown Rules + Chart ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Rules */}
          <div className="lg:col-span-3 glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-semibold text-surface-900">Smart Markdown Rules</h3>
                <p className="text-xs text-surface-500 mt-0.5">Automatically adjust prices based on conditions</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => applyMarkdownsMut.mutate()} disabled={applyMarkdownsMut.isLoading} className="btn-secondary btn-sm">
                  <Zap size={14} /> Run Now
                </button>
                <button onClick={() => setShowRuleModal(true)} className="btn-primary btn-sm">
                  <Plus size={14} /> Add Rule
                </button>
              </div>
            </div>

            {rules.length === 0 ? (
              <EmptyState icon={Sparkles} title="No pricing rules" description="Create rules to auto-adjust prices based on time, engagement, or demand" />
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <MarkdownRuleCard
                    key={rule.id}
                    rule={rule}
                    onToggle={(r) => toast.success(`Rule "${r.name}" ${r.active ? 'disabled' : 'enabled'}`)}
                    onDelete={(id) => toast.success('Rule deleted')}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="lg:col-span-2 glass-card p-5">
            <h3 className="font-display font-semibold text-surface-900 mb-4">Weekly Auto-Markdowns</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyMarkdowns}>
                  <XAxis dataKey="day" tick={{ fill: '#718096', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#718096', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#171d2b', border: '1px solid rgba(49,59,82,0.6)', borderRadius: '0.75rem', color: '#e2e8f0', fontSize: '0.8rem' }}
                    formatter={(v, name) => [name === 'count' ? `${v} items` : `$${v}`, name === 'count' ? 'Markdowns' : 'Value']}
                  />
                  <Bar dataKey="count" fill="#22a899" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <DemandGauge score={72} label="Avg Demand" />
              <DemandGauge score={85} label="Sell-Through" />
            </div>
          </div>
        </div>

        {/* ─── Product Price Suggestions ─── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-surface-900 text-lg">Price Suggestions</h3>
              <p className="text-sm text-surface-500">Get AI-powered pricing for your active listings</p>
            </div>
          </div>

          {loadingProducts ? <LoadingSpinner /> : productList.length === 0 ? (
            <EmptyState icon={Brain} title="No active products" description="Add active products to get pricing suggestions" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {productList.map((product) => (
                <PriceSuggestionCard key={product.id} product={product} onApply={handleApplyPrice} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── New Rule Modal ─── */}
      <Modal isOpen={showRuleModal} onClose={() => setShowRuleModal(false)} title="Create Markdown Rule" size="md">
        <div className="space-y-4">
          <div>
            <label className="input-label">Rule Name</label>
            <input value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} className="input-field" placeholder="e.g., 30-day price drop" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Trigger</label>
              <select value={newRule.triggerType} onChange={e => setNewRule(p => ({ ...p, triggerType: e.target.value }))} className="input-field">
                <option value="days_listed">After X days listed</option>
                <option value="no_likes">No engagement after X days</option>
                <option value="scheduled">On specific date</option>
              </select>
            </div>
            <div>
              <label className="input-label">Days</label>
              <input type="number" min="1" value={newRule.triggerDays} onChange={e => setNewRule(p => ({ ...p, triggerDays: e.target.value }))} className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Action</label>
              <select value={newRule.actionType} onChange={e => setNewRule(p => ({ ...p, actionType: e.target.value }))} className="input-field">
                <option value="percentage_off">Percentage off</option>
                <option value="fixed_reduction">Fixed $ reduction</option>
                <option value="set_price">Set specific price</option>
              </select>
            </div>
            <div>
              <label className="input-label">{newRule.actionType === 'percentage_off' ? 'Percent' : 'Amount ($)'}</label>
              <input type="number" min="1" value={newRule.actionValue} onChange={e => setNewRule(p => ({ ...p, actionValue: e.target.value }))} className="input-field" />
            </div>
          </div>

          <div>
            <label className="input-label">Price Floor (minimum price)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 text-sm">$</span>
              <input type="number" step="0.01" value={newRule.priceFloor} onChange={e => setNewRule(p => ({ ...p, priceFloor: e.target.value }))} className="input-field pl-7" placeholder="0.00" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowRuleModal(false)} className="btn-secondary btn-sm">Cancel</button>
          <button onClick={() => { setShowRuleModal(false); toast.success('Rule created'); }} className="btn-primary btn-sm">
            <Plus size={14} /> Create Rule
          </button>
        </div>
      </Modal>
    </div>
  );
}
