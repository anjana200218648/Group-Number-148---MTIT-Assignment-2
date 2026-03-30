import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Box,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Avatar,
  Grid,
  Card,
  CardContent,
  IconButton,
  Breadcrumbs,
  Link,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import { deliveryApi } from '../services/delivarylogistic';
import { DeliveryOrder, DeliveryStatus } from '../types/delivery.types';

const HotelDeliveries: React.FC = () => {
  const { hotelId } = useParams<{ hotelId: string }>();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<DeliveryOrder[]>([]);
  const [hotelInfo, setHotelInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (hotelId) {
      fetchHotelDeliveries();
    }
  }, [hotelId]);

  useEffect(() => {
    filterDeliveries();
  }, [searchTerm, deliveries]);

  const fetchHotelDeliveries = async () => {
    try {
      const response = await deliveryApi.getHotelDeliveries(hotelId!);
      if (response.success) {
        setDeliveries(response.data);
        setFilteredDeliveries(response.data);
        if (response.data.length > 0) {
          setHotelInfo(response.data[0].hotel_info);
        }
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('Failed to fetch hotel deliveries');
    } finally {
      setLoading(false);
    }
  };

  const filterDeliveries = () => {
    if (!searchTerm) {
      setFilteredDeliveries(deliveries);
    } else {
      const filtered = deliveries.filter(
        (delivery) =>
          delivery.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          delivery.customer_info.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          delivery.customer_info.phone.includes(searchTerm)
      );
      setFilteredDeliveries(filtered);
    }
  };

  const getStatusColor = (status?: DeliveryStatus) => {
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: '#FFCF71' }} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const totalOrders = deliveries.length;
  const completedOrders = deliveries.filter(d => d.status === DeliveryStatus.DELIVERED).length;
  const activeOrders = deliveries.filter(d => d.status !== DeliveryStatus.DELIVERED && d.status !== DeliveryStatus.CANCELLED).length;

  return (
    <Box>
      {/* Header with Back Button */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'text.secondary' }}
            onClick={() => navigate('/')}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          <Typography color="text.primary">Hotel Deliveries</Typography>
        </Breadcrumbs>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ color: '#FFCF71' }}
        >
          Back to Dashboard
        </Button>
      </Box>

      {/* Hotel Info Card */}
      {hotelInfo && (
        <Card sx={{ mb: 4, bgcolor: '#1A2C3E', color: 'white' }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#FFCF71', width: 56, height: 56 }}>
                    <LocalShippingIcon sx={{ color: '#1A2C3E', fontSize: 32 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {hotelInfo.hotel_name}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      ID: {hotelInfo.hotel_id} • CONO: {hotelInfo.hotel_cono}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOnIcon sx={{ fontSize: 18, opacity: 0.8 }} />
                  <Typography variant="body2">{hotelInfo.address}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <PhoneIcon sx={{ fontSize: 18, opacity: 0.8 }} />
                  <Typography variant="body2">{hotelInfo.phone}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: '#FFCF71' }}>
                    {totalOrders}
                  </Typography>
                  <Typography variant="body2">Total Orders</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {completedOrders}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" fontWeight="bold" color="warning.main">
                {activeOrders}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" fontWeight="bold" color="info.main">
                {totalOrders - completedOrders - activeOrders}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Other
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by Order ID, Customer Name, or Phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Orders Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8F9FA' }}>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Order Size</TableCell>
              <TableCell>Vehicle</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDeliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Box py={4}>
                    <LocalShippingIcon sx={{ fontSize: 48, color: '#E5E9F0', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      No deliveries found for this hotel
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredDeliveries.map((delivery) => (
                <TableRow key={delivery.order_id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {delivery.order_id}
                    </Typography>
                  </TableCell>
                  <TableCell>{delivery.customer_info.name}</TableCell>
                  <TableCell>{delivery.customer_info.phone}</TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {delivery.customer_info.address}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={delivery.order_size?.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: delivery.order_size === 'small' ? '#4CAF50' : 
                                 delivery.order_size === 'medium' ? '#2196F3' :
                                 delivery.order_size === 'large' ? '#FF9800' : '#F44336',
                        color: 'white',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>
                    {delivery.vehicle_type}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={delivery.status?.replace('_', ' ').toUpperCase()}
                      color={getStatusColor(delivery.status)}
                      size="small"
                      sx={{ borderRadius: 2 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/track/${delivery.order_id}`)}
                      sx={{ color: '#FFCF71' }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default HotelDeliveries;