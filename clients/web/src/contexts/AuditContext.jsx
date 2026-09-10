import React, { createContext, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';

const AuditContext = createContext();

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (!context) throw new Error('useAudit must be used within AuditProvider');
  return context;
};

const API = 'http://localhost:3001';

export const AuditProvider = ({ children }) => {
  const { user } = useAuth();

  const logAction = useCallback(async ({ action, resource, resourceId, oldValue, newValue }) => {
    try {
      await fetch(`${API}/auditLog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          userName: user?.name || user?.username || 'Unknown',
          action,
          resource,
          resourceId,
          oldValue: oldValue ? JSON.stringify(oldValue) : null,
          newValue: newValue ? JSON.stringify(newValue) : null,
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      // Audit log failures should not break the app
    }
  }, [user]);

  return (
    <AuditContext.Provider value={{ logAction }}>
      {children}
    </AuditContext.Provider>
  );
};
