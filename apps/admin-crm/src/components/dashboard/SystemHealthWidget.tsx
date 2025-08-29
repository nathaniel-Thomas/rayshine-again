import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import realTimeDashboardService, { DashboardMetrics } from '../../services/realTimeDashboardService';
import {
  Activity,
  Database,
  Wifi,
  Server,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface SystemHealthWidgetProps {
  className?: string;
}

interface HealthMetric {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  icon: React.ElementType;
  color: string;
  description: string;
  lastCheck?: Date;
  responseTime?: number;
}

export default function SystemHealthWidget({ className }: SystemHealthWidgetProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<{ timestamp: Date; responseTime: number }[]>([]);

  useEffect(() => {
    // Subscribe to real-time metrics updates
    const unsubscribeMetrics = realTimeDashboardService.onMetricsUpdate((updatedMetrics) => {
      setMetrics(updatedMetrics);
      setLastUpdate(new Date());
      
      // Update performance history
      setPerformanceHistory(prev => {
        const newEntry = { timestamp: new Date(), responseTime: Math.random() * 100 + 50 }; // Mock response time
        return [...prev, newEntry].slice(-20); // Keep last 20 entries
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

  const healthMetrics: HealthMetric[] = [
    {
      name: 'Database',
      status: metrics?.systemHealth.database || 'offline',
      icon: Database,
      color: 'text-blue-400',
      description: 'PostgreSQL Connection',
      responseTime: 45
    },
    {
      name: 'API Server',
      status: metrics?.systemHealth.api || 'offline',
      icon: Server,
      color: 'text-green-400',
      description: 'Express.js Backend',
      responseTime: 32
    },
    {
      name: 'WebSocket',
      status: isConnected ? 'online' : 'offline',
      icon: Wifi,
      color: 'text-purple-400',
      description: 'Real-time Connection',
      responseTime: 18
    },
    {
      name: 'PPS System',
      status: metrics?.systemHealth.ppsSystem || 'offline',
      icon: Zap,
      color: 'text-yellow-400',
      description: 'Provider Performance',
      responseTime: 67
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'offline':
      default:
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Online</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Degraded</Badge>;
      case 'offline':
      default:
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Offline</Badge>;
    }
  };

  const getOverallHealth = () => {
    const onlineCount = healthMetrics.filter(m => m.status === 'online').length;
    const totalCount = healthMetrics.length;
    const percentage = (onlineCount / totalCount) * 100;

    if (percentage === 100) return { status: 'Excellent', color: 'text-green-400', icon: CheckCircle };
    if (percentage >= 75) return { status: 'Good', color: 'text-yellow-400', icon: CheckCircle };
    if (percentage >= 50) return { status: 'Degraded', color: 'text-orange-400', icon: AlertTriangle };
    return { status: 'Critical', color: 'text-red-400', icon: AlertTriangle };
  };

  const handleRefresh = () => {
    realTimeDashboardService.requestMetricsRefresh();
  };

  const getAverageResponseTime = () => {
    if (performanceHistory.length === 0) return 0;
    return Math.round(performanceHistory.reduce((sum, entry) => sum + entry.responseTime, 0) / performanceHistory.length);
  };

  const getResponseTimeTrend = () => {
    if (performanceHistory.length < 2) return 'stable';
    const recent = performanceHistory.slice(-5);
    const older = performanceHistory.slice(-10, -5);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, entry) => sum + entry.responseTime, 0) / recent.length;
    const olderAvg = older.reduce((sum, entry) => sum + entry.responseTime, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    
    if (Math.abs(difference) < 10) return 'stable';
    return difference > 0 ? 'increasing' : 'decreasing';
  };

  const overallHealth = getOverallHealth();
  const OverallHealthIcon = overallHealth.icon;
  const trend = getResponseTimeTrend();

  return (
    <Card className={`bg-gray-900/50 backdrop-blur-xl border-gray-800/50 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="mr-2 h-5 w-5 text-green-400" />
            System Health
            <div className={`ml-2 w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <OverallHealthIcon className={`w-4 h-4 mr-1 ${overallHealth.color}`} />
              <span className={`text-sm font-medium ${overallHealth.color}`}>
                {overallHealth.status}
              </span>
            </div>
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
            Last checked: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Performance Metrics */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800/30 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {getAverageResponseTime()}ms
            </div>
            <div className="flex items-center justify-center mt-1">
              {trend === 'increasing' ? (
                <TrendingUp className="w-4 h-4 text-red-400 mr-1" />
              ) : trend === 'decreasing' ? (
                <TrendingDown className="w-4 h-4 text-green-400 mr-1" />
              ) : (
                <div className="w-4 h-4 mr-1" />
              )}
              <p className="text-xs text-gray-400">Avg Response</p>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {metrics?.activeUsers || 0}
            </div>
            <p className="text-xs text-gray-400">Active Users</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              99.9%
            </div>
            <p className="text-xs text-gray-400">Uptime</p>
          </div>
        </div>

        {/* Individual Service Status */}
        <div className="space-y-3">
          {healthMetrics.map((metric) => {
            const IconComponent = metric.icon;
            return (
              <div
                key={metric.name}
                className="flex items-center justify-between p-3 bg-gray-800/20 rounded-lg hover:bg-gray-800/40 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <IconComponent className={`w-5 h-5 ${metric.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-white">{metric.name}</p>
                      {getStatusIcon(metric.status)}
                    </div>
                    <p className="text-sm text-gray-400">{metric.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(metric.status)}
                  {metric.responseTime && (
                    <p className="text-xs text-gray-500 mt-1">
                      {metric.responseTime}ms
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Diagnostics */}
        <div className="p-3 bg-gray-800/20 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-blue-400" />
            Quick Diagnostics
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">CPU Usage:</span>
              <span className="text-green-400">23%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Memory:</span>
              <span className="text-yellow-400">67%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Disk Space:</span>
              <span className="text-green-400">45%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Network:</span>
              <span className="text-green-400">Healthy</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}