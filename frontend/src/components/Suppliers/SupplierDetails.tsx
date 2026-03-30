import React, { useEffect, useState } from 'react';
import { Supplier, PerformanceScore } from '../../types';
import { supplierService } from '../../services/supplier';

interface SupplierDetailsProps {
  supplier: Supplier;
  onClose: () => void;
  onUpdate: () => void;
}

const SupplierDetails: React.FC<SupplierDetailsProps> = ({ supplier, onClose, onUpdate }) => {
  const [performance, setPerformance] = useState<PerformanceScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformance();
  }, [supplier.id]);

  const loadPerformance = async () => {
    try {
      const data = await supplierService.getPerformance(supplier.id);
      setPerformance(data);
    } catch (err) {
      console.error('Failed to load performance', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">{supplier.company_name}</h2>
              <p className="text-sm text-gray-500">{supplier.supplier_code}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status */}
          <div className="mb-6">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(supplier.status)}`}>
              {supplier.status.toUpperCase()}
            </span>
          </div>

          {/* Contact Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p><span className="font-medium">Contact Person:</span> {supplier.contact_person}</p>
              <p><span className="font-medium">Email:</span> {supplier.contact_info.email}</p>
              <p><span className="font-medium">Phone:</span> {supplier.contact_info.phone}</p>
              <p><span className="font-medium">Address:</span> {supplier.contact_info.address}</p>
              <p><span className="font-medium">City:</span> {supplier.contact_info.city}, {supplier.contact_info.country}</p>
              <p><span className="font-medium">Postal Code:</span> {supplier.contact_info.postal_code}</p>
            </div>
          </div>

          {/* Categories */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {supplier.categories.map((cat) => (
                <span key={cat} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Performance Metrics</h3>
            {loading ? (
              <div className="text-gray-500">Loading performance data...</div>
            ) : performance ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Overall Score</div>
                  <div className="text-2xl font-bold text-green-600">{performance.overall_score}%</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">On-Time Delivery</div>
                  <div className="text-2xl font-bold text-blue-600">{performance.on_time_score}%</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Quality Score</div>
                  <div className="text-2xl font-bold text-yellow-600">{performance.quality_score}%</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total Orders</div>
                  <div className="text-2xl font-bold text-purple-600">{performance.total_orders}</div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">No performance data available</div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetails;