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
  IconButton,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Avatar,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { deliveryApi } from '../../services/delivarylogistic';
import { DeliveryOrder, DeliveryStatus, OrderSize } from '../../types/delivery.types';

const DeliveryList: React.FC = () => {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchAllDeliveries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, sizeFilter, deliveries]);

  const fetchAllDeliveries = async () => {
  setLoading(true);
  setError(null);
  try {
    // Use the new all-deliveries endpoint
    const response = await deliveryApi.getAllDeliveries();
    if (response.success) {
      setDeliveries(response.data);
      setFilteredDeliveries(response.data);
    } else {
      setError(response.message || 'Failed to fetch deliveries');
    }
  } catch (err) {
    console.error('Error fetching deliveries:', err);
    setError('Failed to fetch deliveries. Please check your connection.');
  } finally {
    setLoading(false);
  }
};

  const applyFilters = () => {
    let filtered = [...deliveries];

    if (searchTerm) {
      filtered = filtered.filter(
        (delivery) =>
          delivery.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          delivery.customer_info.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          delivery.customer_info.phone.includes(searchTerm) ||
          delivery.hotel_info.hotel_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((delivery) => delivery.status === statusFilter);
    }

    if (sizeFilter !== 'all') {
      filtered = filtered.filter((delivery) => delivery.order_size === sizeFilter);
    }

    setFilteredDeliveries(filtered);
    setPage(0);
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

  const getSizeChip = (size?: OrderSize) => {
    const colors = {
      [OrderSize.SMALL]: '#4CAF50',
      [OrderSize.MEDIUM]: '#2196F3',
      [OrderSize.LARGE]: '#FF9800',
      [OrderSize.EXTRA_LARGE]: '#F44336',
    };
    return (
      <Chip
        label={size?.toUpperCase()}
        size="small"
        sx={{
          bgcolor: colors[size || OrderSize.SMALL],
          color: 'white',
          fontWeight: 500,
        }}
      />
    );
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

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          All Deliveries
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and track all delivery orders
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <LocalShippingIcon sx={{ color: '#FFCF71', fontSize: 32, mb: 1 }} />
              <Typography variant="h5" fontWeight="bold">
                {deliveries.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {deliveries.filter(d => d.status === DeliveryStatus.DELIVERED).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Delivered
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h5" fontWeight="bold" color="warning.main">
                {deliveries.filter(d => d.status === DeliveryStatus.IN_TRANSIT || d.status === DeliveryStatus.PICKED_UP).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In Transit
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h5" fontWeight="bold" color="info.main">
                {deliveries.filter(d => d.status === DeliveryStatus.PENDING).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search by Order ID, Customer, Hotel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                {Object.values(DeliveryStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.replace('_', ' ').toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Order Size</InputLabel>
              <Select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                label="Order Size"
              >
                <MenuItem value="all">All Sizes</MenuItem>
                {Object.values(OrderSize).map((size) => (
                  <MenuItem key={size} value={size}>
                    {size.toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 1 }}>
            <IconButton onClick={applyFilters} sx={{ bgcolor: '#FFCF71', '&:hover': { bgcolor: '#E5B85E' } }}>
              <FilterListIcon />
            </IconButton>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8F9FA' }}>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Hotel</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Vehicle</TableCell>
              <TableCell>Distance</TableCell>
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
                      No deliveries found
                    </Typography>
                    <Button
                      component="a"
                      href="/create"
                      variant="contained"
                      sx={{ mt: 2, bgcolor: '#FFCF71', color: '#1A2C3E' }}
                    >
                      Create First Order
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredDeliveries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((delivery) => (
                <TableRow key={delivery.order_id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {delivery.order_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{delivery.hotel_info.hotel_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {delivery.hotel_info.hotel_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{delivery.customer_info.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {delivery.customer_info.phone}
                    </Typography>
                  </TableCell>
                  <TableCell>{getSizeChip(delivery.order_size)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {delivery.vehicle_type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {delivery.distance_km?.toFixed(1)} km
                    </Typography>
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
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredDeliveries.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>
    </Box>
  );
};

export default DeliveryList;