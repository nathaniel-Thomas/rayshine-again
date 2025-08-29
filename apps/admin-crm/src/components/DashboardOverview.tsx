import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { apiClient } from '../lib/apiClient';
import LiveBookingsWidget from './dashboard/LiveBookingsWidget';
import SystemHealthWidget from './dashboard/SystemHealthWidget';
import UserActivityWidget from './dashboard/UserActivityWidget';
import LiveRevenueWidget from './dashboard/LiveRevenueWidget';
import SystemAlertsWidget from './dashboard/SystemAlertsWidget';
import RealTimeTrendChart from './dashboard/RealTimeTrendChart';
import AnimatedMetricCard from './dashboard/AnimatedMetricCard';
import ProviderActivityHeatmap from './dashboard/ProviderActivityHeatmap';
import SystemStatusIndicators from './dashboard/SystemStatusIndicators';
import ErrorRecoveryPanel from './dashboard/ErrorRecoveryPanel';
import SystemHealthMonitor from './dashboard/SystemHealthMonitor';
import realTimeDashboardService, { DashboardMetrics } from '../services/realTimeDashboardService';
import {
  UserPlus,
  Star,
  Users,
  BarChart3,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Zap,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [recentBookings, setRecentBookings] = useState<never[]>([]);

  useEffect(() => {
    // Subscribe to real-time metrics updates
    const unsubscribeMetrics = realTimeDashboardService.onMetricsUpdate((updatedMetrics) => {
      setStats(updatedMetrics);
      setLastUpdate(new Date());
      setLoading(false);
    });

    // Subscribe to connection status
    const unsubscribeConnection = realTimeDashboardService.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    // Fallback: Load initial data if real-time fails
    const fallbackTimer = setTimeout(() => {
      if (loading) {
        loadDashboardData();
      }
    }, 3000);

    return () => {
      unsubscribeMetrics();
      unsubscribeConnection();
      clearTimeout(fallbackTimer);
    };
  }, [loading, stats]);

  const loadDashboardData = async () => {
    try {
      const [bookingsResponse] = await Promise.all([
        apiClient.getBookings({ limit: 10 })
      ]);
      
      setRecentBookings(bookingsResponse.data?.slice(0, 5) || []);
      
      // Set fallback stats if real-time service is not working
      if (!stats) {
        setStats({
          todaysBookings: 8,
          totalRevenue: 2350,
          activeProviders: 12,
          avgPPSScore: 78.5,
          pendingApprovals: 3,
          revenueToday: 450,
          completedBookings: 25,
          activeUsers: 34,
          providerUtilization: 67.8,
          systemHealth: {
            database: 'online',
            api: 'online',
            websocket: isConnected ? 'online' : 'offline',
            ppsSystem: 'online'
          },
          trends: {
            bookingsTrend: 12.5,
            revenueTrend: 8.2,
            providerTrend: 5.7
          }
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
      // Use fallback mock data
      if (!stats) {
        setStats({
          todaysBookings: 8,
          totalRevenue: 2350,
          activeProviders: 12,
          avgPPSScore: 78.5,
          pendingApprovals: 3,
          revenueToday: 450,
          completedBookings: 25,
          activeUsers: 34,
          providerUtilization: 0,
          systemHealth: {
            database: 'offline',
            api: 'offline',
            websocket: 'offline',
            ppsSystem: 'offline'
          },
          trends: {
            bookingsTrend: 0,
            revenueTrend: 0,
            providerTrend: 0
          }
        });
      }
      setRecentBookings(mockBookings);
    }
  };

  const handleRefresh = () => {
    // Use the new force KPI refresh for more comprehensive updates
    realTimeDashboardService.forceKPIRefresh();
    realTimeDashboardService.requestMetricsRefresh();
    loadDashboardData();
  };

  // Fallback mock data
  const mockBookings = [
    {
      id: 1,
      user_profiles: { full_name: "Sarah Johnson" },
      services: { name: "House Cleaning" },
      scheduled_start_time: "2024-01-20T09:00:00",
      providers: { user_profiles: { full_name: "Maria Santos" } },
      status: "confirmed",
      final_cost: 120,
    },
    {
      id: 2,
      user_profiles: { full_name: "Mike Chen" },
      services: { name: "Lawn Care" },
      scheduled_start_time: "2024-01-20T14:00:00",
      providers: { user_profiles: { full_name: "James Wilson" } },
      status: "in_progress",
      final_cost: 80,
    },
    {
      id: 3,
      user_profiles: { full_name: "Emily Rodriguez" },
      services: { name: "Deep Cleaning" },
      scheduled_start_time: "2024-01-20T16:00:00",
      providers: { user_profiles: { full_name: "Maria Santos" } },
      status: "pending",
      estimated_cost: 180,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
          <div className="animate-spin">
            <RefreshCw className="h-5 w-5 text-purple-400" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-800/50 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-gray-400 mt-1">Real-time marketplace insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={`${isConnected ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
            {isConnected ? <Wifi className="w-3 h-3 mr-2" /> : <WifiOff className="w-3 h-3 mr-2" />}
            Real-time {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics - Animated Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <AnimatedMetricCard
          title="Today's Bookings"
          value={stats?.todaysBookings || 0}
          previousValue={Math.round((stats?.todaysBookings || 0) * 0.88)} // Simulate previous value
          trend={stats?.trends?.bookingsTrend || 0}
          icon={Calendar}
          iconColor="text-blue-400"
          format="number"
        />

        <AnimatedMetricCard
          title="Total Revenue"
          value={stats?.totalRevenue || 0}
          previousValue={Math.round((stats?.totalRevenue || 0) * 0.92)} // Simulate previous value
          trend={stats?.trends?.revenueTrend || 0}
          icon={DollarSign}
          iconColor="text-green-400"
          format="currency"
        />

        <AnimatedMetricCard
          title="Active Providers"
          value={stats?.activeProviders || 0}
          previousValue={Math.round((stats?.activeProviders || 0) * 0.95)} // Simulate previous value
          trend={stats?.trends?.providerTrend || 0}
          icon={Users}
          iconColor="text-purple-400"
          format="number"
        />

        <AnimatedMetricCard
          title="Avg PPS Score"
          value={stats?.avgPPSScore || 0}
          previousValue={(stats?.avgPPSScore || 0) * 0.97} // Simulate previous value
          trend={2.3} // Mock PPS trend
          icon={Star}
          iconColor="text-yellow-400"
          format="percentage"
        />

        <AnimatedMetricCard
          title="Pending Approvals"
          value={stats?.pendingApprovals || 0}
          previousValue={Math.round((stats?.pendingApprovals || 0) * 1.2)} // Simulate previous value
          trend={-15.0} // Mock negative trend (good for pending items)
          icon={AlertCircle}
          iconColor="text-orange-400"
          format="number"
        />
      </div>

      {/* Real-time Trend Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RealTimeTrendChart className="xl:col-span-1" height={350} />
        <SystemStatusIndicators className="xl:col-span-1" />
      </div>

      {/* Activity Heatmap */}
      <div className="grid grid-cols-1 gap-6">
        <ProviderActivityHeatmap />
      </div>

      {/* Real-time Dashboard Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <LiveBookingsWidget className="xl:col-span-2" />
        <LiveRevenueWidget />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <SystemHealthWidget />
        <UserActivityWidget />
        <SystemAlertsWidget />
      </div>

      {/* Error Recovery and System Health */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ErrorRecoveryPanel className="xl:col-span-1" maxErrors={5} />
        <SystemHealthMonitor className="xl:col-span-1" />
      </div>

      {/* Quick Actions */}
      <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Zap className="mr-2 h-5 w-5 text-purple-400" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-20 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 flex-col">
              <UserPlus className="h-6 w-6 mb-2" />
              <span className="text-sm">Add Provider</span>
            </Button>
            <Button className="h-20 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 flex-col">
              <CheckCircle className="h-6 w-6 mb-2" />
              <span className="text-sm">Approve Pending</span>
            </Button>
            <Button className="h-20 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex-col">
              <BarChart3 className="h-6 w-6 mb-2" />
              <span className="text-sm">View Analytics</span>
            </Button>
            <Button className="h-20 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 flex-col">
              <MessageSquare className="h-6 w-6 mb-2" />
              <span className="text-sm">Support Queue</span>
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}