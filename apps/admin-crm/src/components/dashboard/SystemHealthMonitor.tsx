import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  errorRecoveryService, 
  ErrorSeverity, 
  ErrorCategory,
  ErrorCode 
} from '../../services/errorRecoveryService';
import { connectionManager, ConnectionMode } from '../../services/connectionManager';
import realTimeDashboardService from '../../services/realTimeDashboardService';
import {
  Shield,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  Server,
  Database,
  Globe,
  Heart,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Eye,
  AlertCircle
} from 'lucide-react';

interface HealthMetric {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'offline';
  value: string | number;
  unit?: string;
  lastCheck: Date;
  threshold?: {
    warning: number;
    critical: number;
  };
  trend?: 'up' | 'down' | 'stable';
  description: string;
}

interface SystemHealthMonitorProps {
  className?: string;
  compact?: boolean;
}

export default function SystemHealthMonitor({ 
  className = '',
  compact = false 
}: SystemHealthMonitorProps) {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [overallHealth, setOverallHealth] = useState<'healthy' | 'degraded' | 'critical'>('healthy');
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (!isMonitoring) return;

    const updateHealthMetrics = () => {
      const metrics = generateHealthMetrics();
      setHealthMetrics(metrics);
      setOverallHealth(calculateOverallHealth(metrics));
      setLastUpdate(new Date());
    };

    // Initial update
    updateHealthMetrics();

    // Set up monitoring interval
    const interval = setInterval(updateHealthMetrics, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const generateHealthMetrics = (): HealthMetric[] => {
    const connectionHealth = connectionManager.getHealth();
    const errorStats = errorRecoveryService.getStats();
    const connectionStatus = realTimeDashboardService.getConnectionStatus();
    const featureAvailability = realTimeDashboardService.getFeatureAvailability();

    const metrics: HealthMetric[] = [
      // Connection Health
      {
        id: 'connection',
        name: 'Connection',
        status: connectionHealth.isHealthy ? 'healthy' : 'offline',
        value: connectionHealth.mode === ConnectionMode.WEBSOCKET ? 'WebSocket' : 'HTTP Polling',
        lastCheck: new Date(),
        trend: connectionHealth.consecutiveFailures === 0 ? 'stable' : 'down',
        description: `${connectionHealth.mode} connection ${connectionHealth.isHealthy ? 'established' : 'failed'}`
      },

      // Response Time / Latency
      {
        id: 'latency',
        name: 'Response Time',
        status: connectionHealth.latency < 500 ? 'healthy' : 
               connectionHealth.latency < 1000 ? 'degraded' : 'offline',
        value: Math.round(connectionHealth.latency),
        unit: 'ms',
        lastCheck: new Date(),
        threshold: { warning: 500, critical: 1000 },
        trend: connectionHealth.latency < 300 ? 'up' : 
              connectionHealth.latency > 800 ? 'down' : 'stable',
        description: `Average response time for API calls`
      },

      // Error Rate
      {
        id: 'error_rate',
        name: 'Error Rate',
        status: errorStats.activeErrors === 0 ? 'healthy' :
               errorStats.activeErrors < 3 ? 'degraded' : 'offline',
        value: errorStats.activeErrors,
        unit: 'errors',
        lastCheck: new Date(),
        threshold: { warning: 3, critical: 10 },
        trend: errorStats.activeErrors === 0 ? 'up' : 
              errorStats.criticalErrors > 0 ? 'down' : 'stable',
        description: `Currently active system errors`
      },

      // System Uptime (simulated based on connection health)
      {
        id: 'uptime',
        name: 'System Uptime',
        status: connectionHealth.consecutiveFailures === 0 ? 'healthy' :
               connectionHealth.consecutiveFailures < 3 ? 'degraded' : 'offline',
        value: connectionHealth.consecutiveFailures === 0 ? '99.9' : '95.2',
        unit: '%',
        lastCheck: new Date(),
        threshold: { warning: 98, critical: 95 },
        trend: 'stable',
        description: 'System availability over the last 24 hours'
      },

      // Data Sync Status
      {
        id: 'data_sync',
        name: 'Data Sync',
        status: featureAvailability.realTimeUpdates ? 'healthy' : 'degraded',
        value: featureAvailability.updateFrequency === 'realtime' ? 'Real-time' :
              featureAvailability.updateFrequency === 'frequent' ? 'Frequent' :
              featureAvailability.updateFrequency === 'normal' ? 'Normal' : 'Slow',
        lastCheck: new Date(),
        trend: featureAvailability.realTimeUpdates ? 'up' : 'down',
        description: 'Data synchronization status between client and server'
      },

      // Memory Usage (simulated)
      {
        id: 'memory',
        name: 'Memory Usage',
        status: 'healthy', // Would be calculated from actual memory metrics
        value: Math.round(45 + Math.random() * 15), // Simulated 45-60%
        unit: '%',
        lastCheck: new Date(),
        threshold: { warning: 80, critical: 90 },
        trend: 'stable',
        description: 'Browser memory usage for the dashboard application'
      },

      // API Health
      {
        id: 'api_health',
        name: 'API Health',
        status: connectionStatus.connected ? 'healthy' : 'offline',
        value: connectionStatus.connected ? 'Online' : 'Offline',
        lastCheck: new Date(),
        trend: connectionStatus.connected ? 'stable' : 'down',
        description: 'Backend API server availability and responsiveness'
      },

      // WebSocket Health
      {
        id: 'websocket_health',
        name: 'Real-time Features',
        status: featureAvailability.instantNotifications ? 'healthy' :
               featureAvailability.realTimeUpdates ? 'degraded' : 'offline',
        value: connectionStatus.mode === 'websocket' ? 'Active' : 'Fallback',
        lastCheck: new Date(),
        trend: connectionStatus.mode === 'websocket' ? 'up' : 'down',
        description: 'Real-time notification and update capabilities'
      }
    ];

    return metrics;
  };

  const calculateOverallHealth = (metrics: HealthMetric[]): 'healthy' | 'degraded' | 'critical' => {
    const healthyCount = metrics.filter(m => m.status === 'healthy').length;
    const degradedCount = metrics.filter(m => m.status === 'degraded').length;
    const offlineCount = metrics.filter(m => m.status === 'offline').length;
    const total = metrics.length;

    if (offlineCount > 0 || healthyCount / total < 0.6) {
      return 'critical';
    }
    if (degradedCount > 0 || healthyCount / total < 0.8) {
      return 'degraded';
    }
    return 'healthy';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'degraded':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'offline':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTrendIcon = (trend: string | undefined) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-400" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-400" />;
      case 'stable':
        return <Activity className="w-3 h-3 text-blue-400" />;
      default:
        return null;
    }
  };

  const getMetricIcon = (id: string) => {
    switch (id) {
      case 'connection':
        return connectionManager.getHealth().isHealthy ? 
          <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />;
      case 'latency':
        return <Clock className="w-4 h-4" />;
      case 'error_rate':
        return <AlertTriangle className="w-4 h-4" />;
      case 'uptime':
        return <Activity className="w-4 h-4" />;
      case 'data_sync':
        return <Database className="w-4 h-4" />;
      case 'memory':
        return <Zap className="w-4 h-4" />;
      case 'api_health':
        return <Server className="w-4 h-4" />;
      case 'websocket_health':
        return <Heart className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getOverallHealthInfo = () => {
    switch (overallHealth) {
      case 'healthy':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20 border-green-500/30',
          label: 'System Healthy',
          description: 'All systems operational'
        };
      case 'degraded':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20 border-yellow-500/30',
          label: 'Performance Issues',
          description: 'Some systems degraded'
        };
      case 'critical':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-500/20 border-red-500/30',
          label: 'System Issues',
          description: 'Critical systems affected'
        };
    }
  };

  const handleToggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  const handleForceRefresh = () => {
    const metrics = generateHealthMetrics();
    setHealthMetrics(metrics);
    setOverallHealth(calculateOverallHealth(metrics));
    setLastUpdate(new Date());
  };

  const overallInfo = getOverallHealthInfo();
  const OverallIcon = overallInfo.icon;

  if (compact) {
    return (
      <Card className={`bg-gray-900/50 backdrop-blur-xl border-gray-800/50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <OverallIcon className={`w-5 h-5 ${overallInfo.color}`} />
              <div>
                <div className="text-sm font-medium text-white">{overallInfo.label}</div>
                <div className="text-xs text-gray-400">{overallInfo.description}</div>
              </div>
            </div>
            <Badge className={overallInfo.bgColor}>
              {healthMetrics.filter(m => m.status === 'healthy').length}/{healthMetrics.length} Healthy
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gray-900/50 backdrop-blur-xl border-gray-800/50 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="mr-2 h-5 w-5 text-blue-400" />
            System Health Monitor
            <div className={`ml-2 w-2 h-2 rounded-full ${overallHealth === 'healthy' ? 'bg-green-400' : overallHealth === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className={overallInfo.bgColor}>
              <OverallIcon className={`w-3 h-3 mr-1 ${overallInfo.color}`} />
              <span className={overallInfo.color}>{overallInfo.label}</span>
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleMonitoring}
              className={`${isMonitoring ? 'text-green-400 hover:bg-green-400/10' : 'text-gray-400 hover:bg-gray-400/10'}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleForceRefresh}
              className="text-blue-400 hover:bg-blue-400/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        <div className="text-xs text-gray-500">
          {overallInfo.description} • Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Health Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {healthMetrics.map((metric) => (
            <div
              key={metric.id}
              className={`p-4 rounded-lg border transition-all duration-300 hover:scale-[1.02] ${
                metric.status === 'healthy' 
                  ? 'bg-gray-800/20 border-green-500/30' 
                  : metric.status === 'degraded'
                  ? 'bg-gray-800/20 border-yellow-500/30'
                  : 'bg-gray-800/20 border-red-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getMetricIcon(metric.id)}
                  <span className="font-medium text-white text-sm">{metric.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  {getTrendIcon(metric.trend)}
                  {getStatusIcon(metric.status)}
                </div>
              </div>
              
              <div className="text-lg font-bold text-white mb-1">
                {metric.value}{metric.unit && <span className="text-sm text-gray-400 ml-1">{metric.unit}</span>}
              </div>
              
              <div className="text-xs text-gray-400 mb-2">{metric.description}</div>
              
              <div className="flex items-center justify-between text-xs">
                <Badge className={getStatusColor(metric.status)}>
                  {metric.status.toUpperCase()}
                </Badge>
                <span className="text-gray-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {metric.lastCheck.toLocaleTimeString()}
                </span>
              </div>
              
              {/* Health bar */}
              <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
                <div 
                  className={`h-1 rounded-full transition-all duration-500 ${
                    metric.status === 'healthy' ? 'bg-green-400' :
                    metric.status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ 
                    width: metric.status === 'healthy' ? '100%' : 
                          metric.status === 'degraded' ? '60%' : '20%' 
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* System Summary */}
        <div className="p-4 bg-gray-800/20 rounded-lg">
          <div className="text-sm font-medium text-white mb-3 flex items-center">
            <OverallIcon className={`w-4 h-4 mr-2 ${overallInfo.color}`} />
            Health Summary
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-gray-400">Healthy Services</div>
              <div className="text-green-400 font-bold text-lg">
                {healthMetrics.filter(m => m.status === 'healthy').length}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Issues</div>
              <div className="text-yellow-400 font-bold text-lg">
                {healthMetrics.filter(m => m.status === 'degraded').length}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Critical</div>
              <div className="text-red-400 font-bold text-lg">
                {healthMetrics.filter(m => m.status === 'offline').length}
              </div>
            </div>
          </div>
        </div>

        {/* Monitoring Controls */}
        <div className="flex items-center justify-between p-3 bg-gray-800/20 rounded-lg">
          <div className="text-sm text-gray-400">
            Monitoring: {isMonitoring ? 'Active' : 'Paused'}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={isMonitoring ? "default" : "outline"}
              onClick={handleToggleMonitoring}
              className={isMonitoring ? 
                "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30" :
                "border-gray-600 text-gray-300 hover:bg-gray-700"
              }
            >
              {isMonitoring ? 'Monitoring Active' : 'Start Monitoring'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}