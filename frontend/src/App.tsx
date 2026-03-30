import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login';
import Login2 from './components/Auth/Login';
import UserDashboard from './pages/UserDashboard';
import SupplierDashboard from './pages/SupplierDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SupplierList from './components/Suppliers/SupplierList';
import DashboardStats from './components/Dashboard/DashboardStats';
import Navbar from './components/Layout/Navbar';
import PerformanceMetrics from './components/Performance/PerformanceMetrics';
import { Toaster } from 'react-hot-toast';

// Delivery Microservice Imports
import CreateDelivery from './components/delivery/CreateDelivery';
import DeliveryTracker from './components/delivery/DeliveryTracker';
import DeliveryList from './components/delivery/DeliveryList';
import HotelDeliveries from './pages/HotelDeliveries';
import DeliveryDashboard from './pages/DelivarylogisticDashboard';
import Analytics from './components/delivery/Analytics';

// PrivateRoute Component
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

// Dashboard Layout Component with Navbar
const DashboardLayout: React.FC<{ 
  children: React.ReactNode; 
  currentPage: string; 
  onPageChange: (page: string) => void;
}> = ({ children, currentPage, onPageChange }) => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fff4ca' }}>
      <Navbar
        currentPage={currentPage}
        onPageChange={onPageChange}
      />
      <div className="pt-16">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on load
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardStats />;
      case 'suppliers':
        return <SupplierList onSelectSupplier={(id) => {
          setSelectedSupplierId(id);
          setCurrentPage('performance');
        }} />;
      case 'performance':
        return selectedSupplierId ? (
          <PerformanceMetrics 
            supplierId={selectedSupplierId} 
            onClose={() => setCurrentPage('suppliers')}
          />
        ) : (
          <SupplierList onSelectSupplier={(id) => {
            setSelectedSupplierId(id);
            setCurrentPage('performance');
          }} />
        );
      default:
        return <DashboardStats />;
    }
  };

  return (
    <Router>
      {/* Add Toaster for delivery notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '8px',
            background: '#1A2C3E',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#7d1616',
              secondary: '#1A2C3E',
            },
          },
        }}
      />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex-grow relative">
        <Routes>
          {/* Root path - redirect to dashboard or login based on auth */}
          <Route path="/" element={
            localStorage.getItem('token') 
              ? <Navigate to="/dashboard" replace /> 
              : <Navigate to="/login" replace />
          } />
          
          <Route path="/login" element={<Login />} />
          <Route path="/login2" element={<Login2 />} />
          
          {/* Dashboard Route with Navbar - This shows DashboardStats by default */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <DashboardLayout 
                currentPage={currentPage} 
                onPageChange={setCurrentPage}
              >
                {renderPage()}
              </DashboardLayout>
            </PrivateRoute>
          } />
          
          {/* Role-based Routes with Navbar */}
          <Route path="/user" element={
            <PrivateRoute>
              <DashboardLayout 
                currentPage={currentPage} 
                onPageChange={setCurrentPage}
              >
                <UserDashboard />
              </DashboardLayout>
            </PrivateRoute>
          } />
          
          <Route path="/supplier" element={
            <PrivateRoute>
              <DashboardLayout 
                currentPage={currentPage} 
                onPageChange={setCurrentPage}
              >
                <SupplierDashboard />
              </DashboardLayout>
            </PrivateRoute>
          } />
          
          <Route path="/admin" element={
            <PrivateRoute>
              <DashboardLayout 
                currentPage={currentPage} 
                onPageChange={setCurrentPage}
              >
                <AdminDashboard />
              </DashboardLayout>
            </PrivateRoute>
          } />
          
          <Route path="/superadmin" element={
            <PrivateRoute>
              <DashboardLayout 
                currentPage={currentPage} 
                onPageChange={setCurrentPage}
              >
                <SuperAdminDashboard />
              </DashboardLayout>
            </PrivateRoute>
          } />

          {/* Delivery Microservice Routes - Direct access (no prefix needed) */}
          <Route path="/delivery" element={<DeliveryDashboard />} />
          <Route path="/create" element={<CreateDelivery />} />
          <Route path="/track/:orderId" element={<DeliveryTracker />} />
          <Route path="/deliveries" element={<DeliveryList />} />
          <Route path="/hotel/:hotelId" element={<HotelDeliveries />} />
          <Route path="/analytics" element={<Analytics />} />
          
          {/* Also keep prefixed routes for backward compatibility */}
          <Route path="/delivery/create" element={<CreateDelivery />} />
          <Route path="/delivery/track/:orderId" element={<DeliveryTracker />} />
          <Route path="/delivery/orders" element={<DeliveryList />} />
          <Route path="/delivery/hotel/:hotelId" element={<HotelDeliveries />} />
          <Route path="/delivery/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;