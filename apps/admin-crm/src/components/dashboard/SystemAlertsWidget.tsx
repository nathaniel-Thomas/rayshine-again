import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import realTimeDashboardService, { SystemAlert } from '../../services/realTimeDashboardService';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  Clock,
  RefreshCw,
  Filter,
  Bell,
  BellOff,
  Zap,
  Database,
  Server,
  CreditCard,
  Users
} from 'lucide-react';

interface SystemAlertsWidgetProps {
  className?: string;
}

export default function SystemAlertsWidget({ className }: SystemAlertsWidgetProps) {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to real-time alert updates
    const unsubscribeAlerts = realTimeDashboardService.onSystemAlerts((updatedAlerts) => {
      setAlerts(updatedAlerts);
      setLastUpdate(new Date());
      setLoading(false);
    });

    // Subscribe to connection status
    const unsubscribeConnection = realTimeDashboardService.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    return () => {
      unsubscribeAlerts();
      unsubscribeConnection();
    };
  }, []);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return { icon: AlertTriangle, color: 'text-red-400' };
      case 'warning':
        return { icon: AlertCircle, color: 'text-yellow-400' };
      case 'info':
        return { icon: Info, color: 'text-blue-400' };
      case 'success':
        return { icon: CheckCircle, color: 'text-green-400' };
      default:
        return { icon: Info, color: 'text-gray-400' };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system':
        return { icon: Server, color: 'text-purple-400' };
      case 'booking':
        return { icon: Clock, color: 'text-blue-400' };
      case 'payment':
        return { icon: CreditCard, color: 'text-green-400' };
      case 'provider':
        return { icon: Users, color: 'text-orange-400' };
      case 'customer':
        return { icon: Users, color: 'text-cyan-400' };
      default:
        return { icon: Bell, color: 'text-gray-400' };
    }
  };

  const getSeverityBadge = (severity: string) => {
    const severityConfig = {
      critical: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Zap },
      high: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertTriangle },
      medium: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertCircle },
      low: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Info }
    };

    const config = severityConfig[severity as keyof typeof severityConfig] || 
                  { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Info };
    
    const IconComponent = config.icon;

    return (
      <Badge className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return time.toLocaleDateString();
  };

  const getFilteredAlerts = () => {
    let filtered = alerts;

    // Filter by resolved status
    if (!showResolved) {
      filtered = filtered.filter(alert => !alert.resolved);
    }

    // Filter by severity/type
    if (filter !== 'all') {
      if (['critical', 'high', 'medium', 'low'].includes(filter)) {
        filtered = filtered.filter(alert => alert.severity === filter);
      } else {
        filtered = filtered.filter(alert => alert.category === filter);
      }
    }

    return filtered.sort((a, b) => {
      // Sort by severity first (critical, high, medium, low)
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = (severityOrder[a.severity as keyof typeof severityOrder] || 4) - 
                          (severityOrder[b.severity as keyof typeof severityOrder] || 4);
      
      if (severityDiff !== 0) return severityDiff;
      
      // Then by timestamp (newest first)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      realTimeDashboardService.resolveAlert(alertId);
      
      // Optimistically update the UI
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, resolved: true }
          : alert
      ));
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const handleRefresh = () => {
    realTimeDashboardService.requestMetricsRefresh();
  };

  const getAlertStats = () => {
    const unresolvedAlerts = alerts.filter(a => !a.resolved);
    return {
      total: unresolvedAlerts.length,
      critical: unresolvedAlerts.filter(a => a.severity === 'critical').length,
      high: unresolvedAlerts.filter(a => a.severity === 'high').length,
      medium: unresolvedAlerts.filter(a => a.severity === 'medium').length,
      low: unresolvedAlerts.filter(a => a.severity === 'low').length
    };
  };

  if (loading) {
    return (
      <Card className={`bg-gray-900/50 backdrop-blur-xl border-gray-800/50 ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-red-400" />
              System Alerts
            </div>
            <div className="animate-spin">
              <RefreshCw className="h-4 w-4 text-red-400" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-800/30 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredAlerts = getFilteredAlerts();
  const stats = getAlertStats();

  return (
    <Card className={`bg-gray-900/50 backdrop-blur-xl border-gray-800/50 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-red-400" />
            System Alerts
            <div className={`ml-2 w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            {stats.critical > 0 && (
              <Badge className="ml-2 bg-red-500/20 text-red-400 border-red-500/30">
                {stats.critical} Critical
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResolved(!showResolved)}
              className={`text-xs ${showResolved ? 'text-green-400' : 'text-gray-400'}`}
            >
              {showResolved ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
            </Button>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white text-sm rounded px-2 py-1"
            >
              <option value="all">All Alerts</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="system">System</option>
              <option value="booking">Booking</option>
              <option value="payment">Payment</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-red-400 hover:bg-red-400/10"
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
      <CardContent>
        {/* Alert Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6 p-3 bg-gray-800/20 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-red-400">{stats.critical}</div>
            <p className="text-xs text-gray-400">Critical</p>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-400">{stats.high}</div>
            <p className="text-xs text-gray-400">High</p>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-400">{stats.medium}</div>
            <p className="text-xs text-gray-400">Medium</p>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-400">{stats.low}</div>
            <p className="text-xs text-gray-400">Low</p>
          </div>
        </div>

        {/* Alerts List */}
        <ScrollArea className="h-80">
          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No alerts found</p>
                <p className="text-sm text-gray-500">
                  {filter !== 'all' ? `No ${filter} alerts` : showResolved ? 'No alerts' : 'All clear!'}
                </p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const { icon: AlertIcon, color: alertColor } = getAlertIcon(alert.type);
                const { icon: CategoryIcon, color: categoryColor } = getCategoryIcon(alert.category);
                
                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border transition-all duration-200 ${
                      alert.resolved 
                        ? 'bg-gray-800/20 border-gray-700/50 opacity-60' 
                        : alert.severity === 'critical'
                        ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                        : alert.severity === 'high'
                        ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20'
                        : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <AlertIcon className={`w-5 h-5 ${alertColor}`} />
                        <CategoryIcon className={`w-4 h-4 ${categoryColor}`} />
                        <span className="font-semibold text-white text-sm">
                          {alert.title}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getSeverityBadge(alert.severity)}
                        {!alert.resolved && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResolveAlert(alert.id)}
                            className="text-green-400 hover:bg-green-400/10 h-6 w-6 p-0"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-3 leading-relaxed">
                      {alert.message}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-500 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {getTimeAgo(alert.timestamp)}
                        </span>
                        <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                          {alert.category}
                        </Badge>
                      </div>
                      
                      {alert.resolved && (
                        <div className="flex items-center text-green-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          <span>Resolved</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}