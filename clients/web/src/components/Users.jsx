import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  User,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  XCircle,
  Upload,
  AlertCircle,
  Loader,
  Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSubscription } from '../contexts/SubscriptionContext';

const Users = () => {
  const { isPasswordLocked, getPlanForCompany } = useSubscription();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false); // New state for upload modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    role: 'cashier',
    status: 'active'
  });
  
  // New states for Excel upload
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:3001/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      username: '',
      name: '',
      email: '',
      phone: '',
      role: 'cashier',
      status: 'active'
    });
  };

  const handleAdd = () => {
    setShowAddModal(true);
    resetForm();
  };

  // New function to handle Excel upload
  const handleUploadClick = () => {
    setShowUploadModal(true);
    setUploadFile(null);
    setUploadPreview([]);
    setUploadError('');
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadFile(file);
    setUploadError('');
    
    // Read the file
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length === 0) {
          setUploadError('Excel file is empty');
          return;
        }
        
        // Get headers (first row)
        const headers = data[0];
        
        // Validate required headers
        const requiredHeaders = ['username', 'name', 'email', 'role'];
        const missingHeaders = requiredHeaders.filter(h => {
          const headerExists = headers.some(header => 
            typeof header === 'string' && header.toLowerCase() === h.toLowerCase()
          );
          return !headerExists;
        });
        
        if (missingHeaders.length > 0) {
          setUploadError(`Missing required columns: ${missingHeaders.join(', ')}`);
          return;
        }
        
        // Create a mapping of header names to their indices
        const headerMap = {};
        headers.forEach((header, index) => {
          if (typeof header === 'string') {
            headerMap[header.toLowerCase()] = index;
          }
        });
        
        // Process data rows (skip header row)
        const usersData = data.slice(1).map(row => {
          // Skip empty rows
          if (!row || row.length === 0 || (typeof row[0] === 'undefined' && row.length === 1)) {
            return null;
          }
          
          const user = {};
          
          // Map each required field
          requiredHeaders.forEach(field => {
            const index = headerMap[field.toLowerCase()];
            if (index !== undefined && index < row.length) {
              user[field] = row[index];
            }
          });
          
          // Map optional fields
          const optionalFields = ['phone', 'status'];
          optionalFields.forEach(field => {
            const index = headerMap[field.toLowerCase()];
            if (index !== undefined && index < row.length) {
              user[field] = row[index];
            }
          });
          
          // Ensure required fields have values
          if (!user.username || !user.name || !user.email || !user.role) {
            console.warn('Skipping row with missing required fields:', user);
            return null; // Skip invalid rows
          }
          
          // Validate role
          if (!['cashier', 'admin'].includes(user.role.toLowerCase())) {
            user.role = 'cashier'; // Default to cashier if invalid
          } else {
            user.role = user.role.toLowerCase();
          }
          
          // Validate status
          if (!user.status) {
            user.status = 'active';
          } else if (!['active', 'inactive'].includes(user.status.toLowerCase())) {
            user.status = 'active'; // Default to active if invalid
          } else {
            user.status = user.status.toLowerCase();
          }
          
          // Set default createdAt if not provided
          user.createdAt = new Date().toISOString().split('T')[0];
          
          // Set default password — locked to 12345 on Free plan
          user.password = isPasswordLocked ? '12345' : '12345';
          
          return user;
        }).filter(user => user !== null); // Remove invalid users
        
        setUploadPreview(usersData);
        if (usersData.length === 0) {
          setUploadError('No valid users found in the file');
        }
      } catch (error) {
        setUploadError('Error reading Excel file: ' + error.message);
        console.error('Excel upload error:', error);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Process the upload
  const handleUploadSubmit = async () => {
    if (uploadPreview.length === 0) {
      setUploadError('No valid users to upload');
      return;
    }
    
    setIsProcessingUpload(true);
    setUploadError('');
    
    try {
      // Upload each user
      const results = [];
      for (const user of uploadPreview) {
        try {
          const response = await fetch('http://localhost:3001/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
          });
          
          if (response.ok) {
            results.push({
              user: user.name,
              success: true,
              message: 'User created successfully'
            });
          } else {
            const errorData = await response.json().catch(() => ({}));
            results.push({
              user: user.name,
              success: false,
              message: errorData.message || 'Failed to create user'
            });
          }
        } catch (error) {
          results.push({
            user: user.name,
            success: false,
            message: 'Network error: ' + error.message
          });
        }
      }
      
      // Show summary
      const failedCount = results.filter(r => !r.success).length;
      if (failedCount > 0) {
        setUploadError(`${failedCount} users failed to upload. Check console for details.`);
        console.log('Upload results:', results);
      } else {
        alert(`${uploadPreview.length} users uploaded successfully!`);
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadPreview([]);
        // Refresh the users list
        await fetchUsers();
      }
    } catch (error) {
      setUploadError('Error uploading users: ' + error.message);
      console.error('Upload error:', error);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status || 'active'
    });
    setShowEditModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const userData = {
      ...formData,
      createdAt: new Date().toISOString().split('T')[0],
      password: showEditModal
        ? (isPasswordLocked ? '12345' : selectedUser.password)
        : '12345'
    };

    try {
      let response;
      if (showEditModal) {
        response = await fetch(`http://localhost:3001/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...selectedUser, ...userData }),
        });
      } else {
        response = await fetch('http://localhost:3001/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });
      }

      if (response.ok) {
        await fetchUsers();
        setShowAddModal(false);
        setShowEditModal(false);
        resetForm();
        alert(showEditModal ? 'User updated successfully!' : 'User created successfully!');
      } else {
        alert('Failed to save user');
      }
    } catch (error) {
      alert('Error saving user');
    }
  };

  const handleDelete = async (user) => {
    if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
      try {
        const response = await fetch(`http://localhost:3001/users/${user.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          await fetchUsers();
          alert('User deleted successfully!');
        } else {
          alert('Failed to delete user');
        }
      } catch (error) {
        alert('Error deleting user');
      }
    }
  };

  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch(`http://localhost:3001/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchUsers();
      } else {
        alert('Failed to update user status');
      }
    } catch (error) {
      alert('Error updating user status');
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage system users and their access permissions
          </p>
        </div>
        <div className="flex space-x-3">
          {/* Excel Upload Button */}
          <button
            onClick={handleUploadClick}
            className="inline-flex items-center px-4 py-2 border border-blue-600 rounded-lg shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 transition-all duration-200 transform hover:scale-105"
          >
            <Upload className="h-4 w-4 mr-2" />
            <span className="font-medium">Upload Excel</span>
          </button>
          
          {/* Add User Button */}
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Error Message Display */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <div>
            <p className="font-medium">Upload Error</p>
            <p className="text-sm">{uploadError}</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search users..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {user.email}
                    </div>
                    {user.phone && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {user.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleUserStatus(user)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.status === 'active' ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="text-red-600 hover:text-red-900"
                        disabled={user.role === 'admin'} // Prevent deleting admin users
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No users found. Try adjusting your search.
          </div>
        )}
      </div>

      {/* Add/Edit User Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {showEditModal ? 'Edit User' : 'Add New User'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Password info — changes based on plan */}
              {isPasswordLocked ? (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 p-3 rounded-md flex items-start gap-2">
                  <Lock className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">Password locked — Free Plan</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                      Password is set to <strong>12345</strong> for all Free plan users. Upgrade to a paid plan to enable custom passwords.
                    </p>
                  </div>
                </div>
              ) : (
                !showEditModal && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-3 rounded-md">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Default password: <strong>12345</strong>
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      User can change this after first login (paid plan active).
                    </p>
                  </div>
                )
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  {showEditModal ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-3xl shadow-xl rounded-lg bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Upload Users from Excel</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>
            
            <div className="mb-6 p-5 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <h4 className="font-bold text-blue-900 mb-3 flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Excel Format Requirements
              </h4>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-2">
                <li><span className="font-medium">Required columns:</span> username, name, email, role</li>
                <li><span className="font-medium">Optional columns:</span> phone, status</li>
                <li>First row must contain column headers</li>
                <li>Supported formats: .xlsx, .xls</li>
                <li>Valid roles: 'cashier' or 'admin'</li>
                <li>Valid status: 'active' or 'inactive' (defaults to 'active')</li>
              </ul>
            </div>
            
            {/* File Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Excel File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
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
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {uploadFile ? uploadFile.name : 'Click to select Excel file'}
                  </p>
                  <p className="text-sm text-gray-500">
                    or drag and drop your Excel file here
                  </p>
                </label>
              </div>
            </div>
            
            {/* Error Display */}
            {uploadError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <p className="font-medium">Upload Error</p>
                </div>
                <p className="text-sm mt-1">{uploadError}</p>
              </div>
            )}
            
            {/* Preview Table */}
            {uploadPreview.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg font-medium text-gray-900">Preview ({uploadPreview.length} users)</h4>
                  <span className="text-sm text-gray-500">
                    Showing first 5 users
                  </span>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {uploadPreview.slice(0, 5).map((user, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{user.username}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{user.name}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{user.email}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                user.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                user.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {user.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {uploadPreview.length > 5 && (
                          <tr>
                            <td colSpan="5" className="px-4 py-3 text-center text-gray-500 text-sm">
                              ... and {uploadPreview.length - 5} more users
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
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={isProcessingUpload}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={isProcessingUpload || uploadPreview.length === 0}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
              >
                {isProcessingUpload ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {uploadPreview.length} Users
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;