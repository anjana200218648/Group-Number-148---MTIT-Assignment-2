import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  InputAdornment,
  Chip,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton as MuiIconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormHelperText,
  Tooltip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SearchIcon from '@mui/icons-material/Search';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import TrafficIcon from '@mui/icons-material/Traffic';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import InventoryIcon from '@mui/icons-material/Inventory';
import PhoneIcon from '@mui/icons-material/Phone';
import StoreIcon from '@mui/icons-material/Store';
import { deliveryApi } from '../../services/delivarylogistic';
import { DeliveryOrder, OrderSize, HotelInfo, CustomerInfo, StockItem } from '../../types/delivery.types';
import VehicleSelector from './VehicleSelector';

const steps = ['Hotel/Restaurant', 'Customer Information', 'Order Details', 'Stock Items', 'Confirmation'];

// Validation functions
const validatePhoneNumber = (phone: string): boolean => {
  // Sri Lankan phone number validation
  // Format: 0XXXXXXXXX or +94XXXXXXXXX (10 digits after 0 or 9 digits after +94)
  const sriLankanPhoneRegex = /^(?:(?:\+94)|0)(?:7[0-9]{8}|[1-9][0-9]{8})$/;
  return sriLankanPhoneRegex.test(phone);
};

const validateHotelCONO = (cono: string): boolean => {
  // Hotel CONO validation - alphanumeric, 3-15 characters
  const conoRegex = /^[A-Za-z0-9]{3,15}$/;
  return conoRegex.test(cono);
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateAddress = (address: string): boolean => {
  return address.trim().length >= 5;
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const CreateDelivery: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<any>(null);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [addItemDialog, setAddItemDialog] = useState(false);
  
  // Validation errors state
  const [errors, setErrors] = useState({
    hotel: {
      hotel_id: '',
      hotel_name: '',
      hotel_cono: '',
      address: '',
      phone: '',
    },
    customer: {
      name: '',
      phone: '',
      address: '',
    },
    items: [] as string[],
  });

  const [newItem, setNewItem] = useState<Partial<StockItem>>({
    item_id: '',
    item_name: '',
    quantity: 1,
    weight_kg: 0,
    unit_price: 0,
    total_price: 0
  });
  
  const [newItemErrors, setNewItemErrors] = useState({
    item_id: '',
    item_name: '',
    quantity: '',
    weight_kg: '',
    unit_price: '',
  });
  
  // Hotel/Restaurant information (where the order is coming from)
  const [hotelInfo, setHotelInfo] = useState<HotelInfo>({
    hotel_id: '',
    hotel_name: '',
    hotel_cono: '',
    address: '',
    phone: '',
    latitude: undefined,
    longitude: undefined,
  });

  // Customer information (delivery destination)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    address: '',
    latitude: undefined,
    longitude: undefined,
  });

  // Stock items
  const [items, setItems] = useState<StockItem[]>([]);
  const [orderSize, setOrderSize] = useState<OrderSize>(OrderSize.SMALL);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [totalWeight, setTotalWeight] = useState(0);
  const [totalValue, setTotalValue] = useState(0);

  // Update totals when items change
  useEffect(() => {
    const weight = items.reduce((sum, item) => sum + (item.weight_kg * item.quantity), 0);
    const value = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    setTotalWeight(weight);
    setTotalValue(value);
    
    // Auto-determine order size based on total weight
    if (weight <= 5) {
      setOrderSize(OrderSize.SMALL);
    } else if (weight <= 20) {
      setOrderSize(OrderSize.MEDIUM);
    } else if (weight <= 100) {
      setOrderSize(OrderSize.LARGE);
    } else {
      setOrderSize(OrderSize.EXTRA_LARGE);
    }
  }, [items]);

  // Validate hotel information
  const validateHotelInfo = (): boolean => {
    const newErrors = {
      hotel_id: '',
      hotel_name: '',
      hotel_cono: '',
      address: '',
      phone: '',
    };
    let isValid = true;

    if (!hotelInfo.hotel_id.trim()) {
      newErrors.hotel_id = 'Hotel ID is required';
      isValid = false;
    }

    if (!hotelInfo.hotel_name.trim()) {
      newErrors.hotel_name = 'Hotel name is required';
      isValid = false;
    }

    if (!hotelInfo.hotel_cono.trim()) {
      newErrors.hotel_cono = 'Hotel CONO is required';
      isValid = false;
    } else if (!validateHotelCONO(hotelInfo.hotel_cono)) {
      newErrors.hotel_cono = 'CONO must be 3-15 alphanumeric characters';
      isValid = false;
    }

    if (!hotelInfo.address.trim()) {
      newErrors.address = 'Hotel address is required';
      isValid = false;
    } else if (!validateAddress(hotelInfo.address)) {
      newErrors.address = 'Address must be at least 5 characters';
      isValid = false;
    }

    if (!hotelInfo.phone.trim()) {
      newErrors.phone = 'Phone number is required';
      isValid = false;
    } else if (!validatePhoneNumber(hotelInfo.phone)) {
      newErrors.phone = 'Invalid Sri Lankan phone number (e.g., 0712345678 or +94712345678)';
      isValid = false;
    }

    setErrors(prev => ({ ...prev, hotel: newErrors }));
    return isValid;
  };

  // Validate customer information
  const validateCustomerInfo = (): boolean => {
    const newErrors = {
      name: '',
      phone: '',
      address: '',
    };
    let isValid = true;

    if (!customerInfo.name.trim()) {
      newErrors.name = 'Customer name is required';
      isValid = false;
    }

    if (!customerInfo.phone.trim()) {
      newErrors.phone = 'Phone number is required';
      isValid = false;
    } else if (!validatePhoneNumber(customerInfo.phone)) {
      newErrors.phone = 'Invalid Sri Lankan phone number (e.g., 0712345678 or +94712345678)';
      isValid = false;
    }

    if (!customerInfo.address.trim()) {
      newErrors.address = 'Delivery address is required';
      isValid = false;
    } else if (!validateAddress(customerInfo.address)) {
      newErrors.address = 'Address must be at least 5 characters';
      isValid = false;
    }

    setErrors(prev => ({ ...prev, customer: newErrors }));
    return isValid;
  };

  // Validate new item before adding
  const validateNewItem = (): boolean => {
    const newErrors = {
      item_id: '',
      item_name: '',
      quantity: '',
      weight_kg: '',
      unit_price: '',
    };
    let isValid = true;

    if (!newItem.item_id?.trim()) {
      newErrors.item_id = 'Item ID is required';
      isValid = false;
    }

    if (!newItem.item_name?.trim()) {
      newErrors.item_name = 'Item name is required';
      isValid = false;
    }

    if (!newItem.quantity || newItem.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
      isValid = false;
    }

    if (!newItem.unit_price || newItem.unit_price < 0) {
      newErrors.unit_price = 'Unit price cannot be negative';
      isValid = false;
    }

    if (newItem.weight_kg && newItem.weight_kg < 0) {
      newErrors.weight_kg = 'Weight cannot be negative';
      isValid = false;
    }

    setNewItemErrors(newErrors);
    return isValid;
  };

  const handleAddItem = () => {
    if (!validateNewItem()) {
      return;
    }
    
    const item: StockItem = {
      item_id: newItem.item_id!,
      item_name: newItem.item_name!,
      quantity: newItem.quantity || 1,
      weight_kg: newItem.weight_kg || 0,
      unit_price: newItem.unit_price || 0,
      total_price: (newItem.unit_price || 0) * (newItem.quantity || 1)
    };
    
    setItems([...items, item]);
    setAddItemDialog(false);
    setNewItem({
      item_id: '',
      item_name: '',
      quantity: 1,
      weight_kg: 0,
      unit_price: 0,
      total_price: 0
    });
    toast.success('Item added successfully');
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    toast.success('Item removed');
  };

  const handleHotelAddressSearch = async () => {
    if (!validateAddress(hotelInfo.address)) {
      toast.error('Please enter a valid hotel address (minimum 5 characters)');
      return;
    }
    
    setSearchingAddress(true);
    try {
      const location = await geocodeAddress(hotelInfo.address);
      if (location) {
        setHotelInfo({
          ...hotelInfo,
          latitude: location.lat,
          longitude: location.lng,
        });
        toast.success('Hotel location found!');
        
        // Auto-calculate estimate if both locations are available
        if (customerInfo.latitude && customerInfo.longitude && items.length > 0) {
          await calculateEstimate();
        }
      } else {
        toast.error('Address not found. Please try a more specific address.');
      }
    } catch (error) {
      toast.error('Failed to search address');
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleCustomerAddressSearch = async () => {
    if (!validateAddress(customerInfo.address)) {
      toast.error('Please enter a valid delivery address (minimum 5 characters)');
      return;
    }
    
    setSearchingAddress(true);
    try {
      const location = await geocodeAddress(customerInfo.address);
      if (location) {
        setCustomerInfo({
          ...customerInfo,
          latitude: location.lat,
          longitude: location.lng,
        });
        toast.success('Delivery address found!');
        
        // Auto-calculate estimate if both locations are available
        if (hotelInfo.latitude && hotelInfo.longitude && items.length > 0) {
          await calculateEstimate();
        }
      } else {
        toast.error('Address not found. Please try a more specific address.');
      }
    } catch (error) {
      toast.error('Failed to search address');
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleNext = async () => {
    let isValid = true;
    
    if (activeStep === 0) {
      isValid = validateHotelInfo();
    } else if (activeStep === 1) {
      isValid = validateCustomerInfo();
    } else if (activeStep === 2) {
      if (items.length === 0) {
        toast.error('Please add at least one stock item');
        isValid = false;
      } else {
        const calculated = await calculateEstimate();
        if (!calculated) {
          isValid = false;
        }
      }
    }
    
    if (isValid) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const calculateEstimate = async () => {
    // Check if coordinates are available
    if (!hotelInfo.latitude || !hotelInfo.longitude) {
      toast.error('Please enter and validate hotel address first');
      return false;
    }
    if (!customerInfo.latitude || !customerInfo.longitude) {
      toast.error('Please enter and validate delivery address first');
      return false;
    }
    if (items.length === 0) {
      toast.error('Please add at least one stock item');
      return false;
    }

    setLoading(true);
    try {
      const order: DeliveryOrder = {
        hotel_info: hotelInfo,
        customer_info: customerInfo,
        items: items,
        order_size: orderSize,
      };
      
      const response = await deliveryApi.calculateDetailedEstimate(order);
      if (response.success) {
        setEstimate(response.data);
        
        const breakdown = response.data.breakdown;
        toast.success(
          ` Distance: ${response.data.distance_km} km |  Est: ${response.data.estimated_minutes} min\n` +
          ` Processing: ${breakdown.order_processing} |  Travel: ${breakdown.travel_time}`
        );
        return true;
      } else {
        toast.error(response.message || 'Failed to calculate estimate');
        return false;
      }
    } catch (error) {
      toast.error('Failed to calculate estimate');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Final validation before submission
    if (!validateHotelInfo() || !validateCustomerInfo()) {
      toast.error('Please fix all validation errors before submitting');
      return;
    }
    
    if (!hotelInfo.latitude || !hotelInfo.longitude) {
      toast.error('Please validate hotel address by clicking the search button');
      return;
    }
    if (!customerInfo.latitude || !customerInfo.longitude) {
      toast.error('Please validate delivery address by clicking the search button');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one stock item');
      return;
    }

    setLoading(true);
    try {
      const order: DeliveryOrder = {
        hotel_info: hotelInfo,
        customer_info: customerInfo,
        items: items,
        order_size: orderSize,
        vehicle_type: selectedVehicle,
        total_weight_kg: totalWeight,
        total_value: totalValue,
      };
      
      const response = await deliveryApi.createDelivery(order);
      if (response.success) {
        toast.success('Delivery order created successfully!');
        navigate(`/track/${response.order_id}`);
      } else {
        toast.error(response.message || 'Failed to create delivery order');
      }
    } catch (error) {
      console.error('Create delivery error:', error);
      toast.error('Failed to create delivery order');
    } finally {
      setLoading(false);
    }
  };

  const formatEstimatedTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins > 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  const getTrafficIcon = (multiplier: number) => {
    if (multiplier >= 1.4) return '🔴 Heavy';
    if (multiplier >= 1.2) return '🟡 Moderate';
    return '🟢 Light';
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Card sx={{ bgcolor: '#FBF3D1', mb: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <RestaurantIcon color="primary" />
                    <Typography variant="h6">Hotel/Restaurant Information</Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Enter the hotel or restaurant details where the order is coming from
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Hotel ID"
                value={hotelInfo.hotel_id}
                onChange={(e) => setHotelInfo({ ...hotelInfo, hotel_id: e.target.value })}
                error={!!errors.hotel.hotel_id}
                helperText={errors.hotel.hotel_id}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Hotel Name"
                value={hotelInfo.hotel_name}
                onChange={(e) => setHotelInfo({ ...hotelInfo, hotel_name: e.target.value })}
                error={!!errors.hotel.hotel_name}
                helperText={errors.hotel.hotel_name}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Hotel CONO"
                value={hotelInfo.hotel_cono}
                onChange={(e) => setHotelInfo({ ...hotelInfo, hotel_cono: e.target.value.toUpperCase() })}
                error={!!errors.hotel.hotel_cono}
                helperText={errors.hotel.hotel_cono || "Format: 3-15 alphanumeric characters"}
                required
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Phone Number"
                value={hotelInfo.phone}
                onChange={(e) => setHotelInfo({ ...hotelInfo, phone: e.target.value })}
                error={!!errors.hotel.phone}
                helperText={errors.hotel.phone || "Format: 0712345678 or +94712345678"}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Hotel Address"
                value={hotelInfo.address}
                onChange={(e) => setHotelInfo({ ...hotelInfo, address: e.target.value })}
                error={!!errors.hotel.address}
                helperText={errors.hotel.address}
                required
                multiline
                rows={2}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Search and validate address">
                        <IconButton 
                          onClick={handleHotelAddressSearch}
                          disabled={searchingAddress || !hotelInfo.address}
                        >
                          <SearchIcon />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
              <Typography variant="caption" color="textSecondary">
                Enter the hotel address and click search to validate
              </Typography>
            </Grid>
            
            {hotelInfo.latitude && hotelInfo.longitude && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="success" icon={<LocationOnIcon />}>
                  Hotel location validated! Distance will be calculated from this address.
                  <br />
                  <strong>Coordinates:</strong> {hotelInfo.latitude.toFixed(6)}, {hotelInfo.longitude.toFixed(6)}
                </Alert>
              </Grid>
            )}
          </Grid>
        );
      
      case 1:
        return (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Card sx={{ bgcolor: '#7d1616', mb: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <LocationOnIcon color="warning" />
                    <Typography variant="h6">Delivery Address</Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    Enter the customer's delivery address. We'll calculate distance and estimated time from the hotel.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Customer Name"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                error={!!errors.customer.name}
                helperText={errors.customer.name}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Customer Phone"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                error={!!errors.customer.phone}
                helperText={errors.customer.phone || "Format: 0712345678 or +94712345678"}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Delivery Address"
                value={customerInfo.address}
                onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                error={!!errors.customer.address}
                helperText={errors.customer.address}
                required
                multiline
                rows={2}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Search and validate address">
                        <IconButton 
                          onClick={handleCustomerAddressSearch}
                          disabled={searchingAddress || !customerInfo.address}
                        >
                          <SearchIcon />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
              <Typography variant="caption" color="textSecondary">
                Enter the full delivery address and click the search icon to validate
              </Typography>
            </Grid>
            
            {customerInfo.latitude && customerInfo.longitude && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="success" icon={<LocationOnIcon />}>
                  Delivery address validated! Distance will be calculated from the hotel.
                  <br />
                  <strong>Coordinates:</strong> {customerInfo.latitude.toFixed(6)}, {customerInfo.longitude.toFixed(6)}
                </Alert>
              </Grid>
            )}
          </Grid>
        );
      
      case 2:
        return (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Card sx={{ bgcolor: '#FBF3D1', mb: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <InventoryIcon color="success" />
                    <Typography variant="h6">Stock Items</Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    Add the stock items that need to be delivered
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1">
                  Items ({items.length})
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setAddItemDialog(true)}
                  size="small"
                >
                  Add Item
                </Button>
              </Box>
              
              {items.length === 0 ? (
                <Alert severity="info">
                  No items added yet. Click "Add Item" to add stock items for delivery.
                </Alert>
              ) : (
                <Paper variant="outlined">
                  <List>
                    {items.map((item, index) => (
                      <ListItem
                        key={index}
                        secondaryAction={
                          <MuiIconButton edge="end" onClick={() => handleRemoveItem(index)}>
                            <DeleteIcon />
                          </MuiIconButton>
                        }
                      >
                        <ListItemText
                          primary={item.item_name}
                          secondary={
                            <>
                              ID: {item.item_id} | Qty: {item.quantity} | 
                              Weight: {item.weight_kg * item.quantity} kg | 
                              Value: {formatCurrency(item.unit_price * item.quantity)}
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
              
              <Box sx={{ mt: 2, p: 2, bgcolor: '#FBF3D1', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="textSecondary">
                      Total Weight
                    </Typography>
                    <Typography variant="h6">{totalWeight.toFixed(2)} kg</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="textSecondary">
                      Total Value
                    </Typography>
                    <Typography variant="h6">{formatCurrency(totalValue)}</Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        );
      
      case 3:
        return (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Order Size</InputLabel>
                <Select
                  value={orderSize}
                  onChange={(e) => setOrderSize(e.target.value as OrderSize)}
                  label="Order Size"
                >
                  <MenuItem value={OrderSize.SMALL}>Small (Up to 5kg)</MenuItem>
                  <MenuItem value={OrderSize.MEDIUM}>Medium (5-20kg)</MenuItem>
                  <MenuItem value={OrderSize.LARGE}>Large (20-100kg)</MenuItem>
                  <MenuItem value={OrderSize.EXTRA_LARGE}>Extra Large (100+ kg)</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="textSecondary">
                Auto-detected based on total weight: {totalWeight.toFixed(2)} kg
              </Typography>
            </Grid>
            
            <Grid size={{ xs: 12 }}>
              <VehicleSelector
                orderSize={orderSize}
                onVehicleSelect={setSelectedVehicle}
                selectedVehicle={selectedVehicle}
              />
            </Grid>

            {(!hotelInfo.latitude || !customerInfo.latitude) && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="warning">
                  Please ensure both hotel and delivery addresses are validated.
                </Alert>
              </Grid>
            )}

            {hotelInfo.latitude && customerInfo.latitude && !estimate && (
              <Grid size={{ xs: 12 }}>
                <Button
                  variant="contained"
                  onClick={calculateEstimate}
                  disabled={loading}
                  fullWidth
                  sx={{ bgcolor: '#FFCF71', color: '#1A2C3E' }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Calculate Delivery Estimate'}
                </Button>
              </Grid>
            )}

            {estimate && (
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 2, bgcolor: '#E8F5E9' }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    Delivery Estimate
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Typography variant="body2" color="textSecondary">Distance from Hotel</Typography>
                      <Typography variant="h6">{estimate.distance_km} km</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Typography variant="body2" color="textSecondary">Estimated Delivery Time</Typography>
                      <Typography variant="h6">{formatEstimatedTime(estimate.estimated_minutes)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Typography variant="body2" color="textSecondary">Recommended Vehicle</Typography>
                      <Chip 
                        label={estimate.recommended_vehicle?.toUpperCase()} 
                        color="primary"
                        size="small"
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                    Time Breakdown
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          <strong>Processing:</strong> {estimate.breakdown?.order_processing}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <BusinessIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          <strong>Warehouse:</strong> {estimate.breakdown?.warehouse_queue}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <SpeedIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          <strong>Travel:</strong> {estimate.breakdown?.travel_time}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                    Factors Affecting Delivery
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <TrafficIcon fontSize="small" color="warning" />
                        <Typography variant="body2">
                          Traffic: {getTrafficIcon(estimate.breakdown?.traffic_multiplier)} ({estimate.breakdown?.traffic_multiplier}x)
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <WbSunnyIcon fontSize="small" color="warning" />
                        <Typography variant="body2">
                          Weather: Clear ({estimate.breakdown?.weather_multiplier}x)
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Typography variant="body2">
                        {estimate.breakdown?.is_peak_hour && '🔴 Peak Hour Delivery'}
                        {estimate.breakdown?.is_weekend && '📅 Weekend Delivery'}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Typography variant="body2" color="primary" sx={{ mt: 2 }}>
                    Estimated arrival: {new Date(estimate.estimated_delivery_time).toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        );
      
      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Order Summary</Typography>
            
            <Paper sx={{ p: 2, mb: 2, bgcolor: '#E3F2FD' }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                <RestaurantIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Hotel/Restaurant (Pickup Point)
              </Typography>
              <Typography>ID: {hotelInfo.hotel_id}</Typography>
              <Typography>Name: {hotelInfo.hotel_name}</Typography>
              <Typography>CONO: {hotelInfo.hotel_cono}</Typography>
              <Typography>Phone: {hotelInfo.phone}</Typography>
              <Typography>Address: {hotelInfo.address}</Typography>
              <Typography variant="caption" color="textSecondary">
                Location: {hotelInfo.latitude?.toFixed(6)}, {hotelInfo.longitude?.toFixed(6)}
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, mb: 2, bgcolor: '#FFF9C4' }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                <LocationOnIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Delivery Address
              </Typography>
              <Typography>Name: {customerInfo.name}</Typography>
              <Typography>Phone: {customerInfo.phone}</Typography>
              <Typography>Address: {customerInfo.address}</Typography>
              <Typography variant="caption" color="textSecondary">
                Location: {customerInfo.latitude?.toFixed(6)}, {customerInfo.longitude?.toFixed(6)}
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                <InventoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Stock Items ({items.length})
              </Typography>
              {items.map((item, index) => (
                <Box key={index} sx={{ mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>{item.item_name}</strong> (ID: {item.item_id})
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Quantity: {item.quantity} | Weight: {item.weight_kg * item.quantity} kg | 
                    Unit Price: {formatCurrency(item.unit_price)} | Total: {formatCurrency(item.unit_price * item.quantity)}
                  </Typography>
                </Box>
              ))}
              <Box sx={{ mt: 2, p: 1, bgcolor: '#E8F5E9', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>Total Weight:</strong> {totalWeight.toFixed(2)} kg | 
                  <strong> Total Value:</strong> {formatCurrency(totalValue)}
                </Typography>
              </Box>
            </Paper>

            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Delivery Details
              </Typography>
              <Typography>Order Size: {orderSize.toUpperCase()}</Typography>
              <Typography>Vehicle: {selectedVehicle?.toUpperCase() || 'Auto-assigned'}</Typography>
              {estimate && (
                <>
                  <Typography sx={{ mt: 1 }}>
                    <strong>Distance from Hotel:</strong> {estimate.distance_km} km
                  </Typography>
                  <Typography>
                    <strong>Estimated Delivery Time:</strong> {formatEstimatedTime(estimate.estimated_minutes)}
                  </Typography>
                  <Typography>
                    <strong>Estimated Arrival:</strong> {new Date(estimate.estimated_delivery_time).toLocaleString()}
                  </Typography>
                  <Typography>
                    <strong>Recommended Vehicle:</strong> {estimate.recommended_vehicle?.toUpperCase()}
                  </Typography>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Typography variant="caption" display="block" color="textSecondary">
                    Breakdown: Processing ({estimate.breakdown?.order_processing}) + 
                    Warehouse ({estimate.breakdown?.warehouse_queue}) + 
                    Travel ({estimate.breakdown?.travel_time})
                  </Typography>
                  {estimate.breakdown?.is_peak_hour && (
                    <Typography variant="caption" display="block" color="warning.main">
                      ⚠️ Peak hour delivery - additional processing time
                    </Typography>
                  )}
                  {estimate.breakdown?.is_weekend && (
                    <Typography variant="caption" display="block" color="info.main">
                      📅 Weekend delivery - slight delay expected
                    </Typography>
                  )}
                </>
              )}
            </Paper>

            {(!hotelInfo.latitude || !customerInfo.latitude) && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Missing location data! Please ensure both hotel and delivery addresses are validated.
              </Alert>
            )}
          </Box>
        );
      
      default:
        return null;
    }
  };

  // Geocoding service function (moved outside or keep inside component)
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Create New Delivery Order
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Enter the hotel/restaurant details, customer delivery address, and stock items
        </Typography>

        <Stepper activeStep={activeStep} sx={{ my: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          {activeStep > 0 && (
            <Button onClick={handleBack} sx={{ mr: 1 }}>
              Back
            </Button>
          )}
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
              sx={{ bgcolor: '#FFCF71', color: '#1A2C3E' }}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={loading}
              sx={{ bgcolor: '#FFCF71', color: '#1A2C3E' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Create Order'}
            </Button>
          )}
        </Box>
      </Paper>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialog} onClose={() => setAddItemDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Stock Item</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Item ID"
                value={newItem.item_id}
                onChange={(e) => setNewItem({ ...newItem, item_id: e.target.value })}
                error={!!newItemErrors.item_id}
                helperText={newItemErrors.item_id}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Item Name"
                value={newItem.item_name}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                error={!!newItemErrors.item_name}
                helperText={newItemErrors.item_name}
                required
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                error={!!newItemErrors.quantity}
                helperText={newItemErrors.quantity}
                required
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Weight per Unit (kg)"
                type="number"
                value={newItem.weight_kg}
                onChange={(e) => setNewItem({ ...newItem, weight_kg: parseFloat(e.target.value) || 0 })}
                error={!!newItemErrors.weight_kg}
                helperText={newItemErrors.weight_kg}
                inputProps={{ min: 0, step: 0.1 }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Unit Price (LKR)"
                type="number"
                value={newItem.unit_price}
                onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                error={!!newItemErrors.unit_price}
                helperText={newItemErrors.unit_price || "Price in Sri Lankan Rupees (LKR)"}
                InputProps={{
                  startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                }}
                inputProps={{ min: 0, step: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddItemDialog(false)}>Cancel</Button>
          <Button onClick={handleAddItem} variant="contained" sx={{ bgcolor: '#FFCF71', color: '#1A2C3E' }}>
            Add Item
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CreateDelivery;