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
import { io, Socket } from 'socket.io-client';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import HomeIcon from '@mui/icons-material/Home';
import StoreIcon from '@mui/icons-material/Store';
import BusinessIcon from '@mui/icons-material/Business';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import { deliveryApi } from '../../services/delivarylogistic';

// Helper function to calculate distance between two coordinates in kilometers
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

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
  current_status?: string;
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
  const [distanceToDestination, setDistanceToDestination] = useState<number | null>(null);
  const [destinationType, setDestinationType] = useState<'pickup' | 'delivery' | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const mapRef = useRef<any>(null);
  const simulationRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Calculate distance from current location to appropriate destination
  useEffect(() => {
    if (!driverLocation || !trackingInfo) {
      console.log('Missing driver location or tracking info');
      return;
    }

    const currentStatus = trackingInfo.current_status;
    const deliveryType = trackingInfo.delivery_type;
    
    console.log('Calculating distance - Delivery type:', deliveryType, 'Status:', currentStatus);
    console.log('Driver location:', driverLocation);
    console.log('Hotel location:', trackingInfo.hotel_location);
    console.log('Customer location:', trackingInfo.customer_location);
    
    let targetLat: number | null = null;
    let targetLng: number | null = null;
    let type: 'pickup' | 'delivery' | null = null;

    // Determine which destination to calculate distance based on delivery type and status
    if (deliveryType === 'hotel') {
      // For hotel deliveries, the destination is always the hotel
      targetLat = trackingInfo.hotel_location?.lat;
      targetLng = trackingInfo.hotel_location?.lng;
      type = 'delivery';
      console.log('Hotel delivery - target hotel:', targetLat, targetLng);
    } else if (deliveryType === 'customer') {
      // For customer deliveries, check status to determine current leg
      if (currentStatus === 'assigned' || currentStatus === 'pickup' || currentStatus === 'en_route_to_pickup') {
        targetLat = trackingInfo.hotel_location?.lat;
        targetLng = trackingInfo.hotel_location?.lng;
        type = 'pickup';
        console.log('Customer delivery - heading to pickup:', targetLat, targetLng);
      } else if (currentStatus === 'picked_up' || currentStatus === 'en_route_to_delivery' || currentStatus === 'out_for_delivery') {
        targetLat = trackingInfo.customer_location?.lat;
        targetLng = trackingInfo.customer_location?.lng;
        type = 'delivery';
        console.log('Customer delivery - heading to delivery:', targetLat, targetLng);
      }
    }

    if (currentStatus === 'delivered') {
      setDistanceToDestination(0);
      setDestinationType(null);
      return;
    }

    if (targetLat && targetLng && type) {
      const distance = calculateDistance(
        driverLocation.lat,
        driverLocation.lng,
        targetLat,
        targetLng
      );
      console.log('Calculated distance:', distance, 'km');
      setDistanceToDestination(distance);
      setDestinationType(type);
    } else {
      console.log('Missing target coordinates for calculation');
    }
  }, [driverLocation, trackingInfo]);

  useEffect(() => {
    // Initialize WebSocket connection with error handling
    console.log('Initializing WebSocket connection...');
    const socket = io('http://localhost:8084', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      socket.emit('join_order', { order_id: orderId });
    });
    
    socket.on('connect_error', (err: Error) => {
      console.error('WebSocket connection error:', err);
      // Don't set error, just log - we can still use REST API
    });
    
    socket.on('error', (err: Error) => {
      console.error('WebSocket error:', err);
    });
    
    // Listen for location updates
    socket.on('location_update', (data: LocationUpdateData) => {
      console.log('Location update received:', data);
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
      console.log('Status update received:', data);
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
      console.log('Fetching tracking info for order:', orderId);
      const response = await deliveryApi.trackDelivery(orderId);
      console.log('Tracking info response:', response);
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
        console.error('Tracking info error:', response.message);
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
        setDriverLocation({ lat: currentLat, lng: currentLng });
      } catch (error) {
        console.error('Failed to update location:', error);
      }
    }, 1000);
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)} meters`;
    }
    return `${distance.toFixed(2)} km`;
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

  // Check if we have valid locations
  const hasHotelLocation = trackingInfo.hotel_location?.lat && trackingInfo.hotel_location?.lng;
  const hasCustomerLocation = trackingInfo.customer_location?.lat && trackingInfo.customer_location?.lng;
  const hasLocations = hasHotelLocation && (trackingInfo.delivery_type === 'hotel' || hasCustomerLocation);
  
  const currentLocation = driverLocation || trackingInfo.current_location;
  const currentStatus = trackingInfo.current_status;
  const deliveryType = trackingInfo.delivery_type;

  console.log('Rendering with:', {
    deliveryType,
    hasHotelLocation,
    hasCustomerLocation,
    hasLocations,
    currentLocation,
    distanceToDestination,
    destinationType
  });

  // Get the destination text based on current status and delivery type
  const getDestinationText = (): string => {
    if (deliveryType === 'hotel') {
      return 'Distance to Hotel/Restaurant';
    } else if (destinationType === 'pickup') {
      return 'Distance to Pickup Location';
    } else if (destinationType === 'delivery') {
      return 'Distance to Delivery Location';
    }
    return 'Distance Remaining';
  };

  return (
    <Box>
      {/* Delivery Type Header */}
      <Alert 
        severity={deliveryType === 'hotel' ? 'info' : 'success'} 
        sx={{ mb: 2 }}
        icon={deliveryType === 'hotel' ? <StoreIcon /> : <HomeIcon />}
      >
        <strong>Delivery Type:</strong> {deliveryType === 'hotel' ? 'Hotel/Restaurant Delivery' : 'Customer Home Delivery'}
      </Alert>

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
          🚚 Driver is approaching the {deliveryType === 'hotel' ? 'hotel/restaurant' : 'delivery'} location!
        </Alert>
      )}

      {/* Real-time Distance and ETA Card */}
      {(realtimeEta || distanceToDestination !== null) && (
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
                      {realtimeEta?.eta_minutes || (distanceToDestination !== null && distanceToDestination < 5 ? '~5' : 'Calculating')} min
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <SpeedIcon color="warning" />
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      {getDestinationText()}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                      {distanceToDestination !== null 
                        ? formatDistance(distanceToDestination)
                        : realtimeEta?.distance_remaining_km 
                          ? `${realtimeEta.distance_remaining_km} km`
                          : 'Calculating...'
                      }
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
                  value={realtimeEta?.progress_percentage || 
                    (trackingInfo.total_distance_km && distanceToDestination 
                      ? ((trackingInfo.total_distance_km - distanceToDestination) / trackingInfo.total_distance_km * 100)
                      : 0)
                  } 
                  sx={{ height: 10, borderRadius: 5, mt: 1 }}
                />
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                  {realtimeEta?.progress_percentage?.toFixed(0) || 
                    (trackingInfo.total_distance_km && distanceToDestination 
                      ? ((trackingInfo.total_distance_km - distanceToDestination) / trackingInfo.total_distance_km * 100).toFixed(0)
                      : '0')}% Complete
                </Typography>
              </Grid>
            </Grid>
            
            {/* Status Badge */}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Chip 
                label={deliveryType === 'hotel' 
                  ? (currentStatus === 'delivered' ? 'Delivered to Hotel' : 'In Transit to Hotel')
                  : (currentStatus === 'pickup' ? 'Heading to Pickup' : 
                     currentStatus === 'out_for_delivery' ? 'Out for Delivery' : 
                     currentStatus === 'delivered' ? 'Delivered' : 
                     currentStatus)
                }
                color={currentStatus === 'delivered' ? 'success' : 'warning'}
                size="medium"
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Map Section */}
      {hasLocations ? (
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
              
              {/* Hotel Marker - Always show hotel location */}
              {hasHotelLocation && (
                <Marker position={[trackingInfo.hotel_location.lat, trackingInfo.hotel_location.lng]} icon={hotelIcon}>
                  <Popup>
                    <strong>📍 {deliveryType === 'hotel' ? 'Destination' : 'Pickup'} Location</strong><br />
                    {trackingInfo.hotel_name || 'Hotel'}<br />
                    {deliveryType === 'hotel' && distanceToDestination !== null && (
                      <>
                        <br />
                        <strong>Distance: {formatDistance(distanceToDestination)}</strong>
                      </>
                    )}
                  </Popup>
                </Marker>
              )}
              
              {/* Customer Marker - Only show for customer deliveries */}
              {deliveryType === 'customer' && hasCustomerLocation && (
                <Marker position={[trackingInfo.customer_location.lat, trackingInfo.customer_location.lng]} icon={customerIcon}>
                  <Popup>
                    <strong>🏠 Delivery Location</strong><br />
                    {trackingInfo.customer_name || 'Customer'}<br />
                    {destinationType === 'delivery' && distanceToDestination !== null && (
                      <>
                        <br />
                        <strong>Distance: {formatDistance(distanceToDestination)}</strong>
                      </>
                    )}
                  </Popup>
                </Marker>
              )}
              
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
                    {distanceToDestination !== null && (
                      <>
                        Distance to {deliveryType === 'hotel' ? 'hotel' : (destinationType === 'pickup' ? 'pickup' : 'delivery')}: {formatDistance(distanceToDestination)}
                        <br />
                      </>
                    )}
                    {realtimeEta && `ETA: ${realtimeEta.eta_minutes} min`}<br />
                    Last updated: {new Date().toLocaleTimeString()}
                  </Popup>
                </CircleMarker>
              )}
              
              {/* Route Line from Current Location to Destination */}
              {currentLocation && destinationType && hasHotelLocation && (
                <Polyline
                  positions={[
                    [currentLocation.lat, currentLocation.lng],
                    destinationType === 'pickup' 
                      ? [trackingInfo.hotel_location.lat, trackingInfo.hotel_location.lng]
                      : deliveryType === 'customer' && hasCustomerLocation
                        ? [trackingInfo.customer_location.lat, trackingInfo.customer_location.lng]
                        : [trackingInfo.hotel_location.lat, trackingInfo.hotel_location.lng]
                  ]}
                  color="#FFCF71"
                  weight={4}
                  opacity={0.9}
                />
              )}
              
              {/* Full Route Line (Hotel to Customer) - only show for customer deliveries */}
              {deliveryType === 'customer' && hasHotelLocation && hasCustomerLocation && (
                <Polyline
                  positions={[
                    [trackingInfo.hotel_location.lat, trackingInfo.hotel_location.lng],
                    [trackingInfo.customer_location.lat, trackingInfo.customer_location.lng]
                  ]}
                  color="#CCCCCC"
                  weight={2}
                  opacity={0.4}
                  dashArray="5, 10"
                />
              )}
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
      ) : (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Location data not available. Please ensure hotel and customer addresses are validated.
          <br />
          Hotel location: {hasHotelLocation ? 'Validated' : 'Missing'}
          <br />
          Customer location: {hasCustomerLocation ? 'Validated' : 'Missing'}
        </Alert>
      )}

      {/* Journey Details */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Journey Details
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: deliveryType === 'hotel' ? 6 : 4 }}>
            <Box display="flex" alignItems="center" gap={1}>
              {deliveryType === 'hotel' ? <StoreIcon color="action" /> : <RestaurantIcon color="action" />}
              <Box>
                <Typography variant="caption" color="textSecondary">
                  {deliveryType === 'hotel' ? 'Destination (Hotel/Restaurant)' : 'Pickup Location'}
                </Typography>
                <Typography variant="body2">
                  {trackingInfo.hotel_name || 'Not specified'}
                </Typography>
                {trackingInfo.hotel_location?.lat && (
                  <Typography variant="caption" color="textSecondary">
                    {trackingInfo.hotel_location.lat.toFixed(6)}, {trackingInfo.hotel_location.lng.toFixed(6)}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>
          
          {deliveryType === 'customer' && (
            <Grid size={{ xs: 12, md: 4 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <HomeIcon color="action" />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Delivery Location
                  </Typography>
                  <Typography variant="body2">
                    {trackingInfo.customer_name || 'Not specified'}
                  </Typography>
                  {trackingInfo.customer_location?.lat && (
                    <Typography variant="caption" color="textSecondary">
                      {trackingInfo.customer_location.lat.toFixed(6)}, {trackingInfo.customer_location.lng.toFixed(6)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          )}
          
          <Grid size={{ xs: 12, md: deliveryType === 'hotel' ? 6 : 4 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <LocalShippingIcon color="action" />
              <Box>
                <Typography variant="caption" color="textSecondary">
                  {deliveryType === 'hotel' ? 'Distance to Destination' : 
                   destinationType === 'pickup' ? 'Distance to Pickup' : 
                   destinationType === 'delivery' ? 'Distance to Delivery' : 
                   'Total Journey Distance'}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#FFCF71' }}>
                  {distanceToDestination !== null 
                    ? formatDistance(distanceToDestination)
                    : trackingInfo.total_distance_km 
                      ? `${trackingInfo.total_distance_km.toFixed(2)} km (total)`
                      : 'Calculating...'
                  }
                </Typography>
                {trackingInfo.total_distance_km && distanceToDestination !== null && destinationType === 'delivery' && (
                  <Typography variant="caption" color="textSecondary">
                    Total journey: {trackingInfo.total_distance_km.toFixed(2)} km
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        {/* Current Status Description */}
        {currentStatus && (
          <Box sx={{ mt: 2, p: 1, bgcolor: '#F5F5F5', borderRadius: 1 }}>
            <Typography variant="body2" color="textSecondary">
              {deliveryType === 'hotel' && currentStatus === 'assigned' && '🚚 Driver assigned and heading to hotel/restaurant'}
              {deliveryType === 'hotel' && currentStatus === 'out_for_delivery' && '🚚 Out for delivery! Driver is on the way to the hotel/restaurant'}
              {deliveryType === 'hotel' && currentStatus === 'delivered' && '✅ Order delivered to hotel/restaurant successfully!'}
              {deliveryType === 'customer' && currentStatus === 'assigned' && '🚚 Driver assigned and heading to pickup location'}
              {deliveryType === 'customer' && currentStatus === 'pickup' && '📍 Driver en route to pickup the order from the hotel'}
              {deliveryType === 'customer' && currentStatus === 'picked_up' && '📦 Order picked up! Now heading to delivery address'}
              {deliveryType === 'customer' && currentStatus === 'out_for_delivery' && '🚚 Out for delivery! Driver is on the way to you'}
              {deliveryType === 'customer' && currentStatus === 'delivered' && '✅ Order delivered successfully!'}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default RealTimeLocationTracker;