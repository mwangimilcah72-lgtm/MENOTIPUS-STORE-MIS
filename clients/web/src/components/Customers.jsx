import React, { useState } from 'react';
import {
  Users, Search, Plus, Edit2, Trash2, Star, Phone, Mail, TrendingUp,
  Award, Eye, X, ChevronLeft, ChevronRight, Gift
} from 'lucide-react';
import { useCustomers } from '../contexts/CustomerContext';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { useSales } from '../contexts/SalesContext';

const EMPTY_FORM = { name: '', phone: '', email: '', notes: '' };

const Customers = () => {
  const { customers, loading, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const { settings } = useAppSettings();
  const { sales } = useSales();

  const sym = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', KES: 'KSh', TZS: 'TSh', UGX: 'USh' }[settings?.currency] || '$';
  const fmt = (n) => `${sym}${Number(n || 0).toLocaleString()}`;

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const customerSales = (customerId) =>
    sales.filter(s => s.customerId === customerId || s.customerPhone === customers.find(c => c.id === customerId)?.phone);

  const openEdit = (c) => { setSelected(c); setForm({ name: c.name, phone: c.phone, email: c.email || '', notes: c.notes || '' }); setShowEdit(true); };
  const openView = (c) => { setSelected(c); setShowView(true); };

  const handleAdd = async (e) => {
    e.preventDefault();
    await addCustomer(form);
    setShowAdd(false); setForm(EMPTY_FORM);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    await updateCustomer(selected.id, form);
    setShowEdit(false); setSelected(null);
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete customer "${c.name}"?`)) return;
    await deleteCustomer(c.id);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-600" /> Customer CRM
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Purchase history, loyalty points & total spend</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setShowAdd(true); }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Customer
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Customers', value: customers.length, icon: Users, color: 'blue' },
          { label: 'Total Revenue (CRM)', value: fmt(customers.reduce((s, c) => s + (c.totalSpend || 0), 0)), icon: TrendingUp, color: 'green' },
          { label: 'Loyalty Points Issued', value: customers.reduce((s, c) => s + (c.pointsBalance || 0), 0).toLocaleString(), icon: Award, color: 'purple' },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-${card.color}-50 dark:bg-${card.color}-900/30`}>
              <card.icon className={`h-6 w-6 text-${card.color}-600 dark:text-${card.color}-400`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, phone or email..."
            className="pl-9 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Customer', 'Phone', 'Email', 'Total Spend', 'Points', 'Since', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paged.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {c.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white text-sm">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{c.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">{fmt(c.totalSpend)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
                      <Star className="h-3 w-3" /> {c.pointsBalance || 0} pts
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{c.createdAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openView(c)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => openEdit(c)} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(c)} className="text-red-600 hover:text-red-800 dark:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">No customers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 rounded disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1 rounded disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <Modal title="Add Customer" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <FormField label="Full Name" required>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={INPUT} placeholder="e.g. Mary Wanjiru" />
            </FormField>
            <FormField label="Phone Number" required>
              <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={INPUT} placeholder="+254712345678" />
            </FormField>
            <FormField label="Email">
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={INPUT} placeholder="optional" />
            </FormField>
            <FormField label="Notes">
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={INPUT} rows={2} />
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className={BTN_SEC}>Cancel</button>
              <button type="submit" className={BTN_PRI}>Save Customer</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEdit && selected && (
        <Modal title={`Edit — ${selected.name}`} onClose={() => setShowEdit(false)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <FormField label="Full Name" required>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={INPUT} />
            </FormField>
            <FormField label="Phone Number">
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={INPUT} />
            </FormField>
            <FormField label="Email">
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={INPUT} />
            </FormField>
            <FormField label="Notes">
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={INPUT} rows={2} />
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowEdit(false)} className={BTN_SEC}>Cancel</button>
              <button type="submit" className={BTN_PRI}>Update</button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {showView && selected && (
        <Modal title={`Profile — ${selected.name}`} onClose={() => setShowView(false)} wide>
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                {selected.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selected.name}</h2>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{selected.phone}</span>
                  {selected.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{selected.email}</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Spend', value: fmt(selected.totalSpend), icon: TrendingUp, color: 'green' },
                { label: 'Loyalty Points', value: `${selected.pointsBalance || 0} pts`, icon: Gift, color: 'yellow' },
                { label: 'Member Since', value: selected.createdAt, icon: Award, color: 'blue' },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
                  <p className="font-bold text-gray-900 dark:text-white">{s.value}</p>
                </div>
              ))}
            </div>

            {selected.notes && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase mb-1">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{selected.notes}</p>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Purchase History</h4>
              {customerSales(selected.id).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">No recorded sales for this customer yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customerSales(selected.id).map(sale => (
                    <div key={sale.id} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 text-sm">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">#{sale.id}</span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2">{sale.date}</span>
                      </div>
                      <span className="font-semibold text-green-600 dark:text-green-400">{fmt(sale.total)}</span>
                    </div>
                  ))}
                </div>
              )}
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
const BTN_PRI = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg';
const BTN_SEC = 'px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg';

const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="h-5 w-5" /></button>
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

export default Customers;
