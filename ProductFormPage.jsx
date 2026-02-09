// src/pages/ProductFormPage.jsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Layers, Brain } from 'lucide-react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { PageLoading } from '../components/common';
import { products, ai } from '../api/endpoints';
import ImageUploader from '../components/products/ImageUploader';

const CATEGORIES = ['Clothing', 'Shoes', 'Accessories', 'Bags', 'Jewelry', 'Electronics', 'Home', 'Beauty', 'Vintage', 'Other'];
const CONDITIONS = [
  { value: 'new_with_tags', label: 'New with Tags' },
  { value: 'new_without_tags', label: 'New without Tags' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];
const SOURCES = [
  { value: 'thrift', label: 'Thrift Store' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'purchased', label: 'Retail Purchase' },
  { value: 'brand_return', label: 'Brand Returns' },
  { value: 'consignment', label: 'Consignment' },
  { value: 'dropship', label: 'Dropship' },
  { value: 'other', label: 'Other' },
];

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: '', description: '', brand: '', category: '', size: '', color: '',
    condition: 'good', material: '', tags: '',
    costPrice: '', basePrice: '', floorPrice: '',
    quantity: 1, sku: '', barcode: '', location: '',
    sourceType: 'thrift', sourceName: '', weightOz: '', status: 'draft',
  });
  const [aiPricing, setAiPricing] = useState(null);

  const { isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => products.get(id),
    enabled: isEdit,
    onSuccess: (data) => {
      const p = data.data;
      setForm({
        title: p.title || '', description: p.description || '', brand: p.brand || '',
        category: p.category || '', size: p.size || '', color: p.color || '',
        condition: p.condition || 'good', material: p.material || '',
        tags: (p.tags || []).join(', '), costPrice: p.cost_price || '',
        basePrice: p.base_price || '', floorPrice: p.floor_price || '',
        quantity: p.quantity || 1, sku: p.sku || '', barcode: p.barcode || '',
        location: p.location || '', sourceType: p.source_type || 'thrift',
        sourceName: p.source_name || '', weightOz: p.weight_oz || '', status: p.status || 'draft',
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit ? products.update(id, data) : products.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['products']);
      toast.success(isEdit ? 'Product updated' : 'Product created');
      navigate(isEdit ? `/products/${id}` : `/products/${res.data.id}`);
    },
  });

  const handleSave = (asDraft = false) => {
    if (!form.title.trim()) return toast.error('Title is required');
    saveMutation.mutate({
      ...form,
      status: asDraft ? 'draft' : 'active',
      costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
      basePrice: form.basePrice ? parseFloat(form.basePrice) : undefined,
      floorPrice: form.floorPrice ? parseFloat(form.floorPrice) : undefined,
      weightOz: form.weightOz ? parseFloat(form.weightOz) : undefined,
      quantity: parseInt(form.quantity) || 1,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
  };

  const getAiPrice = async () => {
    if (!isEdit) return toast.error('Save the product first to get AI pricing');
    try {
      const res = await ai.suggestedPrice(id);
      setAiPricing(res.data);
      toast.success('AI pricing suggestion ready');
    } catch { /* handled */ }
  };

  const u = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  if (isEdit && isLoading) return <PageLoading />;

  return (
    <div>
      <Header title={isEdit ? 'Edit Product' : 'New Product'} />
      <div className="p-6 max-w-5xl">
        <button onClick={() => navigate('/products')} className="btn-ghost btn-sm mb-5">
          <ArrowLeft size={16} /> Back to Products
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-display font-semibold text-surface-900">Basic Information</h3>
              <div>
                <label className="input-label">Title *</label>
                <input value={form.title} onChange={e => u('title', e.target.value)} className="input-field" placeholder="e.g., Lululemon Align 25&quot; Black Size 6" />
              </div>
              <div>
                <label className="input-label">Description</label>
                <textarea value={form.description} onChange={e => u('description', e.target.value)} rows={4} className="input-field resize-none" placeholder="Describe the item…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="input-label">Brand</label><input value={form.brand} onChange={e => u('brand', e.target.value)} className="input-field" /></div>
                <div><label className="input-label">Category</label>
                  <select value={form.category} onChange={e => u('category', e.target.value)} className="input-field">
                    <option value="">Select…</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="input-label">Size</label><input value={form.size} onChange={e => u('size', e.target.value)} className="input-field" /></div>
                <div><label className="input-label">Color</label><input value={form.color} onChange={e => u('color', e.target.value)} className="input-field" /></div>
                <div><label className="input-label">Condition</label>
                  <select value={form.condition} onChange={e => u('condition', e.target.value)} className="input-field">
                    {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="input-label">Tags (comma separated)</label><input value={form.tags} onChange={e => u('tags', e.target.value)} className="input-field" /></div>
            </div>

            {/* Pricing */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-surface-900">Pricing</h3>
                {isEdit && <button onClick={getAiPrice} className="btn-ghost btn-sm text-brand-400"><Brain size={14} /> Get AI Price</button>}
              </div>
              {aiPricing && (
                <div className="p-4 bg-brand-600/10 border border-brand-500/20 rounded-xl animate-slide-up">
                  <div className="flex items-center gap-2 mb-2"><Brain size={16} className="text-brand-400" /><span className="text-sm font-medium text-brand-400">AI Suggestion</span></div>
                  <p className="text-2xl font-display font-bold text-surface-950">${aiPricing.suggestedPrice}</p>
                  <p className="text-xs text-surface-500 mt-1">Range: ${aiPricing.priceRange?.low?.toFixed(2)} – ${aiPricing.priceRange?.high?.toFixed(2)} · {aiPricing.confidence} confidence</p>
                  <button onClick={() => u('basePrice', aiPricing.suggestedPrice)} className="btn-primary btn-sm mt-3">Apply Price</button>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                {[['costPrice', 'Cost Price'], ['basePrice', 'Selling Price'], ['floorPrice', 'Floor Price']].map(([key, label]) => (
                  <div key={key}>
                    <label className="input-label">{label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 text-sm">$</span>
                      <input type="number" step="0.01" value={form[key]} onChange={e => u(key, e.target.value)} className="input-field pl-7" />
                    </div>
                  </div>
                ))}
              </div>
              {form.costPrice && form.basePrice && (
                <div className="p-3 bg-surface-200/40 rounded-xl text-sm">
                  <span className="text-surface-500">Est. profit: </span>
                  <span className="font-display font-bold text-emerald-400">${(parseFloat(form.basePrice) - parseFloat(form.costPrice)).toFixed(2)}</span>
                  <span className="text-surface-500 ml-2">({(((parseFloat(form.basePrice) - parseFloat(form.costPrice)) / parseFloat(form.costPrice)) * 100).toFixed(0)}% margin)</span>
                </div>
              )}
            </div>

            {/* Sourcing */}
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-display font-semibold text-surface-900">Sourcing & Inventory</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="input-label">Source Type</label>
                  <select value={form.sourceType} onChange={e => u('sourceType', e.target.value)} className="input-field">
                    {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div><label className="input-label">Source Name</label><input value={form.sourceName} onChange={e => u('sourceName', e.target.value)} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="input-label">Quantity</label><input type="number" min="1" value={form.quantity} onChange={e => u('quantity', e.target.value)} className="input-field" /></div>
                <div><label className="input-label">SKU</label><input value={form.sku} onChange={e => u('sku', e.target.value)} className="input-field" placeholder="Auto-generated" /></div>
                <div><label className="input-label">Weight (oz)</label><input type="number" step="0.1" value={form.weightOz} onChange={e => u('weightOz', e.target.value)} className="input-field" /></div>
              </div>
            </div>
          </div>

          {/* ─── Sidebar column ─── */}
          <div className="space-y-4">
            {/* Save actions */}
            <div className="glass-card p-5 space-y-3">
              <h3 className="font-display font-semibold text-surface-900 text-sm">Publish</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-500">Status</span>
                <span className="font-medium text-surface-800 capitalize">{form.status}</span>
              </div>
              <button onClick={() => handleSave(false)} disabled={saveMutation.isLoading} className="btn-primary w-full">
                <Save size={16} /> {isEdit ? 'Save & Publish' : 'Create & Publish'}
              </button>
              <button onClick={() => handleSave(true)} disabled={saveMutation.isLoading} className="btn-secondary w-full">
                Save as Draft
              </button>
            </div>

            {/* Quick cross-list */}
            {isEdit && (
              <div className="glass-card p-5 space-y-3">
                <h3 className="font-display font-semibold text-surface-900 text-sm">Cross-List</h3>
                <p className="text-xs text-surface-500">Push this product to marketplaces after saving.</p>
                <button onClick={() => navigate(`/listings/cross-list?product=${id}`)} className="btn-secondary w-full">
                  <Layers size={16} /> Cross-List Now
                </button>
              </div>
            )}

            {/* Image upload */}
            <div className="glass-card p-5 space-y-3">
              <h3 className="font-display font-semibold text-surface-900 text-sm">Images</h3>
              <ImageUploader productId={isEdit ? id : null} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
