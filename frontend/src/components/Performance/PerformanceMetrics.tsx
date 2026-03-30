import React, { useEffect, useState } from 'react';
import { supplierService } from '../../services/supplier';
import { PerformanceScore } from '../../types';

interface PerformanceMetricsProps {
  supplierId: string;
  supplierName?: string;
  onClose?: () => void;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ 
  supplierId, 
  supplierName,
  onClose 
}) => {
  const [performance, setPerformance] = useState<PerformanceScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRecordForm, setShowRecordForm] = useState(false);

  useEffect(() => {
    loadPerformance();
  }, [supplierId]);

  const loadPerformance = async () => {
    try {
      const data = await supplierService.getPerformance(supplierId);
      setPerformance(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('No performance data available yet');
      } else {
        setError('Failed to load performance data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Custom color functions
  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'bg-gradient-to-r from-green-700 to-green-800';
    if (score >= 60) return 'bg-gradient-to-r from-amber-600 to-amber-700';
    if (score >= 40) return 'bg-gradient-to-r from-orange-600 to-orange-700';
    return 'bg-gradient-to-r from-red-700 to-red-800';
  };

  const getRatingLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Very Good';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    return 'Needs Improvement';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-[#5D4037]">Loading performance data...</div>
      </div>
    );
  }

  if (error && !performance) {
    return (
      <div className="text-center py-12">
        <p className="text-[#5D4037]">{error}</p>
        <button
          onClick={() => setShowRecordForm(true)}
          className="mt-4 px-4 py-2 rounded-lg transition"
          style={{ backgroundColor: '#825026', color: '#fff4ca' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9B6A3E'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#825026'}
        >
          Record First Performance
        </button>
        {showRecordForm && (
          <RecordPerformanceForm
            supplierId={supplierId}
            onSuccess={() => {
              setShowRecordForm(false);
              loadPerformance();
            }}
            onClose={() => setShowRecordForm(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[#2C1810]">Performance Metrics</h2>
          {supplierName && (
            <p className="text-[#5D4037] mt-1">{supplierName}</p>
          )}
        </div>
        <button
          onClick={() => setShowRecordForm(true)}
          className="px-4 py-2 rounded-lg transition flex items-center gap-2"
          style={{ backgroundColor: '#825026', color: '#fff4ca' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9B6A3E'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#825026'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Record Performance
        </button>
      </div>

      {performance && (
        <>
          {/* Overall Score Card */}
          <div className="rounded-xl p-6 text-white" style={{ backgroundColor: '#825026' }}>
            <div className="text-center">
              <div className="text-sm opacity-90 mb-2">Overall Performance Score</div>
              <div className="text-5xl font-bold mb-2">{performance.overall_score}%</div>
              <div className="text-lg font-semibold">{getRatingLabel(performance.overall_score)}</div>
              <div className="text-sm opacity-90 mt-2">
                Last updated: {new Date(performance.last_updated).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Score Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* On-Time Delivery Score */}
            <div className={`${getScoreGradient(performance.on_time_score)} rounded-xl p-6 text-white shadow-lg`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold">On-Time Delivery</h3>
                </div>
                <div className="text-3xl font-bold">
                  {performance.on_time_score}%
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-white/30 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-white"
                    style={{ width: `${performance.on_time_score}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm text-white/90">
                  <span>On Time: {performance.on_time_orders}</span>
                  <span>Total: {performance.total_orders}</span>
                </div>
              </div>
            </div>

            {/* Quality Score */}
            <div className={`${getScoreGradient(performance.quality_score)} rounded-xl p-6 text-white shadow-lg`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <h3 className="text-lg font-semibold">Quality Score</h3>
                </div>
                <div className="text-3xl font-bold">
                  {performance.quality_score}%
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-white/30 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-white"
                    style={{ width: `${performance.quality_score}%` }}
                  />
                </div>
                <div className="mt-2 text-sm text-white/90 text-center">
                  Average Rating: {performance.average_quality_rating} / 5
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Summary */}
          <div className="rounded-xl p-6 shadow-lg" style={{ backgroundColor: '#2C1810' }}>
            <h3 className="text-lg font-semibold text-[#fff4ca] mb-4">Statistics Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#fff4ca]">{performance.total_orders}</div>
                <div className="text-sm text-[#fff4ca]/70">Total Orders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{performance.on_time_orders}</div>
                <div className="text-sm text-[#fff4ca]/70">On-Time Deliveries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {performance.total_orders - performance.on_time_orders}
                </div>
                <div className="text-sm text-[#fff4ca]/70">Delayed Deliveries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">{performance.average_quality_rating}</div>
                <div className="text-sm text-[#fff4ca]/70">Avg Quality Rating</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Record Performance Form Modal */}
      {showRecordForm && (
        <RecordPerformanceForm
          supplierId={supplierId}
          onSuccess={() => {
            setShowRecordForm(false);
            loadPerformance();
          }}
          onClose={() => setShowRecordForm(false)}
        />
      )}
    </div>
  );
};

// Record Performance Form Component
interface RecordPerformanceFormProps {
  supplierId: string;
  onSuccess: () => void;
  onClose: () => void;
}

const RecordPerformanceForm: React.FC<RecordPerformanceFormProps> = ({ 
  supplierId, 
  onSuccess, 
  onClose 
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    order_id: '',
    delivery_time_actual: '',
    delivery_time_expected: '',
    delivery_status: 'on_time' as 'on_time' | 'delayed' | 'early',
    quality_rating: 3,
    comments: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const expectedDate = new Date(formData.delivery_time_expected);
      const actualDate = new Date(formData.delivery_time_actual);
      
      const payload = {
        order_id: formData.order_id,
        delivery_time_expected: expectedDate.toISOString(),
        delivery_time_actual: actualDate.toISOString(),
        delivery_status: formData.delivery_status,
        quality_rating: formData.quality_rating,
        comments: formData.comments
      };
      
      const result = await supplierService.recordPerformance(supplierId, payload);
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to record performance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold" style={{ color: '#2C1810' }}>Record Performance</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Order ID *</label>
              <input
                type="text"
                value={formData.order_id}
                onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#825026]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Expected Delivery *</label>
                <input
                  type="datetime-local"
                  value={formData.delivery_time_expected}
                  onChange={(e) => setFormData({ ...formData, delivery_time_expected: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#825026]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Actual Delivery *</label>
                <input
                  type="datetime-local"
                  value={formData.delivery_time_actual}
                  onChange={(e) => setFormData({ ...formData, delivery_time_actual: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#825026]"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Delivery Status *</label>
              <select
                value={formData.delivery_status}
                onChange={(e) => setFormData({ ...formData, delivery_status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#825026]"
              >
                <option value="on_time">On Time</option>
                <option value="delayed">Delayed</option>
                <option value="early">Early</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>
                Quality Rating (1-5) *
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFormData({ ...formData, quality_rating: rating })}
                    className={`w-10 h-10 rounded-full transition ${
                      formData.quality_rating === rating
                        ? 'text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    style={formData.quality_rating === rating ? { backgroundColor: '#825026' } : {}}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#5D4037' }}>Comments</label>
              <textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#825026]"
                placeholder="Add any comments about this delivery..."
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-white rounded-md transition disabled:opacity-50"
                style={{ backgroundColor: '#825026' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9B6A3E'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#825026'}
              >
                {loading ? 'Recording...' : 'Record Performance'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;