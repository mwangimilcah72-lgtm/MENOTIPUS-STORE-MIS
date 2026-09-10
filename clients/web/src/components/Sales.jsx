import React, { useState, useEffect } from 'react';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Smartphone, Banknote, Printer, Check, X, AlertTriangle, Tag, Percent, Barcode, Package, Filter, Grid, List, Pause, User
} from 'lucide-react';
import ReceiptModal from './ReceiptModal';
import { useInventory } from '../contexts/InventoryContext';
import { useSales } from '../contexts/SalesContext';
import { useAuth } from '../contexts/AuthContext';
import { useAppSettings } from '../contexts/AppSettingsContext';

const Sales = () => {
  const { products } = useInventory();
  const { cart, addToCart, removeFromCart, updateCartQuantity, clearCart, getCartTotal, getCartTax, processSale, heldOrders, saveHeldOrders, handleUnholdOrder } = useSales();
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdNote, setHoldNote] = useState('');
  const [activeTab, setActiveTab] = useState('products');
  const [viewMode, setViewMode] = useState('grid');
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const formatPrice = (amount) => {
    const symbol = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', KES: 'KSh', TZS: 'TSh', UGX: 'USh' }[settings.currency] || '$';
    return `${symbol}${amount.toFixed(2)}`;
  };

  const availableProducts = products.filter(product => 
    product.stock > 0 && 
    (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const categories = [...new Set(products.map(product => product.category))];
  const [selectedCategory, setSelectedCategory] = useState('');
  const filteredProducts = selectedCategory 
    ? availableProducts.filter(product => product.category === selectedCategory)
    : availableProducts;

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const subtotal = getCartTotal();
  const tax = getCartTax(subtotal);
  const total = subtotal + tax;

  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: Banknote, color: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' },
    { id: 'card', name: 'Card', icon: CreditCard, color: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200' },
    { id: 'mobile_money', name: 'Mobile Money', icon: Smartphone, color: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200' }
  ];

  const handleProcessSale = async () => {
    if (cart.length === 0) {
      alert('Please add items to cart before processing sale');
      return;
    }
    setProcessing(true);
    const result = await processSale(selectedPaymentMethod, user, null, customerName || 'Walk-in Customer', isCreditSale);
    if (result.success) {
      setLastSale(result.sale);
      setShowReceipt(true);
      setIsCreditSale(false);
      setCustomerName('');
    } else {
      alert('Sale processing failed. Please try again.');
    }
    setProcessing(false);
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    const heldOrder = {
      id: Date.now().toString(),
      cart: [...cart],
      note: holdNote,
      customerName: customerName || 'Walk-in Customer',
      heldAt: new Date().toISOString(),
      cashier: user
    };
    saveHeldOrders([...heldOrders, heldOrder]);
    clearCart();
    setHoldNote('');
    setShowHoldModal(false);
    alert('Order held successfully!');
  };


  const handleBarcodeScan = (e) => {
    if (e.key === 'Enter') {
      const scannedProduct = products.find(p => p.barcode && p.barcode.toLowerCase() === searchTerm.toLowerCase());
      if (scannedProduct && scannedProduct.stock > 0) {
        addToCart(scannedProduct);
        setSearchTerm('');
      } else if (scannedProduct) {
        alert('This product is out of stock');
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        if (e.key === '/') {
          e.preventDefault();
          document.getElementById('search-input')?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const ProductCard = ({ product }) => {
    const cartItem = cart.find(item => item.id === product.id);
    const availableStock = product.stock - (cartItem?.quantity || 0);
    const isInLowStock = availableStock <= product.minStock;
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1 group h-full flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
              {product.name}
            </h3>
            <div className="flex items-center mt-1 flex-wrap gap-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                {product.category}
              </span>
              {product.barcode && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                  <Barcode className="h-3 w-3 mr-1" />
                  {product.barcode}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">SKU: {product.sku}</p>
          </div>
          <div className="text-right ml-2 flex-shrink-0 w-20">
            <p className="font-bold text-lg text-gray-900 dark:text-white truncate">{formatPrice(product.sellingPrice)}</p>
            <div className="flex items-center justify-end mt-1">
              {isInLowStock && (
                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1 flex-shrink-0" />
              )}
              <span className={`text-xs font-medium truncate ${
                isInLowStock ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {availableStock} left
              </span>
            </div>
          </div>
        </div>
        <div className="mt-auto">
          {cartItem ? (
            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
              <button
                onClick={() => updateCartQuantity(product.id, Math.max(1, cartItem.quantity - 1))}
                className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </button>
              <span className="font-bold text-blue-900 dark:text-blue-300 text-lg min-w-8 text-center">{cartItem.quantity}</span>
              <button
                onClick={() => updateCartQuantity(product.id, cartItem.quantity + 1)}
                disabled={cartItem.quantity >= product.stock}
                className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToCart(product)}
              disabled={availableStock <= 0}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white text-sm py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-900 transform hover:scale-105 transition-all disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:transform-none shadow-sm"
            >
              <div className="flex items-center justify-center">
                <Plus className="h-4 w-4 mr-2" />
                Add to Cart
              </div>
            </button>
          )}
        </div>
      </div>
    );
  };

  const ProductListItem = ({ product }) => {
    const cartItem = cart.find(item => item.id === product.id);
    const availableStock = product.stock - (cartItem?.quantity || 0);
    const isInLowStock = availableStock <= product.minStock;
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all duration-200 group">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <Package className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {product.name}
            </h3>
            <div className="flex items-center mt-1 flex-wrap gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                {product.category}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">SKU: {product.sku}</span>
              {product.barcode && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                  <Barcode className="h-3 w-3 mr-1" />
                  {product.barcode}
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0 w-20">
            <p className="font-bold text-lg text-gray-900 dark:text-white truncate">{formatPrice(product.sellingPrice)}</p>
            <div className="flex items-center justify-end mt-1">
              {isInLowStock && (
                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1 flex-shrink-0" />
              )}
              <span className={`text-xs font-medium truncate ${
                isInLowStock ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {availableStock} left
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3">
          {cartItem ? (
            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
              <button
                onClick={() => updateCartQuantity(product.id, Math.max(1, cartItem.quantity - 1))}
                className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </button>
              <span className="font-bold text-blue-900 dark:text-blue-300 text-lg min-w-8 text-center">{cartItem.quantity}</span>
              <button
                onClick={() => updateCartQuantity(product.id, cartItem.quantity + 1)}
                disabled={cartItem.quantity >= product.stock}
                className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToCart(product)}
              disabled={availableStock <= 0}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white text-sm py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-900 transform hover:scale-105 transition-all disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:transform-none shadow-sm"
            >
              <div className="flex items-center justify-center">
                <Plus className="h-4 w-4 mr-2" />
                Add to Cart
              </div>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Point of Sale System</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Quick and easy checkout for your customers
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1">
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded">/</kbd>
              <span className="ml-2">to focus search</span>
            </div>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('products')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'products' 
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                Products
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'categories' 
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                Categories
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-5 w-5" />
            <input
              id="search-input"
              type="text"
              placeholder="Search by name, SKU, or barcode... (Press Enter to scan)"
              className="pl-10 pr-4 py-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-3 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleBarcodeScan}
              onFocus={() => setIsScanning(false)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {activeTab === 'categories' && (
            <select
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-3 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all text-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          )}
          <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg px-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title="Grid View"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <select
              className="ml-2 px-2 py-1 text-sm border-none bg-transparent text-gray-700 dark:text-gray-300"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={12}>12 per page</option>
              <option value={20}>20 per page</option>
              <option value={30}>30 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3">
            <Package className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
            <span>{filteredProducts.length} products available</span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {activeTab === 'categories' && selectedCategory ? `${selectedCategory} Products` : 'Available Products'}
            </h2>
            {filteredProducts.length > 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
              </div>
            )}
          </div>
          {filteredProducts.length > 0 ? (
            <div className="flex-1 flex flex-col">
              <div className={`flex-1 pb-4 overflow-y-auto ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-4'}`}>
                {paginatedProducts.map(product => (
                  viewMode === 'grid' ? (
                    <ProductCard key={product.id} product={product} />
                  ) : (
                    <ProductListItem key={product.id} product={product} />
                  )
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center space-x-1">
                    {[...Array(Math.min(5, totalPages))].map((_, index) => {
                      const pageNumber = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + index;
                      if (pageNumber > totalPages) return null;
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`px-3 py-1 text-sm rounded-lg ${
                            currentPage === pageNumber
                              ? 'bg-blue-600 text-white dark:bg-blue-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-gray-300 dark:text-gray-600 mb-4">
                <Search className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No products found</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                {searchTerm 
                  ? 'Try adjusting your search terms or clear the search to see all products' 
                  : selectedCategory 
                    ? `No products available in the ${selectedCategory} category` 
                    : 'All products are currently out of stock'}
              </p>
              {(searchTerm || selectedCategory) && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
                    setCurrentPage(1);
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white text-sm rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <ShoppingCart className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
                  Cart
                  <span className="ml-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {cart.length}
                  </span>
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium transition-colors flex items-center"
                    aria-label="Clear cart"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-6 py-4 flex-1 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-8">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                      <ShoppingCart className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Your cart is empty</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-center">Search for products and add them to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-sm transition-shadow">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm leading-tight">{item.name}</h4>
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatPrice(item.sellingPrice)} each</span>
                            <span className="mx-2 text-gray-300 dark:text-gray-500">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Stock: {item.stock}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => updateCartQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                          </button>
                          <span className="w-10 text-center font-bold text-lg text-gray-900 dark:text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                            className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-gray-200 dark:border-gray-600 ml-2 transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {cart.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700">
                  <div className="space-y-3 text-sm mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">Subtotal:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Percent className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
                        <span className="text-gray-600 dark:text-gray-300">Tax ({settings.taxRate || 10}%):</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{formatPrice(tax)}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-lg pt-2 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-gray-900 dark:text-white">Total:</span>
                      <span className="text-blue-600 dark:text-blue-400">{formatPrice(total)}</span>
                    </div>
                  </div>
                  
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCreditSale}
                        onChange={(e) => setIsCreditSale(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Credit Sale
                      </span>
                    </label>
                    {isCreditSale && (
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="Customer name (optional)"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Payment Method</p>
                    <div className="grid grid-cols-3 gap-2">
                      {paymentMethods.map(method => {
                        const Icon = method.icon;
                        return (
                          <button
                            key={method.id}
                            onClick={() => setSelectedPaymentMethod(method.id)}
                            className={`p-2.5 rounded-lg border-2 text-xs font-medium flex flex-col items-center space-y-1 transition-all ${
                              selectedPaymentMethod === method.id
                                ? method.color.replace('bg-', 'dark:bg-').replace('text-', 'dark:text-').replace('border-', 'dark:border-')
                                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="font-medium text-xs">{method.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex space-x-3 mb-4">
                    <button
                      onClick={() => setShowHoldModal(true)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-sm rounded-lg font-medium hover:from-yellow-600 hover:to-yellow-700 transform hover:scale-105 transition-all shadow-sm flex items-center justify-center"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Hold Order
                    </button>
                  </div>

                  <button
                    onClick={handleProcessSale}
                    disabled={processing || cart.length === 0}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 text-white py-3 rounded-xl font-bold text-base hover:from-green-700 hover:to-green-800 dark:hover:from-green-800 dark:hover:to-green-900 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                  >
                    {processing ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5 mr-2 inline-block" />
                        {isCreditSale ? 'Create Credit Sale' : `Charge ${formatPrice(total)}`}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showHoldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Hold Order</h3>
            <input
              type="text"
              placeholder="Note (optional)"
              value={holdNote}
              onChange={(e) => setHoldNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setShowHoldModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleHoldOrder}
                className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg"
              >
                Hold Order
              </button>
            </div>
          </div>
        </div>
      )}

      {heldOrders.length > 0 && (
        <div className="fixed right-4 bottom-20 z-40 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-bold">Held Orders ({heldOrders.length})</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {heldOrders.map(order => (
              <div key={order.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex justify-between">
                  <span className="font-medium">{order.customerName}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(order.heldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{order.note}</p>
                <div className="mt-2 flex space-x-2">
                  <button
                    onClick={() => handleUnholdOrder(order)}
                    className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-1 rounded"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => saveHeldOrders(heldOrders.filter(o => o.id !== order.id))}
                    className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ReceiptModal
        isOpen={showReceipt && !!lastSale}
        onClose={() => setShowReceipt(false)}
        sale={lastSale}
      />
    </div>
  );
};

export default Sales;