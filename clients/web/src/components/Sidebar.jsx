// src/components/Sidebar.jsx
import React from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Truck,
  Users,
  Settings,
  X,
  HelpCircle,
  Database,
  DollarSign,
  Calendar,
  Store,
  ArrowRightLeft,
  ShoppingBag,
  Shield,
  UserCircle,
  CreditCard,
  Layers,
  FileText,
  BadgeDollarSign
} from 'lucide-react';

const Sidebar = ({ activeView, setActiveView, userRole = 'user', isOpen, onClose, selectedStore }) => {
  const allMenuItems = [
    { id: 'company-dashboard', label: 'Company Dashboard', icon: LayoutDashboard, showWhen: 'no-store' },
    { id: 'master-control', label: 'Master Control', icon: Database, adminOnly: true, showWhen: 'no-store' },
    { id: 'dashboard', label: 'Store Dashboard', icon: LayoutDashboard, showWhen: 'with-store' },
    { id: 'inventory', label: 'Inventory', icon: Package, showWhen: 'with-store' },
    { id: 'pos', label: 'Point of Sale', icon: ShoppingBag, showWhen: 'with-store' },
    { id: 'stock-transfer', label: 'Stock Transfer', icon: ArrowRightLeft, requiresStoreAccess: true, showWhen: 'with-store' },
    { id: 'proxy-sales', label: 'Proxy Sales', icon: ShoppingCart, requiresStoreAccess: true, showWhen: 'with-store' },
    { id: 'reports', label: 'Reports', icon: BarChart3, showWhen: 'with-store' },
    { id: 'customers', label: 'Customers (CRM)', icon: UserCircle, showWhen: 'with-store' },
    { id: 'layaway', label: 'Layaway / Debt', icon: CreditCard, showWhen: 'with-store' },
    { id: 'bundles', label: 'Bundles & Kits', icon: Layers, adminOnly: true, showWhen: 'with-store' },
    { id: 'master-data', label: 'Master Data', icon: Database, adminOnly: true, showWhen: 'with-store' },
    { id: 'expenses', label: 'Expenses', icon: DollarSign, adminOnly: true, showWhen: 'with-store' },
    { id: 'cashier-shifts', label: 'Cashier Shifts', icon: Calendar, adminOnly: false, showWhen: 'with-store' },
    { id: 'audit-log', label: 'Audit Trail', icon: FileText, adminOnly: true, showWhen: 'with-store' },
    { id: 'stores', label: 'Stores', icon: Store, adminOnly: true, showWhen: 'no-store' },
    { id: 'suppliers', label: 'Suppliers', icon: Truck, adminOnly: true, showWhen: 'with-store' },
    { id: 'users', label: 'Users', icon: Users, adminOnly: true, showWhen: 'with-store' },
    { id: 'subscriptions', label: 'Subscriptions', icon: BadgeDollarSign, adminOnly: true, showWhen: 'always' },
    { id: 'engineer-activation', label: 'Engineer Activation', icon: Shield, adminOnly: true, showWhen: 'always' },
    { id: 'support-queries', label: 'Support Queries', icon: HelpCircle, adminOnly: true, showWhen: 'always' },
    { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true, showWhen: 'always' },
  ];

  // Filter menu items based on user role, store access, and visibility conditions
  const visibleMenuItems = allMenuItems.filter(item => {
    // Check visibility conditions
    if (item.showWhen === 'with-store' && !selectedStore) {
      return false;
    }
    if (item.showWhen === 'no-store' && selectedStore) {
      return false;
    }

    // Engineer Activation - ONLY engineers can see
    if (item.id === 'engineer-activation') {
      return userRole === 'engineer';
    }

    // systems_admin has GOD MODE - access to everything
    if (userRole === 'systems_admin') {
      return true;
    }

    // Check admin-only items (excludes engineer activation which is handled above)
    if (item.adminOnly) {
      return userRole === 'admin' || userRole === 'manager' || userRole === 'owner' || userRole === 'engineer';
    }

    // Check store access required items
    if (item.requiresStoreAccess) {
      return userRole === 'admin' || userRole === 'manager' || userRole === 'supervisor' || userRole === 'cashier' || userRole === 'owner' || userRole === 'engineer';
    }

    return true;
  });

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-70 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed top-16 left-0 z-40 w-64 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center justify-between p-4 lg:hidden">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  onClose();
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-r-2 border-blue-700 dark:border-blue-500'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-400 dark:text-gray-500'}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Logged in as</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{userRole}</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;