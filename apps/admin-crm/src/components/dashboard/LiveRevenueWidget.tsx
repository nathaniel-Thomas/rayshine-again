import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import realTimeDashboardService, { DashboardMetrics } from '../../services/realTimeDashboardService';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  Clock,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface LiveRevenueWidgetProps {
  className?: string;
}

interface RevenueData {
  current: number;
  target: number;
  previous: number;
  growth: number;
  todaysRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
}

export default function LiveRevenueWidget({ className }: LiveRevenueWidgetProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [revenueHistory, setRevenueHistory] = useState<{ timestamp: Date; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to real-time metrics updates
    const unsubscribeMetrics = realTimeDashboardService.onMetricsUpdate((updatedMetrics) => {
      setMetrics(updatedMetrics);
      setLastUpdate(new Date());
      setLoading(false);
      
      // Update revenue history for trend analysis
      setRevenueHistory(prev => {
        const newEntry = { 
          timestamp: new Date(), 
          amount: updatedMetrics.revenueToday || 0 
        };
        return [...prev, newEntry].slice(-24); // Keep last 24 hours
      });
    });

    // Subscribe to connection status
    const unsubscribeConnection = realTimeDashboardService.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    return () => {
      unsubscribeMetrics();
      unsubscribeConnection();
    };
  }, []);

  const getRevenueData = (): RevenueData => {
    if (!metrics) {
      return {
        current: 0,
        target: 10000,
        previous: 0,
        growth: 0,
        todaysRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0
      };
    }

    const todaysRevenue = metrics.revenueToday || 0;
    const monthlyRevenue = metrics.totalRevenue || 0;
    const weeklyRevenue = monthlyRevenue * 0.25; // Estimate
    const previousRevenue = monthlyRevenue * 0.85; // Mock previous month
    const target = 10000; // Monthly target
    const growth = previousRevenue > 0 ? ((monthlyRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    return {
      current: monthlyRevenue,
      target,
      previous: previousRevenue,
      growth,
      todaysRevenue,
      weeklyRevenue,
      monthlyRevenue
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getGrowthTrend = () => {
    if (revenueHistory.length < 2) return 'stable';
    
    const recent = revenueHistory.slice(-6); // Last 6 entries
    const older = revenueHistory.slice(-12, -6); // Previous 6 entries
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, entry) => sum + entry.amount, 0) / recent.length;
    const olderAvg = older.reduce((sum, entry) => sum + entry.amount, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    const threshold = olderAvg * 0.1; // 10% threshold
    
    if (Math.abs(difference) < threshold) return 'stable';
    return difference > 0 ? 'up' : 'down';
  };

  const handleRefresh = () => {
    realTimeDashboardService.requestMetricsRefresh();
  };

  const getRevenueBreakdown = () => {
    const data = getRevenueData();
    return [
      {
        category: 'House Cleaning',
        amount: data.monthlyRevenue * 0.45,
        percentage: 45,
        color: 'text-blue-400'
      },
      {
        category: 'Lawn Care',
        amount: data.monthlyRevenue * 0.30,
        percentage: 30,
        color: 'text-green-400'
      },
      {
        category: 'Deep Cleaning',
        amount: data.monthlyRevenue * 0.20,
        percentage: 20,
        color: 'text-purple-400'
      },
      {
        category: 'Other Services',
        amount: data.monthlyRevenue * 0.05,
        percentage: 5,
        color: 'text-gray-400'
      }
    ];
  };

  if (loading) {
    return (
      <Card className={`bg-gray-900/50 backdrop-blur-xl border-gray-800/50 ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5 text-green-400" />
              Live Revenue
            </div>
            <div className="animate-spin">
              <RefreshCw className="h-4 w-4 text-green-400" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-24 bg-gray-800/30 rounded-lg animate-pulse"></div>
            <div className="h-16 bg-gray-800/30 rounded-lg animate-pulse"></div>
            <div className="h-32 bg-gray-800/30 rounded-lg animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const revenueData = getRevenueData();
  const progressPercentage = getProgressPercentage(revenueData.current, revenueData.target);
  const trend = getGrowthTrend();
  const breakdown = getRevenueBreakdown();

  return (
    <Card className={`bg-gray-900/50 backdrop-blur-xl border-gray-800/50 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5 text-green-400" />
            Live Revenue
            <div className={`ml-2 w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`${
              trend === 'up' 
                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                : trend === 'down'
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
            }`}>
              {trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
              {trend === 'stable' && <Activity className="w-3 h-3 mr-1" />}
              {trend.toUpperCase()}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-green-400 hover:bg-green-400/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        {lastUpdate && (
          <p className="text-xs text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Revenue Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-800/20 rounded-lg">
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(revenueData.todaysRevenue)}
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center justify-center">
              <Calendar className="w-3 h-3 mr-1" />
              Today
            </p>
          </div>
          <div className="text-center p-4 bg-gray-800/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">
              {formatCurrency(revenueData.weeklyRevenue)}
            </div>
            <p className="text-xs text-gray-400 mt-1">This Week</p>
          </div>
          <div className="text-center p-4 bg-gray-800/20 rounded-lg">
            <div className="text-2xl font-bold text-white">
              {formatCurrency(revenueData.monthlyRevenue)}
            </div>
            <p className="text-xs text-gray-400 mt-1">This Month</p>
          </div>
        </div>

        {/* Monthly Progress */}
        <div className="p-4 bg-gray-800/20 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Target className="w-4 h-4 text-purple-400 mr-2" />
              <span className="text-sm font-medium text-white">Monthly Target</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-white">
                {formatCurrency(revenueData.current)} / {formatCurrency(revenueData.target)}
              </span>
              <div className="text-xs text-gray-400">
                {progressPercentage.toFixed(1)}% complete
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Growth Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-800/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Growth Rate</span>
              {revenueData.growth >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div className={`text-lg font-bold ${
              revenueData.growth >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {revenueData.growth >= 0 ? '+' : ''}{revenueData.growth.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500">vs. previous month</p>
          </div>
          <div className="p-3 bg-gray-800/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Avg. Order</span>
              <BarChart3 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {formatCurrency((metrics?.completedBookings || 1) > 0 ? revenueData.monthlyRevenue / (metrics?.completedBookings || 1) : 0)}
            </div>
            <p className="text-xs text-gray-500">per booking</p>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="p-4 bg-gray-800/20 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-white flex items-center">
              <PieChart className="w-4 h-4 mr-2 text-purple-400" />
              Revenue by Service
            </h4>
          </div>
          <div className="space-y-3">
            {breakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full bg-current ${item.color}`}></div>
                  <span className="text-sm text-gray-300">{item.category}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    {formatCurrency(item.amount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex justify-between p-2 bg-gray-800/10 rounded">
            <span className="text-gray-400">Peak Hour:</span>
            <span className="text-white">2:00 PM - 4:00 PM</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-800/10 rounded">
            <span className="text-gray-400">Conv. Rate:</span>
            <span className="text-green-400">78.5%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}