import React, { useState, useEffect, useRef } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Avatar,
  LinearProgress,
  Container,
  alpha,
  Stack,
  Skeleton,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SpeedIcon from '@mui/icons-material/Speed';
import RouteIcon from '@mui/icons-material/Route';
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TimelineIcon from '@mui/icons-material/Timeline';
import AddIcon from '@mui/icons-material/Add';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import { motion, useScroll, useTransform, useSpring, Variants } from 'framer-motion';
import { deliveryApi } from '../services/delivarylogistic';
import { DeliveryStatistics, DeliveryOrder } from '../types/delivery.types';
import deliveryBouy from '../components/delivery/delivaryassest/delivaryboy.png';

// Motion components
const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionCard = motion(Card);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState<DeliveryStatistics | null>(null);
  const [recentDeliveries, setRecentDeliveries] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Parallax effects
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -100]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const statsResponse = await deliveryApi.getDeliveryStatistics();
      if (statsResponse.success) {
        setStatistics(statsResponse.data);
      }

      const deliveriesResponse = await deliveryApi.getHotelDeliveries('demo_hotel_123');
      if (deliveriesResponse.success) {
        setRecentDeliveries(deliveriesResponse.data.slice(0, 5));
      }
    } catch (err) {
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Navigation handlers
  const handleCreateDelivery = () => {
    navigate('/delivery/create');
  };

  const handleTrackDelivery = () => {
    navigate('/delivery/track');
  };

  const handleAllDeliveries = () => {
    navigate('/delivery/orders');
  };

  const handleAnalytics = () => {
    navigate('/delivery/analytics');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'success';
      case 'in_transit': return 'info';
      case 'assigned': return 'warning';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircleIcon sx={{ fontSize: 16 }} />;
      case 'in_transit': return <LocalShippingIcon sx={{ fontSize: 16 }} />;
      case 'assigned': return <PendingIcon sx={{ fontSize: 16 }} />;
      default: return <PendingIcon sx={{ fontSize: 16 }} />;
    }
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={400} animation="wave" />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((i) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                <Skeleton variant="rounded" height={180} animation="wave" />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const totalDeliveries = statistics?.total_deliveries || 0;
  const completed = statistics?.status_breakdown?.delivered || 0;
  const inProgress = (statistics?.status_breakdown?.assigned || 0) +
    (statistics?.status_breakdown?.picked_up || 0) +
    (statistics?.status_breakdown?.in_transit || 0);
  const pending = statistics?.status_breakdown?.pending || 0;
  const completionRate = totalDeliveries > 0 ? (completed / totalDeliveries) * 100 : 0;

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 },
    },
  };

  return (
    <Box>
      {/* Progress Bar */}
      <motion.div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: '#7d1616',
          transformOrigin: '0%',
          scaleX: scaleX,
          zIndex: 1000,
        }}
      />

      {/* Hero Section with Parallax */}
      <Box
        ref={heroRef}
        sx={{
          position: 'relative',
          height: '70vh',
          minHeight: 500,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #dde0e3 0%, rgb(18, 19, 20) 100%)',
          borderRadius: '0 0 50px 50px',
          mb: 4,
        }}
      >
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url(https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.2,
            y: y1,
          }}
        />
        
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(255,207,113,0.1) 0%, transparent 50%)',
            y: y2,
          }}
        />

        <Container maxWidth="xl" sx={{ height: '100%', position: 'relative', zIndex: 2 }}>
          <Grid container spacing={4} alignItems="center" sx={{ height: '100%' }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, type: 'spring' }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    color: '#7d1616',
                    letterSpacing: 2,
                    fontWeight: 600,
                    mb: 2,
                    display: 'block',
                  }}
                >
                  SWIFT DELIVERY SOLUTIONS
                </Typography>
                <Typography
                  variant="h1"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '2.5rem', md: '4rem', lg: '5rem' },
                    color: 'white',
                    mb: 2,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  Deliver Fast,
                  <br />
                  <Box component="span" sx={{ color: '#7d1616' }}>
                    Deliver Smart
                  </Box>
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: alpha('#fff', 0.8),
                    mb: 4,
                    maxWidth: 600,
                  }}
                >
                  Real-time tracking, intelligent vehicle assignment, and seamless logistics management for hotels and restaurants.
                </Typography>
                
                {/* Added Navigation Buttons Row */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateDelivery}
                    sx={{
                      bgcolor: '#7d1616',
                      color: '#eff2f4',
                      px: 2.5,
                      py: 1,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: '#7d1616',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Create Delivery
                  </Button>
                  {/* <Button
                    variant="outlined"
                    startIcon={<TrackChangesIcon />}
                    onClick={handleTrackDelivery}
                    sx={{
                      borderColor: '#7d1616',
                      color: '#7d1616',
                      px: 2.5,
                      py: 1,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: '#7d1616',
                        backgroundColor: alpha('#7d1616', 0.1),
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Track Delivery
                  </Button> */}
                  <Button
                    variant="outlined"
                    startIcon={<ListAltIcon />}
                    onClick={handleAllDeliveries}
                    sx={{
                      borderColor: '#7d1616',
                      color: '#7d1616',
                      px: 2.5,
                      py: 1,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: '#7d1616',
                        backgroundColor: alpha('#7d1616', 0.1),
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    All Deliveries
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<AnalyticsIcon />}
                    onClick={handleAnalytics}
                    sx={{
                      borderColor: '#7d1616',
                      color: '#7d1616',
                      px: 2.5,
                      py: 1,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: '#7d1616',
                        backgroundColor: alpha('#7d1616', 0.1),
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Analytics
                  </Button>
                </Stack>

               
              </motion.div>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, type: 'spring', delay: 0.2 }}
              >
                <Box
                  component="img"
                  src={deliveryBouy}
                  alt="Delivery"
                  sx={{
                    width: '100%',
                    maxWidth: 400,
                    filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.3))',
                    animation: 'float 3s ease-in-out infinite',
                    '@keyframes float': {
                      '0%, 100%': { transform: 'translateY(0px)' },
                      '50%': { transform: 'translateY(-20px)' },
                    },
                  }}
                />
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Container maxWidth="xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MotionCard
                variants={itemVariants}
                whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                transition={{ duration: 0.3 }}
                sx={{
                  position: 'relative',
                  overflow: 'visible',
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Total Deliveries
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                        {totalDeliveries}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        All time orders
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: '#7d1616', width: 56, height: 56 }}>
                      <LocalShippingIcon sx={{ color: '#f3f7fb', fontSize: 32 }} />
                    </Avatar>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={100}
                    sx={{ mt: 2, height: 8, borderRadius: 4, bgcolor: '#E5E9F0' }}
                  />
                </CardContent>
              </MotionCard>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MotionCard
                variants={itemVariants}
                whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                transition={{ duration: 0.3 }}
                sx={{ borderRadius: 4 }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Completed
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: '#4CAF50' }}>
                        {completed}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Successfully delivered
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: '#E8F5E9', width: 56, height: 56 }}>
                      <CheckCircleIcon sx={{ color: '#4CAF50', fontSize: 32 }} />
                    </Avatar>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={completionRate}
                    sx={{ mt: 2, height: 8, borderRadius: 4, bgcolor: '#E5E9F0' }}
                  />
                </CardContent>
              </MotionCard>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MotionCard
                variants={itemVariants}
                whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                transition={{ duration: 0.3 }}
                sx={{ borderRadius: 4 }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        In Progress
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: '#FF9800' }}>
                        {inProgress}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active deliveries
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: '#FFF3E0', width: 56, height: 56 }}>
                      <TrendingUpIcon sx={{ color: '#FF9800', fontSize: 32 }} />
                    </Avatar>
                  </Box>
                </CardContent>
              </MotionCard>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MotionCard
                variants={itemVariants}
                whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                transition={{ duration: 0.3 }}
                sx={{ borderRadius: 4 }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Pending
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: '#2196F3' }}>
                        {pending}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Awaiting assignment
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: '#E3F2FD', width: 56, height: 56 }}>
                      <PendingIcon sx={{ color: '#2196F3', fontSize: 32 }} />
                    </Avatar>
                  </Box>
                </CardContent>
              </MotionCard>
            </Grid>
          </Grid>

          {/* Main Content Grid */}
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 7 }}>
              <MotionPaper
                variants={itemVariants}
                sx={{ p: 3, borderRadius: 4 }}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Recent Deliveries
                  </Typography>
                  <Button
                    component={Link}
                    to="/deliveries"
                    endIcon={<ArrowForwardIcon />}
                    sx={{ color: '#FFCF71' }}
                  >
                    View All
                  </Button>
                </Box>
                <List>
                  {recentDeliveries.length === 0 ? (
                    <Box textAlign="center" py={4}>
                      <LocalShippingIcon sx={{ fontSize: 48, color: '#E5E9F0', mb: 2 }} />
                      <Typography color="text.secondary">No deliveries yet</Typography>
                      <Button
                        component={Link}
                        to="/create"
                        variant="contained"
                        sx={{ mt: 2, bgcolor: '#7d1616', color: '#f1f3f6' }}
                      >
                        Create First Order
                      </Button>
                    </Box>
                  ) : (
                    recentDeliveries.map((delivery, index) => (
                      <React.Fragment key={delivery.order_id}>
                        <ListItem sx={{ px: 0, py: 2 }}>
                          <ListItemText
                            primary={
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {delivery.order_id}
                                </Typography>
                                <Chip
                                  icon={getStatusIcon(delivery.status || '')}
                                  label={delivery.status?.replace('_', ' ').toUpperCase()}
                                  size="small"
                                  color={getStatusColor(delivery.status || '') as any}
                                  sx={{ borderRadius: 2 }}
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Customer:</strong> {delivery.customer_info.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Hotel:</strong> {delivery.hotel_info.hotel_name}
                                </Typography>
                                {delivery.distance_km && (
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>Distance:</strong> {delivery.distance_km.toFixed(2)} km
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                          <Button
                            component={Link}
                            to={`/track/${delivery.order_id}`}
                            variant="outlined"
                            size="small"
                            sx={{ borderRadius: 2, borderColor: '#7d1616', color: '#7d1616' }}
                          >
                            Track
                          </Button>
                        </ListItem>
                        {index < recentDeliveries.length - 1 && <Divider />}
                      </React.Fragment>
                    ))
                  )}
                </List>
              </MotionPaper>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={3}>
                <MotionPaper
                  variants={itemVariants}
                  sx={{ p: 3, borderRadius: 4 }}
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.3 }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Performance Metrics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar sx={{ bgcolor: '#7d1616', width: 48, height: 48 }}>
                          <SpeedIcon sx={{ color: '#ecf0f4' }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Average Delivery Time
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 700 }}>
                            {statistics?.average_delivery_time_minutes?.toFixed(0) || 0}{' '}
                            <Typography component="span" variant="body2">minutes</Typography>
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: '#7d1616', width: 48, height: 48 }}>
                          <RouteIcon sx={{ color: '#f7f9fc' }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Total Distance Covered
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 700 }}>
                            {statistics?.total_distance_km?.toFixed(1) || 0}{' '}
                            <Typography component="span" variant="body2">km</Typography>
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </MotionPaper>

                <MotionPaper
                  variants={itemVariants}
                  sx={{ p: 3, borderRadius: 4 }}
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.3 }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Status Breakdown
                  </Typography>
                  {statistics?.status_breakdown && Object.entries(statistics.status_breakdown).map(([status, count]) => (
                    <Box key={status} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">
                          {status.replace('_', ' ').toUpperCase()}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {count}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(count / totalDeliveries) * 100}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: '#E5E9F0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: status === 'delivered' ? '#4CAF50' : '#7d1616',
                            borderRadius: 4,
                          },
                        }}
                      />
                    </Box>
                  ))}
                </MotionPaper>
              </Stack>
            </Grid>
          </Grid>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Box sx={{ mt: 6, py: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
                Why Choose SwiftDeliver?
              </Typography>
              <Grid container spacing={4}>
                {[
                  { icon: <DeliveryDiningIcon sx={{ fontSize: 48 }} />, title: 'Real-time Tracking', desc: 'Track your delivery in real-time with live location updates' },
                  { icon: <SpeedIcon sx={{ fontSize: 48 }} />, title: 'Fast Delivery', desc: 'Optimized routes for quick and efficient deliveries' },
                  { icon: <TimelineIcon sx={{ fontSize: 48 }} />, title: 'Smart Analytics', desc: 'Detailed insights and performance metrics' },
                  { icon: <RestaurantIcon sx={{ fontSize: 48 }} />, title: 'Hotel Integration', desc: 'Seamless integration with hotel management systems' },
                ].map((feature, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Paper
                        sx={{
                          p: 3,
                          textAlign: 'center',
                          borderRadius: 4,
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          '&:hover': {
                            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                          },
                        }}
                      >
                        <Box sx={{ color: '#7d1616', mb: 2 }}>{feature.icon}</Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          {feature.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {feature.desc}
                        </Typography>
                      </Paper>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </motion.div>
        </motion.div>
      </Container>
    </Box>
  );
};

export default Dashboard;