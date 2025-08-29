import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback } from '../ui/avatar';
import realTimeDashboardService, { UserActivity } from '../../services/realTimeDashboardService';
import {
  Users,
  UserPlus,
  UserMinus,
  LogIn,
  LogOut,
  ShoppingBag,
  Settings,
  Star,
  MessageSquare,
  CreditCard,
  CheckCircle,
  RefreshCw,
  Filter,
  Clock
} from 'lucide-react';

interface UserActivityWidgetProps {
  className?: string;
}

export default function UserActivityWidget({ className }: UserActivityWidgetProps) {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to real-time user activity updates
    const unsubscribeActivity = realTimeDashboardService.onUserActivityUpdate((updatedActivities) => {
      setActivities(updatedActivities);
      setLastUpdate(new Date());
      setLoading(false);
    });

    // Subscribe to connection status
    const unsubscribeConnection = realTimeDashboardService.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    return () => {
      unsubscribeActivity();
      unsubscribeConnection();
    };
  }, []);

  const getActivityIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('login') || actionLower.includes('signed in')) {
      return { icon: LogIn, color: 'text-green-400' };
    }
    if (actionLower.includes('logout') || actionLower.includes('signed out')) {
      return { icon: LogOut, color: 'text-gray-400' };
    }
    if (actionLower.includes('register') || actionLower.includes('joined')) {
      return { icon: UserPlus, color: 'text-blue-400' };
    }
    if (actionLower.includes('booking') || actionLower.includes('order')) {
      return { icon: ShoppingBag, color: 'text-purple-400' };
    }
    if (actionLower.includes('payment') || actionLower.includes('paid')) {
      return { icon: CreditCard, color: 'text-green-400' };
    }
    if (actionLower.includes('review') || actionLower.includes('rating')) {
      return { icon: Star, color: 'text-yellow-400' };
    }
    if (actionLower.includes('message') || actionLower.includes('chat')) {
      return { icon: MessageSquare, color: 'text-blue-400' };
    }
    if (actionLower.includes('complete') || actionLower.includes('finished')) {
      return { icon: CheckCircle, color: 'text-green-400' };
    }
    if (actionLower.includes('profile') || actionLower.includes('settings')) {
      return { icon: Settings, color: 'text-gray-400' };
    }
    if (actionLower.includes('online') || actionLower.includes('offline')) {
      return { icon: Users, color: actionLower.includes('online') ? 'text-green-400' : 'text-red-400' };
    }
    
    return { icon: Users, color: 'text-gray-400' };
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Admin' },
      provider: { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Provider' },
      customer: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Customer' }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || 
                  { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: role };
    
    return (
      <Badge className={`${config.color} text-xs`}>
        {config.label}
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

  const getFilteredActivities = () => {
    if (filter === 'all') return activities;
    return activities.filter(activity => activity.userRole === filter);
  };

  const getActivityStats = () => {
    const stats = {
      total: activities.length,
      customers: activities.filter(a => a.userRole === 'customer').length,
      providers: activities.filter(a => a.userRole === 'provider').length,
      admins: activities.filter(a => a.userRole === 'admin').length,
      recentHour: activities.filter(a => {
        const activityTime = new Date(a.timestamp);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return activityTime > oneHourAgo;
      }).length
    };
    return stats;
  };

  const handleRefresh = () => {
    realTimeDashboardService.requestMetricsRefresh();
  };

  const getUserInitials = (userName: string) => {
    return userName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card className={`bg-gray-900/50 backdrop-blur-xl border-gray-800/50 ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-purple-400" />
              User Activity
            </div>
            <div className="animate-spin">
              <RefreshCw className="h-4 w-4 text-purple-400" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-800 rounded animate-pulse w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredActivities = getFilteredActivities();
  const stats = getActivityStats();

  return (
    <Card className={`bg-gray-900/50 backdrop-blur-xl border-gray-800/50 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-purple-400" />
            User Activity
            <div className={`ml-2 w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white text-sm rounded px-2 py-1"
            >
              <option value="all">All Users</option>
              <option value="customer">Customers</option>
              <option value="provider">Providers</option>
              <option value="admin">Admins</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-purple-400 hover:bg-purple-400/10"
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
        {/* Activity Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6 p-3 bg-gray-800/20 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{stats.total}</div>
            <p className="text-xs text-gray-400">Total</p>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-400">{stats.customers}</div>
            <p className="text-xs text-gray-400">Customers</p>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-400">{stats.providers}</div>
            <p className="text-xs text-gray-400">Providers</p>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-400">{stats.recentHour}</div>
            <p className="text-xs text-gray-400">Last Hour</p>
          </div>
        </div>

        {/* Activity Feed */}
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activity found</p>
                <p className="text-sm text-gray-500">
                  {filter !== 'all' ? `No ${filter} activity` : 'No recent activity'}
                </p>
              </div>
            ) : (
              filteredActivities.map((activity, index) => {
                const { icon: IconComponent, color } = getActivityIcon(activity.action);
                
                return (
                  <div
                    key={`${activity.userId}-${index}`}
                    className="flex items-start space-x-3 p-3 bg-gray-800/20 rounded-lg hover:bg-gray-800/40 transition-colors"
                  >
                    <Avatar className="w-8 h-8 bg-gray-700">
                      <AvatarFallback className="bg-gray-700 text-gray-300 text-xs">
                        {getUserInitials(activity.userName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <IconComponent className={`w-4 h-4 ${color}`} />
                        <span className="font-medium text-white truncate">
                          {activity.userName}
                        </span>
                        {getRoleBadge(activity.userRole)}
                      </div>
                      
                      <p className="text-sm text-gray-300 mb-1">
                        {activity.action}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {getTimeAgo(activity.timestamp)}
                        </span>
                        
                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <div className="text-xs text-gray-500">
                            {Object.entries(activity.metadata).map(([key, value]) => (
                              <span key={key} className="ml-2">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
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