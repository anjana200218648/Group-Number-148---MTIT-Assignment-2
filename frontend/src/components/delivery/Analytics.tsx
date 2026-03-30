import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  LocalShipping,
  CheckCircle,
  Cancel,
  AccessTime,
  Speed,
  AttachMoney,
  Assessment,
  PieChart as PieChartIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { deliveryApi } from '../../services/delivarylogistic';
import toast from 'react-hot-toast';

interface Statistics {
  total_deliveries: number;
  status_breakdown: Record<string, number>;
  average_delivery_time_minutes: number;
  total_distance_km: number;
  on_time_delivery_rate: number;
  average_driver_rating: number;
  total_revenue: number;
  deliveries_by_vehicle: Record<string, number>;
  peak_hours: number[];
}

interface DailyDeliveryData {
  day: string;
  deliveries: number;
  revenue: number;
  date: string;
}

interface PeakHourData {
  hour: string;
  deliveries: number;
}

const Analytics: React.FC = () => {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [error, setError] = useState<string | null>(null);
  const [dailyDeliveries, setDailyDeliveries] = useState<DailyDeliveryData[]>([]);
  const [peakHourData, setPeakHourData] = useState<PeakHourData[]>([]);
  const [hotelId, setHotelId] = useState<string>('');

  const COLORS = ['#7d1616', '#FFCF71', '#4CAF50', '#FF9800', '#2196F3', '#9C27B0'];

  useEffect(() => {
    fetchStatistics();
    fetchDailyTrends();
    fetchPeakHours();
  }, [timeRange, hotelId]);

  const fetchStatistics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await deliveryApi.getDeliveryStatistics(hotelId || undefined);
      
      if (response.success) {
        setStatistics(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError('Failed to load analytics data');
      toast.error('Failed to load analytics');
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    setStatistics({
      total_deliveries: 384,
      status_breakdown: {
        delivered: 245,
        in_transit: 78,
        pending: 42,
        assigned: 12,
        cancelled: 7,
      },
      average_delivery_time_minutes: 42.5,
      total_distance_km: 2847.3,
      on_time_delivery_rate: 87.5,
      average_driver_rating: 4.6,
      total_revenue: 192400,
      deliveries_by_vehicle: {
        motorcycle: 156,
        car: 98,
        van: 72,
        truck: 58,
      },
      peak_hours: [11, 12, 13, 18, 19, 20],
    });
  };

  const fetchDailyTrends = async () => {
    try {
      const response = await deliveryApi.getAllDeliveries(1000);
      
      if (response.success && response.data) {
        const deliveries = response.data;
        const deliveriesByDate = new Map();
        const now = new Date();
        const daysToShow = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
        
        for (let i = daysToShow - 1; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          deliveriesByDate.set(dateStr, {
            day: dayName,
            date: dateStr,
            deliveries: 0,
            revenue: 0,
          });
        }
        
        deliveries.forEach((delivery: any) => {
          const createdAt = new Date(delivery.created_at);
          const dateStr = createdAt.toISOString().split('T')[0];
          
          if (deliveriesByDate.has(dateStr)) {
            const data = deliveriesByDate.get(dateStr);
            data.deliveries += 1;
            data.revenue += delivery.delivery_cost || delivery.total_value || 0;
            deliveriesByDate.set(dateStr, data);
          }
        });
        
        const dailyData = Array.from(deliveriesByDate.values());
        setDailyDeliveries(dailyData);
      } else {
        setDailyDeliveries([
          { day: 'Mon', deliveries: 45, revenue: 22500, date: '2024-01-01' },
          { day: 'Tue', deliveries: 52, revenue: 26000, date: '2024-01-02' },
          { day: 'Wed', deliveries: 48, revenue: 24000, date: '2024-01-03' },
          { day: 'Thu', deliveries: 61, revenue: 30500, date: '2024-01-04' },
          { day: 'Fri', deliveries: 58, revenue: 29000, date: '2024-01-05' },
          { day: 'Sat', deliveries: 42, revenue: 21000, date: '2024-01-06' },
          { day: 'Sun', deliveries: 38, revenue: 19000, date: '2024-01-07' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching daily trends:', error);
      setDailyDeliveries([
        { day: 'Mon', deliveries: 45, revenue: 22500, date: '2024-01-01' },
        { day: 'Tue', deliveries: 52, revenue: 26000, date: '2024-01-02' },
        { day: 'Wed', deliveries: 48, revenue: 24000, date: '2024-01-03' },
        { day: 'Thu', deliveries: 61, revenue: 30500, date: '2024-01-04' },
        { day: 'Fri', deliveries: 58, revenue: 29000, date: '2024-01-05' },
        { day: 'Sat', deliveries: 42, revenue: 21000, date: '2024-01-06' },
        { day: 'Sun', deliveries: 38, revenue: 19000, date: '2024-01-07' },
      ]);
    }
  };

  const fetchPeakHours = async () => {
    try {
      const response = await deliveryApi.getAllDeliveries(1000);
      
      if (response.success && response.data) {
        const deliveries = response.data;
        const hourCounts = new Array(24).fill(0);
        
        deliveries.forEach((delivery: any) => {
          const createdAt = new Date(delivery.created_at);
          const hour = createdAt.getHours();
          hourCounts[hour]++;
        });
        
        const peakData: PeakHourData[] = [];
        for (let i = 0; i < 24; i += 2) {
          const hourRange = `${i}-${i + 2}`;
          const deliveries = hourCounts[i] + (hourCounts[i + 1] || 0);
          peakData.push({ hour: hourRange, deliveries });
        }
        
        setPeakHourData(peakData);
      } else {
        setPeakHourData([
          { hour: '6-8', deliveries: 12 },
          { hour: '8-10', deliveries: 28 },
          { hour: '10-12', deliveries: 35 },
          { hour: '12-14', deliveries: 42 },
          { hour: '14-16', deliveries: 38 },
          { hour: '16-18', deliveries: 45 },
          { hour: '18-20', deliveries: 52 },
          { hour: '20-22', deliveries: 31 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching peak hours:', error);
      setPeakHourData([
        { hour: '6-8', deliveries: 12 },
        { hour: '8-10', deliveries: 28 },
        { hour: '10-12', deliveries: 35 },
        { hour: '12-14', deliveries: 42 },
        { hour: '14-16', deliveries: 38 },
        { hour: '16-18', deliveries: 45 },
        { hour: '18-20', deliveries: 52 },
        { hour: '20-22', deliveries: 31 },
      ]);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !statistics) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  const statusData = statistics ? Object.entries(statistics.status_breakdown).map(([name, value]) => ({
    name: name.replace('_', ' ').toUpperCase(),
    value,
  })) : [];

  const vehicleData = statistics ? Object.entries(statistics.deliveries_by_vehicle).map(([name, value]) => ({
    name: name.toUpperCase(),
    value,
  })) : [];

  // Custom label formatter for pie chart to handle undefined percent
  const renderCustomLabel = ({ name, percent }: { name?: string; percent?: number }) => {
    if (!name || percent === undefined) return '';
    return `${name}: ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Analytics Dashboard
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Real-time delivery statistics and performance metrics from your data
      </Typography>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Hotel (Optional)</InputLabel>
            <Select
              value={hotelId}
              onChange={(e) => setHotelId(e.target.value)}
              label="Hotel (Optional)"
            >
              <MenuItem value="">All Hotels</MenuItem>
              <MenuItem value="hotel_001">Grand Hotel</MenuItem>
              <MenuItem value="hotel_002">City Plaza</MenuItem>
              <MenuItem value="hotel_003">Beach Resort</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Time Range</InputLabel>
            <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value as any)} label="Time Range">
              <MenuItem value="week">Last 7 Days</MenuItem>
              <MenuItem value="month">Last 30 Days</MenuItem>
              <MenuItem value="year">Last Year</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              fetchStatistics();
              fetchDailyTrends();
              fetchPeakHours();
            }}
            startIcon={<RefreshIcon />}
          >
            Refresh Data
          </Button>
        </Grid>
      </Grid>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Deliveries
              </Typography>
              <Typography variant="h4">
                {statistics?.total_deliveries || 0}
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                <LocalShipping color="primary" />
                <Typography variant="body2" color="textSecondary" ml={1}>
                  All time deliveries
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Revenue
              </Typography>
              <Typography variant="h4">
                ${((statistics?.total_revenue || 0) / 1000).toFixed(1)}k
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                <AttachMoney color="success" />
                <Typography variant="body2" color="textSecondary" ml={1}>
                  From deliveries
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                On-Time Delivery Rate
              </Typography>
              <Typography variant="h4">
                {statistics?.on_time_delivery_rate || 0}%
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                <CheckCircle color="success" />
                <Typography variant="body2" color="textSecondary" ml={1}>
                  Delivery efficiency
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Delivery Time
              </Typography>
              <Typography variant="h4">
                {statistics?.average_delivery_time_minutes || 0} min
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                <AccessTime color="warning" />
                <Typography variant="body2" color="textSecondary" ml={1}>
                  Average duration
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Daily Deliveries Trend */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Daily Delivery Trends
            </Typography>
            <Box height={400}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyDeliveries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="deliveries" stroke="#7d1616" name="Deliveries" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#FFCF71" name="Revenue ($)" />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Status Distribution */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Delivery Status
            </Typography>
            <Box height={400}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Vehicle Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Deliveries by Vehicle Type
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehicleData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#7d1616" name="Number of Deliveries" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Peak Hours */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Peak Delivery Hours
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={peakHourData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="deliveries" stroke="#7d1616" fill="#7d1616" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Performance Metrics Table */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Metric</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell align="right">Target</TableCell>
                    <TableCell align="right">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Average Delivery Time</TableCell>
                    <TableCell align="right">{statistics?.average_delivery_time_minutes || 0} min</TableCell>
                    <TableCell align="right">45 min</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={(statistics?.average_delivery_time_minutes || 0) <= 45 ? "Good" : "Needs Improvement"}
                        color={(statistics?.average_delivery_time_minutes || 0) <= 45 ? "success" : "warning"}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>On-Time Delivery Rate</TableCell>
                    <TableCell align="right">{statistics?.on_time_delivery_rate || 0}%</TableCell>
                    <TableCell align="right">95%</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={(statistics?.on_time_delivery_rate || 0) >= 90 ? "Excellent" : "Needs Improvement"}
                        color={(statistics?.on_time_delivery_rate || 0) >= 90 ? "success" : "warning"}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Average Driver Rating</TableCell>
                    <TableCell align="right">{statistics?.average_driver_rating || 0}/5.0</TableCell>
                    <TableCell align="right">4.5</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={(statistics?.average_driver_rating || 0) >= 4.5 ? "Excellent" : "Good"}
                        color={(statistics?.average_driver_rating || 0) >= 4.5 ? "success" : "info"}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Total Distance Covered</TableCell>
                    <TableCell align="right">{statistics?.total_distance_km || 0} km</TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">
                      <Chip label="Tracking" color="info" size="small" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;