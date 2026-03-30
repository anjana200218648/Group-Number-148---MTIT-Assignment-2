import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface DashboardStats {
  total_suppliers: number;
  active_suppliers: number;
  suppliers_with_performance: number;
  average_performance_score: number;
  suppliers_needing_attention: number;
  performance_coverage: number;
}

interface TopSupplier {
  supplier_id: string;
  supplier_name: string;
  overall_score: number;
  on_time_score: number;
  quality_score: number;
  total_orders: number;
}

const DashboardStats: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topSuppliers, setTopSuppliers] = useState<TopSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get dashboard stats
      const statsRes = await api.get('/performance/dashboard/stats');
      setStats(statsRes.data);

      // Get top suppliers
      const topRes = await api.get('/performance/top-rated?limit=5');
      setTopSuppliers(topRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats || stats.total_suppliers === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">No data available</div>
        <p className="text-sm text-gray-400">Add suppliers and record performance metrics to see dashboard</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#fdf3ca', minHeight: '100vh', padding: '1rem' }}>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
          <div className="text-sm text-gray-600 mb-1">Total Suppliers</div>
          <div className="text-3xl font-bold text-blue-600">{stats.total_suppliers}</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
          <div className="text-sm text-gray-600 mb-1">Active Suppliers</div>
          <div className="text-3xl font-bold text-green-600">{stats.active_suppliers}</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
          <div className="text-sm text-gray-600 mb-1">Avg Performance Score</div>
          <div className="text-3xl font-bold text-purple-600">{stats.average_performance_score}%</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
          <div className="text-sm text-gray-600 mb-1">Performance Coverage</div>
          <div className="text-3xl font-bold text-yellow-600">{stats.performance_coverage}%</div>
        </div>
      </div>

      {/* Top Suppliers */}
      {topSuppliers.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">🏆 Top Performing Suppliers</h2>
          <div className="space-y-4">
            {topSuppliers.map((supplier, index) => (
              <div key={supplier.supplier_id} className="flex justify-between items-center border-b pb-3 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{supplier.supplier_name}</p>
                    <p className="text-sm text-gray-500">Total Orders: {supplier.total_orders}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">{supplier.overall_score}%</p>
                  <p className="text-xs text-gray-500">Overall Score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suppliers Needing Attention */}
      {stats.suppliers_needing_attention > 0 && (
        <div className="mt-6 bg-red-50 rounded-lg p-6 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-700 font-medium">Attention Needed</p>
          </div>
          <p className="text-red-600 text-sm">
            {stats.suppliers_needing_attention} supplier(s) have performance score below 60%
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardStats;