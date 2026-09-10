import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Updated role hierarchy with permissions
const DEFAULT_PERMISSIONS = {
  engineer: { users: 'crud', products: 'crud', sales: 'crud', suppliers: 'crud', reports: 'crud', settings: 'crud', stores: 'crud', master_data: 'crud', pos: 'crud', expenses: 'crud', cashier_shifts: 'crud' },
  owner: { users: 'crud', products: 'crud', sales: 'crud', suppliers: 'crud', reports: 'crud', settings: 'crud', stores: 'crud', master_data: 'read', pos: 'crud', expenses: 'crud', cashier_shifts: 'crud' },
  manager: { users: 'read', products: 'crud', sales: 'crud', suppliers: 'crud', reports: 'read', settings: 'read', stores: 'read', master_data: 'read', pos: 'crud', expenses: 'read', cashier_shifts: 'read' },
  supervisor: { users: 'read', products: 'read', sales: 'crud', suppliers: 'read', reports: 'read', settings: 'read', stores: 'read', master_data: 'read', pos: 'crud', expenses: 'read', cashier_shifts: 'read' },
  cashier: { users: 'none', products: 'read', sales: 'create', suppliers: 'none', reports: 'none', settings: 'none', stores: 'none', master_data: 'none', pos: 'create', expenses: 'none', cashier_shifts: 'none' }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);

  // Auth disabled for exploration: auto-login as a full-access user, no credentials needed.
  const EXPLORE_MODE = true;
  const EXPLORE_USER = {
    id: 100,
    username: 'sysadmin',
    role: 'systems_admin',
    name: 'System Admin',
    email: 'sysadmin@store.com',
    phone: '+1234567899',
    status: 'active',
    createdAt: '2025-09-22',
    trialStatus: 'unlimited',
    trialEndDate: null,
    pin: '12345',
    pinSet: true,
    stores: [1, 1]
  };

  useEffect(() => {
    if (EXPLORE_MODE) {
      setUser(EXPLORE_USER);
      setIsAuthenticated(true);
      setLoading(false);
      return;
    }

    const savedUser = localStorage.getItem('user');
    const savedPermissions = localStorage.getItem('rolePermissions');

    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      // Check if user needs to set PIN
      if (!parsedUser.pinSet) {
        // Redirect to PIN setup page
        // For now, we'll just log this
        console.log('User needs to set PIN');
      }
      setUser(parsedUser);
      setIsAuthenticated(true);
    }

    if (savedPermissions) {
      try {
        setPermissions(JSON.parse(savedPermissions));
      } catch (e) {
        console.error('Failed to parse permissions');
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (EXPLORE_MODE || !isAuthenticated) return;
    const timeout = setTimeout(() => {
      logout();
      alert('You have been logged out due to inactivity.');
    }, 30 * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [isAuthenticated]);

  const login = async (username, password) => {
    try {
      const response = await fetch('http://localhost:3001/users');
      const users = await response.json();

      // Find user by email or username
      const foundUser = users.find(u =>
        (u.email === username || u.username === username) &&
        u.password === password &&
        u.status === 'active' // Only allow active users to login
      );

      if (foundUser) {
        // Check trial period - skip for admin, systems_admin, and engineer roles
        const exemptRoles = ['admin', 'systems_admin', 'engineer'];
        if (!exemptRoles.includes(foundUser.role)) {
          const userCreatedDate = new Date(foundUser.createdAt);
          const currentDate = new Date();
          const diffTime = Math.abs(currentDate - userCreatedDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays > 7 && foundUser.trialStatus !== 'extended' && foundUser.trialStatus !== 'unlimited') {
            alert('Your 7-day trial has expired. Please contact an engineer to extend your access.');
            return { success: false, message: 'Trial period expired. Contact engineer for extension.' };
          }
        }

        const { password: _, ...userWithoutPassword } = foundUser;
        setUser(userWithoutPassword);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(userWithoutPassword));
        return { success: true };
      }
      return { success: false, message: 'Invalid credentials or account not active' };
    } catch (error) {
      return { success: false, message: 'Connection error. Please try again.' };
    }
  };

  const signup = async (userData) => {
    try {
      // Check if user already exists
      const response = await fetch('http://localhost:3001/users');
      const users = await response.json();

      const existingUser = users.find(u => u.email === userData.email);
      if (existingUser) {
        return { success: false, message: 'User with this email already exists' };
      }

      // Only owners and engineers can create accounts directly
      if (!['owner', 'engineer'].includes(userData.role)) {
        return { success: false, message: 'Only owners and engineers can create company accounts' };
      }
      
      // Create new user
      const newUserResponse = await fetch('http://localhost:3001/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...userData,
          username: userData.email.split('@')[0], // Use email prefix as username
          verified: true, // No email verification required
          pinSet: true, // Company PIN is set during signup
          pin: userData.pin, // Include the company PIN in the user data
          stores: [], // No stores assigned initially
          createdAt: new Date().toISOString(),
          status: 'active', // User is active by default
          trialStatus: 'active', // New user gets 7-day trial
          trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          isCompanyAccount: true, // Flag to identify company accounts
          allowedRoles: ['owner', 'engineer', 'manager', 'supervisor', 'cashier'], // Roles that can be added later
          companyId: userData.email // Use email as company ID for store isolation
        })
      });
      
      if (newUserResponse.ok) {
        // Notify engineers about the new account
        await notifyEngineers(userData);
        return { success: true, message: 'Company account created successfully. You have 7 days of free trial.' };
      } else {
        return { success: false, message: 'Failed to create account' };
      }
    } catch (error) {
      return { success: false, message: 'Connection error. Please try again.' };
    }
  };

  const notifyEngineers = async (newUserData) => {
    try {
      // Create a support ticket for engineers to be notified about the new account
      const supportTicket = {
        name: "System Notification",
        email: "system@metanopus.com",
        subject: "New Account Created",
        message: `A new account has been created:\n\nName: ${newUserData.firstName} ${newUserData.lastName}\nEmail: ${newUserData.email}\nRole: ${newUserData.role}\nCreated at: ${new Date().toISOString()}`,
        status: "open",
        priority: "low",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await fetch('http://localhost:3001/supportTickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(supportTicket)
      });
    } catch (error) {
      console.error('Error notifying engineers:', error);
    }
  };


  const setPin = async (userId, pin) => {
    try {
      const response = await fetch(`http://localhost:3001/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pin: pin,
          pinSet: true
        })
      });
      
      if (response.ok) {
        // Update the current user state
        const updatedUser = { ...user, pin: pin, pinSet: true };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return { success: true, message: 'PIN set successfully' };
      }
      return { success: false, message: 'Failed to set PIN' };
    } catch (error) {
      return { success: false, message: 'Connection error. Please try again.' };
    }
  };

  const logout = () => {
    if (EXPLORE_MODE) return; // exploration mode: logout disabled
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };

  const hasPermission = (module, action) => {
    if (!user) return false;
    if (user.role === 'systems_admin') return true; // systems_admin has GOD MODE - all permissions
    if (user.role === 'engineer') return true; // Engineer has all permissions
    const rolePerm = (permissions[user.role] || {})[module] || 'none';
    if (rolePerm === 'crud') return true;
    if (rolePerm === 'read' && action === 'read') return true;
    if (rolePerm === 'create' && action === 'create') return true;
    return false;
  };

  const updatePermissions = (newPermissions) => {
    setPermissions(newPermissions);
    localStorage.setItem('rolePermissions', JSON.stringify(newPermissions));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      login,
      logout,
      signup,
      setPin,
      loading,
      hasPermission,
      updatePermissions,
      permissions
    }}>
      {children}
    </AuthContext.Provider>
  );
};