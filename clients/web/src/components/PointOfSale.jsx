import React, { useState, useEffect, useRef } from 'react';
import {
  Calculator, Search, ShoppingCart, Package, Plus, Minus, Trash2, Receipt,
  Camera, Smartphone, Banknote, CreditCard, X, Star, User, AlertCircle, Gift, Layers
} from 'lucide-react';
import { useInventory } from '../contexts/InventoryContext';
import { useSales } from '../contexts/SalesContext';
import { useAuth } from '../contexts/AuthContext';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { useCustomers } from '../contexts/CustomerContext';
import PinVerificationModal from './PinVerificationModal';
import ReceiptModal from './ReceiptModal';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote, color: 'green' },
  { id: 'card', label: 'Card', icon: CreditCard, color: 'blue' },
  { id: 'mpesa', label: 'M-Pesa', icon: Smartphone, color: 'emerald' },
];

const PointOfSale = () => {
  const { products, loading: invLoading, updateStock } = useInventory();
  const { loading: salesLoading } = useSales();
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const { customers, findByPhone, addPoints } = useCustomers();

  const sym = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', KES: 'KSh', TZS: 'TSh', UGX: 'USh' }[settings?.currency] || '$';
  const fmt = (n) => `${sym}${Number(n || 0).toFixed(2)}`;

  // Cart & search
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('products'); // products | bundles
  const [bundles, setBundles] = useState([]);

  // Customer
  const [customerPhone, setCustomerPhone] = useState('');
  const [linkedCustomer, setLinkedCustomer] = useState(null);
  const [redeemPoints, setRedeemPoints] = useState(false);

  // Split payment
  const [splitPayments, setSplitPayments] = useState([{ method: 'cash', amount: '' }]);

  // Discount & tax
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(settings?.taxRate || 0);
  const [discountPending, setDiscountPending] = useState(null);

  // PIN modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinAction, setPinAction] = useState(null);
  const [pinTitle, setPinTitle] = useState('');
  const [pinMessage, setPinMessage] = useState('');

  // Receipt
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  // M-Pesa STK
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaStatus, setMpesaStatus] = useState('idle'); // idle | pending | success | failed

  // Barcode scanner
  const [showScanModal, setShowScanModal] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const scanInputRef = useRef(null);

  // Load bundles
  useEffect(() => {
    fetch('http://localhost:3001/bundles')
      .then(r => r.ok ? r.json() : [])
      .then(setBundles)
      .catch(() => setBundles([]));
  }, []);

  // Auto-lookup customer by phone
  useEffect(() => {
    if (customerPhone.length >= 9) {
      const found = findByPhone(customerPhone);
      setLinkedCustomer(found || null);
    } else {
      setLinkedCustomer(null);
    }
  }, [customerPhone, findByPhone]);

  // Recompute split totals when cart changes
  useEffect(() => {
    if (splitPayments.length === 1) {
      setSplitPayments([{ ...splitPayments[0], amount: total.toFixed(2) }]);
    }
  }, [cart, discount, taxRate]);

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(p.barcode)?.includes(searchTerm)
  );

  const filteredBundles = bundles.filter(b =>
    b.status === 'active' && (
      b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const addToCart = (product, isBundle = false) => {
    const key = isBundle ? `bundle-${product.id}` : product.id;
    const existing = cart.find(item => item._cartKey === key);
    if (existing) {
      setCart(cart.map(item => item._cartKey === key ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, {
        ...product,
        _cartKey: key,
        _isBundle: isBundle,
        price: isBundle ? product.sellingPrice : product.sellingPrice,
        quantity: 1
      }]);
    }
  };

  const updateQuantity = (key, qty) => {
    if (qty <= 0) { setCart(cart.filter(i => i._cartKey !== key)); return; }
    setCart(cart.map(i => i._cartKey === key ? { ...i, quantity: qty } : i));
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const discountAmount = (subtotal * discount) / 100;
  const pointsDiscount = redeemPoints && linkedCustomer ? Math.min(linkedCustomer.pointsBalance, subtotal * 0.1) : 0;
  const total = Math.max(0, subtotal + taxAmount - discountAmount - pointsDiscount);

  const splitTotal = splitPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const splitRemaining = total - splitTotal;

  // Discount change with PIN guard
  const handleDiscountChange = (newDiscount) => {
    const threshold = settings?.discountPinThreshold ?? 10;
    if (newDiscount > threshold) {
      setDiscountPending(newDiscount);
      setPinTitle('Manager Authorization Required');
      setPinMessage(`Discounts above ${threshold}% require a manager PIN.`);
      setPinAction(() => () => {
        setDiscount(discountPending ?? newDiscount);
        setDiscountPending(null);
        return { success: true };
      });
      setShowPinModal(true);
    } else {
      setDiscount(newDiscount);
    }
  };

  // Barcode scan logic
  const handleBarcodeScan = () => {
    const code = barcodeInput.trim();
    if (!code) return;
    const product = products.find(p => String(p.barcode) === code || p.sku === code);
    if (product) {
      addToCart(product);
      setBarcodeInput('');
      setShowScanModal(false);
    } else {
      alert(`No product found for barcode: ${code}`);
      setBarcodeInput('');
    }
  };

  // M-Pesa STK push simulation
  const triggerMpesa = async () => {
    if (!mpesaPhone) { alert('Enter phone number'); return; }
    setMpesaStatus('pending');
    // Real implementation: POST to your Flask backend /api/mpesa/stk-push
    // which calls Daraja API with credentials from settings
    setTimeout(() => {
      setMpesaStatus('success');
    }, 3000);
  };

  const completeSaleAction = async () => {
    if (Math.abs(splitRemaining) > 0.01 && splitPayments.length > 1) {
      alert(`Split payments don't add up. Remaining: ${fmt(splitRemaining)}`);
      return { success: false };
    }

    const paymentMethod = splitPayments.length === 1
      ? splitPayments[0].method
      : 'split';

    const saleData = {
      items: cart.map(item => ({
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
        isBundle: item._isBundle || false
      })),
      customer: { name: linkedCustomer?.name || '', phone: customerPhone, email: linkedCustomer?.email || '' },
      customerId: linkedCustomer?.id || null,
      customerName: linkedCustomer?.name || (customerPhone ? customerPhone : 'Walk-in Customer'),
      customerPhone,
      paymentMethod,
      payments: splitPayments,
      subtotal,
      tax: taxAmount,
      discount: discountAmount + pointsDiscount,
      pointsRedeemed: redeemPoints ? pointsDiscount : 0,
      total,
      userId: user?.id,
      cashierName: user?.name || user?.username,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      storeId: user?.stores?.[0] || null
    };

    // Post sale to json-server
    const res = await fetch('http://localhost:3001/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData)
    });

    if (!res.ok) throw new Error('Failed to save sale');

    // Deduct stock for each item
    for (const item of cart) {
      if (!item._isBundle) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          await fetch(`http://localhost:3001/products/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock: Math.max(0, product.stock - item.quantity) })
          });
        }
      }
    }

    // Award loyalty points
    if (linkedCustomer) {
      const pointsRate = settings?.loyaltyPointsRate || 10;
      await addPoints(linkedCustomer.id, total, pointsRate);
    }

    const savedSale = await res.json();
    setLastSale(savedSale);
    setShowReceipt(true);

    setCart([]);
    setCustomerPhone('');
    setLinkedCustomer(null);
    setDiscount(0);
    setRedeemPoints(false);
    setSplitPayments([{ method: 'cash', amount: '' }]);
    return { success: true };
  };

  const processSale = () => {
    if (cart.length === 0) return;
    setPinTitle('Verify Your PIN');
    setPinMessage('Enter your PIN to complete this transaction');
    setPinAction(() => completeSaleAction);
    setShowPinModal(true);
  };

  if (invLoading || salesLoading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="p-4 lg:p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Calculator className="h-8 w-8 text-blue-600" /> Point of Sale
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Process transactions and manage sales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Product search + cart */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search + Scan + Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products, SKU or barcode..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => { setShowScanModal(true); setTimeout(() => scanInputRef.current?.focus(), 100); }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                title="Scan barcode"
              >
                <Camera className="h-4 w-4" /> Scan
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg w-fit">
              <button onClick={() => setActiveTab('products')} className={`px-3 py-1.5 text-sm rounded-md font-medium transition ${activeTab === 'products' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                Products
              </button>
              <button onClick={() => setActiveTab('bundles')} className={`px-3 py-1.5 text-sm rounded-md font-medium transition flex items-center gap-1 ${activeTab === 'bundles' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                <Layers className="h-3.5 w-3.5" /> Bundles
              </button>
            </div>

            {/* Product grid */}
            {activeTab === 'products' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => product.stock > 0 && addToCart(product)}
                    className={`border rounded-xl p-3 transition cursor-pointer ${
                      product.stock <= 0
                        ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold text-xs mb-2">
                      {product.name?.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-medium text-xs text-gray-900 dark:text-white truncate">{product.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{product.sku}</p>
                    <p className="font-semibold text-sm text-blue-600 dark:text-blue-400 mt-1">{fmt(product.sellingPrice)}</p>
                    <p className="text-xs text-gray-400">{product.stock <= 0 ? 'Out of stock' : `Stock: ${product.stock}`}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Bundle grid */}
            {activeTab === 'bundles' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto">
                {filteredBundles.map(bundle => (
                  <div
                    key={bundle.id}
                    onClick={() => addToCart(bundle, true)}
                    className="border border-indigo-200 dark:border-indigo-700 rounded-xl p-3 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
                  >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white mb-2">
                      <Layers className="h-4 w-4" />
                    </div>
                    <p className="font-medium text-xs text-gray-900 dark:text-white truncate">{bundle.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{bundle.components?.length} items</p>
                    <p className="font-semibold text-sm text-indigo-600 dark:text-indigo-400 mt-1">{fmt(bundle.sellingPrice)}</p>
                  </div>
                ))}
                {filteredBundles.length === 0 && (
                  <p className="col-span-3 text-center py-8 text-sm text-gray-400">No active bundles</p>
                )}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Cart ({cart.length} item{cart.length !== 1 ? 's' : ''})</h2>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {cart.map(item => (
                  <div key={item._cartKey} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${item._isBundle ? 'bg-gradient-to-br from-indigo-400 to-purple-600' : 'bg-gradient-to-br from-blue-400 to-blue-600'}`}>
                        {item._isBundle ? <Layers className="h-4 w-4" /> : item.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{fmt(item.price)} each{item._isBundle ? ' (bundle)' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => updateQuantity(item._cartKey, item.quantity - 1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item._cartKey, item.quantity + 1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-16 text-right text-sm font-semibold">{fmt(item.price * item.quantity)}</span>
                      <button onClick={() => setCart(cart.filter(i => i._cartKey !== item._cartKey))} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Checkout panel */}
        <div className="space-y-4">
          {/* Customer lookup */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" /> Customer
            </h3>
            <input
              type="text"
              placeholder="Phone number to lookup..."
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
            />
            {linkedCustomer && (
              <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-300 text-sm">{linkedCustomer.name}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5">
                      <Star className="h-3 w-3" /> {linkedCustomer.pointsBalance} loyalty points
                    </p>
                  </div>
                  {linkedCustomer.pointsBalance > 0 && (
                    <label className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-300 cursor-pointer">
                      <input type="checkbox" checked={redeemPoints} onChange={e => setRedeemPoints(e.target.checked)} className="rounded" />
                      <Gift className="h-3.5 w-3.5" /> Redeem
                    </label>
                  )}
                </div>
                {redeemPoints && pointsDiscount > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">Points saving: -{fmt(pointsDiscount)}</p>
                )}
              </div>
            )}
          </div>

          {/* Payment method + split */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Payment</h3>

            {splitPayments.map((pay, idx) => (
              <div key={idx} className="mb-2">
                <div className="flex gap-2 items-center">
                  <select
                    value={pay.method}
                    onChange={e => setSplitPayments(sp => sp.map((p, i) => i === idx ? { ...p, method: e.target.value } : p))}
                    className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                  >
                    {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount"
                    value={pay.amount}
                    onChange={e => setSplitPayments(sp => sp.map((p, i) => i === idx ? { ...p, amount: e.target.value } : p))}
                    className="w-24 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                  />
                  {idx === 0 && pay.method === 'mpesa' && (
                    <button onClick={() => { setMpesaPhone(customerPhone); setShowMpesaModal(true); }} className="px-2 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700">
                      STK
                    </button>
                  )}
                  {idx > 0 && (
                    <button onClick={() => setSplitPayments(sp => sp.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={() => setSplitPayments(sp => [...sp, { method: 'cash', amount: Math.max(0, splitRemaining).toFixed(2) }])}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
            >
              + Add payment line (split)
            </button>

            {splitPayments.length > 1 && (
              <div className={`mt-2 text-xs font-medium ${Math.abs(splitRemaining) < 0.01 ? 'text-green-600' : 'text-red-500'}`}>
                {Math.abs(splitRemaining) < 0.01 ? '✓ Fully covered' : `Remaining: ${fmt(splitRemaining)}`}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-2">
            <div className="flex gap-4 mb-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Discount (%)</label>
                <input
                  type="number" min="0" max="100"
                  value={discount}
                  onChange={e => handleDiscountChange(Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tax (%)</label>
                <input
                  type="number" min="0" max="100"
                  value={taxRate}
                  onChange={e => setTaxRate(Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {[
              { label: 'Subtotal', value: fmt(subtotal) },
              discount > 0 && { label: `Discount (${discount}%)`, value: `-${fmt(discountAmount)}`, color: 'text-orange-600 dark:text-orange-400' },
              redeemPoints && pointsDiscount > 0 && { label: 'Points Redemption', value: `-${fmt(pointsDiscount)}`, color: 'text-green-600 dark:text-green-400' },
              { label: `Tax (${taxRate}%)`, value: fmt(taxAmount) },
            ].filter(Boolean).map(row => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
                <span className={row.color || 'text-gray-900 dark:text-white'}>{row.value}</span>
              </div>
            ))}

            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="font-bold text-gray-900 dark:text-white">Total</span>
              <span className="font-bold text-xl text-gray-900 dark:text-white">{fmt(total)}</span>
            </div>

            <button
              onClick={processSale}
              disabled={cart.length === 0}
              className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${
                cart.length === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
              }`}
            >
              <Receipt className="h-5 w-5" /> Complete Sale — {fmt(total)}
            </button>
          </div>
        </div>
      </div>

      {/* PIN Modal */}
      <PinVerificationModal
        isOpen={showPinModal}
        onClose={() => { setShowPinModal(false); setDiscountPending(null); }}
        onVerify={pinAction}
        title={pinTitle}
        message={pinMessage}
      />

      {/* M-Pesa STK Push Modal */}
      {showMpesaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-600" /> M-Pesa STK Push
              </h3>
              <button onClick={() => { setShowMpesaModal(false); setMpesaStatus('idle'); }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            {mpesaStatus === 'idle' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Phone (07xx or 254xx)</label>
                  <input
                    value={mpesaPhone}
                    onChange={e => setMpesaPhone(e.target.value)}
                    placeholder="e.g. 0712345678"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-sm text-emerald-700 dark:text-emerald-300">
                  Amount to charge: <strong>{fmt(total)}</strong>
                </div>
                {!settings?.mpesaConfig?.shortCode && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-xs text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>M-Pesa credentials not configured. Go to Settings → M-Pesa to enter your Daraja API credentials.</span>
                  </div>
                )}
                <button onClick={triggerMpesa} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700">
                  Send STK Push
                </button>
              </div>
            )}

            {mpesaStatus === 'pending' && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
                <p className="font-medium text-gray-700 dark:text-gray-300">Waiting for customer confirmation...</p>
                <p className="text-sm text-gray-500 mt-1">A prompt has been sent to {mpesaPhone}</p>
              </div>
            )}

            {mpesaStatus === 'success' && (
              <div className="text-center py-8">
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✓</span>
                </div>
                <p className="font-bold text-green-700 dark:text-green-300 text-lg">Payment Confirmed!</p>
                <p className="text-sm text-gray-500 mt-1">{fmt(total)} received via M-Pesa</p>
                <button
                  onClick={() => {
                    setSplitPayments([{ method: 'mpesa', amount: total.toFixed(2) }]);
                    setShowMpesaModal(false);
                    setMpesaStatus('idle');
                  }}
                  className="mt-4 w-full py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
                >
                  Continue to Complete Sale
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-600" /> Barcode Scanner
              </h3>
              <button onClick={() => setShowScanModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Scan a barcode with a USB/Bluetooth scanner, or type the barcode number below.
            </p>
            <div className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl p-8 mb-4 text-center bg-blue-50 dark:bg-blue-900/20">
              <Camera className="h-12 w-12 text-blue-400 mx-auto mb-2" />
              <p className="text-xs text-blue-600 dark:text-blue-400">Camera scanning via @zxing/browser</p>
              <p className="text-xs text-gray-400 mt-1">(install: npm i @zxing/browser)</p>
            </div>
            <input
              ref={scanInputRef}
              type="text"
              placeholder="Type or scan barcode here..."
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBarcodeScan()}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white mb-3"
              autoFocus
            />
            <button onClick={handleBarcodeScan} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
              Find Product
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        sale={lastSale}
      />
    </div>
  );
};

export default PointOfSale;
