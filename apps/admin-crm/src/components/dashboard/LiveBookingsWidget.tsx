import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import realTimeDashboardService, { LiveBooking } from '../../services/realTimeDashboardService';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader,
  Zap,
  RefreshCw,
  Filter
} from 'lucide-react';

interface LiveBookingsWidgetProps {
  className?: string;
}

export default function LiveBookingsWidget({ className }: LiveBookingsWidgetProps) {
  const [bookings, setBookings] = useState<LiveBooking[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Subscribe to real-time booking updates
    const unsubscribeBookings = realTimeDashboardService.onBookingsUpdate((updatedBookings) => {
      setBookings(updatedBookings);
      setLastUpdate(new Date());
      setLoading(false);
    });

    // Subscribe to connection status
    const unsubscribeConnection = realTimeDashboardService.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    return () => {
      unsubscribeBookings();
      unsubscribeConnection();
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
      confirmed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: CheckCircle },
      in_progress: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Zap },
      completed: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
      cancelled: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Clock };
    
    const IconComponent = config.icon;

    return (
      <Badge className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/10';
      case 'high': return 'text-orange-400 bg-orange-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'low': return 'text-green-400 bg-green-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (timeString: string) => {
    return new Date(timeString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getFilteredBookings = () => {
    if (filter === 'all') return bookings;
    return bookings.filter(booking => booking.status === filter);
  };

  const handleRefresh = () => {
    realTimeDashboardService.requestMetricsRefresh();
  };

  const getTimeUntilScheduled = (scheduledTime: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledTime);
    const diffMs = scheduled.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs < 0) {
      return 'Overdue';
    } else if (diffHours < 1) {
      return `${diffMinutes}m`;
    } else if (diffHours < 24) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ${diffHours % 24}h`;
    }
  };

  if (loading) {
    return (
      <Card className={`bg-gray-900/50 backdrop-blur-xl border-gray-800/50 ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-blue-400" />
              Live Bookings
            </div>
            <div className="animate-spin">
              <Loader className="h-4 w-4 text-blue-400" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-800/30 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredBookings = getFilteredBookings();

  return (
    <Card className={`bg-gray-900/50 backdrop-blur-xl border-gray-800/50 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-blue-400" />
            Live Bookings
            <div className={`ml-2 w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white text-sm rounded px-2 py-1"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-blue-400 hover:bg-blue-400/10"
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
      <CardContent className="p-0">
        <ScrollArea className="h-80">
          <div className="space-y-2 p-6 pt-0">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No bookings found</p>
                <p className="text-sm text-gray-500">
                  {filter !== 'all' ? `No ${filter} bookings` : 'No recent activity'}
                </p>
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-colors border border-gray-700/50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(booking.priority).split(' ')[0]}`}></div>
                      <span className="font-medium text-white">#{booking.id}</span>
                      <div className={`px-2 py-1 rounded text-xs ${getPriorityColor(booking.priority)}`}>
                        {booking.priority.toUpperCase()}
                      </div>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center text-gray-300">
                        <User className="w-4 h-4 mr-2 text-blue-400" />
                        <span className="truncate">{booking.customer_name}</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <Zap className="w-4 h-4 mr-2 text-purple-400" />
                        <span className="truncate">{booking.service_name}</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <User className="w-4 h-4 mr-2 text-green-400" />
                        <span className="truncate">{booking.provider_name}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-gray-300">
                        <Clock className="w-4 h-4 mr-2 text-yellow-400" />
                        <span>{formatDate(booking.scheduled_time)} at {formatTime(booking.scheduled_time)}</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <MapPin className="w-4 h-4 mr-2 text-red-400" />
                        <span className="truncate">{booking.location}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-gray-300">
                          <DollarSign className="w-4 h-4 mr-1 text-green-400" />
                          <span className="font-semibold">${booking.cost}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {getTimeUntilScheduled(booking.scheduled_time)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}