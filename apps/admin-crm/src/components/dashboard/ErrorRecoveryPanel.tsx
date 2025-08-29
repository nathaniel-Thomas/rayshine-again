import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  errorRecoveryService, 
  ErrorReport, 
  ErrorSeverity, 
  ErrorCategory,
  ErrorCode 
} from '../../services/errorRecoveryService';
import { connectionManager } from '../../services/connectionManager';
import {
  AlertTriangle,
  XCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Activity,
  Wifi,
  WifiOff,
  Shield,
  AlertCircle,
  Info,
  Zap,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  RotateCcw,
  Server,
  Database
} from 'lucide-react';

interface ErrorRecoveryPanelProps {
  className?: string;
  showDetails?: boolean;
  maxErrors?: number;
}

export default function ErrorRecoveryPanel({ 
  className = '', 
  showDetails = true,
  maxErrors = 10 
}: ErrorRecoveryPanelProps) {
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [stats, setStats] = useState(errorRecoveryService.getStats());
  const [isExpanded, setIsExpanded] = useState(false);
  const [connectionHealth, setConnectionHealth] = useState(connectionManager.getHealth());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    // Subscribe to new errors
    const unsubscribeErrors = errorRecoveryService.onError((error) => {
      setErrors(prev => {
        const updated = [error, ...prev.filter(e => e.id !== error.id)];
        return updated.slice(0, maxErrors);
      });
      updateStats();
    });

    // Subscribe to recovery events
    const unsubscribeRecovery = errorRecoveryService.onRecovery((action, success) => {
      console.log(`🔧 Recovery ${success ? 'succeeded' : 'failed'}: ${action.name}`);
      updateStats();
    });

    // Subscribe to connection health changes
    const unsubscribeHealth = connectionManager.onHealthChange((health) => {
      setConnectionHealth(health);
    });

    // Load initial data
    loadActiveErrors();
    updateStats();

    // Auto-refresh if enabled
    let refreshInterval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      refreshInterval = setInterval(() => {
        loadActiveErrors();
        updateStats();
      }, 5000);
    }

    return () => {
      unsubscribeErrors();
      unsubscribeRecovery();
      unsubscribeHealth();
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [maxErrors, autoRefresh]);

  const loadActiveErrors = () => {
    const activeErrors = errorRecoveryService.getActiveErrors();
    setErrors(activeErrors.slice(0, maxErrors));
  };

  const updateStats = () => {
    setStats(errorRecoveryService.getStats());
  };

  const handleResolveError = (errorId: string) => {
    const success = errorRecoveryService.resolveError(errorId, 'manual');
    if (success) {
      setErrors(prev => prev.filter(e => e.id !== errorId));
      updateStats();
    }
  };

  const handleForceRecovery = () => {
    // Force connection recovery attempt
    connectionManager.attemptReconnection();
  };

  const getSeverityIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return <XCircle className="w-4 h-4 text-red-500" />;
      case ErrorSeverity.HIGH:
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case ErrorSeverity.MEDIUM:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case ErrorSeverity.LOW:
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case ErrorSeverity.HIGH:
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case ErrorSeverity.MEDIUM:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case ErrorSeverity.LOW:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getCategoryIcon = (category: ErrorCategory) => {
    switch (category) {
      case ErrorCategory.CONNECTION:
        return connectionHealth.isHealthy ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />;
      case ErrorCategory.SYSTEM:
        return <Server className="w-4 h-4" />;
      case ErrorCategory.DATA_SYNC:
        return <Database className="w-4 h-4" />;
      case ErrorCategory.TRANSACTION:
        return <Activity className="w-4 h-4" />;
      case ErrorCategory.PAYMENT:
        return <Zap className="w-4 h-4" />;
      case ErrorCategory.PROVIDER:
        return <Shield className="w-4 h-4" />;
      case ErrorCategory.PERFORMANCE:
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return timestamp.toLocaleDateString();
  };

  const getHealthStatusColor = () => {
    if (!connectionHealth.isHealthy) return 'text-red-400';
    if (connectionHealth.consecutiveFailures > 0) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getSystemHealthSummary = () => {
    const { totalErrors, activeErrors, criticalErrors, successfulRecoveries } = stats;
    
    if (criticalErrors > 0) {
      return { 
        status: 'Critical Issues', 
        color: 'text-red-400',
        icon: XCircle,
        description: `${criticalErrors} critical errors require immediate attention`
      };
    }
    
    if (activeErrors > 5) {
      return { 
        status: 'Multiple Issues', 
        color: 'text-orange-400',
        icon: AlertTriangle,
        description: `${activeErrors} active errors detected`
      };
    }
    
    if (activeErrors > 0) {
      return { 
        status: 'Minor Issues', 
        color: 'text-yellow-400',
        icon: AlertCircle,
        description: `${activeErrors} minor issues being monitored`
      };
    }
    
    return { 
      status: 'System Healthy', 
      color: 'text-green-400',
      icon: CheckCircle,
      description: 'All systems operating normally'
    };
  };

  const healthSummary = getSystemHealthSummary();
  const HealthIcon = healthSummary.icon;

  return (
    <Card className={`bg-gray-900/50 backdrop-blur-xl border-gray-800/50 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="mr-2 h-5 w-5 text-blue-400" />
            System Health & Recovery
            <div className={`ml-2 w-2 h-2 rounded-full ${connectionHealth.isHealthy ? 'bg-green-400' : 'bg-red-400'}`}></div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getSeverityColor(ErrorSeverity.HIGH)}>
              <HealthIcon className={`w-3 h-3 mr-1 ${healthSummary.color}`} />
              <span className={healthSummary.color}>{healthSummary.status}</span>
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="text-blue-400 hover:bg-blue-400/10"
            >
              {autoRefresh ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { loadActiveErrors(); updateStats(); }}
              className="text-green-400 hover:bg-green-400/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        <div className="text-xs text-gray-500">
          {healthSummary.description} • Connection: {connectionHealth.mode}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* System Health Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-800/20 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{stats.activeErrors}</div>
            <div className="text-xs text-gray-400 flex items-center justify-center mt-1">
              <AlertCircle className="w-3 h-3 mr-1" />
              Active Issues
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-400">{stats.criticalErrors}</div>
            <div className="text-xs text-gray-400">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-400">{stats.successfulRecoveries}</div>
            <div className="text-xs text-gray-400">Auto-Fixed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-400">{Math.round(connectionHealth.latency)}ms</div>
            <div className="text-xs text-gray-400">Latency</div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="p-3 bg-gray-800/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              {connectionHealth.isHealthy ? 
                <Wifi className={`w-4 h-4 mr-2 ${getHealthStatusColor()}`} /> : 
                <WifiOff className={`w-4 h-4 mr-2 ${getHealthStatusColor()}`} />
              }
              <span className="text-sm font-medium text-white">Connection Health</span>
            </div>
            <Badge className={`${getSeverityColor(
              connectionHealth.isHealthy ? ErrorSeverity.LOW : ErrorSeverity.HIGH
            )}`}>
              {connectionHealth.mode.toUpperCase()}
            </Badge>
          </div>
          <div className="text-xs text-gray-400">
            Status: {connectionHealth.state} • Failures: {connectionHealth.consecutiveFailures}
            {connectionHealth.lastSuccessfulConnection && (
              <> • Last Success: {formatTimestamp(connectionHealth.lastSuccessfulConnection)}</>
            )}
          </div>
          {!connectionHealth.isHealthy && (
            <div className="mt-2">
              <Button
                size="sm"
                onClick={handleForceRecovery}
                className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Force Recovery
              </Button>
            </div>
          )}
        </div>

        {/* Active Errors List */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">Active Issues</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-400 hover:bg-gray-700"
              >
                {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {isExpanded ? 'Collapse' : 'Expand'}
              </Button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {errors.slice(0, isExpanded ? errors.length : 3).map((error) => (
                <div
                  key={error.id}
                  className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2 flex-1">
                      <div className="flex flex-col items-center mt-0.5">
                        {getSeverityIcon(error.severity)}
                        {getCategoryIcon(error.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <Badge className={getSeverityColor(error.severity)}>
                            {error.severity.toUpperCase()}
                          </Badge>
                          <Badge className="bg-gray-600/20 text-gray-400 border-gray-600/30 text-xs">
                            {error.category.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium text-white mt-1 truncate">
                          {error.code.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{error.message}</div>
                        <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTimestamp(error.timestamp)}
                          </span>
                          {error.context?.retryAttempts && error.context.retryAttempts > 0 && (
                            <span className="flex items-center">
                              <RotateCcw className="w-3 h-3 mr-1" />
                              {error.context.retryAttempts} retries
                            </span>
                          )}
                        </div>
                        {showDetails && error.details && (
                          <div className="mt-2 p-2 bg-gray-900/50 rounded text-xs text-gray-400 font-mono">
                            {JSON.stringify(error.details, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolveError(error.id)}
                      className="ml-2 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {!isExpanded && errors.length > 3 && (
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(true)}
                  className="text-gray-400 hover:bg-gray-700"
                >
                  Show {errors.length - 3} more errors...
                </Button>
              </div>
            )}
          </div>
        )}

        {/* No Errors State */}
        {errors.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <div className="text-white font-medium">All Systems Operational</div>
            <div className="text-xs text-gray-400 mt-1">
              No active issues detected. Monitoring continues in the background.
            </div>
          </div>
        )}

        {/* Recovery Statistics */}
        {stats.totalErrors > 0 && (
          <div className="p-3 bg-gray-800/20 rounded-lg">
            <div className="text-sm font-medium text-white mb-2 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-blue-400" />
              Recovery Statistics
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-gray-400">Success Rate</div>
                <div className="text-white font-medium">
                  {stats.totalErrors > 0 
                    ? Math.round((stats.successfulRecoveries / stats.totalErrors) * 100)
                    : 0}%
                </div>
              </div>
              <div>
                <div className="text-gray-400">Avg Resolution</div>
                <div className="text-white font-medium">{stats.averageResolutionTime}s</div>
              </div>
              <div>
                <div className="text-gray-400">Total Handled</div>
                <div className="text-white font-medium">{stats.totalErrors}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}