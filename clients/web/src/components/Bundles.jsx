import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Edit2, Trash2, Eye, Search, X, ChevronLeft, ChevronRight, Layers
} from 'lucide-react';
import { useInventory } from '../contexts/InventoryContext';
import { useAppSettings } from '../contexts/AppSettingsContext';

const API = 'http://localhost:3001';

const Bundles = () => {
  const { products } = useInventory();
  const { settings } = useAppSettings();
  const sym = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', KES: 'KSh', TZS: 'TSh', UGX: 'USh' }[settings?.currency] || '$';
  const fmt = (n) => `${sym}${Number(n || 0).toLocaleString()}`;

  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selected, setSelected] = useState(null);

  const EMPTY = { name: '', sku: '', sellingPrice: '', description: '', components: [], status: 'active' };
  const [form, setForm] = useState(EMPTY);
  const [compRow, setCompRow] = useState({ productId: '', quantity: 1 });

  const fetchBundles = useCallback(async () => {
    try {
      const res = await fetch(`${API}/bundles`);
      if (res.ok) setBundles(await res.json());
    } catch { setBundles([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBundles(); }, [fetchBundles]);

  const filtered = bundles.filter(b =>
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.sku?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const addComponent = () => {
    const product = products.find(p => p.id === parseInt(compRow.productId));
    if (!product) return;
    const qty = parseInt(compRow.quantity) || 1;
    setForm(f => ({
      ...f,
      components: [...f.components.filter(c => c.productId !== product.id), { productId: product.id, productName: product.name, quantity: qty, unitCost: product.costPrice }]
    }));
    setCompRow({ productId: '', quantity: 1 });
  };

  const removeComponent = (productId) => setForm(f => ({ ...f, components: f.components.filter(c => c.productId !== productId) }));

  const bundleCost = (components) => components.reduce((s, c) => {
    const p = products.find(pr => pr.id === c.productId);
    return s + (p ? p.costPrice * c.quantity : 0);
  }, 0);

  const save = async (e, isEdit) => {
    e.preventDefault();
    if (form.components.length === 0) { alert('Add at least one component'); return; }
    const payload = { ...form, sellingPrice: parseFloat(form.sellingPrice), createdAt: isEdit ? selected?.createdAt : new Date().toISOString().split('T')[0] };
    const url = isEdit ? `${API}/bundles/${selected.id}` : `${API}/bundles`;
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { await fetchBundles(); isEdit ? setShowEdit(false) : setShowAdd(false); setForm(EMPTY); }
  };

  const handleDelete = async (b) => {
    if (!window.confirm(`Delete bundle "${b.name}"?`)) return;
    await fetch(`${API}/bundles/${b.id}`, { method: 'DELETE' });
    fetchBundles();
  };

  const openEdit = (b) => { setSelected(b); setForm({ name: b.name, sku: b.sku, sellingPrice: b.sellingPrice, description: b.description || '', components: b.components || [], status: b.status }); setShowEdit(true); };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  const ComponentForm = () => (
    <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-4">
      <p className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3">Bundle Components</p>
      <div className="flex gap-2 mb-3">
        <select value={compRow.productId} onChange={e => setCompRow({ ...compRow, productId: e.target.value })} className={`${INPUT} flex-1`}>
          <option value="">Select product...</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>)}
        </select>
        <input type="number" min="1" value={compRow.quantity} onChange={e => setCompRow({ ...compRow, quantity: e.target.value })} className={`${INPUT} w-20`} placeholder="Qty" />
        <button type="button" onClick={addComponent} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-shrink-0">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {form.components.length > 0 && (
        <div className="space-y-1">
          {form.components.map(c => (
            <div key={c.productId} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">{c.productName} × {c.quantity}</span>
              <div className="flex items-center gap-3">
                <span className="text-gray-500">{fmt((products.find(p => p.id === c.productId)?.costPrice || 0) * c.quantity)}</span>
                <button type="button" onClick={() => removeComponent(c.productId)} className="text-red-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold pt-1 text-gray-700 dark:text-gray-300">
            <span>Estimated Cost</span>
            <span>{fmt(bundleCost(form.components))}</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="h-7 w-7 text-indigo-600" /> Product Bundles & Kits
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Define bundles that deduct from individual stock when sold</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setShowAdd(true); }} className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" /> New Bundle
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search bundles..." className="pl-9 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm" />
        </div>
      </div>

      {/* Bundles grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paged.map(b => {
          const cost = bundleCost(b.components || []);
          const margin = b.sellingPrice > 0 ? ((b.sellingPrice - cost) / b.sellingPrice * 100).toFixed(1) : 0;
          return (
            <div key={b.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                    <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{b.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{b.sku}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                  {b.status}
                </span>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{b.description}</p>

              <div className="space-y-1 mb-3">
                {(b.components || []).map(c => (
                  <div key={c.productId} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>{c.productName} × {c.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Selling Price</p>
                  <p className="font-bold text-gray-900 dark:text-white">{fmt(b.sellingPrice)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Margin</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">{margin}%</p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button onClick={() => { setSelected(b); setShowView(true); }} className="flex-1 py-1.5 text-xs text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> View
                </button>
                <button onClick={() => openEdit(b)} className="flex-1 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-center gap-1">
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(b)} className="py-1.5 px-3 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        {paged.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-500 dark:text-gray-400">
            <Layers className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p>No bundles defined yet</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1 disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <Modal title="New Bundle / Kit" onClose={() => setShowAdd(false)} wide>
          <form onSubmit={e => save(e, false)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Bundle Name" required>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={INPUT} placeholder="e.g. School Starter Pack" />
              </FormField>
              <FormField label="SKU">
                <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className={INPUT} placeholder="BUNDLE-001" />
              </FormField>
              <FormField label="Selling Price" required>
                <input required type="number" min="0" step="0.01" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: e.target.value })} className={INPUT} />
              </FormField>
              <FormField label="Status">
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={INPUT}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormField>
            </div>
            <FormField label="Description">
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={INPUT} rows={2} />
            </FormField>
            <ComponentForm />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowAdd(false)} className={BTN_SEC}>Cancel</button>
              <button type="submit" className={BTN_PRI}>Create Bundle</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEdit && selected && (
        <Modal title={`Edit — ${selected.name}`} onClose={() => setShowEdit(false)} wide>
          <form onSubmit={e => save(e, true)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Bundle Name" required>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={INPUT} />
              </FormField>
              <FormField label="SKU">
                <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className={INPUT} />
              </FormField>
              <FormField label="Selling Price" required>
                <input required type="number" min="0" step="0.01" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: e.target.value })} className={INPUT} />
              </FormField>
              <FormField label="Status">
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={INPUT}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormField>
            </div>
            <FormField label="Description">
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={INPUT} rows={2} />
            </FormField>
            <ComponentForm />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowEdit(false)} className={BTN_SEC}>Cancel</button>
              <button type="submit" className={BTN_PRI}>Update Bundle</button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {showView && selected && (
        <Modal title={selected.name} onClose={() => setShowView(false)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">SKU</p><p className="font-medium dark:text-white">{selected.sku || '—'}</p></div>
              <div><p className="text-gray-500">Selling Price</p><p className="font-bold text-gray-900 dark:text-white">{fmt(selected.sellingPrice)}</p></div>
              <div><p className="text-gray-500">Est. Cost</p><p className="font-medium text-red-600">{fmt(bundleCost(selected.components || []))}</p></div>
              <div><p className="text-gray-500">Status</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selected.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600'}`}>{selected.status}</span>
              </div>
            </div>
            {selected.description && <p className="text-sm text-gray-600 dark:text-gray-400">{selected.description}</p>}
            <div>
              <p className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Components</p>
              {(selected.components || []).map(c => (
                <div key={c.productId} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{c.productName} × {c.quantity}</span>
                  <span className="font-medium">{fmt((products.find(p => p.id === c.productId)?.costPrice || 0) * c.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowView(false)} className={BTN_SEC}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const INPUT = 'mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const BTN_PRI = 'px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg';
const BTN_SEC = 'px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg';

const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const FormField = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
  </div>
);

export default Bundles;
