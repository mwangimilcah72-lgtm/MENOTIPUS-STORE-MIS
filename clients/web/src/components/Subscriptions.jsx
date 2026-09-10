import React, { useState, useEffect } from 'react';
import {
  Check, X, Star, Crown, Zap, Shield, Users, ChevronDown, ChevronUp,
  Building2, Calendar, AlertCircle, CheckCircle, Lock, Unlock, Settings
} from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';

const PLAN_ICONS = { free: Shield, starter: Zap, business: Star, enterprise: Crown };
const PLAN_COLORS = {
  free:       { bg: 'bg-gray-50 dark:bg-gray-800',     border: 'border-gray-200 dark:border-gray-600',     btn: 'bg-gray-600 hover:bg-gray-700',      badge: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'      },
  starter:    { bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-700',     btn: 'bg-blue-600 hover:bg-blue-700',       badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'   },
  business:   { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-300 dark:border-indigo-600 ring-2 ring-indigo-400', btn: 'bg-indigo-600 hover:bg-indigo-700', badge: 'bg-indigo-600 text-white' },
  enterprise: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-700', btn: 'bg-purple-600 hover:bg-purple-700',    badge: 'bg-purple-600 text-white'                                           },
};

const fmtKES = (n) => `KSh ${Number(n).toLocaleString()}`;

const Subscriptions = () => {
  const { plans, subscriptions, currentPlan, activateSubscription, cancelSubscription, refresh } = useSubscription();
  const { user } = useAuth();
  const isAdmin = ['admin', 'systems_admin', 'owner', 'manager'].includes(user?.role);

  const [tab, setTab] = useState('plans');       // plans | admin
  const [users, setUsers] = useState([]);
  const [activateForm, setActivateForm] = useState({ userId: '', companyId: '', planId: 'starter', notes: '' });
  const [activating, setActivating] = useState(false);
  const [success, setSuccess] = useState('');
  const [expandedPlan, setExpandedPlan] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3001/users')
      .then(r => r.ok ? r.json() : [])
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const handleActivate = async (e) => {
    e.preventDefault();
    setActivating(true);
    setSuccess('');
    const res = await activateSubscription(activateForm);
    setActivating(false);
    if (res.success) {
      setSuccess(`Subscription activated — ${plans.find(p => p.id === activateForm.planId)?.name} plan.`);
      setActivateForm({ userId: '', companyId: '', planId: 'starter', notes: '' });
    }
  };

  const selectedUser = users.find(u => String(u.id) === String(activateForm.userId));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription Plans</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Current plan: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{currentPlan.name}</span>
            {currentPlan.price > 0 && <span className="ml-1">· {fmtKES(currentPlan.price)}/month</span>}
            {currentPlan.passwordLocked && <span className="ml-2 inline-flex items-center gap-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full"><Lock className="h-3 w-3" /> Password locked to system default</span>}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setTab('plans')} className={`px-4 py-2 text-sm rounded-lg font-medium ${tab === 'plans' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
              Pricing
            </button>
            <button onClick={() => setTab('admin')} className={`px-4 py-2 text-sm rounded-lg font-medium flex items-center gap-1.5 ${tab === 'admin' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
              <Settings className="h-4 w-4" /> Manage
            </button>
          </div>
        )}
      </div>

      {/* === PRICING TAB === */}
      {tab === 'plans' && (
        <>
          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {plans.map(plan => {
              const Icon = PLAN_ICONS[plan.id] || Shield;
              const c = PLAN_COLORS[plan.id] || PLAN_COLORS.free;
              const isCurrent = currentPlan.id === plan.id;
              const isExpanded = expandedPlan === plan.id;

              return (
                <div key={plan.id} className={`relative rounded-2xl border-2 p-6 flex flex-col ${c.bg} ${c.border} transition-all duration-200 hover:shadow-lg`}>
                  {plan.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold ${c.badge}`}>
                      {plan.badge}
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full text-xs font-bold bg-green-500 text-white">
                      Current
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2.5 rounded-xl ${plan.id === 'free' ? 'bg-gray-200 dark:bg-gray-700' : `bg-${plan.color}-100 dark:bg-${plan.color}-900/30`}`}>
                      <Icon className={`h-6 w-6 ${plan.id === 'free' ? 'text-gray-600 dark:text-gray-400' : `text-${plan.color}-600 dark:text-${plan.color}-400`}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        {plan.price === 0
                          ? <span className="text-2xl font-bold text-gray-900 dark:text-white">Free</span>
                          : <>
                              <span className="text-2xl font-bold text-gray-900 dark:text-white">{fmtKES(plan.price)}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">/month</span>
                            </>
                        }
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{plan.description}</p>

                  {/* Limits */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'Users', value: plan.maxUsers === -1 ? '∞' : plan.maxUsers },
                      { label: 'Stores', value: plan.maxStores === -1 ? '∞' : plan.maxStores },
                      { label: 'Products', value: plan.maxProducts === -1 ? '∞' : plan.maxProducts },
                    ].map(lim => (
                      <div key={lim.label} className="text-center bg-white/60 dark:bg-gray-800/60 rounded-xl p-2">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{lim.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{lim.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Password lock notice */}
                  {plan.passwordLocked ? (
                    <div className="mb-3 flex items-center gap-2 text-xs text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3 py-2">
                      <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                      Password locked to system default (12345)
                    </div>
                  ) : (
                    <div className="mb-3 flex items-center gap-2 text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                      <Unlock className="h-3.5 w-3.5 flex-shrink-0" />
                      Custom passwords enabled
                    </div>
                  )}

                  {/* Features list */}
                  <div className="space-y-1.5 flex-1">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        {f}
                      </div>
                    ))}

                    {plan.disabledFeatures?.length > 0 && (
                      <>
                        <button onClick={() => setExpandedPlan(isExpanded ? null : plan.id)} className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-2 hover:text-gray-600">
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {isExpanded ? 'Hide' : `+${plan.disabledFeatures.length} not included`}
                        </button>
                        {isExpanded && plan.disabledFeatures.map(f => (
                          <div key={f} className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                            <X className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                            {f}
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => isAdmin && setTab('admin')}
                    className={`mt-5 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition ${isCurrent ? 'bg-green-500 cursor-default' : c.btn}`}
                  >
                    {isCurrent ? '✓ Active Plan' : isAdmin ? 'Activate for User' : 'Contact Admin'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Annual discount note */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-700 rounded-2xl p-6 text-center">
            <p className="text-indigo-800 dark:text-indigo-200 font-semibold">Save 15% with annual billing</p>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">Pay for 12 months, get 2 months free. Contact admin to set up annual plan.</p>
          </div>

          {/* Comparison table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Full Feature Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 w-48">Feature</th>
                    {plans.map(p => (
                      <th key={p.id} className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {p.name}
                        {p.price > 0 && <div className="text-xs font-normal text-gray-400">{fmtKES(p.price)}/mo</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {[
                    { label: 'Point of Sale', plans: ['free','starter','business','enterprise'] },
                    { label: 'Inventory Management', plans: ['free','starter','business','enterprise'] },
                    { label: 'M-Pesa Integration', plans: ['starter','business','enterprise'] },
                    { label: 'Barcode Scanner', plans: ['starter','business','enterprise'] },
                    { label: 'Custom Passwords', plans: ['starter','business','enterprise'] },
                    { label: 'CRM & Loyalty Points', plans: ['business','enterprise'] },
                    { label: 'Layaway / Debt Tracking', plans: ['business','enterprise'] },
                    { label: 'Product Bundles & Kits', plans: ['business','enterprise'] },
                    { label: 'P&L Statement', plans: ['business','enterprise'] },
                    { label: 'VAT / Tax Reports', plans: ['business','enterprise'] },
                    { label: 'Multi-store (3 stores)', plans: ['business','enterprise'] },
                    { label: 'Full Audit Trail', plans: ['enterprise'] },
                    { label: 'AI Reorder Suggestions', plans: ['enterprise'] },
                    { label: 'Unlimited Stores & Users', plans: ['enterprise'] },
                    { label: 'Priority Support', plans: ['enterprise'] },
                  ].map(row => (
                    <tr key={row.label} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{row.label}</td>
                      {plans.map(p => (
                        <td key={p.id} className="px-4 py-3 text-center">
                          {row.plans.includes(p.id)
                            ? <Check className="h-5 w-5 text-green-500 mx-auto" />
                            : <X className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-auto" />
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* === ADMIN MANAGEMENT TAB === */}
      {tab === 'admin' && isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activate / Upgrade subscription */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <Unlock className="h-5 w-5 text-indigo-600" /> Activate / Upgrade Plan
            </h3>

            {success && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl text-sm">
                <CheckCircle className="h-4 w-4 flex-shrink-0" /> {success}
              </div>
            )}

            <form onSubmit={handleActivate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select User</label>
                <select
                  required
                  value={activateForm.userId}
                  onChange={e => {
                    const u = users.find(u => String(u.id) === e.target.value);
                    setActivateForm(f => ({ ...f, userId: e.target.value, companyId: u?.companyId || u?.email || '' }));
                  }}
                  className={INPUT}
                >
                  <option value="">Choose user...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.fullName || u.username} — {u.role} {u.email ? `(${u.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm space-y-1">
                  <p className="font-medium text-gray-900 dark:text-white">{selectedUser.name || selectedUser.fullName}</p>
                  <p className="text-gray-500 dark:text-gray-400">Role: {selectedUser.role} · Status: {selectedUser.status}</p>
                  <p className="text-gray-500 dark:text-gray-400">Email: {selectedUser.email || '—'}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan</label>
                <div className="grid grid-cols-2 gap-2">
                  {plans.filter(p => p.id !== 'free').map(plan => (
                    <label key={plan.id} className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition ${activateForm.planId === plan.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300'}`}>
                      <input
                        type="radio"
                        name="plan"
                        value={plan.id}
                        checked={activateForm.planId === plan.id}
                        onChange={() => setActivateForm(f => ({ ...f, planId: plan.id }))}
                        className="text-indigo-600"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{plan.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{fmtKES(plan.price)}/mo</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={activateForm.notes}
                  onChange={e => setActivateForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. Paid via M-Pesa, receipt #..."
                  className={INPUT}
                />
              </div>

              {activateForm.planId && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">What this unlocks:</p>
                  <ul className="space-y-0.5">
                    {plans.find(p => p.id === activateForm.planId)?.features.slice(0, 4).map(f => (
                      <li key={f} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" />{f}</li>
                    ))}
                    <li className="flex items-center gap-1.5 text-green-700 dark:text-green-300 font-medium">
                      <Unlock className="h-3.5 w-3.5" /> Custom password setup enabled
                    </li>
                  </ul>
                </div>
              )}

              <button type="submit" disabled={activating || !activateForm.userId} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold disabled:opacity-50 transition">
                {activating ? 'Activating...' : 'Activate Subscription'}
              </button>
            </form>
          </div>

          {/* Active subscriptions list */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-600" /> Active Subscriptions
            </h3>
            {subscriptions.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <AlertCircle className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">No subscriptions activated yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map(sub => {
                  const plan = plans.find(p => p.id === sub.planId);
                  const linkedUser = users.find(u => String(u.id) === String(sub.userId) || u.email === sub.companyId);
                  const isOverdue = sub.endDate && sub.endDate < new Date().toISOString().split('T')[0];
                  return (
                    <div key={sub.id} className={`p-4 rounded-xl border ${sub.status === 'active' && !isOverdue ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">
                            {linkedUser?.name || linkedUser?.fullName || sub.companyId || `User #${sub.userId}`}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{linkedUser?.email || sub.companyId}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${PLAN_COLORS[sub.planId]?.badge || 'bg-gray-100 text-gray-700'}`}>
                              {plan?.name || sub.planId}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sub.status === 'active' && !isOverdue ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                              {isOverdue ? 'Expired' : sub.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
                            <Calendar className="h-3 w-3" />
                            {sub.startDate} → {sub.endDate}
                          </div>
                          {sub.notes && <p className="text-xs text-gray-400 mt-1 italic">{sub.notes}</p>}
                        </div>
                        {sub.status === 'active' && (
                          <button
                            onClick={async () => { if (window.confirm('Cancel this subscription?')) { await cancelSubscription(sub.id); refresh(); } }}
                            className="text-xs text-red-500 hover:text-red-700 border border-red-200 dark:border-red-700 rounded-lg px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Free-tier users notice */}
            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-700">
              <p className="text-xs text-orange-700 dark:text-orange-300 flex items-start gap-1.5">
                <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>Users without an active paid subscription are on the <strong>Free plan</strong> — their password is locked to the system default and cannot be changed until you activate a paid plan for them.</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const INPUT = 'mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent';

export default Subscriptions;
