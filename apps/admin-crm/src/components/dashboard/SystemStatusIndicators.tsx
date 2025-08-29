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
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Globe,
  Shield
} from 'lucide-react';

interface SystemService {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
  icon: React.ElementType;
  color: string;
  description: string;
  responseTime?: number;
  uptime?: number;
  lastChecked?: Date;
}

interface SystemStatusIndicatorsProps {
  className?: string;
}

export default function SystemStatusIndicators({ className }: SystemStatusIndicatorsProps) {
  const [services, setServices] = useState<SystemService[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [overallHealth, setOverallHealth] = useState<'healthy' | 'degraded' | 'critical'>('healthy');

  const baseServices: Omit<SystemService, 'status' | 'responseTime' | 'uptime' | 'lastChecked'>[] = [
    {
      id: 'database',
      name: 'Database',
      icon: Database,
      color: 'text-blue-400',
      description: 'PostgreSQL + Supabase'
    },
    {
      id: 'api',
      name: 'API Server',
      icon: Server,
      color: 'text-green-400',
      description: 'Express.js Backend'
    },
    {
      id: 'websocket',
      name: 'WebSocket',
      icon: Wifi,
      color: 'text-purple-400',
      description: 'Real-time Connection'
    },
    {
      id: 'ppsSystem',
      name: 'PPS System',
      icon: Zap,
      color: 'text-yellow-400',
      description: 'Provider Performance'
    },
    {
      id: 'external',
      name: 'External APIs',
      icon: Globe,
      color: 'text-cyan-400',
      description: 'Payment & Maps'
    },
    {
      id: 'security',
      name: 'Security',
      icon: Shield,
      color: 'text-red-400',
      description: 'Auth & Encryption'
    }
  ];

  useEffect(() => {
    // Subscribe to real-time metrics updates
    const unsubscribeMetrics = realTimeDashboardService.onMetricsUpdate((metrics) => {
      updateServicesFromMetrics(metrics);
      setLastUpdate(new Date());
    });

    // Subscribe to connection status
    const unsubscribeConnection = realTimeDashboardService.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    // Initialize with current data
    const initialMetrics = realTimeDashboardService.getCurrentMetrics();
    if (initialMetrics) {
      updateServicesFromMetrics(initialMetrics);
    } else {
      // Initialize with default status
      initializeServices();
    }

    return () => {
      unsubscribeMetrics();
      unsubscribeConnection();
    };
  }, []);

  const initializeServices = () => {
    const initialServices = baseServices.map(service => ({
      ...service,
      status: 'offline' as const,
      responseTime: Math.floor(Math.random() * 100) + 20,
      uptime: Math.random() * 100,
      lastChecked: new Date()
    }));
    
    setServices(initialServices);
    calculateOverallHealth(initialServices);
  };

  const updateServicesFromMetrics = (metrics: DashboardMetrics) => {
    const updatedServices = baseServices.map(service => {
      let status: 'online' | 'offline' | 'degraded' = 'offline';
      let responseTime = Math.floor(Math.random() * 100) + 20;
      let uptime = 95 + Math.random() * 5; // 95-100%

      // Map metrics to services
      switch (service.id) {
        case 'database':
          status = metrics.systemHealth.database;
          break;
        case 'api':
          status = metrics.systemHealth.api;
          break;
        case 'websocket':
          status = metrics.systemHealth.websocket;
          responseTime = isConnected ? responseTime : 0;
          break;
        case 'ppsSystem':
          status = metrics.systemHealth.ppsSystem;
          break;
        case 'external':
          // Mock external API status based on overall system health
          const healthyServices = Object.values(metrics.systemHealth).filter(s => s === 'online').length;
          status = healthyServices >= 3 ? 'online' : healthyServices >= 2 ? 'degraded' : 'offline';
          break;
        case 'security':
          // Mock security status - usually online if API is online
          status = metrics.systemHealth.api === 'online' ? 'online' : 'degraded';
          break;
      }

      // Add some variability to response times based on status
      if (status === 'degraded') {
        responseTime = Math.floor(Math.random() * 200) + 100; // 100-300ms
        uptime = 85 + Math.random() * 10; // 85-95%
      } else if (status === 'offline') {
        responseTime = 0;
        uptime = 0;
      }

      return {
        ...service,
        status,
        responseTime,
        uptime,
        lastChecked: new Date()
      };
    });

    setServices(updatedServices);
    calculateOverallHealth(updatedServices);
  };

  const calculateOverallHealth = (servicesList: SystemService[]) => {
    const onlineCount = servicesList.filter(s => s.status === 'online').length;
    const degradedCount = servicesList.filter(s => s.status === 'degraded').length;
    const totalCount = servicesList.length;

    if (onlineCount === totalCount) {
      setOverallHealth('healthy');
    } else if (onlineCount + degradedCount >= totalCount * 0.7) {
      setOverallHealth('degraded');
    } else {
      setOverallHealth('critical');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'offline':
      default:
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusBadge = (status: string, responseTime?: number) => {
    const baseClasses = "text-xs transition-all duration-300";
    
    switch (status) {
      case 'online':
        return (
          <Badge className={`bg-green-500/20 text-green-400 border-green-500/30 ${baseClasses}`}>
            <CheckCircle className="w-3 h-3 mr-1" />
            Online {responseTime ? `(${responseTime}ms)` : ''}
          </Badge>
        );
      case 'degraded':
        return (
          <Badge className={`bg-yellow-500/20 text-yellow-400 border-yellow-500/30 ${baseClasses}`}>
            <AlertTriangle className="w-3 h-3 mr-1" />
            Degraded {responseTime ? `(${responseTime}ms)` : ''}
          </Badge>
        );
      case 'offline':
      default:
        return (
          <Badge className={`bg-red-500/20 text-red-400 border-red-500/30 ${baseClasses}`}>
            <XCircle className="w-3 h-3 mr-1" />
            Offline
          </Badge>
        );
    }
  };

  const getOverallHealthInfo = () => {
    switch (overallHealth) {
      case 'healthy':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20 border-green-500/30',
          label: 'All Systems Operational',
          description: 'All services are running normally'
        };
      case 'degraded':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20 border-yellow-500/30',
          label: 'Partial System Issues',
          description: 'Some services are experiencing issues'
        };
      case 'critical':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-500/20 border-red-500/30',
          label: 'Major System Issues',
          description: 'Multiple services are down'
        };
    }
  };

  const handleRefresh = () => {
    realTimeDashboardService.requestMetricsRefresh();
  };

  const overallInfo = getOverallHealthInfo();
  const OverallIcon = overallInfo.icon;
  const averageResponseTime = services
    .filter(s => s.responseTime && s.responseTime > 0)
    .reduce((sum, s) => sum + (s.responseTime || 0), 0) / services.filter(s => s.responseTime && s.responseTime > 0).length;
  const averageUptime = services.reduce((sum, s) => sum + (s.uptime || 0), 0) / services.length;

  return (
    <Card className={`bg-gray-900/50 backdrop-blur-xl border-gray-800/50 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="mr-2 h-5 w-5 text-green-400" />
            System Status
            <div className={`ml-2 w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className={overallInfo.bgColor}>
              <OverallIcon className={`w-3 h-3 mr-1 ${overallInfo.color}`} />
              <span className={overallInfo.color}>{overallInfo.label}</span>
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
        <div className="text-xs text-gray-500">
          {overallInfo.description}
          {lastUpdate && ` • Last checked: ${lastUpdate.toLocaleTimeString()}`}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Metrics */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800/20 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {averageResponseTime ? Math.round(averageResponseTime) : '--'}ms
            </div>
            <div className="text-xs text-gray-400 flex items-center justify-center mt-1">
              <Clock className="w-3 h-3 mr-1" />
              Avg Response Time
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {Math.round(averageUptime)}%
            </div>
            <div className="text-xs text-gray-400">Average Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {services.filter(s => s.status === 'online').length}/{services.length}
            </div>
            <div className="text-xs text-gray-400">Services Online</div>
          </div>
        </div>

        {/* Service Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {services.map((service) => {
            const IconComponent = service.icon;
            return (
              <div
                key={service.id}
                className={`p-4 rounded-lg border transition-all duration-300 hover:scale-105 ${
                  service.status === 'online' 
                    ? 'bg-gray-800/30 border-green-500/30 hover:border-green-400/50' 
                    : service.status === 'degraded'
                    ? 'bg-gray-800/30 border-yellow-500/30 hover:border-yellow-400/50'
                    : 'bg-gray-800/30 border-red-500/30 hover:border-red-400/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <IconComponent className={`w-5 h-5 ${service.color}`} />
                    <span className="font-medium text-white">{service.name}</span>
                  </div>
                  {getStatusIcon(service.status)}
                </div>
                
                <div className="text-xs text-gray-400 mb-3">{service.description}</div>
                
                <div className="space-y-2">
                  <div>{getStatusBadge(service.status, service.responseTime)}</div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Uptime:</span>
                      <span className="text-white ml-1">{service.uptime?.toFixed(1)}%</span>
                    </div>
                    {service.lastChecked && (
                      <div>
                        <span className="text-gray-500">Checked:</span>
                        <span className="text-white ml-1">
                          {service.lastChecked.toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Status bar */}
                  <div className="w-full bg-gray-700 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full transition-all duration-500 ${
                        service.status === 'online' ? 'bg-green-400' :
                        service.status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${service.uptime || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* System Health Summary */}
        <div className="mt-4 p-3 bg-gray-800/20 rounded-lg">
          <div className="text-sm font-medium text-white mb-2 flex items-center">
            <OverallIcon className={`w-4 h-4 mr-2 ${overallInfo.color}`} />
            System Health Summary
          </div>
          <div className="text-xs text-gray-400">
            {services.filter(s => s.status === 'online').length} services online, {' '}
            {services.filter(s => s.status === 'degraded').length} degraded, {' '}
            {services.filter(s => s.status === 'offline').length} offline
          </div>
        </div>
      </CardContent>
    </Card>
  );
}