import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Chip,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AssignmentInd,
  LocalShipping,
  CheckCircle,
  Cancel,
  LocationOn,
  WhatsApp,
} from '@mui/icons-material';
import { deliveryApi } from '../../services/delivarylogistic';
import { DeliveryStatus } from '../../types/delivery.types';
import toast from 'react-hot-toast';

interface StatusUpdateProps {
  orderId: string;
  currentStatus: DeliveryStatus;
  onStatusUpdated: () => void;
}

const StatusUpdate: React.FC<StatusUpdateProps> = ({ orderId, currentStatus, onStatusUpdated }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const getNextStatus = () => {
    switch (currentStatus) {
      case DeliveryStatus.PENDING:
        return DeliveryStatus.ASSIGNED;
      case DeliveryStatus.ASSIGNED:
        return DeliveryStatus.PICKED_UP;
      case DeliveryStatus.PICKED_UP:
        return DeliveryStatus.IN_TRANSIT;
      case DeliveryStatus.IN_TRANSIT:
        return DeliveryStatus.DELIVERED;
      default:
        return null;
    }
  };

  const getStatusConfig = () => {
    const config = {
      [DeliveryStatus.PENDING]: {
        label: 'Assign Driver',
        icon: <AssignmentInd />,
        color: 'warning',
        message: 'Assign a driver to this delivery'
      },
      [DeliveryStatus.ASSIGNED]: {
        label: 'Mark as Picked Up',
        icon: <LocalShipping />,
        color: 'info',
        message: 'Confirm order pickup from hotel'
      },
      [DeliveryStatus.PICKED_UP]: {
        label: 'Start Delivery',
        icon: <LocationOn />,
        color: 'info',
        message: 'Start journey to customer'
      },
      [DeliveryStatus.IN_TRANSIT]: {
        label: 'Mark as Delivered',
        icon: <CheckCircle />,
        color: 'success',
        message: 'Confirm delivery to customer'
      }
    };
    return config[currentStatus as keyof typeof config];
  };

  const handleUpdate = async () => {
    const nextStatus = getNextStatus();
    if (!nextStatus) return;

    setLoading(true);
    try {
      // Get current location (if available)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          () => {
            // Location permission denied, continue without location
            console.log('Location permission denied');
          }
        );
      }

      const update = {
        status: nextStatus,
        notes: notes || getStatusConfig()?.message,
        location: location || undefined
      };

      const response = await deliveryApi.updateDeliveryStatus(orderId, update);
      if (response.success) {
        toast.success(`Status updated to ${nextStatus.replace('_', ' ')}`);
        onStatusUpdated();
        setOpen(false);
        setNotes('');
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Error updating status');
    } finally {
      setLoading(false);
    }
  };

  const nextStatus = getNextStatus();
  const config = getStatusConfig();

  if (!nextStatus || currentStatus === DeliveryStatus.DELIVERED || currentStatus === DeliveryStatus.CANCELLED) {
    return null;
  }

  return (
    <>
      <Tooltip title={`Update to ${nextStatus.replace('_', ' ')}`}>
        <Button
          variant="contained"
          startIcon={config?.icon}
          onClick={() => setOpen(true)}
          sx={{
            bgcolor: config?.color === 'warning' ? '#FF9800' :
                     config?.color === 'info' ? '#2196F3' :
                     config?.color === 'success' ? '#4CAF50' : '#FFCF71',
            '&:hover': {
              bgcolor: config?.color === 'warning' ? '#F57C00' :
                       config?.color === 'info' ? '#1976D2' :
                       config?.color === 'success' ? '#388E3C' : '#E5B85E',
            }
          }}
        >
          {config?.label}
        </Button>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            {config?.icon}
            <Typography variant="h6">{config?.label}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Current Status: <Chip
                label={currentStatus.replace('_', ' ').toUpperCase()}
                size="small"
                color="default"
              />
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Next Status: <Chip
                label={nextStatus.replace('_', ' ').toUpperCase()}
                size="small"
                color="primary"
              />
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={config?.message}
              sx={{ mt: 2 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              💡 Tip: You can add location and additional notes for tracking
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpdate}
            variant="contained"
            disabled={loading}
            sx={{ bgcolor: '#FFCF71', color: '#1A2C3E' }}
          >
            {loading ? 'Updating...' : `Confirm ${config?.label}`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StatusUpdate;