import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
  Plugin
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import realTimeDashboardService, { DashboardMetrics } from '../../services/realTimeDashboardService';
import { TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TrendDataPoint {
  timestamp: Date;
  bookings: number;
  revenue: number;
}

interface RealTimeTrendChartProps {
  className?: string;
  height?: number;
  timeWindow?: number; // minutes of data to show
}

export default function RealTimeTrendChart({ 
  className, 
  height = 300,
  timeWindow = 30 
}: RealTimeTrendChartProps) {
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<DashboardMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const chartRef = useRef<ChartJS<'line'>>(null);

  useEffect(() => {
    // Subscribe to real-time metrics updates
    const unsubscribeMetrics = realTimeDashboardService.onMetricsUpdate((metrics) => {
      setCurrentMetrics(metrics);
      addDataPoint(metrics);
    });

    // Subscribe to connection status
    const unsubscribeConnection = realTimeDashboardService.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    // Initialize with current data
    const initialMetrics = realTimeDashboardService.getCurrentMetrics();
    if (initialMetrics) {
      setCurrentMetrics(initialMetrics);
      initializeChart(initialMetrics);
    }

    return () => {
      unsubscribeMetrics();
      unsubscribeConnection();
    };
  }, []);

  const initializeChart = (metrics: DashboardMetrics) => {
    // Create initial data points for the last few minutes
    const now = new Date();
    const initialData: TrendDataPoint[] = [];
    
    for (let i = timeWindow; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60000); // i minutes ago
      initialData.push({
        timestamp,
        bookings: metrics.todaysBookings * (0.8 + Math.random() * 0.4), // Simulate historical data
        revenue: metrics.revenueToday * (0.8 + Math.random() * 0.4)
      });
    }
    
    setTrendData(initialData);
  };

  const addDataPoint = (metrics: DashboardMetrics) => {
    const newDataPoint: TrendDataPoint = {
      timestamp: new Date(),
      bookings: metrics.todaysBookings,
      revenue: metrics.revenueToday
    };

    setTrendData(prevData => {
      const newData = [...prevData, newDataPoint];
      // Keep only data within the time window
      const cutoffTime = new Date(Date.now() - timeWindow * 60000);
      return newData.filter(point => point.timestamp >= cutoffTime);
    });
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getTrendDirection = (trend: number) => {
    if (trend > 5) return { icon: TrendingUp, color: 'text-green-400', label: 'Increasing' };
    if (trend < -5) return { icon: TrendingDown, color: 'text-red-400', label: 'Decreasing' };
    return { icon: Activity, color: 'text-gray-400', label: 'Stable' };
  };

  const chartData: ChartData<'line'> = {
    labels: trendData.map(point => formatTime(point.timestamp)),
    datasets: [
      {
        label: 'Bookings',
        data: trendData.map(point => point.bookings),
        borderColor: 'rgb(59, 130, 246)', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: false,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: 'Revenue ($)',
        data: trendData.map(point => point.revenue),
        borderColor: 'rgb(16, 185, 129)', // green-500
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: false,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 2,
        yAxisID: 'y1',
      }
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart',
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          color: 'rgb(156, 163, 175)', // gray-400
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)', // gray-900 with opacity
        titleColor: 'rgb(243, 244, 246)', // gray-100
        bodyColor: 'rgb(209, 213, 219)', // gray-300
        borderColor: 'rgb(75, 85, 99)', // gray-600
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label === 'Revenue ($)') {
              return `${label}: $${value.toFixed(0)}`;
            }
            return `${label}: ${value.toFixed(0)}`;
          }
        }
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
          color: 'rgb(156, 163, 175)',
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          maxTicksLimit: 8,
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Bookings',
          color: 'rgb(59, 130, 246)',
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          callback: function(value) {
            return Math.round(Number(value));
          }
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Revenue ($)',
          color: 'rgb(16, 185, 129)',
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          callback: function(value) {
            return `$${Math.round(Number(value))}`;
          }
        },
      },
    },
  };

  const bookingsTrend = getTrendDirection(currentMetrics?.trends?.bookingsTrend || 0);
  const revenueTrend = getTrendDirection(currentMetrics?.trends?.revenueTrend || 0);
  const BookingsTrendIcon = bookingsTrend.icon;
  const RevenueTrendIcon = revenueTrend.icon;

  return (
    <Card className={`bg-gray-900/50 backdrop-blur-xl border-gray-800/50 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5 text-purple-400" />
            Real-Time Trends
            <div className={`ml-2 w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              <BookingsTrendIcon className="w-3 h-3 mr-1" />
              Bookings {bookingsTrend.label}
            </Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              <RevenueTrendIcon className="w-3 h-3 mr-1" />
              Revenue {revenueTrend.label}
            </Badge>
          </div>
        </CardTitle>
        <div className="text-xs text-gray-500">
          Last {timeWindow} minutes • Updates in real-time
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-800/20 rounded-lg">
            <div className="text-lg font-bold text-blue-400">
              {currentMetrics?.todaysBookings || 0}
            </div>
            <div className="text-xs text-gray-400">Current Bookings</div>
            <div className={`text-xs flex items-center justify-center mt-1 ${bookingsTrend.color}`}>
              <BookingsTrendIcon className="w-3 h-3 mr-1" />
              {currentMetrics?.trends?.bookingsTrend?.toFixed(1) || 0}%
            </div>
          </div>
          <div className="text-center p-3 bg-gray-800/20 rounded-lg">
            <div className="text-lg font-bold text-green-400">
              ${currentMetrics?.revenueToday || 0}
            </div>
            <div className="text-xs text-gray-400">Current Revenue</div>
            <div className={`text-xs flex items-center justify-center mt-1 ${revenueTrend.color}`}>
              <RevenueTrendIcon className="w-3 h-3 mr-1" />
              {currentMetrics?.trends?.revenueTrend?.toFixed(1) || 0}%
            </div>
          </div>
        </div>
        
        <div style={{ height: `${height}px` }}>
          <Line ref={chartRef} data={chartData} options={options} />
        </div>
        
        <div className="mt-4 text-center">
          <div className="text-xs text-gray-500">
            {trendData.length > 0 && (
              <>
                Data points: {trendData.length} • 
                Latest update: {trendData[trendData.length - 1]?.timestamp.toLocaleTimeString()}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}