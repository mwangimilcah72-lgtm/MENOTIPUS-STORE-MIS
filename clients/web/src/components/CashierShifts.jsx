import React, { useState, useRef } from 'react';
import {
  Search, Plus, Edit2, Trash2, Download, Upload, Eye, Calendar,
  Database, User, Clock, TrendingUp, TrendingDown, Package, ChevronLeft, ChevronRight, ImageIcon, X,
  Printer, Award, BarChart3, DollarSign
} from 'lucide-react';

const getCashierAvatar = (cashierId, cashierName) => {
  const isFemale = cashierName?.toLowerCase().includes('jane') ||
    cashierName?.toLowerCase().includes('mary') ||
    cashierName?.toLowerCase().includes('ann') ||
    cashierName?.toLowerCase().includes('lisa');
  const gender = isFemale ? 'women' : 'men';
  const num = ((cashierId || 1) % 70) + 1;
  return `https://randomuser.me/api/portraits/${gender}/${num}.jpg`;
};

const CashierAvatar = ({ shift, size = 'sm' }) => {
  const [err, setErr] = useState(false);
  const dim = size === 'lg' ? 'h-16 w-16' : 'h-9 w-9';
  const text = size === 'lg' ? 'text-2xl' : 'text-sm';
  const src = shift.avatar || getCashierAvatar(shift.cashierId, shift.cashierName);
  if (!err) {
    return (
      <img
        src={src}
        alt={shift.cashierName}
        className={`${dim} rounded-full object-cover border-2 border-blue-200 dark:border-blue-700 flex-shrink-0`}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center flex-shrink-0`}>
      <span className={`${text} font-bold text-white`}>{(shift.cashierName || 'C').charAt(0)}</span>
    </div>
  );
};

const CashierShifts = () => {
  const avatarInputRef = useRef(null);

  // State management
  const [shifts, setShifts] = useState([
    {
      id: 1,
      cashierId: 1,
      cashierName: 'John Cashier',
      avatar: getCashierAvatar(1, 'John Cashier'),
      date: '2024-12-21',
      shiftStart: '09:00',
      shiftEnd: '17:00',
      openingCash: 500.00,
      closingCash: 1250.75,
      expectedCash: 1250.75,
      salesAmount: 750.75,
      expenses: [
        { id: 1, description: 'Staff lunch', amount: 25.00, date: '2024-12-21' }
      ],
      transactions: [
        { id: 1, type: 'sale', amount: 150.00, time: '10:15', customerId: null },
        { id: 2, type: 'sale', amount: 89.99, time: '10:45', customerId: 1 },
        { id: 3, type: 'expense', description: 'Staff lunch', amount: 25.00, time: '12:30' },
        { id: 4, type: 'sale', amount: 180.25, time: '14:20', customerId: 2 },
      ],
      status: 'closed',
      createdAt: '2024-12-21 08:55:00',
      closedAt: '2024-12-21 17:05:00'
    },
    {
      id: 2,
      cashierId: 2,
      cashierName: 'Jane Cashier',
      avatar: getCashierAvatar(2, 'Jane Cashier'),
      date: '2024-12-21',
      shiftStart: '13:00',
      shiftEnd: '21:00',
      openingCash: 300.00,
      closingCash: 780.50,
      expectedCash: 780.50,
      salesAmount: 480.50,
      expenses: [
        { id: 1, description: 'Office supplies', amount: 15.00, date: '2024-12-21' }
      ],
      transactions: [
        { id: 1, type: 'sale', amount: 120.00, time: '14:10', customerId: 3 },
        { id: 2, type: 'sale', amount: 95.75, time: '15:30', customerId: null },
        { id: 3, type: 'expense', description: 'Office supplies', amount: 15.00, time: '16:45' },
        { id: 4, type: 'sale', amount: 180.25, time: '18:15', customerId: 1 },
      ],
      status: 'closed',
      createdAt: '2024-12-21 12:55:00',
      closedAt: '2024-12-21 21:02:00'
    }
  ]);
  
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [showEditShiftModal, setShowEditShiftModal] = useState(false);
  const [showViewShiftModal, setShowViewShiftModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCashier, setSelectedCashier] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [shiftForm, setShiftForm] = useState({
    cashierId: '',
    cashierName: '',
    avatar: '',
    date: new Date().toISOString().split('T')[0],
    shiftStart: '09:00',
    shiftEnd: '17:00',
    openingCash: '',
    closingCash: '',
    salesAmount: 0,
    expenses: [],
    transactions: [],
    status: 'open'
  });

  const handleAvatarFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setShiftForm(prev => ({ ...prev, avatar: evt.target.result }));
    reader.readAsDataURL(file);
  };

  // Filter shifts based on search criteria
  const filteredShifts = shifts.filter(shift => {
    const matchesSearch = shift.cashierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shift.id.toString().includes(searchTerm.toLowerCase());
    const matchesCashier = !selectedCashier || shift.cashierId === parseInt(selectedCashier);
    const matchesDate = !selectedDate || shift.date === selectedDate;
    return matchesSearch && matchesCashier && matchesDate;
  });

  // Sort shifts
  const sortedShifts = [...filteredShifts].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedShifts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedShifts.length / itemsPerPage);

  const resetShiftForm = () => ({
    cashierId: '',
    cashierName: '',
    avatar: '',
    date: new Date().toISOString().split('T')[0],
    shiftStart: '09:00',
    shiftEnd: '17:00',
    openingCash: '',
    closingCash: '',
    salesAmount: 0,
    expenses: [],
    transactions: [],
    status: 'open'
  });

  const handleAddShift = (e) => {
    e.preventDefault();
    const newShift = {
      ...shiftForm,
      id: Math.max(...shifts.map(s => s.id), 0) + 1,
      avatar: shiftForm.avatar || getCashierAvatar(parseInt(shiftForm.cashierId) || shifts.length + 1, shiftForm.cashierName),
      expectedCash: parseFloat(shiftForm.openingCash) || 0,
      salesAmount: 0,
      expenses: [],
      transactions: [],
      status: 'open',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    setShifts([...shifts, newShift]);
    setShowAddShiftModal(false);
    setShiftForm(resetShiftForm());
  };

  const handleEditShift = (shift) => {
    setShiftForm({ ...shift });
    setShowEditShiftModal(true);
  };

  const handleViewShift = (shift) => {
    setShiftForm({ ...shift });
    setShowViewShiftModal(true);
  };

  const handleDeleteShift = (shift) => {
    if (window.confirm(`Are you sure you want to delete shift #${shift.id}?`)) {
      setShifts(shifts.filter(item => item.id !== shift.id));
    }
  };

  const exportToExcel = () => {
    alert('Export to Excel functionality would be implemented here');
  };

  const exportToCSV = () => {
    const rows = shifts.map(s => ({
      ID: s.id, Cashier: s.cashierName, Date: s.date, Start: s.shiftStart, End: s.shiftEnd,
      Opening: s.openingCash, Closing: s.closingCash, Sales: s.salesAmount,
      Expenses: s.expenses.reduce((sum, e) => sum + e.amount, 0), Status: s.status
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => r[h]).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'cashier-shifts.csv';
    a.click();
  };

  const getShiftScore = (shift) => {
    const { salesTotal, expensesTotal } = calculateShiftTotals(shift);
    const txCount = shift.transactions?.filter(t => t.type === 'sale').length || 0;
    const avgTx = txCount > 0 ? salesTotal / txCount : 0;
    const cashVar = Math.abs((shift.closingCash || 0) - ((shift.openingCash || 0) + salesTotal - expensesTotal));
    let score = 100;
    if (cashVar > 50) score -= 30;
    else if (cashVar > 20) score -= 15;
    else if (cashVar > 5) score -= 5;
    if (txCount < 5) score -= 10;
    return { score: Math.max(0, score), txCount, avgTx, salesTotal, cashVar };
  };

  const printReconciliation = (shift) => {
    const { salesTotal, expensesTotal, expectedCash } = calculateShiftTotals(shift);
    const variance = (shift.closingCash || 0) - expectedCash;
    const html = `
      <html><head><title>Shift Reconciliation #${shift.id}</title>
      <style>body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;color:#222}
      h1{font-size:20px;border-bottom:2px solid #333;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;margin:16px 0}
      td,th{padding:8px 12px;border:1px solid #ddd;font-size:14px}
      th{background:#f5f5f5;font-weight:bold;text-align:left}
      .total{font-weight:bold;font-size:16px}.variance{color:${variance < 0 ? 'red' : 'green'}}
      .sig{margin-top:60px;border-top:1px solid #333;padding-top:8px;font-size:12px}
      @media print{body{margin:0}}</style></head>
      <body>
        <h1>Daily Cash Reconciliation Report</h1>
        <p><strong>Cashier:</strong> ${shift.cashierName} &nbsp;|&nbsp; <strong>Date:</strong> ${shift.date}</p>
        <p><strong>Shift:</strong> ${shift.shiftStart} – ${shift.shiftEnd || 'Active'} &nbsp;|&nbsp; <strong>Status:</strong> ${shift.status}</p>
        <table>
          <tr><th>Item</th><th>Amount</th></tr>
          <tr><td>Opening Cash</td><td>${formatCurrency(shift.openingCash)}</td></tr>
          <tr><td>Total Sales</td><td>${formatCurrency(salesTotal)}</td></tr>
          <tr><td>Total Expenses</td><td>(${formatCurrency(expensesTotal)})</td></tr>
          <tr><td>Expected Closing Cash</td><td>${formatCurrency(expectedCash)}</td></tr>
          <tr><td>Actual Closing Cash</td><td>${formatCurrency(shift.closingCash)}</td></tr>
          <tr class="total"><td>Cash Variance</td><td class="variance">${variance >= 0 ? '+' : ''}${formatCurrency(variance)}</td></tr>
        </table>
        <p><strong>Transaction Count:</strong> ${shift.transactions?.filter(t => t.type === 'sale').length || 0}</p>
        <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
        <div class="sig">Cashier Signature: _______________________ &nbsp;&nbsp; Manager Signature: _______________________</div>
      </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calculateShiftTotals = (shift) => {
    const salesTotal = shift.transactions
      .filter(t => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expensesTotal = shift.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expectedCash = shift.openingCash + salesTotal - expensesTotal;
    
    return { salesTotal, expensesTotal, expectedCash };
  };

  const getUniqueCashiers = () => {
    return Array.from(new Set(shifts.map(shift => shift.cashierId)))
      .map(id => {
        const shift = shifts.find(s => s.cashierId === id);
        return { id: shift.cashierId, name: shift.cashierName };
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cashier Shift Management</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Track daily sales, cash flows, and expenses for each cashier
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportToExcel}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </button>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <Upload className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => setShowAddShiftModal(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Shift
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Cashiers</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {Array.from(new Set(shifts.filter(s => s.status === 'open').map(s => s.cashierId))).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Sales</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {formatCurrency(shifts.filter(s => s.date === new Date().toISOString().split('T')[0]).reduce((sum, s) => sum + s.salesAmount, 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Expenses</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {formatCurrency(shifts.filter(s => s.date === new Date().toISOString().split('T')[0]).reduce((sum, s) => {
                  return sum + s.expenses.reduce((expSum, exp) => expSum + exp.amount, 0);
                }, 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Shifts</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{shifts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Shift Scorecards */}
      {shifts.filter(s => s.status === 'closed').length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" /> Shift Performance Scorecards
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shifts.filter(s => s.status === 'closed').slice(0, 4).map(shift => {
              const { score, txCount, avgTx, salesTotal, cashVar } = getShiftScore(shift);
              const grade = score >= 90 ? { label: 'Excellent', color: 'text-green-600' } : score >= 75 ? { label: 'Good', color: 'text-blue-600' } : score >= 60 ? { label: 'Fair', color: 'text-yellow-600' } : { label: 'Needs Review', color: 'text-red-600' };
              return (
                <div key={shift.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <CashierAvatar shift={shift} size="sm" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{shift.cashierName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{shift.date} · {shift.shiftStart}–{shift.shiftEnd}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${grade.color}`}>{score}</p>
                      <p className={`text-xs font-medium ${grade.color}`}>{grade.label}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                      <p className="text-gray-500 dark:text-gray-400">Sales</p>
                      <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(salesTotal)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                      <p className="text-gray-500 dark:text-gray-400">Transactions</p>
                      <p className="font-bold text-gray-900 dark:text-white">{txCount}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                      <p className="text-gray-500 dark:text-gray-400">Cash Variance</p>
                      <p className={`font-bold ${cashVar > 20 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(cashVar)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => printReconciliation(shift)}
                    className="mt-3 w-full py-1.5 text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-1.5"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print Reconciliation Report
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
            <input
              type="text"
              placeholder="Search shifts..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            value={selectedCashier}
            onChange={(e) => setSelectedCashier(e.target.value)}
          >
            <option value="">All Cashiers</option>
            {getUniqueCashiers().map(cashier => (
              <option key={cashier.id} value={cashier.id}>{cashier.name}</option>
            ))}
          </select>
          
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 md:col-span-4">
            <Database className="h-4 w-4" />
            <span>{filteredShifts.length} shifts</span>
          </div>
        </div>
      </div>

      {/* Shifts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => {
                    let direction = 'asc';
                    if (sortConfig.key === 'date' && sortConfig.direction === 'asc') {
                      direction = 'desc';
                    }
                    setSortConfig({ key: 'date', direction });
                  }}
                >
                  <div className="flex items-center">
                    Date
                    {sortConfig.key === 'date' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cashier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Shift Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Opening Cash</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Closing Cash</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sales</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Expenses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {currentItems.map((shift) => {
                const { salesTotal, expensesTotal, expectedCash } = calculateShiftTotals(shift);
                return (
                  <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {shift.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <CashierAvatar shift={shift} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{shift.cashierName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">ID #{shift.cashierId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {shift.shiftStart} - {shift.shiftEnd || 'Active'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(shift.openingCash)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatCurrency(shift.closingCash)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                      {formatCurrency(salesTotal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                      {formatCurrency(expensesTotal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        shift.status === 'open' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {shift.status.charAt(0).toUpperCase() + shift.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewShift(shift)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditShift(shift)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => printReconciliation(shift)}
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                          title="Print reconciliation"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteShift(shift)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {currentItems.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No shifts found. Try adjusting your search or filters.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                <span className="font-medium">{Math.min(indexOfLastItem, sortedShifts.length)}</span> of{' '}
                <span className="font-medium">{sortedShifts.length}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 dark:text-gray-500 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0 ${
                    currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                      currentPage === page
                        ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                        : 'text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 dark:text-gray-500 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0 ${
                    currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
            <div className="ml-4">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-md border-0 bg-transparent py-0 pl-2 pr-7 text-sm text-gray-500 dark:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600"
              >
                {[5, 10, 20, 50].map(size => (
                  <option key={size} value={size}>Show {size}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Add Shift Modal */}
      {showAddShiftModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-70 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Shift</h3>
            <form onSubmit={handleAddShift} className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="relative">
                  {shiftForm.avatar ? (
                    <div className="relative">
                      <img src={shiftForm.avatar} alt="Cashier" className="h-14 w-14 rounded-full object-cover border-2 border-blue-300" onError={(e) => e.target.style.display='none'} />
                      <button type="button" onClick={() => setShiftForm({...shiftForm, avatar: ''})} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-gray-200 dark:bg-gray-600 border-2 border-dashed border-gray-300 dark:border-gray-500 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cashier Photo</p>
                  <div className="flex gap-2">
                    <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarFile} className="hidden" />
                    <button type="button" onClick={() => avatarInputRef.current?.click()} className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      <ImageIcon className="h-3 w-3 mr-1" /> Upload photo
                    </button>
                    <input type="text" placeholder="or paste image URL" className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-600 dark:text-white" value={shiftForm.avatar} onChange={(e) => setShiftForm({...shiftForm, avatar: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cashier Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter cashier name"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={shiftForm.cashierName}
                    onChange={(e) => setShiftForm({ ...shiftForm, cashierName: e.target.value, cashierId: shiftForm.cashierId || (shifts.length + 1) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                  <input
                    type="date"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={shiftForm.date}
                    onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shift Start Time</label>
                  <input
                    type="time"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={shiftForm.shiftStart}
                    onChange={(e) => setShiftForm({ ...shiftForm, shiftStart: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shift End Time</label>
                  <input
                    type="time"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={shiftForm.shiftEnd}
                    onChange={(e) => setShiftForm({ ...shiftForm, shiftEnd: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Opening Cash</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={shiftForm.openingCash}
                    onChange={(e) => setShiftForm({ ...shiftForm, openingCash: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Closing Cash</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={shiftForm.closingCash}
                    onChange={(e) => setShiftForm({ ...shiftForm, closingCash: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => { setShowAddShiftModal(false); setShiftForm(resetShiftForm()); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 rounded-md"
                >
                  Add Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Shift Modal */}
      {showViewShiftModal && selectedShift && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-70 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">View Shift Details #{shiftForm.id}</h3>
              <button
                onClick={() => setShowViewShiftModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <CashierAvatar shift={shiftForm} size="lg" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{shiftForm.cashierName}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cashier ID #{shiftForm.cashierId}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    shiftForm.status === 'open'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  }`}>
                    {shiftForm.status?.charAt(0).toUpperCase() + shiftForm.status?.slice(1)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{shiftForm.date} · {shiftForm.shiftStart} – {shiftForm.shiftEnd || 'Active'}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Shift Information</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cashier</p>
                    <p className="font-medium">{shiftForm.cashierName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                    <p className="font-medium">{shiftForm.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Shift Time</p>
                    <p className="font-medium">{shiftForm.shiftStart} - {shiftForm.shiftEnd || 'Active'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <p className="font-medium">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        shiftForm.status === 'open' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {shiftForm.status.charAt(0).toUpperCase() + shiftForm.status.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Financial Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Opening Cash</p>
                    <p className="font-medium">{formatCurrency(shiftForm.openingCash)}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sales Amount</p>
                    <p className="font-medium text-green-600">{formatCurrency(shiftForm.salesAmount)}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Expenses</p>
                    <p className="font-medium text-red-600">
                      {formatCurrency(shiftForm.expenses.reduce((sum, exp) => sum + exp.amount, 0))}
                    </p>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Expected Closing Cash</p>
                    <p className="font-medium text-lg">
                      {formatCurrency(parseFloat(shiftForm.openingCash || 0) + parseFloat(shiftForm.salesAmount || 0) - shiftForm.expenses.reduce((sum, exp) => sum + exp.amount, 0))}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Actual Closing Cash</p>
                    <p className="font-medium">{formatCurrency(shiftForm.closingCash)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Expenses</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {shiftForm.expenses.map(expense => (
                      <tr key={expense.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{expense.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">{formatCurrency(expense.amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{expense.date}</td>
                      </tr>
                    ))}
                    {shiftForm.expenses.length === 0 && (
                      <tr>
                        <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          No expenses recorded
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Transactions</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {shiftForm.transactions.map(transaction => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{transaction.time}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.type === 'sale' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{transaction.description || transaction.name}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          transaction.type === 'sale' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.type === 'sale' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </td>
                      </tr>
                    ))}
                    {shiftForm.transactions.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          No transactions recorded
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowViewShiftModal(false);
                  handleEditShift(shiftForm);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 rounded-md"
              >
                Edit Shift
              </button>
              <button
                onClick={() => setShowViewShiftModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierShifts;