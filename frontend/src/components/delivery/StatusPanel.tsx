// components/StatusPanel.tsx

import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Box,
  TextField,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { deliveryApi } from '../../services/delivarylogistic';
import { DeliveryStatus } from '../../types/delivery.types';
import toast from 'react-hot-toast';

interface StatusPanelProps {
  orderId: string;
  currentStatus: DeliveryStatus;
  trackingHistory: any[];
  onStatusUpdated: () => void;
}

const statusSteps = [
  DeliveryStatus.PENDING,
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.IN_TRANSIT,
  DeliveryStatus.DELIVERED,
];

const StatusPanel: React.FC<StatusPanelProps> = ({
  orderId,
  currentStatus,
  trackingHistory,
  onStatusUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<DeliveryStatus | null>(null);

  const activeStep = statusSteps.indexOf(currentStatus);
  const canProceed = activeStep < statusSteps.length - 1;
  const nextStatus = canProceed ? statusSteps[activeStep + 1] : null;

  const handleStatusUpdate = async () => {
    if (!nextStatus) return;
    
    setLoading(true);
    try {
      const response = await deliveryApi.updateDeliveryStatus(orderId, {
        status: nextStatus,
        notes: notes || `Status updated to ${nextStatus.replace('_', ' ')}`,
      });
      
      if (response.success) {
        toast.success(`Status updated to ${nextStatus.replace('_', ' ')}`);
        setNotes('');
        onStatusUpdated();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Error updating status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusMessage = (status: DeliveryStatus): string => {
    const messages: Record<DeliveryStatus, string> = {
      [DeliveryStatus.PENDING]: 'Order created, waiting for driver assignment',
      [DeliveryStatus.ASSIGNED]: 'Driver assigned, heading to pickup location',
      [DeliveryStatus.PICKED_UP]: 'Order picked up from hotel',
      [DeliveryStatus.IN_TRANSIT]: 'En route to customer location',
      [DeliveryStatus.DELIVERED]: 'Successfully delivered to customer',
      [DeliveryStatus.CANCELLED]: 'Order cancelled',
      [DeliveryStatus.FAILED]: 'Delivery failed. Please contact support.'
    };
    return messages[status] || 'Status update';
  };

  // Helper function to get status display text
  const getStatusDisplayText = (status: DeliveryStatus): string => {
    return status.replace('_', ' ').toUpperCase();
  };

  // Helper function to check if status should be shown in stepper
  const shouldShowInStepper = (status: DeliveryStatus): boolean => {
    return statusSteps.includes(status);
  };

  if (currentStatus === DeliveryStatus.CANCELLED) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        This delivery has been cancelled
      </Alert>
    );
  }

  if (currentStatus === DeliveryStatus.FAILED) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        This delivery has failed. Please contact support for assistance.
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Delivery Progress
      </Typography>
      
      <Stepper activeStep={activeStep} alternativeLabel>
        {statusSteps.map((status) => (
          <Step key={status}>
            <StepLabel
              StepIconProps={{
                completed: statusSteps.indexOf(status) < activeStep,
              }}
            >
              {getStatusDisplayText(status)}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Current Status Info */}
      <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: '#E3F2FD', borderRadius: 2 }}>
        <Typography variant="subtitle2" color="primary" gutterBottom>
          Current Status: {getStatusDisplayText(currentStatus)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {getStatusMessage(currentStatus)}
        </Typography>
      </Box>

      {nextStatus && (
        <Box sx={{ mt: 3, p: 2, bgcolor: '#F8F9FA', borderRadius: 2 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Next Step: {getStatusDisplayText(nextStatus)}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {getStatusMessage(nextStatus)}
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Add notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="E.g., Driver John assigned, ETA 30 minutes"
            sx={{ mt: 2, mb: 2 }}
          />
          
          <Button
            variant="contained"
            onClick={handleStatusUpdate}
            disabled={loading}
            fullWidth
            sx={{
              bgcolor: '#FFCF71',
              color: '#1A2C3E',
              '&:hover': { bgcolor: '#E5B85E' }
            }}
          >
            {loading ? <CircularProgress size={24} /> : `Update to ${getStatusDisplayText(nextStatus)}`}
          </Button>
        </Box>
      )}

      {/* Show latest tracking event */}
      {trackingHistory && trackingHistory.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Latest Update
          </Typography>
          <Alert severity="info" icon={false}>
            <Typography variant="body2">
              {trackingHistory[trackingHistory.length - 1]?.notes || 
               `Status: ${getStatusDisplayText(currentStatus)}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {trackingHistory[trackingHistory.length - 1]?.timestamp 
                ? new Date(trackingHistory[trackingHistory.length - 1].timestamp).toLocaleString()
                : 'No timestamp available'}
            </Typography>
          </Alert>
        </Box>
      )}

      {/* Show all tracking history */}
      {trackingHistory && trackingHistory.length > 1 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            All Updates
          </Typography>
          <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
            {trackingHistory.slice().reverse().map((event, index) => (
              <Box key={index} sx={{ mb: 1, p: 1, borderLeft: '2px solid #FFCF71', pl: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'No timestamp'}
                </Typography>
                <Typography variant="body2">
                  {event.notes || `Status: ${getStatusDisplayText(event.status)}`}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default StatusPanel;