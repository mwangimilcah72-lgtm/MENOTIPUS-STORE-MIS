import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CustomerContext = createContext();

export const useCustomers = () => {
  const context = useContext(CustomerContext);
  if (!context) throw new Error('useCustomers must be used within CustomerProvider');
  return context;
};

const API = 'http://localhost:3001';

export const CustomerProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/customers`);
      if (res.ok) setCustomers(await res.json());
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const addCustomer = async (data) => {
    try {
      const res = await fetch(`${API}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, totalSpend: 0, pointsBalance: 0, createdAt: new Date().toISOString().split('T')[0] })
      });
      if (res.ok) {
        const created = await res.json();
        setCustomers(prev => [...prev, created]);
        return { success: true, customer: created };
      }
    } catch (e) {}
    return { success: false };
  };

  const updateCustomer = async (id, data) => {
    try {
      const res = await fetch(`${API}/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const updated = await res.json();
        setCustomers(prev => prev.map(c => c.id === id ? updated : c));
        return { success: true, customer: updated };
      }
    } catch (e) {}
    return { success: false };
  };

  const deleteCustomer = async (id) => {
    try {
      const res = await fetch(`${API}/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCustomers(prev => prev.filter(c => c.id !== id));
        return { success: true };
      }
    } catch (e) {}
    return { success: false };
  };

  const addPoints = async (customerId, amount, pointsRate = 10) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return { success: false };
    const pointsEarned = Math.floor(amount / pointsRate);
    return updateCustomer(customerId, {
      totalSpend: (customer.totalSpend || 0) + amount,
      pointsBalance: (customer.pointsBalance || 0) + pointsEarned
    });
  };

  const redeemPoints = async (customerId, pointsToRedeem) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer || customer.pointsBalance < pointsToRedeem) return { success: false, message: 'Insufficient points' };
    return updateCustomer(customerId, { pointsBalance: customer.pointsBalance - pointsToRedeem });
  };

  const findByPhone = (phone) => customers.find(c => c.phone === phone || c.phone?.replace(/\s/g, '') === phone?.replace(/\s/g, ''));

  return (
    <CustomerContext.Provider value={{
      customers, loading,
      addCustomer, updateCustomer, deleteCustomer,
      addPoints, redeemPoints, findByPhone,
      refreshCustomers: fetchCustomers
    }}>
      {children}
    </CustomerContext.Provider>
  );
};
