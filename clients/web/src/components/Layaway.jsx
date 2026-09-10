import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Search, Plus, Eye, Trash2, X, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, Clock, DollarSign, Users
} from 'lucide-react';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { useInventory } from '../contexts/InventoryContext';

const API = 'http://localhost:3001';

const statusColor = {
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const Layaway = () => {
  const { settings } = useAppSettings();
  const { products } = useInventory();
  const sym = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', KES: 'KSh', TZS: 'TSh', UGX: 'USh' }[settings?.currency] || '$';
  const fmt = (n) => `${sym}${Number(n || 0).toLocaleString()}`;

  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({ customerName: '', customerPhone: '', dueDate: '', items: [], depositPaid: '' });
  const [cartItem, setCartItem] = useState({ productId: '', quantity: 1 });
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', note: '' });

  const fetchAgreements = useCallback(async () => {
    try {
      const res = await fetch(`${API}/layaway`);
      if (res.ok) {
        let data = await res.json();
        const today = new Date().toISOString().split('T')[0];
        data = data.map(a => ({
          ...a,
          status: a.status === 'active' && a.dueDate < today ? 'overdue' : a.status
        }));
        setAgreements(data);
      }
    } catch { setAgreements([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAgreements(); }, [fetchAgreements]);

  const filtered = agreements.filter(a => {
    const matchSearch = a.customerName?.toLowerCase().includes(search.toLowerCase()) || a.customerPhone?.includes(search);
    const matchStatus = !statusFilter || a.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const addItemToForm = () => {
    const product = products.find(p => p.id === parseInt(cartItem.productId));
    if (!product) return;
    const exists = form.items.find(i => i.productId === product.id);
    if (exists) {
      setForm(f => ({ ...f, items: f.items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + parseInt(cartItem.quantity) } : i) }));
    } else {
      setForm(f => ({ ...f, items: [...f.items, { productId: product.id, productName: product.name, quantity: parseInt(cartItem.quantity), price: product.sellingPrice, total: product.sellingPrice * parseInt(cartItem.quantity) }] }));
    }
    setCartItem({ productId: '', quantity: 1 });
  };

  const formTotal = form.items.reduce((s, i) => s + i.total, 0);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (form.items.length === 0) { alert('Add at least one item'); return; }
    const deposit = parseFloat(form.depositPaid) || 0;
    const payload = {
      ...form,
      totalAmount: formTotal,
      depositPaid: deposit,
      balanceDue: formTotal - deposit,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      payments: deposit > 0 ? [{ id: 1, amount: deposit, method: 'cash', date: new Date().toISOString().split('T')[0], note: 'Initial deposit' }] : []
    };
    const res = await fetch(`${API}/layaway`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { await fetchAgreements(); setShowAdd(false); setForm({ customerName: '', customerPhone: '', dueDate: '', items: [], depositPaid: '' }); }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentForm.amount);
    const newBalance = Math.max(0, (selected.balanceDue || 0) - amount);
    const newPayment = { id: Date.now(), amount, method: paymentForm.method, date: new Date().toISOString().split('T')[0], note: paymentForm.note };
    const newStatus = newBalance === 0 ? 'completed' : selected.status;
    const updated = { ...selected, balanceDue: newBalance, depositPaid: selected.depositPaid + amount, status: newStatus, payments: [...(selected.payments || []), newPayment] };
    const res = await fetch(`${API}/layaway/${selected.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    if (res.ok) { await fetchAgreements(); setShowPayment(false); setSelected(null); setPaymentForm({ amount: '', method: 'cash', note: '' }); }
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Cancel layaway for ${a.customerName}?`)) return;
    await fetch(`${API}/layaway/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) });
    fetchAgreements();
  };

  const totalActive = agreements.filter(a => a.status === 'active' || a.status === 'overdue');
  const totalOwed = totalActive.reduce((s, a) => s + (a.balanceDue || 0), 0);
  const overdueCount = agreements.filter(a => a.status === 'overdue').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-purple-600" /> Layaway & Debt Tracking
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track installment payments and outstanding balances</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" /> New Agreement
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Agreements', value: totalActive.length, icon: CreditCard, color: 'blue' },
          { label: 'Total Outstanding', value: fmt(totalOwed), icon: DollarSign, color: 'purple' },
          { label: 'Overdue', value: overdueCount, icon: AlertTriangle, color: 'red' },
          { label: 'Completed', value: agreements.filter(a => a.status === 'completed').length, icon: CheckCircle, color: 'green' },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-${card.color}-50 dark:bg-${card.color}-900/30`}>
              <card.icon className={`h-5 w-5 text-${card.color}-600 dark:text-${card.color}-400`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search customer name or phone..." className="pl-9 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="overdue">Overdue</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Customer', 'Phone', 'Items', 'Total', 'Paid', 'Balance Due', 'Due Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paged.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{a.customerName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{a.customerPhone}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{a.items?.length || 0} item(s)</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{fmt(a.totalAmount)}</td>
                  <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">{fmt(a.depositPaid)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400">{fmt(a.balanceDue)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{a.dueDate}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[a.status] || ''}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setSelected(a); setShowView(true); }} className="text-blue-600 dark:text-blue-400"><Eye className="h-4 w-4" /></button>
                      {(a.status === 'active' || a.status === 'overdue') && (
                        <button onClick={() => { setSelected(a); setShowPayment(true); }} className="text-green-600 dark:text-green-400 text-xs font-medium px-2 py-0.5 border border-green-400 rounded">Pay</button>
                      )}
                      {a.status !== 'cancelled' && a.status !== 'completed' && (
                        <button onClick={() => handleDelete(a)} className="text-red-600 dark:text-red-400"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">No layaway agreements found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1 disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Add Agreement Modal */}
      {showAdd && (
        <Modal title="New Layaway Agreement" onClose={() => setShowAdd(false)} wide>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Customer Name" required>
                <input required value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} className={INPUT} placeholder="Full name" />
              </FormField>
              <FormField label="Phone">
                <input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} className={INPUT} placeholder="+254..." />
              </FormField>
              <FormField label="Due Date" required>
                <input required type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className={INPUT} />
              </FormField>
              <FormField label="Initial Deposit">
                <input type="number" min="0" step="0.01" value={form.depositPaid} onChange={e => setForm({ ...form, depositPaid: e.target.value })} className={INPUT} placeholder="0.00" />
              </FormField>
            </div>

            <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-4">
              <p className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3">Add Items</p>
              <div className="flex gap-2">
                <select value={cartItem.productId} onChange={e => setCartItem({ ...cartItem, productId: e.target.value })} className={`${INPUT} flex-1`}>
                  <option value="">Select product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} — {sym}{p.sellingPrice}</option>)}
                </select>
                <input type="number" min="1" value={cartItem.quantity} onChange={e => setCartItem({ ...cartItem, quantity: e.target.value })} className={`${INPUT} w-20`} />
                <button type="button" onClick={addItemToForm} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex-shrink-0">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {form.items.length > 0 && (
                <div className="mt-3 space-y-1">
                  {form.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-300">{item.productName} × {item.quantity}</span>
                      <span className="font-medium">{fmt(item.total)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold pt-1">
                    <span>Total</span><span>{fmt(formTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className={BTN_SEC}>Cancel</button>
              <button type="submit" className={BTN_PRI}>Create Agreement</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {showPayment && selected && (
        <Modal title={`Record Payment — ${selected.customerName}`} onClose={() => setShowPayment(false)}>
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm">
            <p className="text-red-700 dark:text-red-300 font-medium">Balance Due: {fmt(selected.balanceDue)}</p>
          </div>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <FormField label="Amount" required>
              <input required type="number" min="0.01" max={selected.balanceDue} step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} className={INPUT} placeholder="0.00" />
            </FormField>
            <FormField label="Method">
              <select value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })} className={INPUT}>
                <option value="cash">Cash</option>
                <option value="mpesa">M-Pesa</option>
                <option value="card">Card</option>
              </select>
            </FormField>
            <FormField label="Note">
              <input value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} className={INPUT} placeholder="optional note" />
            </FormField>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowPayment(false)} className={BTN_SEC}>Cancel</button>
              <button type="submit" className={BTN_PRI}>Record Payment</button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {showView && selected && (
        <Modal title={`Agreement — ${selected.customerName}`} onClose={() => setShowView(false)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500 dark:text-gray-400">Customer</p><p className="font-medium text-gray-900 dark:text-white">{selected.customerName}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400">Phone</p><p className="font-medium">{selected.customerPhone}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400">Total</p><p className="font-bold text-gray-900 dark:text-white">{fmt(selected.totalAmount)}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400">Balance Due</p><p className="font-bold text-red-600">{fmt(selected.balanceDue)}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400">Due Date</p><p className="font-medium">{selected.dueDate}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400">Status</p><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[selected.status]}`}>{selected.status}</span></div>
            </div>

            <div>
              <p className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Items</p>
              {selected.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700">
                  <span>{item.productName} × {item.quantity}</span>
                  <span className="font-medium">{fmt(item.total)}</span>
                </div>
              ))}
            </div>

            <div>
              <p className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Payment History</p>
              {(selected.payments || []).length === 0 ? (
                <p className="text-sm text-gray-400">No payments recorded</p>
              ) : (selected.payments || []).map((p, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">{p.date} — {p.method}{p.note ? ` (${p.note})` : ''}</span>
                  <span className="font-medium text-green-600">+{fmt(p.amount)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              {(selected.status === 'active' || selected.status === 'overdue') && (
                <button onClick={() => { setShowView(false); setShowPayment(true); }} className={BTN_PRI}>Record Payment</button>
              )}
              <button onClick={() => setShowView(false)} className={BTN_SEC}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const INPUT = 'mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const BTN_PRI = 'px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg';
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

export default Layaway;
