import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import CancelIcon from '@mui/icons-material/Cancel';
import { deliveryApi } from '../../services/delivarylogistic';
import { DeliveryStatus, TrackingEvent } from '../../types/delivery.types';
import StatusUpdate from './StatusUpdate';
import RealTimeLocationTracker from './RealTimeLocationTracker'; // Import the real-time tracker

const statusSteps = [
  DeliveryStatus.PENDING,
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.IN_TRANSIT,
  DeliveryStatus.DELIVERED,
];

const getStatusColor = (status: DeliveryStatus) => {
  switch (status) {
    case DeliveryStatus.DELIVERED:
      return 'success';
    case DeliveryStatus.IN_TRANSIT:
    case DeliveryStatus.PICKED_UP:
      return 'info';
    case DeliveryStatus.ASSIGNED:
      return 'warning';
    case DeliveryStatus.PENDING:
      return 'default';
    case DeliveryStatus.CANCELLED:
      return 'error';
    default:
      return 'default';
  }
};

const DeliveryTracker: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [loading, setLoading] = useState(true);
  const [trackingInfo, setTrackingInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (orderId) {
      fetchTrackingInfo();
      // Poll for updates every 10 seconds
      const interval = setInterval(fetchTrackingInfo, 10000);
      return () => clearInterval(interval);
    }
  }, [orderId, refreshTrigger]);

  const fetchTrackingInfo = async () => {
    try {
      const response = await deliveryApi.trackDelivery(orderId!);
      if (response.success) {
        setTrackingInfo(response.data);
        setError(null);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('Failed to fetch tracking information');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdated = () => {
    fetchTrackingInfo();
    setRefreshTrigger(prev => prev + 1);
  };

  const getActiveStep = () => {
    if (!trackingInfo) return 0;
    const currentStatus = trackingInfo.current_status;
    if (currentStatus === DeliveryStatus.CANCELLED) return -1;
    const index = statusSteps.indexOf(currentStatus);
    return index !== -1 ? index : 0;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !trackingInfo) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        <Alert severity="error">{error || 'Tracking information not found'}</Alert>
      </Box>
    );
  }

  const activeStep = getActiveStep();

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Real-Time Delivery Tracking
        </Typography>

        {/* Basic Information Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Order ID
                </Typography>
                <Typography variant="h6">{trackingInfo.order_id}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Current Status
                </Typography>
                <Chip
                  label={trackingInfo.current_status.replace('_', ' ').toUpperCase()}
                  color={getStatusColor(trackingInfo.current_status)}
                  sx={{ mt: 1 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Hotel
                </Typography>
                <Typography>{trackingInfo.hotel_name}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Customer
                </Typography>
                <Typography>{trackingInfo.customer_name}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Vehicle
                </Typography>
                <Typography sx={{ textTransform: 'capitalize' }}>
                  {trackingInfo.vehicle_type}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Total Distance
                </Typography>
                <Typography>{trackingInfo.distance_km?.toFixed(2)} km</Typography>
              </Grid>
            </Grid>

            {trackingInfo.estimated_delivery_time && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Initial Estimated Delivery Time
                </Typography>
                <Typography variant="h6" color="primary">
                  {format(new Date(trackingInfo.estimated_delivery_time), 'PPpp')}
                </Typography>
              </Box>
            )}

            {trackingInfo.actual_delivery_time && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Actual Delivery Time
                </Typography>
                <Typography variant="h6" color="success.main">
                  {format(new Date(trackingInfo.actual_delivery_time), 'PPpp')}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Real-time Location Tracker Component */}
        <Box sx={{ mb: 4 }}>
          <RealTimeLocationTracker orderId={orderId!} />
        </Box>

        {/* Status Update Section */}
        {trackingInfo.current_status !== DeliveryStatus.DELIVERED && 
         trackingInfo.current_status !== DeliveryStatus.CANCELLED && (
          <Box sx={{ mt: 3, mb: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <StatusUpdate
              orderId={orderId!}
              currentStatus={trackingInfo.current_status}
              onStatusUpdated={handleStatusUpdated}
            />
            
            {/* Cancel Order Button */}
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={async () => {
                if (window.confirm('Are you sure you want to cancel this delivery?')) {
                  try {
                    const response = await deliveryApi.updateDeliveryStatus(orderId!, {
                      status: DeliveryStatus.CANCELLED,
                      notes: 'Order cancelled by user'
                    });
                    if (response.success) {
                      toast.success('Delivery cancelled successfully');
                      handleStatusUpdated();
                    } else {
                      toast.error('Failed to cancel delivery');
                    }
                  } catch (error) {
                    toast.error('Error cancelling delivery');
                  }
                }
              }}
            >
              Cancel Order
            </Button>
          </Box>
        )}

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          Tracking History
        </Typography>

        {trackingInfo.current_status === DeliveryStatus.CANCELLED ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            This delivery has been cancelled
          </Alert>
        ) : (
          <Stepper activeStep={activeStep} orientation="vertical">
            {statusSteps.map((status, index) => {
              const events = trackingInfo.tracking_history?.filter(
                (e: TrackingEvent) => e.status === status
              );
              const latestEvent = events?.[events.length - 1];

              return (
                <Step key={status}>
                  <StepLabel
                    optional={
                      latestEvent && (
                        <Typography variant="caption">
                          {format(new Date(latestEvent.timestamp), 'PPp')}
                        </Typography>
                      )
                    }
                  >
                    {status.replace('_', ' ').toUpperCase()}
                  </StepLabel>
                  <StepContent>
                    {events?.map((event: TrackingEvent, idx: number) => (
                      <Box key={idx} sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          {format(new Date(event.timestamp), 'PPp')}
                        </Typography>
                        {event.notes && (
                          <Typography variant="body2" color="textSecondary">
                            Note: {event.notes}
                          </Typography>
                        )}
                        {event.location && (
                          <Typography variant="body2" color="textSecondary">
                            Location: {event.location.lat}, {event.location.lng}
                          </Typography>
                        )}
                        {idx < events.length - 1 && <Divider sx={{ my: 1 }} />}
                      </Box>
                    ))}
                  </StepContent>
                </Step>
              );
            })}
          </Stepper>
        )}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => window.print()}
            sx={{ mr: 2 }}
          >
            Print Details
          </Button>
          <Button
            variant="contained"
            onClick={() => window.location.href = '/delivery'}
          >
            Back to Home
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default DeliveryTracker;