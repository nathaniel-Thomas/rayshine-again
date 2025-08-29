import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import realTimeDashboardService from '../../services/realTimeDashboardService';
import { Users, RefreshCw, Clock, Zap, Activity } from 'lucide-react';

interface ActivityData {
  hour: number;
  day: number; // 0 = Sunday, 1 = Monday, etc.
  intensity: number; // 0-100
  bookings: number;
  providers: number;
}

interface ProviderActivityHeatmapProps {
  className?: string;
}

export default function ProviderActivityHeatmap({ className }: ProviderActivityHeatmapProps) {
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [hoveredCell, setHoveredCell] = useState<ActivityData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    // Subscribe to connection status
    const unsubscribeConnection = realTimeDashboardService.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    // Generate initial heatmap data
    generateHeatmapData();
    
    // Update current hour every minute
    const hourInterval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);

    // Refresh data every 5 minutes
    const dataInterval = setInterval(() => {
      generateHeatmapData();
    }, 5 * 60 * 1000);

    return () => {
      unsubscribeConnection();
      clearInterval(hourInterval);
      clearInterval(dataInterval);
    };
  }, []);

  const generateHeatmapData = () => {
    const data: ActivityData[] = [];
    const now = new Date();
    
    // Generate data for the past week
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        // Create realistic activity patterns
        let baseIntensity = 0;
        
        // Business hours (9 AM - 5 PM) have higher activity
        if (hour >= 9 && hour <= 17) {
          baseIntensity = 60;
        }
        // Evening hours (6 PM - 10 PM) have moderate activity
        else if (hour >= 18 && hour <= 22) {
          baseIntensity = 40;
        }
        // Early morning (6 AM - 8 AM) has some activity
        else if (hour >= 6 && hour <= 8) {
          baseIntensity = 30;
        }
        // Night hours have minimal activity
        else {
          baseIntensity = 10;
        }
        
        // Weekend adjustments
        if (day === 0 || day === 6) {
          if (hour >= 10 && hour <= 16) {
            baseIntensity = Math.max(baseIntensity * 0.7, 20);
          } else {
            baseIntensity = Math.max(baseIntensity * 0.5, 5);
          }
        }
        
        // Add some randomness
        const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
        const intensity = Math.min(100, Math.max(0, baseIntensity * randomFactor));
        
        // Calculate derived metrics
        const bookings = Math.round((intensity / 100) * 15); // Max 15 bookings per hour
        const providers = Math.round((intensity / 100) * 8); // Max 8 active providers per hour
        
        data.push({
          hour,
          day,
          intensity,
          bookings,
          providers
        });
      }
    }
    
    setActivityData(data);
    setLastUpdate(new Date());
  };

  const getIntensityColor = (intensity: number): string => {
    if (intensity >= 80) return 'bg-green-500';
    if (intensity >= 60) return 'bg-green-400';
    if (intensity >= 40) return 'bg-yellow-400';
    if (intensity >= 20) return 'bg-orange-400';
    if (intensity >= 10) return 'bg-red-400';
    return 'bg-gray-600';
  };

  const getIntensityOpacity = (intensity: number): string => {
    if (intensity >= 80) return 'opacity-100';
    if (intensity >= 60) return 'opacity-80';
    if (intensity >= 40) return 'opacity-60';
    if (intensity >= 20) return 'opacity-40';
    if (intensity >= 10) return 'opacity-30';
    return 'opacity-20';
  };

  const isCurrentHour = (day: number, hour: number): boolean => {
    const now = new Date();
    return day === now.getDay() && hour === now.getHours();
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const getActivityLevel = (intensity: number): string => {
    if (intensity >= 80) return 'Very High';
    if (intensity >= 60) return 'High';
    if (intensity >= 40) return 'Medium';
    if (intensity >= 20) return 'Low';
    if (intensity >= 10) return 'Very Low';
    return 'Minimal';
  };

  const handleRefresh = () => {
    generateHeatmapData();
  };

  const totalActivity = activityData.reduce((sum, cell) => sum + cell.intensity, 0);
  const averageActivity = activityData.length > 0 ? totalActivity / activityData.length : 0;
  const peakActivity = Math.max(...activityData.map(cell => cell.intensity));
  const peakCell = activityData.find(cell => cell.intensity === peakActivity);

  return (
    <Card className={`bg-gray-900/50 backdrop-blur-xl border-gray-800/50 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-purple-400" />
            Provider Activity Heatmap
            <div className={`ml-2 w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
              <Activity className="w-3 h-3 mr-1" />
              Avg: {averageActivity.toFixed(0)}%
            </Badge>
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
        <div className="text-xs text-gray-500">
          Last 7 days • Peak activity: {peakActivity.toFixed(0)}% ({days[peakCell?.day || 0]} {formatHour(peakCell?.hour || 0)})
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Activity Level:</span>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-600 opacity-20 rounded-sm"></div>
              <span className="text-xs text-gray-500">Low</span>
              <div className="w-3 h-3 bg-yellow-400 opacity-60 rounded-sm"></div>
              <span className="text-xs text-gray-500">Med</span>
              <div className="w-3 h-3 bg-green-500 opacity-100 rounded-sm"></div>
              <span className="text-xs text-gray-500">High</span>
            </div>
          </div>
          {lastUpdate && (
            <div className="text-xs text-gray-500">
              Updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Heatmap Grid */}
        <div className="relative">
          {/* Hour labels */}
          <div className="flex ml-8">
            {[0, 6, 12, 18].map(hour => (
              <div key={hour} className="flex-1 text-center">
                <div className="text-xs text-gray-400">{formatHour(hour)}</div>
              </div>
            ))}
          </div>
          
          {/* Grid */}
          <div className="mt-2">
            {days.map((day, dayIndex) => (
              <div key={day} className="flex items-center mb-1">
                <div className="w-8 text-xs text-gray-400 text-right pr-2">
                  {day}
                </div>
                <div className="flex space-x-1">
                  {hours.map(hour => {
                    const cellData = activityData.find(
                      cell => cell.day === dayIndex && cell.hour === hour
                    );
                    const isCurrent = isCurrentHour(dayIndex, hour);
                    
                    return (
                      <div
                        key={`${dayIndex}-${hour}`}
                        className={`w-3 h-3 rounded-sm cursor-pointer transition-all duration-200 hover:scale-125 ${
                          cellData ? getIntensityColor(cellData.intensity) : 'bg-gray-600'
                        } ${
                          cellData ? getIntensityOpacity(cellData.intensity) : 'opacity-20'
                        } ${
                          isCurrent ? 'ring-2 ring-blue-400 ring-opacity-75' : ''
                        }`}
                        onMouseEnter={() => setHoveredCell(cellData || null)}
                        onMouseLeave={() => setHoveredCell(null)}
                        title={
                          cellData
                            ? `${days[dayIndex]} ${formatHour(hour)}: ${getActivityLevel(cellData.intensity)} (${cellData.bookings} bookings, ${cellData.providers} providers)`
                            : 'No data'
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tooltip */}
        {hoveredCell && (
          <div className="mt-4 p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
            <div className="text-sm font-medium text-white">
              {days[hoveredCell.day]} {formatHour(hoveredCell.hour)}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-2 text-xs">
              <div>
                <div className="text-gray-400">Activity</div>
                <div className="text-white font-medium">
                  {getActivityLevel(hoveredCell.intensity)} ({hoveredCell.intensity.toFixed(0)}%)
                </div>
              </div>
              <div>
                <div className="text-gray-400">Bookings</div>
                <div className="text-blue-400 font-medium">{hoveredCell.bookings}</div>
              </div>
              <div>
                <div className="text-gray-400">Providers</div>
                <div className="text-green-400 font-medium">{hoveredCell.providers}</div>
              </div>
            </div>
          </div>
        )}

        {/* Current time indicator */}
        <div className="mt-4 flex items-center justify-center">
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Current Time: {formatHour(currentHour)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}