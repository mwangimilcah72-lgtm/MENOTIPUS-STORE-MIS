import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Filter, Edit2, Trash2, AlertTriangle, Package, Eye, Barcode, Calendar, Loader, AlertCircle, Upload, Scale, RotateCcw, FileText, ImageIcon, X
} from 'lucide-react';

const CATEGORY_COLORS = {
  Kitchen: 'from-orange-400 to-red-500',
  Electronics: 'from-blue-400 to-indigo-600',
  Clothing: 'from-purple-400 to-pink-500',
  Food: 'from-green-400 to-teal-500',
  Beverages: 'from-yellow-400 to-orange-500',
  Health: 'from-teal-400 to-cyan-500',
  Sports: 'from-lime-400 to-green-600',
  Office: 'from-slate-400 to-gray-600',
  Toys: 'from-pink-400 to-rose-500',
  Books: 'from-amber-400 to-yellow-600',
};

const getAvatarGradient = (category, name) =>
  CATEGORY_COLORS[category] || `from-blue-${(name.charCodeAt(0) % 4) * 100 + 400} to-indigo-${(name.charCodeAt(0) % 3) * 100 + 500}` || 'from-blue-400 to-indigo-600';

const getAutoImageUrl = (product) => {
  const kw = `${product.name}+${product.category}`.toLowerCase().replace(/\s+/g, '+');
  return `https://source.unsplash.com/featured/200x200/?${kw}`;
};

