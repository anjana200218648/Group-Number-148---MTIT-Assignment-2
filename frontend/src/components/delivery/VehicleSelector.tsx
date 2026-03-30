import React, { useEffect, useState } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Paper,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import TimeToLeaveIcon from '@mui/icons-material/TimeToLeave';
import { deliveryApi } from '../../services/delivarylogistic';
import { OrderSize, VehicleType, VehicleRequirement } from '../../types/delivery.types';

interface VehicleSelectorProps {
  orderSize: OrderSize;
  onVehicleSelect: (vehicle: VehicleType) => void;
  selectedVehicle?: VehicleType;
  disabled?: boolean;
}

const VehicleSelector: React.FC<VehicleSelectorProps> = ({
  orderSize,
  onVehicleSelect,
  selectedVehicle,
  disabled = false,
}) => {
  const [requirements, setRequirements] = useState<VehicleRequirement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderSize) {
      fetchVehicleRequirements();
    }
  }, [orderSize]);

  const fetchVehicleRequirements = async () => {
    setLoading(true);
    try {
      const response = await deliveryApi.getVehicleRequirements(orderSize);
      if (response.success) {
        setRequirements(response.data);
        // Auto-select recommended vehicle
        onVehicleSelect(response.data.recommended_vehicle);
      }
    } catch (err) {
      setError('Failed to load vehicle requirements');
    } finally {
      setLoading(false);
    }
  };

  const getVehicleIcon = (vehicle: VehicleType) => {
    switch (vehicle) {
      case VehicleType.BIKE:
        return <TwoWheelerIcon />;
      case VehicleType.MOTORCYCLE:
        return <TwoWheelerIcon />;
      case VehicleType.CAR:
        return <DirectionsCarIcon />;
      case VehicleType.VAN:
        return <TimeToLeaveIcon />;
      case VehicleType.TRUCK:
        return <LocalShippingIcon />;
      default:
        return <LocalShippingIcon />;
    }
  };

  const getVehicleLabel = (vehicle: VehicleType) => {
    return vehicle.charAt(0).toUpperCase() + vehicle.slice(1);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!requirements) {
    return null;
  }

  return (
    <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Vehicle Assignment
      </Typography>

      <Box mb={2}>
        <Chip
          label={`Max Distance: ${requirements.max_distance_km}km`}
          size="small"
          sx={{ mr: 1, mb: 1 }}
        />
        <Chip
          label={`Max Weight: ${requirements.max_weight_kg}kg`}
          size="small"
          sx={{ mr: 1, mb: 1 }}
        />
      </Box>

      <Typography variant="body2" color="textSecondary" gutterBottom>
        {requirements.description}
      </Typography>

      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Select Vehicle</InputLabel>
        <Select
          value={selectedVehicle || requirements.recommended_vehicle}
          onChange={(e) => onVehicleSelect(e.target.value as VehicleType)}
          disabled={disabled}
          label="Select Vehicle"
        >
          <MenuItem value={VehicleType.BIKE}>
            <Box display="flex" alignItems="center" gap={1}>
              {getVehicleIcon(VehicleType.BIKE)}
              {getVehicleLabel(VehicleType.BIKE)}
            </Box>
          </MenuItem>
          <MenuItem value={VehicleType.MOTORCYCLE}>
            <Box display="flex" alignItems="center" gap={1}>
              {getVehicleIcon(VehicleType.MOTORCYCLE)}
              {getVehicleLabel(VehicleType.MOTORCYCLE)}
            </Box>
          </MenuItem>
          <MenuItem value={VehicleType.CAR}>
            <Box display="flex" alignItems="center" gap={1}>
              {getVehicleIcon(VehicleType.CAR)}
              {getVehicleLabel(VehicleType.CAR)}
            </Box>
          </MenuItem>
          <MenuItem value={VehicleType.VAN}>
            <Box display="flex" alignItems="center" gap={1}>
              {getVehicleIcon(VehicleType.VAN)}
              {getVehicleLabel(VehicleType.VAN)}
            </Box>
          </MenuItem>
          <MenuItem value={VehicleType.TRUCK}>
            <Box display="flex" alignItems="center" gap={1}>
              {getVehicleIcon(VehicleType.TRUCK)}
              {getVehicleLabel(VehicleType.TRUCK)}
            </Box>
          </MenuItem>
        </Select>
      </FormControl>

      {selectedVehicle && selectedVehicle !== requirements.recommended_vehicle && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Note: This vehicle is larger than recommended for this order size.
          Consider using {getVehicleLabel(requirements.recommended_vehicle)} for optimal efficiency.
        </Alert>
      )}
    </Paper>
  );
};

export default VehicleSelector; 