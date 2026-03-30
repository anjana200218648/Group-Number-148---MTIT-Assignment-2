import React, { useEffect, useState } from 'react';
import { supplierService } from '../../services/supplier';
import { Supplier } from '../../types';
import SupplierForm from './SupplierForm';
import SupplierDetails from './SupplierDetails';

interface SupplierListProps {
  onSelectSupplier?: (id: string) => void;
}

const SupplierList: React.FC<SupplierListProps> = ({ onSelectSupplier }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const data = await supplierService.getAll();
      setSuppliers(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await supplierService.delete(id);
        loadSuppliers();
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Failed to delete supplier');
      }
    }
  };

  const handleApprove = async (id: string) => {
    if (window.confirm('Approve this supplier?')) {
      try {
        await supplierService.update(id, { status: 'active' });
        loadSuppliers();
        alert('Supplier approved successfully!');
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Failed to approve supplier');
      }
    }
  };

  const handleSuspend = async (id: string) => {
    if (window.confirm('Suspend this supplier? They will not be able to do business until activated.')) {
      try {
        await supplierService.update(id, { status: 'suspended' });
        loadSuppliers();
        alert('Supplier suspended');
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Failed to suspend supplier');
      }
    }
  };

  const handleActivate = async (id: string) => {
    if (window.confirm('Activate this supplier?')) {
      try {
        await supplierService.update(id, { status: 'active' });
        loadSuppliers();
        alert('Supplier activated successfully!');
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Failed to activate supplier');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading suppliers...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
          <p className="text-gray-600 mt-1">Manage your hotel & restaurant suppliers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Supplier
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{supplier.company_name}</h3>
                  <p className="text-sm text-gray-500">{supplier.supplier_code}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(supplier.status)}`}>
                  {supplier.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">Contact:</span> {supplier.contact_person}
                </p>
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">Email:</span> {supplier.contact_info.email}
                </p>
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">Phone:</span> {supplier.contact_info.phone}
                </p>
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">City:</span> {supplier.contact_info.city}
                </p>
              </div>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Rating</div>
                  <div className={`font-semibold ${getRatingColor(supplier.rating)}`}>
                    {supplier.rating} / 5
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600">On-time Delivery</div>
                  <div className="font-semibold text-green-600">
                    {supplier.on_time_delivery_rate}%
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-4">
                {supplier.categories.slice(0, 3).map((cat, idx) => (
                  <span key={idx} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                    {cat}
                  </span>
                ))}
                {supplier.categories.length > 3 && (
                  <span className="text-gray-500 text-xs">+{supplier.categories.length - 3}</span>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    if (onSelectSupplier) {
                      onSelectSupplier(supplier.id);
                    } else {
                      setSelectedSupplier(supplier);
                      setShowDetails(true);
                    }
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition text-sm"
                >
                  View Details
                </button>

                {/* Approve Button - Only for pending suppliers */}
                {supplier.status === 'pending' && (
                  <button
                    onClick={() => handleApprove(supplier.id)}
                    className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm"
                  >
                    Approve
                  </button>
                )}

                {/* Suspend Button - Only for active suppliers */}
                {supplier.status === 'active' && (
                  <button
                    onClick={() => handleSuspend(supplier.id)}
                    className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition text-sm"
                  >
                    Suspend
                  </button>
                )}

                {/* Activate Button - For suspended or inactive suppliers */}
                {(supplier.status === 'suspended' || supplier.status === 'inactive') && (
                  <button
                    onClick={() => handleActivate(supplier.id)}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm"
                  >
                    Activate
                  </button>
                )}

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(supplier.id)}
                  className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {suppliers.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No suppliers found. Click "Add Supplier" to create one.</p>
        </div>
      )}

      {/* Supplier Form Modal */}
      {showForm && (
        <SupplierForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            loadSuppliers();
          }}
        />
      )}

      {/* Supplier Details Modal */}
      {showDetails && selectedSupplier && (
        <SupplierDetails
          supplier={selectedSupplier}
          onClose={() => {
            setShowDetails(false);
            setSelectedSupplier(null);
          }}
          onUpdate={() => {
            loadSuppliers();
          }}
        />
      )}
    </div>
  );
};

export default SupplierList;