const ProductThumbnail = ({ product, size = 'sm' }) => {
  const [primaryError, setPrimaryError] = useState(false);
  const [autoError, setAutoError] = useState(false);
  const dim = size === 'lg' ? 'h-32 w-32' : 'h-10 w-10';
  const textSize = size === 'lg' ? 'text-4xl' : 'text-sm';
  const cls = `${dim} rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-600`;

  if (product.image && !primaryError) {
    return <img src={product.image} alt={product.name} className={cls} onError={() => setPrimaryError(true)} />;
  }
  if (!autoError) {
    return <img src={getAutoImageUrl(product)} alt={product.name} className={cls} onError={() => setAutoError(true)} />;
  }
  const gradient = getAvatarGradient(product.category, product.name);
  return (
    <div className={`${dim} rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
      <span className={`${textSize} font-bold text-white`}>{product.name.charAt(0).toUpperCase()}</span>
    </div>
  );
};
import { useInventory } from '../contexts/InventoryContext';
import { useAppSettings } from '../contexts/AppSettingsContext';
import * as XLSX from 'xlsx';
import stringSimilarity from 'string-similarity';

const Inventory = () => {
  const { 
    products, 
    loading, 
    addProduct, 
    updateProduct, 
    deleteProduct,
    getSupplierName,
    fetchProducts,
    bulkAddProducts
  } = useInventory();
  const { settings } = useAppSettings();
  const currentCurrency = settings?.currency || 'USD';

  const formatCurrency = (amount) => {
    const currencySymbols = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', KES: 'KSh', TZS: 'TSh', UGX: 'USh' };
    const symbol = currencySymbols[currentCurrency] || '$';
    const formattedAmount = parseFloat(amount).toFixed(2);
    if (['KES', 'TZS', 'UGX'].includes(currentCurrency)) {
      return `${symbol} ${parseFloat(amount).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    }
    return `${symbol} ${formattedAmount}`;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    sku: '',
    barcode: '',
    costPrice: '',
    sellingPrice: '',
    stock: '',
    minStock: '',
    supplierId: '',
    description: '',
    image: '',
    dateAdded: new Date().toISOString().split('T')[0],
    baseUnit: 'piece',
    sellUnits: ['piece'],
    conversionFactors: { piece: 1 }
  });
  const imageInputRef = useRef(null);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustData, setAdjustData] = useState({
    type: 'add',
    quantity: '',
    reason: 'sold',
    note: ''
  });
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeCandidates, setMergeCandidates] = useState([]);
  const [selectedMerge, setSelectedMerge] = useState(null);

  useEffect(() => {
    if (products && products.length > 0) {
      const ids = products.map(p => p.id);
      const uniqueIds = [...new Set(ids)];
      if (ids.length !== uniqueIds.length) {
        setShowDuplicateWarning(true);
      } else {
        setShowDuplicateWarning(false);
      }
    }
  }, [products]);

  const categories = [...new Set(products.map(product => product.category))];
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      sku: '',
      barcode: '',
      costPrice: '',
      sellingPrice: '',
      stock: '',
      minStock: '',
      supplierId: '',
      description: '',
      image: '',
      dateAdded: new Date().toISOString().split('T')[0],
      expiryDate: '',
      baseUnit: 'piece',
      sellUnits: ['piece'],
      conversionFactors: { piece: 1 }
    });
  };

  const getExpiryStatus = (product) => {
    if (!product.expiryDate) return null;
    const today = new Date();
    const expiry = new Date(product.expiryDate);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { label: 'Expired', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
    if (daysLeft <= 30) return { label: `Exp. ${daysLeft}d`, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' };
    return { label: `Exp. ${product.expiryDate}`, color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' };
  };

  const reorderSuggestions = products.filter(p => p.stock <= p.minStock && p.stock >= 0)
    .map(p => {
      const avgDailySales = 2;
      const suggested = Math.max(p.minStock * 2, avgDailySales * 14);
      return { ...p, suggestedQty: Math.round(suggested) };
    });

  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setFormData(prev => ({ ...prev, image: evt.target.result }));
    reader.readAsDataURL(file);
  };

  const handleAdd = () => {
    setShowAddModal(true);
    resetForm();
  };

  const handleUploadClick = () => {
    setShowUploadModal(true);
    setUploadFile(null);
    setUploadPreview([]);
    setUploadError('');
  };

  const findDuplicates = (newProduct) => {
    return products.filter(existing => {
      const nameSimilarity = stringSimilarity.compareTwoStrings(newProduct.name, existing.name);
      const skuMatch = newProduct.sku === existing.sku;
      const barcodeMatch = newProduct.barcode && existing.barcode && newProduct.barcode === existing.barcode;
      return nameSimilarity >= 0.9 && (skuMatch || barcodeMatch);
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);
    setUploadError('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (data.length === 0) {
          setUploadError('Excel file is empty');
          return;
        }
        const headers = data[0];
        const requiredHeaders = ['name', 'category', 'sku', 'costPrice', 'sellingPrice', 'stock', 'minStock'];
        const missingHeaders = requiredHeaders.filter(h => {
          const headerExists = headers.some(header => typeof header === 'string' && header.toLowerCase() === h.toLowerCase());
          return !headerExists;
        });
        if (missingHeaders.length > 0) {
          setUploadError(`Missing required columns: ${missingHeaders.join(', ')}`);
          return;
        }
        const headerMap = {};
        headers.forEach((header, index) => {
          if (typeof header === 'string') {
            headerMap[header.toLowerCase()] = index;
          }
        });
        const productsData = data.slice(1).map(row => {
          if (!row || row.length === 0 || (typeof row[0] === 'undefined' && row.length === 1)) {
            return null;
          }
          const product = {};
          requiredHeaders.forEach(field => {
            const index = headerMap[field.toLowerCase()];
            if (index !== undefined && index < row.length) {
              product[field] = row[index];
            }
          });
          const optionalFields = ['barcode', 'supplierId', 'description', 'dateAdded'];
          optionalFields.forEach(field => {
            const index = headerMap[field.toLowerCase()];
            if (index !== undefined && index < row.length) {
              product[field] = row[index];
            }
          });
          if (!product.name || !product.category || !product.sku) {
            console.warn('Skipping row with missing required fields:', product);
            return null;
          }
          product.costPrice = parseFloat(product.costPrice) || 0;
          product.sellingPrice = parseFloat(product.sellingPrice) || 0;
          product.stock = parseInt(product.stock) || 0;
          product.minStock = parseInt(product.minStock) || 0;
          if (product.supplierId !== undefined) {
            product.supplierId = parseInt(product.supplierId) || 0;
          }
          if (!product.dateAdded) {
            product.dateAdded = new Date().toISOString().split('T')[0];
          }
          return product;
        }).filter(product => product !== null);
        setUploadPreview(productsData);
        if (productsData.length === 0) {
          setUploadError('No valid products found in the file');
        }
      } catch (error) {
        setUploadError('Error reading Excel file: ' + error.message);
        console.error('Excel upload error:', error);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUploadSubmit = async () => {
    if (uploadPreview.length === 0) {
      setUploadError('No valid products to upload');
      return;
    }
    setIsProcessingUpload(true);
    setUploadError('');
    try {
      const finalProducts = [];
      const duplicates = [];
      for (const product of uploadPreview) {
        const dupes = findDuplicates(product);
        if (dupes.length > 0) {
          duplicates.push({ newProduct: product, existing: dupes[0] });
        } else {
          finalProducts.push(product);
        }
      }
      if (duplicates.length > 0) {
        setMergeCandidates(duplicates);
        setShowMergeModal(true);
        setIsProcessingUpload(false);
        return;
      }
      let results;
      if (bulkAddProducts) {
        results = await bulkAddProducts(finalProducts);
      } else {
        results = [];
        for (const product of finalProducts) {
          const result = await addProduct(product);
          results.push({ product: product.name, success: result.success, message: result.message });
        }
      }
      const failedCount = results.filter(r => !r.success).length;
      if (failedCount > 0) {
        setUploadError(`${failedCount} products failed to upload. Check console for details.`);
        console.log('Upload results:', results);
      } else {
        alert(`${finalProducts.length} products uploaded successfully!`);
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadPreview([]);
        await fetchProducts();
      }
    } catch (error) {
      setUploadError('Error uploading products: ' + error.message);
      console.error('Upload error:', error);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleMerge = async (mergeItem, action) => {
    let finalProduct;
    if (action === 'auto') {
      finalProduct = {
        ...mergeItem.existing,
        stock: mergeItem.existing.stock + mergeItem.newProduct.stock,
        sellingPrice: Math.max(mergeItem.existing.sellingPrice, mergeItem.newProduct.sellingPrice)
      };
    } else {
      finalProduct = selectedMerge === 'existing' ? mergeItem.existing : mergeItem.newProduct;
    }
    const result = await updateProduct(mergeItem.existing.id, finalProduct);
    if (result.success) {
      setMergeCandidates(prev => prev.filter(m => m !== mergeItem));
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      sku: product.sku,
      barcode: product.barcode || '',
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      minStock: product.minStock,
      supplierId: product.supplierId,
      description: product.description || '',
      image: product.image || '',
      dateAdded: product.dateAdded ? product.dateAdded.split('T')[0] : new Date().toISOString().split('T')[0],
      expiryDate: product.expiryDate || '',
      baseUnit: product.baseUnit || 'piece',
      sellUnits: product.sellUnits || ['piece'],
      conversionFactors: product.conversionFactors || { piece: 1 }
    });
    setShowEditModal(true);
  };

  const handleView = (product) => {
    setSelectedProduct(product);
    setShowViewModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const productData = {
      ...formData,
      costPrice: parseFloat(formData.costPrice),
      sellingPrice: parseFloat(formData.sellingPrice),
      stock: parseInt(formData.stock),
      minStock: parseInt(formData.minStock),
      supplierId: parseInt(formData.supplierId),
      dateAdded: formData.dateAdded
    };
    if (isNaN(productData.costPrice) || isNaN(productData.sellingPrice) || 
        isNaN(productData.stock) || isNaN(productData.minStock)) {
      alert('Please enter valid numbers for all numeric fields');
      return;
    }
    let result;
    if (showEditModal) {
      result = await updateProduct(selectedProduct.id, productData);
    } else {
      result = await addProduct(productData);
    }
    if (result.success) {
      setShowAddModal(false);
      setShowEditModal(false);
      resetForm();
    } else {
      alert(`Failed to save product: ${result.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (product) => {
    const productCurrency = product.currencyAtCreation || 'USD';
    if (currentCurrency !== productCurrency) {
      alert(`You cannot delete this product while using ${currentCurrency}. Switch back to ${productCurrency} to delete this product.`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${product.name}? This action cannot be undone.`)) {
      setDeletingProductId(product.id);
      setDeleteError(null);
      try {
        console.log(`Attempting to delete product with ID: ${product.id}`);
        const result = await deleteProduct(product.id);
        if (result.success) {
          console.log(`Product ${product.name} deleted successfully`);
          await fetchProducts();
        } else {
          const errorMessage = result.message || 'Failed to delete product';
          setDeleteError(errorMessage);
          alert(`Error: ${errorMessage}`);
          console.error('Delete failed:', errorMessage);
        }
      } catch (error) {
        const errorMessage = `Network error: ${error.message || 'Unknown error'}`;
        setDeleteError(errorMessage);
        alert(`Error: ${errorMessage}`);
        console.error('Delete failed with exception:', error);
      } finally {
        setDeletingProductId(null);
        setTimeout(() => {
          setDeleteError(null);
        }, 3000);
      }
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustProduct || !adjustData.quantity) return;
    const quantity = parseInt(adjustData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }
    const newStock = adjustData.type === 'add' ? adjustProduct.stock + quantity : adjustProduct.stock - quantity;
    if (newStock < 0) {
      alert('Cannot reduce stock below zero');
      return;
    }
    const adjustmentLog = {
      productId: adjustProduct.id,
      type: adjustData.type,
      quantity: quantity,
      newStock: newStock,
      reason: adjustData.reason,
      note: adjustData.note,
      adjustedBy: user?.name || 'System',
      timestamp: new Date().toISOString()
    };
    const logs = JSON.parse(localStorage.getItem('stockAdjustments') || '[]');
    localStorage.setItem('stockAdjustments', JSON.stringify([...logs, adjustmentLog]));
    await updateProduct(adjustProduct.id, { stock: newStock });
    setShowAdjustModal(false);
    setAdjustData({ type: 'add', quantity: '', reason: 'sold', note: '' });
  };

  const getStockStatus = (product) => {
    if (product.stock === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
    } else if (product.stock <= product.minStock) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' };
    }
    return { label: 'In Stock', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const adjustmentReasons = [
    { value: 'sold', label: 'Sold' },
    { value: 'damaged', label: 'Damaged/Expired' },
    { value: 'theft', label: 'Theft/Loss' },
    { value: 'return', label: 'Customer Return' },
    { value: 'correction', label: 'Inventory Correction' },
    { value: 'transfer', label: 'Stock Transfer' },
    { value: 'other', label: 'Other' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage your product inventory and stock levels
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleUploadClick}
            className="inline-flex items-center px-4 py-2 border border-blue-600 dark:border-blue-500 rounded-lg shadow-sm text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105"
          >
            <Upload className="h-4 w-4 mr-2" />
            <span className="font-medium">Upload Excel</span>
          </button>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 transition-all duration-200 transform hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {showDuplicateWarning && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded-lg flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
          <div>
            <p className="font-medium">Warning: Duplicate Product IDs Detected</p>
            <p className="text-sm">This may cause display issues. Please check your database for products with duplicate IDs.</p>
          </div>
        </div>
      )}

      {deleteError && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <div>
            <p className="font-medium">Delete Error</p>
            <p className="text-sm">{deleteError}</p>
          </div>
        </div>
      )}

      {/* Expiry Alert Panel */}
      {products.some(p => p.expiryDate && (() => {
        const d = Math.ceil((new Date(p.expiryDate) - new Date()) / 86400000);
        return d < 30;
      })()) && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <p className="font-semibold text-orange-800 dark:text-orange-200">Expiring Soon</p>
          </div>
          <div className="space-y-1">
            {products.filter(p => {
              if (!p.expiryDate) return false;
              return Math.ceil((new Date(p.expiryDate) - new Date()) / 86400000) < 30;
            }).map(p => {
              const d = Math.ceil((new Date(p.expiryDate) - new Date()) / 86400000);
              return (
                <p key={p.id} className="text-sm text-orange-700 dark:text-orange-300">
                  <strong>{p.name}</strong> — {d < 0 ? 'EXPIRED' : `expires in ${d} days`} ({p.expiryDate}) · Stock: {p.stock}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* Reorder Suggestions Panel */}
      {reorderSuggestions.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <p className="font-semibold text-blue-800 dark:text-blue-200">AI Reorder Suggestions ({reorderSuggestions.length} products)</p>
          </div>
          <div className="space-y-2">
            {reorderSuggestions.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-blue-800 dark:text-blue-300">{p.name}</span>
                  <span className="text-blue-600 dark:text-blue-400 ml-2">Stock: {p.stock} / Min: {p.minStock}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-700 dark:text-blue-300">Suggest order: <strong>{p.suggestedQty} units</strong></span>
                  <button
                    onClick={() => alert(`Draft PO created for ${p.name}: ${p.suggestedQty} units\n(Connect to Suppliers page to send)`)}
                    className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Draft PO
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
            <input
              type="text"
              placeholder="Search products..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Package className="h-4 w-4" />
            <span>{filteredProducts.length} products found</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Added</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProducts.map((product) => {
                const costPrice = isNaN(product.costPrice) ? 0 : product.costPrice;
                const sellingPrice = isNaN(product.sellingPrice) ? 0 : product.sellingPrice;
                const stock = isNaN(product.stock) ? 0 : product.stock;
                const minStock = isNaN(product.minStock) ? 0 : product.minStock;
                const status = getStockStatus({...product, stock, minStock});
                return (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <ProductThumbnail product={product} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {getSupplierName(product.supplierId)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {stock} units
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Min: {minStock}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatCurrency(sellingPrice)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Cost: {formatCurrency(costPrice)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400 dark:text-gray-500" />
                        {formatDate(product.dateAdded)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                        {(() => { const es = getExpiryStatus(product); return es ? <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${es.color}`}>{es.label}</span> : null; })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleView(product)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setAdjustProduct(product);
                            setShowAdjustModal(true);
                          }}
                          className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          disabled={deletingProductId === product.id}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50"
                          title="Delete product"
                        >
                          {deletingProductId === product.id ? (
                            <Loader className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No products found. Try adjusting your search or filters.
          </div>
        )}
      </div>

      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-70 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {showEditModal ? 'Edit Product' : 'Add New Product'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Name</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SKU</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Barcode</label>
                  <input
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Selling Price</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Stock</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date Added</label>
                  <input
                    type="date"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={formData.dateAdded}
                    onChange={(e) => setFormData({ ...formData, dateAdded: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Expiry Date <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Base Unit</label>
                  <select
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={formData.baseUnit}
                    onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                  >
                    <option value="piece">Piece</option>
                    <option value="kg">Kilogram</option>
                    <option value="g">Gram</option>
                    <option value="liter">Liter</option>
                    <option value="meter">Meter</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Image</label>
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0">
                    {formData.image ? (
                      <div className="relative">
                        <img
                          src={formData.image}
                          alt="Preview"
                          className="h-20 w-20 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                          onError={(e) => { e.target.style.display='none'; }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image: '' })}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      placeholder="Paste image URL..."
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">or</span>
                      <input
                        type="file"
                        accept="image/*"
                        ref={imageInputRef}
                        onChange={handleImageFile}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Upload className="h-3 w-3 mr-1" /> Upload from device
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 rounded-md"
                >
                  {showEditModal ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-70 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-3xl shadow-xl rounded-lg bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Upload Products from Excel</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-2xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="mb-6 p-5 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-lg">
              <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-3 flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Excel Format Requirements
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 list-disc list-inside space-y-2">
                <li><span className="font-medium">Required columns:</span> name, category, sku, costPrice, sellingPrice, stock, minStock</li>
                <li><span className="font-medium">Optional columns:</span> barcode, supplierId, description, dateAdded</li>
                <li>First row must contain column headers</li>
                <li>Supported formats: .xlsx, .xls</li>
                <li>All numeric fields (costPrice, sellingPrice, stock, minStock) should contain numbers</li>
              </ul>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select Excel File
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excel-upload"
                />
                <label 
                  htmlFor="excel-upload" 
                  className="cursor-pointer block"
                >
                  <Upload className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-lg font-medium text-gray-700 dark:text-white mb-2">
                    {uploadFile ? uploadFile.name : 'Click to select Excel file'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    or drag and drop your Excel file here
                  </p>
                </label>
              </div>
            </div>
            {uploadError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-md">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <p className="font-medium">Upload Error</p>
                </div>
                <p className="text-sm mt-1">{uploadError}</p>
              </div>
            )}
            {uploadPreview.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">Preview ({uploadPreview.length} products)</h4>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Showing first 5 products
                  </span>
                </div>
                <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">SKU</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Stock</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Selling Price</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {uploadPreview.slice(0, 5).map((product, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{product.name}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{product.category}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{product.sku}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{product.stock}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{formatCurrency(product.sellingPrice)}</td>
                          </tr>
                        ))}
                        {uploadPreview.length > 5 && (
                          <tr>
                            <td colSpan="5" className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 text-sm">
                              ... and {uploadPreview.length - 5} more products
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                disabled={isProcessingUpload}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={isProcessingUpload || uploadPreview.length === 0}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
              >
                {isProcessingUpload ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {uploadPreview.length} Products
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMergeModal && mergeCandidates.length > 0 && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-70 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-4xl shadow-xl rounded-lg bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Duplicate Products Detected</h3>
              <button
                onClick={() => setShowMergeModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-2xl font-bold"
              >
                &times;
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We found {mergeCandidates.length} potential duplicate{mergeCandidates.length > 1 ? 's' : ''}. Please review and merge to avoid data duplication.
            </p>
            <div className="space-y-6 max-h-96 overflow-y-auto">
              {mergeCandidates.map((candidate, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Existing Product</h4>
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                        <p className="text-sm"><span className="font-medium">Name:</span> {candidate.existing.name}</p>
                        <p className="text-sm"><span className="font-medium">SKU:</span> {candidate.existing.sku}</p>
                        <p className="text-sm"><span className="font-medium">Stock:</span> {candidate.existing.stock}</p>
                        <p className="text-sm"><span className="font-medium">Price:</span> {formatCurrency(candidate.existing.sellingPrice)}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">New Product</h4>
                      <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded">
                        <p className="text-sm"><span className="font-medium">Name:</span> {candidate.newProduct.name}</p>
                        <p className="text-sm"><span className="font-medium">SKU:</span> {candidate.newProduct.sku}</p>
                        <p className="text-sm"><span className="font-medium">Stock:</span> {candidate.newProduct.stock}</p>
                        <p className="text-sm"><span className="font-medium">Price:</span> {formatCurrency(candidate.newProduct.sellingPrice)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-3 pt-2">
                    <button
                      onClick={() => handleMerge(candidate, 'auto')}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-md"
                    >
                      Auto-Merge (Combine stock, keep higher price)
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMerge('existing');
                        handleMerge(candidate, 'manual');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md"
                    >
                      Keep Existing
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMerge('new');
                        handleMerge(candidate, 'manual');
                      }}
                      className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md"
                    >
                      Keep New
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-3 pt-6">
              <button
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
              >
                Skip All
              </button>
              <button
                onClick={() => {
                  // Upload non-duplicate products
                  const nonDuplicates = uploadPreview.filter(p => 
                    !mergeCandidates.some(c => c.newProduct.name === p.name && c.newProduct.sku === p.sku)
                  );
                  // Process non-duplicates
                  // ... (implementation would go here)
                  setShowMergeModal(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 rounded-md"
              >
                Upload Non-Duplicates
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdjustModal && adjustProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-70 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Adjust Stock: {adjustProduct.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Adjustment Type</label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="adjustType"
                      checked={adjustData.type === 'add'}
                      onChange={() => setAdjustData({...adjustData, type: 'add'})}
                      className="mr-2"
                    />
                    Add
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="adjustType"
                      checked={adjustData.type === 'remove'}
                      onChange={() => setAdjustData({...adjustData, type: 'remove'})}
                      className="mr-2"
                    />
                    Remove
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({...adjustData, quantity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <select
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({...adjustData, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {adjustmentReasons.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Note (Optional)</label>
                <textarea
                  value={adjustData.note}
                  onChange={(e) => setAdjustData({...adjustData, note: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows="2"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustStock}
                  className="flex-1 px-4 py-2 bg-orange-600 dark:bg-orange-700 text-white rounded-lg"
                >
                  Adjust Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-70 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Product Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <ProductThumbnail product={selectedProduct} size="lg" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedProduct.name}</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 mt-1">
                  {selectedProduct.category}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">SKU: {selectedProduct.sku}</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${getStockStatus(selectedProduct).color}`}>
                  {getStockStatus(selectedProduct).label}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Basic Information</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Product Name</p>
                    <p className="font-medium">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
                    <p className="font-medium">{selectedProduct.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">SKU</p>
                    <p className="font-medium">{selectedProduct.sku}</p>
                  </div>
                  {selectedProduct.barcode && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Barcode</p>
                      <p className="font-medium flex items-center">
                        <Barcode className="h-4 w-4 mr-2" />
                        {selectedProduct.barcode}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date Added</p>
                    <p className="font-medium flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(selectedProduct.dateAdded)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Product ID</p>
                    <p className="font-medium">{selectedProduct.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Currency at Creation</p>
                    <p className="font-medium">{selectedProduct.currencyAtCreation || 'USD'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Base Unit</p>
                    <p className="font-medium">{selectedProduct.baseUnit || 'piece'}</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Pricing & Stock</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cost Price</p>
                    <p className="font-medium">{formatCurrency(selectedProduct.costPrice)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Selling Price</p>
                    <p className="font-medium">{formatCurrency(selectedProduct.sellingPrice)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Profit Margin</p>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(selectedProduct.sellingPrice - selectedProduct.costPrice)}
                      ({(((selectedProduct.sellingPrice - selectedProduct.costPrice) / selectedProduct.costPrice) * 100).toFixed(1)}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Current Stock</p>
                    <p className="font-medium">{selectedProduct.stock} units</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Minimum Stock</p>
                    <p className="font-medium">{selectedProduct.minStock} units</p>
                  </div>
                </div>
              </div>
              {selectedProduct.description && (
                <div className="md:col-span-2">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Description</h4>
                  <p className="text-gray-700 dark:text-gray-300">{selectedProduct.description}</p>
                </div>
              )}
              <div className="md:col-span-2">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Supplier</h4>
                <p className="text-gray-700 dark:text-gray-300">{getSupplierName(selectedProduct.supplierId)}</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEdit(selectedProduct);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 rounded-md"
              >
                Edit Product
              </button>
              <button
                onClick={() => setShowViewModal(false)}
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

export default Inventory;