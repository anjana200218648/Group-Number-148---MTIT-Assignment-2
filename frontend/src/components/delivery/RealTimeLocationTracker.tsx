import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Alert,
  Button,
  CircularProgress,
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io,Socket } from 'socket.io-client';  // Change this line
import MyLocationIcon from '@mui/icons-material/MyLocation';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import HomeIcon from '@mui/icons-material/Home';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import { deliveryApi } from '../../services/delivarylogistic';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const hotelIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface RealTimeLocationTrackerProps {
  orderId: string;
}

// Define types for socket data
interface LocationUpdateData {
  order_id: string;
  latitude: number;
  longitude: number;
  distance_remaining?: number;
  eta_minutes?: number;
  progress_percentage?: number;
}

interface StatusUpdateData {
  order_id: string;
  type: string;
  message?: string;
  new_status?: string;
}

const RealTimeLocationTracker: React.FC<RealTimeLocationTrackerProps> = ({ orderId }) => {
  const [trackingInfo, setTrackingInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [realtimeEta, setRealtimeEta] = useState<any>(null);
  const [approaching, setApproaching] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  
  const socketRef = useRef<Socket | null>(null);
  const mapRef = useRef<any>(null);
  const simulationRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // Initialize WebSocket connection
    const socket = io('http://localhost:8084', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      socket.emit('join_order', { order_id: orderId });
    });
    
    socket.on('connect_error', (err: Error) => {
      console.error('WebSocket connection error:', err);
    });
    
    // Listen for location updates
    socket.on('location_update', (data: LocationUpdateData) => {
      if (data.order_id === orderId) {
        setDriverLocation({ lat: data.latitude, lng: data.longitude });
        setRealtimeEta({
          distance_remaining_km: data.distance_remaining,
          eta_minutes: data.eta_minutes,
          progress_percentage: data.progress_percentage
        });
        
        if (mapRef.current) {
          mapRef.current.setView([data.latitude, data.longitude], 14);
        }
      }
    });
    
    // Listen for status updates
    socket.on('status_update', (data: StatusUpdateData) => {
      if (data.order_id === orderId) {
        setNotifications(prev => [...prev.slice(-2), `${data.type}: ${data.message || `Status changed to ${data.new_status}`}`]);
        fetchTrackingInfo();
        
        if (data.type === 'approaching') {
          setApproaching(true);
          setTimeout(() => setApproaching(false), 10000);
        }
      }
    });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_order', { order_id: orderId });
        socketRef.current.disconnect();
      }
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
    };
  }, [orderId]);

  useEffect(() => {
    fetchTrackingInfo();
    const interval = setInterval(fetchTrackingInfo, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchTrackingInfo = async () => {
    try {
      const response = await deliveryApi.trackDelivery(orderId);
      if (response.success) {
        setTrackingInfo(response.data);
        if (response.data.current_location) {
          setDriverLocation({
            lat: response.data.current_location.latitude,
            lng: response.data.current_location.longitude
          });
        }
        if (response.data.realtime_eta) {
          setRealtimeEta(response.data.realtime_eta);
        }
        setError(null);
      } else {
        setError(response.message);
      }
    } catch (err) {
      console.error('Error fetching tracking info:', err);
      setError('Failed to fetch tracking information');
    } finally {
      setLoading(false);
    }
  };

  const simulateDriverMovement = async () => {
    if (!trackingInfo?.hotel_location?.lat || !trackingInfo?.customer_location?.lat) {
      console.error('Missing location data');
      return;
    }
    
    setSimulating(true);
    let progress = 0;
    const startLat = trackingInfo.hotel_location.lat;
    const startLng = trackingInfo.hotel_location.lng;
    const endLat = trackingInfo.customer_location.lat;
    const endLng = trackingInfo.customer_location.lng;
    
    simulationRef.current = setInterval(async () => {
      progress += 0.02;
      if (progress >= 1) {
        if (simulationRef.current) {
          clearInterval(simulationRef.current);
        }
        setSimulating(false);
        return;
      }
      
      const currentLat = startLat + (endLat - startLat) * progress;
      const currentLng = startLng + (endLng - startLng) * progress;
      
      try {
        await deliveryApi.updateDriverLocation(orderId, currentLat, currentLng);
      } catch (error) {
        console.error('Failed to update location:', error);
      }
    }, 1000);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !trackingInfo) {
    return <Alert severity="error">{error || 'Tracking information not available'}</Alert>;
  }

  const hasLocations = trackingInfo.hotel_location?.lat && trackingInfo.customer_location?.lat;
  const currentLocation = driverLocation || trackingInfo.current_location;

  return (
    <Box>
      {/* Notifications */}
      {notifications.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {notifications.slice(-3).map((note, idx) => (
            <Alert severity="info" key={idx} sx={{ mb: 1 }}>
              {note}
            </Alert>
          ))}
        </Box>
      )}

      {/* Approaching Alert */}
      {approaching && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          🚚 Driver is approaching the delivery location!
        </Alert>
      )}

      {/* Real-time ETA Card */}
      {realtimeEta && (
        <Card sx={{ mb: 3, bgcolor: '#FFF9C4' }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <AccessTimeIcon color="warning" />
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Live ETA
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                      {realtimeEta.eta_minutes} min
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <SpeedIcon color="warning" />
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Distance Remaining
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                      {realtimeEta.distance_remaining_km} km
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" color="textSecondary">
                  Delivery Progress
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={realtimeEta.progress_percentage || 0} 
                  sx={{ height: 10, borderRadius: 5, mt: 1 }}
                />
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                  {realtimeEta.progress_percentage?.toFixed(0)}% Complete
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Map Section */}
      {hasLocations && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Live Location Tracking
            </Typography>
            <Chip 
              icon={<MyLocationIcon />} 
              label={currentLocation ? "Live" : "Waiting for location"}
              color={currentLocation ? "success" : "warning"}
              size="small"
            />
          </Box>
          
          <Box sx={{ height: 500, position: 'relative' }}>
            <MapContainer
              center={[trackingInfo.hotel_location.lat, trackingInfo.hotel_location.lng]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {/* Hotel Marker */}
              <Marker position={[trackingInfo.hotel_location.lat, trackingInfo.hotel_location.lng]} icon={hotelIcon}>
                <Popup>
                  <strong> Pickup Location</strong><br />
                  {trackingInfo.hotel_name}
                </Popup>
              </Marker>
              
              {/* Customer Marker */}
              <Marker position={[trackingInfo.customer_location.lat, trackingInfo.customer_location.lng]} icon={customerIcon}>
                <Popup>
                  <strong> Delivery Location</strong><br />
                  {trackingInfo.customer_name}
                </Popup>
              </Marker>
              
              {/* Driver Marker */}
              {currentLocation && (
                <CircleMarker
                  center={[currentLocation.lat, currentLocation.lng]}
                  radius={8}
                  fillColor="#2196F3"
                  color="#0b5e9e"
                  weight={2}
                  fillOpacity={0.8}
                >
                  <Popup>
                    <strong>🚚 Current Location</strong><br />
                    {realtimeEta && `ETA: ${realtimeEta.eta_minutes} min`}<br />
                    Last updated: {new Date().toLocaleTimeString()}
                  </Popup>
                </CircleMarker>
              )}
              
              {/* Route Line */}
              <Polyline
                positions={[
                  [trackingInfo.hotel_location.lat, trackingInfo.hotel_location.lng],
                  [trackingInfo.customer_location.lat, trackingInfo.customer_location.lng]
                ]}
                color="#FFCF71"
                weight={3}
                opacity={0.7}
                dashArray="5, 10"
              />
            </MapContainer>
          </Box>
          
          {/* Controls */}
          <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
            {trackingInfo.current_status !== 'delivered' && (
              <Button
                variant="contained"
                startIcon={<MyLocationIcon />}
                onClick={simulateDriverMovement}
                disabled={simulating}
                sx={{ bgcolor: '#FFCF71', color: '#1A2C3E' }}
              >
                {simulating ? 'Simulating...' : 'Simulate Driver Movement'}
              </Button>
            )}
          </Box>
        </Paper>
      )}

      {/* Journey Details */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Journey Details
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <RestaurantIcon color="action" />
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Pickup Location
                </Typography>
                <Typography variant="body2">
                  {trackingInfo.hotel_name}
                </Typography>
                {trackingInfo.hotel_location?.lat && (
                  <Typography variant="caption" color="textSecondary">
                    {trackingInfo.hotel_location.lat.toFixed(6)}, {trackingInfo.hotel_location.lng.toFixed(6)}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <HomeIcon color="action" />
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Delivery Location
                </Typography>
                <Typography variant="body2">
                  {trackingInfo.customer_name}
                </Typography>
                {trackingInfo.customer_location?.lat && (
                  <Typography variant="caption" color="textSecondary">
                    {trackingInfo.customer_location.lat.toFixed(6)}, {trackingInfo.customer_location.lng.toFixed(6)}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <LocalShippingIcon color="action" />
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Total Distance
                </Typography>
                <Typography variant="body2">
                  {trackingInfo.distance_km?.toFixed(2)} km
                </Typography>
                {realtimeEta?.distance_remaining_km && (
                  <Typography variant="caption" color="warning.main">
                    {realtimeEta.distance_remaining_km} km remaining
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default RealTimeLocationTracker;