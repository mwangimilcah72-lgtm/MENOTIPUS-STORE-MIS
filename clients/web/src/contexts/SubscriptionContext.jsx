import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
};

const API = 'http://localhost:3001';

export const SubscriptionProvider = ({ children }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [plansRes, subsRes] = await Promise.all([
        fetch(`${API}/subscriptionPlans`),
        fetch(`${API}/subscriptions`)
      ]);
      if (plansRes.ok) setPlans(await plansRes.json());
      if (subsRes.ok) setSubscriptions(await subsRes.json());
    } catch { /* use defaults */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // The active subscription for the current user's company
  const activeSubscription = subscriptions.find(s =>
    s.status === 'active' &&
    (s.companyId === user?.companyId || s.companyId === user?.email || s.userId === user?.id)
  );

  const currentPlan = plans.find(p => p.id === (activeSubscription?.planId || 'free')) ||
    plans.find(p => p.id === 'free') ||
    { id: 'free', name: 'Free', price: 0, passwordLocked: true, maxUsers: 1, maxStores: 1, maxProducts: 100, features: [], disabledFeatures: [] };

  const isFeatureEnabled = (feature) => {
    if (currentPlan.id === 'enterprise') return true;
    return !currentPlan.disabledFeatures?.includes(feature);
  };

  const isPasswordLocked = currentPlan.passwordLocked === true;

  const activateSubscription = async ({ userId, companyId, planId, notes }) => {
    const existing = subscriptions.find(s => s.companyId === companyId || s.userId === userId);
    const payload = {
      companyId,
      userId,
      planId,
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      activatedBy: user?.id,
      activatedByName: user?.name || user?.username,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };
    try {
      let res;
      if (existing) {
        res = await fetch(`${API}/subscriptions/${existing.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...existing, ...payload })
        });
      } else {
        res = await fetch(`${API}/subscriptions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (res.ok) { await fetchAll(); return { success: true }; }
    } catch (e) {}
    return { success: false };
  };

  const cancelSubscription = async (subscriptionId) => {
    try {
      const res = await fetch(`${API}/subscriptions/${subscriptionId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      if (res.ok) { await fetchAll(); return { success: true }; }
    } catch (e) {}
    return { success: false };
  };

  // Get plan for any arbitrary companyId / userId (for admin view)
  const getPlanForCompany = (companyId, userId) => {
    const sub = subscriptions.find(s =>
      s.status === 'active' && (s.companyId === companyId || s.userId === userId)
    );
    return plans.find(p => p.id === (sub?.planId || 'free')) || plans.find(p => p.id === 'free') || currentPlan;
  };

  return (
    <SubscriptionContext.Provider value={{
      plans, subscriptions, loading,
      currentPlan, activeSubscription,
      isFeatureEnabled, isPasswordLocked,
      activateSubscription, cancelSubscription,
      getPlanForCompany,
      refresh: fetchAll
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
