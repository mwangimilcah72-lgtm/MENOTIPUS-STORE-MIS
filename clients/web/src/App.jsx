// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import PinSetupPage from './components/PinSetupPage';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import PointOfSale from './components/PointOfSale'; // NEW IMPORT
import StockTransfer from './components/StockTransfer'; // NEW IMPORT
import ProxySales from './components/ProxySales'; // NEW IMPORT
import Reports from './components/Reports';
import Suppliers from './components/Suppliers';
import Settings from './components/Settings';
import Users from './components/Users';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ContactPage from './components/ContactPage';
import MasterData from './components/MasterData';
import Expenses from './components/Expenses';
import CashierShifts from './components/CashierShifts';
import AdminSupportPanel from './components/AdminSupportPanel';
import StoresManagement from './components/StoresManagement';
import MasterControl from './components/MasterControl';
import CompanyDashboard from './components/CompanyDashboard';
import EngineerActivation from './components/EngineerActivation';
import Customers from './components/Customers';
import Layaway from './components/Layaway';
import Bundles from './components/Bundles';
import AuditLog from './components/AuditLog';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { InventoryProvider } from './contexts/InventoryContext';
import { SalesProvider } from './contexts/SalesContext';
import { SuppliersProvider } from './contexts/SuppliersContext';
import { AppSettingsProvider } from './contexts/AppSettingsContext';
import { SupportTicketsProvider } from './contexts/SupportTicketsContext';
import { StoresProvider } from './contexts/StoresContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CustomerProvider } from './contexts/CustomerContext';
import { AuditProvider } from './contexts/AuditContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import Subscriptions from './components/Subscriptions';

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState('company-dashboard'); // Changed to company dashboard
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user needs to set PIN
  if (isAuthenticated && user && !user.pinSet) {
    return <Navigate to="/pin-setup" replace />;
  }

  const handleSelectStore = (store) => {
    setSelectedStore(store);
    setActiveView('dashboard'); // Switch to store dashboard
  };

  const renderActiveView = () => {
    // If a store is selected, show store-specific views
    if (selectedStore) {
      switch (activeView) {
        case 'dashboard':
          return <Dashboard />;
        case 'inventory':
          return <Inventory />;
        case 'pos': // UPDATED ROUTE NAME
          return <PointOfSale />;
        case 'stock-transfer': // NEW ROUTE
          return <StockTransfer />;
        case 'proxy-sales': // NEW ROUTE
          return <ProxySales />;
        case 'reports':
          return <Reports />;
        case 'suppliers':
          return <Suppliers />;
        case 'users':
          return <Users />;
        case 'settings':
          return <Settings />;
        case 'contact':
          return <ContactPage />;
        case 'master-data':
          return <MasterData />; // This will now be the store-specific master data
        case 'expenses':
          return <Expenses />;
        case 'cashier-shifts':
          return <CashierShifts />;
        case 'customers':
          return <Customers />;
        case 'layaway':
          return <Layaway />;
        case 'bundles':
          return <Bundles />;
        case 'audit-log':
          return <AuditLog />;
        case 'subscriptions':
          return <Subscriptions />;
        case 'support-queries':
          return <AdminSupportPanel user={user} />;
        default:
          return <Dashboard />;
      }
    } else {
      // Show company-wide views when no store is selected
      switch (activeView) {
        case 'company-dashboard':
          return <CompanyDashboard onSelectStore={handleSelectStore} />;
        case 'master-control': // NEW ROUTE for company-wide master control
          return <MasterControl />;
        case 'engineer-activation':
          // Only engineers and systems_admin can access engineer activation
          if (user.role !== 'engineer' && user.role !== 'systems_admin') {
            return (
              <div className="p-6">
                <div className="max-w-4xl mx-auto">
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                    <Shield className="h-12 w-12 mx-auto text-red-500 dark:text-red-400 mb-4" />
                    <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">Access Denied</h2>
                    <p className="text-red-600 dark:text-red-300">
                      You don't have the required permissions to access this feature.
                      Only engineers and systems administrators can manage user trials and store assignments.
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          return <EngineerActivation />;
        case 'stores': // 👈 STORES MANAGEMENT (when no store selected)
          return <StoresManagement />;
        case 'support-queries':
          return <AdminSupportPanel user={user} />;
        case 'subscriptions':
          return <Subscriptions />;
        case 'settings':
          return <Settings />;
        default:
          return <CompanyDashboard onSelectStore={handleSelectStore} />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header
        user={user}
        onMenuClick={() => setSidebarOpen(true)}
        setActiveView={setActiveView}
        selectedStore={selectedStore} // Pass selected store to header
        onStoreChange={(store) => setSelectedStore(store)} // Allow changing store from header
      />

      <div className="flex">
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          userRole={user.role}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          selectedStore={selectedStore} // Pass selected store to sidebar
        />

        <main className="flex-1 lg:ml-64 pt-16">
          <div className="p-4 lg:p-6">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider> {/* 👈 WRAP WITH THEME PROVIDER */}
      <Router>
        <Routes>
          <Route path="/login" element={
            <AppSettingsProvider>
              <AuthProvider>
                <InventoryProvider>
                  <SalesProvider>
                    <SuppliersProvider>
                      <SupportTicketsProvider>
                        <StoresProvider>
                          <CustomerProvider>
                            <AuditProvider>
                              <LoginPage />
                            </AuditProvider>
                          </CustomerProvider>
                        </StoresProvider>
                      </SupportTicketsProvider>
                    </SuppliersProvider>
                  </SalesProvider>
                </InventoryProvider>
              </AuthProvider>
            </AppSettingsProvider>
          } />
          <Route path="/signup" element={
            <AppSettingsProvider>
              <AuthProvider>
                <InventoryProvider>
                  <SalesProvider>
                    <SuppliersProvider>
                      <SupportTicketsProvider>
                        <StoresProvider>
                          <SignupPage />
                        </StoresProvider>
                      </SupportTicketsProvider>
                    </SuppliersProvider>
                  </SalesProvider>
                </InventoryProvider>
              </AuthProvider>
            </AppSettingsProvider>
          } />
          <Route path="/pin-setup" element={
            <AppSettingsProvider>
              <AuthProvider>
                <InventoryProvider>
                  <SalesProvider>
                    <SuppliersProvider>
                      <SupportTicketsProvider>
                        <StoresProvider>
                          <PinSetupPage />
                        </StoresProvider>
                      </SupportTicketsProvider>
                    </SuppliersProvider>
                  </SalesProvider>
                </InventoryProvider>
              </AuthProvider>
            </AppSettingsProvider>
          } />
          <Route path="/*" element={
            <AppSettingsProvider>
              <AuthProvider>
                <InventoryProvider>
                  <SalesProvider>
                    <SuppliersProvider>
                      <SupportTicketsProvider>
                        <StoresProvider>
                          <CustomerProvider>
                            <AuditProvider>
                              <SubscriptionProvider>
                                <AppContent />
                              </SubscriptionProvider>
                            </AuditProvider>
                          </CustomerProvider>
                        </StoresProvider>
                      </SupportTicketsProvider>
                    </SuppliersProvider>
                  </SalesProvider>
                </InventoryProvider>
              </AuthProvider>
            </AppSettingsProvider>
          } />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;