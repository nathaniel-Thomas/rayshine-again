// Chart Visualization Utilities for Rayshine Admin CRM
// Comprehensive utilities for creating, configuring, and managing chart visualizations

import {
  ChartDataSet,
  ChartDataPoint,
  ChartType,
  ChartColor,
  ChartOptions,
  ChartAnimations,
  LegendOptions,
  AxisOptions,
  AxisConfig,
  GridOptions,
  DashboardMetrics,
  LiveBooking,
  UserActivity,
  KPIHistoricalPoint
} from '../types/dashboardTypes';

export interface ChartConfiguration {
  id: string;
  title: string;
  subtitle?: string;
  width?: number;
  height?: number;
  responsive: boolean;
  maintainAspectRatio: boolean;
  datasets: ChartDataSet[];
  globalOptions: ChartOptions;
  theme: ChartTheme;
}

export interface ChartTheme {
  name: string;
  colors: {
    primary: string[];
    secondary: string[];
    background: string;
    text: string;
    grid: string;
    axis: string;
  };
  fonts: {
    title: ChartFont;
    label: ChartFont;
    tooltip: ChartFont;
  };
  spacing: {
    padding: number;
    margin: number;
  };
}

export interface ChartFont {
  family: string;
  size: number;
  weight: 'normal' | 'bold' | 'lighter' | 'bolder';
  color: string;
}

export interface RealTimeChartManager {
  chartId: string;
  updateInterval: number;
  maxDataPoints: number;
  autoScroll: boolean;
  isPaused: boolean;
}

class ChartVisualizationService {
  private chartConfigurations: Map<string, ChartConfiguration> = new Map();
  private realTimeManagers: Map<string, RealTimeChartManager> = new Map();
  private themes: Map<string, ChartTheme> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeThemes();
    this.initializeDefaultChartConfigurations();
  }

  // ================== INITIALIZATION ==================

  private initializeThemes(): void {
    // Dark theme for admin dashboard
    this.themes.set('dark', {
      name: 'dark',
      colors: {
        primary: [
          '#3B82F6', // Blue
          '#10B981', // Green
          '#F59E0B', // Yellow
          '#EF4444', // Red
          '#8B5CF6', // Purple
          '#06B6D4', // Cyan
          '#F97316', // Orange
          '#EC4899'  // Pink
        ],
        secondary: [
          '#60A5FA',
          '#34D399',
          '#FBBF24',
          '#F87171',
          '#A78BFA',
          '#22D3EE',
          '#FB923C',
          '#F472B6'
        ],
        background: '#1F2937',
        text: '#F9FAFB',
        grid: '#374151',
        axis: '#6B7280'
      },
      fonts: {
        title: { family: 'Inter, sans-serif', size: 16, weight: 'bold', color: '#F9FAFB' },
        label: { family: 'Inter, sans-serif', size: 12, weight: 'normal', color: '#D1D5DB' },
        tooltip: { family: 'Inter, sans-serif', size: 11, weight: 'normal', color: '#F9FAFB' }
      },
      spacing: {
        padding: 16,
        margin: 8
      }
    });

    // Light theme alternative
    this.themes.set('light', {
      name: 'light',
      colors: {
        primary: [
          '#2563EB', '#059669', '#D97706', '#DC2626',
          '#7C3AED', '#0891B2', '#EA580C', '#BE185D'
        ],
        secondary: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
          '#8B5CF6', '#06B6D4', '#F97316', '#EC4899'
        ],
        background: '#FFFFFF',
        text: '#111827',
        grid: '#E5E7EB',
        axis: '#6B7280'
      },
      fonts: {
        title: { family: 'Inter, sans-serif', size: 16, weight: 'bold', color: '#111827' },
        label: { family: 'Inter, sans-serif', size: 12, weight: 'normal', color: '#4B5563' },
        tooltip: { family: 'Inter, sans-serif', size: 11, weight: 'normal', color: '#111827' }
      },
      spacing: {
        padding: 16,
        margin: 8
      }
    });
  }

  private initializeDefaultChartConfigurations(): void {
    // Revenue Trend Chart
    this.createChartConfiguration({
      id: 'revenue_trend',
      title: 'Revenue Trend',
      subtitle: 'Daily revenue over time',
      responsive: true,
      maintainAspectRatio: false,
      height: 300,
      datasets: [{
        id: 'revenue_data',
        label: 'Daily Revenue',
        data: [],
        chartType: 'line',
        color: this.createGradientColor('#3B82F6', '#1D4ED8'),
        options: {
          realTimeUpdate: true,
          updateInterval: 60000, // 1 minute
          maxDataPoints: 30,
          animations: { enabled: true, duration: 750, easing: 'easeInOut' },
          responsive: true,
          legend: { show: true, position: 'top', align: 'end' },
          axes: {
            x: {
              show: true,
              label: 'Time',
              format: 'datetime',
              grid: { show: true, color: '#374151', width: 1 }
            },
            y: {
              show: true,
              label: 'Revenue ($)',
              format: 'currency',
              grid: { show: true, color: '#374151', width: 1 }
            }
          }
        }
      }],
      globalOptions: {
        realTimeUpdate: true,
        responsive: true,
        animations: { enabled: true, duration: 750, easing: 'easeInOut' },
        legend: { show: true, position: 'top', align: 'end' },
        axes: {
          x: {
            show: true,
            label: 'Time',
            format: 'datetime',
            grid: { show: true, color: '#374151', width: 1 }
          },
          y: {
            show: true,
            label: 'Revenue ($)',
            format: 'currency',
            grid: { show: true, color: '#374151', width: 1 }
          }
        }
      },
      theme: this.themes.get('dark')!
    });

    // Booking Status Distribution
    this.createChartConfiguration({
      id: 'booking_status_pie',
      title: 'Booking Status Distribution',
      responsive: true,
      maintainAspectRatio: true,
      height: 250,
      datasets: [{
        id: 'booking_status_data',
        label: 'Bookings',
        data: [],
        chartType: 'doughnut',
        color: { primary: '#3B82F6' },
        options: {
          realTimeUpdate: true,
          updateInterval: 30000, // 30 seconds
          animations: { enabled: true, duration: 500, easing: 'easeInOut' },
          responsive: true,
          legend: { show: true, position: 'right', align: 'center' },
          axes: { x: { show: false }, y: { show: false } }
        }
      }],
      globalOptions: {
        realTimeUpdate: true,
        responsive: true,
        animations: { enabled: true, duration: 500, easing: 'easeInOut' },
        legend: { show: true, position: 'right', align: 'center' },
        axes: { x: { show: false }, y: { show: false } }
      },
      theme: this.themes.get('dark')!
    });

    // Provider Performance Heatmap
    this.createChartConfiguration({
      id: 'provider_performance_heatmap',
      title: 'Provider Performance Heatmap',
      subtitle: 'PPS scores by provider and time period',
      responsive: true,
      maintainAspectRatio: false,
      height: 400,
      datasets: [{
        id: 'provider_heatmap_data',
        label: 'PPS Score',
        data: [],
        chartType: 'heatmap',
        color: this.createGradientColor('#FEF3C7', '#F59E0B'),
        options: {
          realTimeUpdate: false,
          animations: { enabled: true, duration: 1000, easing: 'easeInOut' },
          responsive: true,
          legend: { show: true, position: 'bottom', align: 'center' },
          axes: {
            x: { show: true, label: 'Time Period', grid: { show: false } },
            y: { show: true, label: 'Provider', grid: { show: false } }
          }
        }
      }],
      globalOptions: {
        realTimeUpdate: false,
        responsive: true,
        animations: { enabled: true, duration: 1000, easing: 'easeInOut' },
        legend: { show: true, position: 'bottom', align: 'center' },
        axes: {
          x: { show: true, label: 'Time Period', grid: { show: false } },
          y: { show: true, label: 'Provider', grid: { show: false } }
        }
      },
      theme: this.themes.get('dark')!
    });

    // System Health Gauge
    this.createChartConfiguration({
      id: 'system_health_gauge',
      title: 'System Health',
      responsive: true,
      maintainAspectRatio: true,
      height: 200,
      datasets: [{
        id: 'system_health_data',
        label: 'Health Score',
        data: [],
        chartType: 'gauge',
        color: this.createGradientColor('#10B981', '#059669'),
        options: {
          realTimeUpdate: true,
          updateInterval: 5000, // 5 seconds
          animations: { enabled: true, duration: 1500, easing: 'easeInOut' },
          responsive: true,
          legend: { show: false },
          axes: { x: { show: false }, y: { show: false } }
        }
      }],
      globalOptions: {
        realTimeUpdate: true,
        responsive: true,
        animations: { enabled: true, duration: 1500, easing: 'easeInOut' },
        legend: { show: false },
        axes: { x: { show: false }, y: { show: false } }
      },
      theme: this.themes.get('dark')!
    });
  }

  // ================== CHART CONFIGURATION MANAGEMENT ==================

  public createChartConfiguration(config: Omit<ChartConfiguration, 'globalOptions'> & { globalOptions?: Partial<ChartOptions> }): void {
    const fullConfig: ChartConfiguration = {
      ...config,
      globalOptions: {
        realTimeUpdate: false,
        responsive: true,
        animations: { enabled: true, duration: 750, easing: 'easeInOut' },
        legend: { show: true, position: 'top', align: 'center' },
        axes: {
          x: { show: true, grid: { show: true, color: '#374151', width: 1 } },
          y: { show: true, grid: { show: true, color: '#374151', width: 1 } }
        },
        ...config.globalOptions
      }
    };

    this.chartConfigurations.set(config.id, fullConfig);

    // Set up real-time updates if enabled
    if (fullConfig.globalOptions.realTimeUpdate) {
      this.setupRealTimeUpdates(config.id, fullConfig.globalOptions.updateInterval || 60000);
    }
  }

  public getChartConfiguration(chartId: string): ChartConfiguration | undefined {
    return this.chartConfigurations.get(chartId);
  }

  public updateChartConfiguration(chartId: string, updates: Partial<ChartConfiguration>): boolean {
    const existing = this.chartConfigurations.get(chartId);
    if (!existing) return false;

    const updated: ChartConfiguration = { ...existing, ...updates };
    this.chartConfigurations.set(chartId, updated);
    return true;
  }

  public deleteChartConfiguration(chartId: string): boolean {
    this.stopRealTimeUpdates(chartId);
    return this.chartConfigurations.delete(chartId);
  }

  // ================== DATA TRANSFORMATION FOR CHARTS ==================

  public transformDashboardMetricsToChartData(metrics: DashboardMetrics): Map<string, ChartDataPoint[]> {
    const chartData = new Map<string, ChartDataPoint[]>();

    // Revenue trend data
    chartData.set('revenue_trend', [
      { x: new Date().toISOString(), y: metrics.revenueToday, label: 'Today' }
    ]);

    // Booking status distribution
    const bookingStatusData: ChartDataPoint[] = [
      { x: 'Completed', y: metrics.completedBookings, label: 'Completed' },
      { x: 'Today\'s Bookings', y: metrics.todaysBookings, label: 'Active' },
      { x: 'Pending', y: metrics.pendingApprovals, label: 'Pending' }
    ];
    chartData.set('booking_status_pie', bookingStatusData);

    // System health gauge
    const healthScore = this.calculateSystemHealthScore(metrics.systemHealth);
    chartData.set('system_health_gauge', [
      { x: 'Health', y: healthScore, label: `${healthScore}%` }
    ]);

    return chartData;
  }

  public transformBookingDataToTimeSeriesChart(
    bookings: LiveBooking[],
    timeField: 'createdAt' | 'updatedAt' | 'scheduledStartTime' = 'createdAt',
    valueField: 'finalCost' | 'count' = 'count',
    granularity: 'hour' | 'day' | 'week' = 'day'
  ): ChartDataPoint[] {
    // Group bookings by time period
    const groups = new Map<string, LiveBooking[]>();

    bookings.forEach(booking => {
      let timestamp: Date;
      switch (timeField) {
        case 'createdAt':
          timestamp = new Date(booking.createdAt);
          break;
        case 'updatedAt':
          timestamp = new Date(booking.updatedAt);
          break;
        case 'scheduledStartTime':
          timestamp = new Date(booking.scheduledStartTime);
          break;
      }

      const periodKey = this.getPeriodKey(timestamp, granularity);
      
      if (!groups.has(periodKey)) {
        groups.set(periodKey, []);
      }
      
      groups.get(periodKey)!.push(booking);
    });

    // Convert to chart data points
    const chartData: ChartDataPoint[] = [];
    
    for (const [periodKey, periodBookings] of groups) {
      let value: number;
      
      if (valueField === 'count') {
        value = periodBookings.length;
      } else {
        value = periodBookings.reduce((sum, booking) => {
          return sum + (booking.pricing?.finalCost || booking.pricing?.totalEstimated || 0);
        }, 0);
      }

      chartData.push({
        x: periodKey,
        y: value,
        label: `${periodKey}: ${value}`,
        metadata: {
          bookingCount: periodBookings.length,
          bookings: periodBookings.map(b => b.id)
        }
      });
    }

    return chartData.sort((a, b) => String(a.x).localeCompare(String(b.x)));
  }

  public transformUserActivityToChart(
    activities: UserActivity[],
    chartType: 'timeline' | 'heatmap' | 'bar' = 'timeline'
  ): ChartDataPoint[] {
    switch (chartType) {
      case 'timeline':
        return activities.map(activity => ({
          x: activity.timestamp,
          y: this.getActivityScore(activity),
          label: `${activity.userName}: ${activity.action}`,
          metadata: { activity }
        }));

      case 'heatmap':
        return this.createActivityHeatmapData(activities);

      case 'bar':
        return this.createActivityBarData(activities);

      default:
        return [];
    }
  }

  // ================== REAL-TIME CHART MANAGEMENT ==================

  private setupRealTimeUpdates(chartId: string, interval: number): void {
    const manager: RealTimeChartManager = {
      chartId,
      updateInterval: interval,
      maxDataPoints: 50,
      autoScroll: true,
      isPaused: false
    };

    this.realTimeManagers.set(chartId, manager);

    const updateInterval = setInterval(() => {
      if (!manager.isPaused) {
        this.updateChartData(chartId);
      }
    }, interval);

    this.updateIntervals.set(chartId, updateInterval);
  }

  private stopRealTimeUpdates(chartId: string): void {
    const interval = this.updateIntervals.get(chartId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(chartId);
    }
    this.realTimeManagers.delete(chartId);
  }

  public pauseRealTimeUpdates(chartId: string): boolean {
    const manager = this.realTimeManagers.get(chartId);
    if (manager) {
      manager.isPaused = true;
      return true;
    }
    return false;
  }

  public resumeRealTimeUpdates(chartId: string): boolean {
    const manager = this.realTimeManagers.get(chartId);
    if (manager) {
      manager.isPaused = false;
      return true;
    }
    return false;
  }

  private updateChartData(chartId: string): void {
    // This would be called by the real-time dashboard service
    console.log(`📊 Updating chart data for: ${chartId}`);
    
    // Emit event for chart components to listen to
    window.dispatchEvent(new CustomEvent('chart-data-update', {
      detail: { chartId, timestamp: new Date().toISOString() }
    }));
  }

  // ================== COLOR AND STYLING UTILITIES ==================

  private createGradientColor(startColor: string, endColor: string): ChartColor {
    return {
      primary: startColor,
      secondary: endColor,
      gradient: {
        start: startColor,
        end: endColor,
        direction: 'vertical'
      }
    };
  }

  public generateColorPalette(count: number, theme: string = 'dark'): string[] {
    const themeColors = this.themes.get(theme);
    if (!themeColors) return [];

    const colors = themeColors.colors.primary;
    const palette: string[] = [];

    for (let i = 0; i < count; i++) {
      palette.push(colors[i % colors.length]);
    }

    return palette;
  }

  public applyThemeToChart(chartId: string, themeName: string): boolean {
    const config = this.chartConfigurations.get(chartId);
    const theme = this.themes.get(themeName);
    
    if (!config || !theme) return false;

    config.theme = theme;
    this.chartConfigurations.set(chartId, config);
    return true;
  }

  // ================== CHART TYPE SPECIFIC UTILITIES ==================

  public createSparklineData(
    values: number[],
    options: {
      showTrend?: boolean;
      trendColor?: string;
      maxPoints?: number;
    } = {}
  ): ChartDataPoint[] {
    const { showTrend = true, maxPoints = 20 } = options;
    
    let processedValues = values;
    if (maxPoints && values.length > maxPoints) {
      const step = values.length / maxPoints;
      processedValues = values.filter((_, index) => index % Math.ceil(step) === 0);
    }

    return processedValues.map((value, index) => ({
      x: index,
      y: value,
      metadata: { 
        trend: showTrend ? this.calculateTrend(processedValues, index) : undefined 
      }
    }));
  }

  public createGaugeData(
    value: number,
    min: number = 0,
    max: number = 100,
    thresholds?: { warning: number; danger: number }
  ): ChartDataPoint[] {
    let color = '#10B981'; // Green default
    
    if (thresholds) {
      if (value >= thresholds.danger) {
        color = '#EF4444'; // Red
      } else if (value >= thresholds.warning) {
        color = '#F59E0B'; // Yellow
      }
    }

    return [{
      x: 'value',
      y: Math.max(min, Math.min(max, value)),
      label: `${value}%`,
      metadata: { min, max, color, thresholds }
    }];
  }

  public createHeatmapData(
    data: Array<{ x: string | number; y: string | number; value: number }>,
    colorScale: 'linear' | 'logarithmic' = 'linear'
  ): ChartDataPoint[] {
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return data.map(item => {
      let normalizedValue: number;
      
      if (colorScale === 'logarithmic' && item.value > 0) {
        normalizedValue = Math.log(item.value) / Math.log(max);
      } else {
        normalizedValue = (item.value - min) / (max - min);
      }

      return {
        x: item.x,
        y: item.y,
        label: String(item.value),
        metadata: {
          originalValue: item.value,
          normalizedValue,
          intensity: normalizedValue
        }
      };
    });
  }

  // ================== UTILITY METHODS ==================

  private calculateSystemHealthScore(systemHealth: any): number {
    const components = Object.values(systemHealth);
    const onlineCount = components.filter(status => status === 'online').length;
    return Math.round((onlineCount / components.length) * 100);
  }

  private getActivityScore(activity: UserActivity): number {
    // Assign score based on activity type and importance
    const scores = {
      'authentication': 1,
      'booking_action': 3,
      'payment_action': 4,
      'profile_update': 2,
      'system_action': 2,
      'communication': 2,
      'admin_action': 5,
      'api_request': 1
    };

    return scores[activity.actionType] || 1;
  }

  private createActivityHeatmapData(activities: UserActivity[]): ChartDataPoint[] {
    // Group by hour and day of week
    const heatmapData = new Map<string, number>();

    activities.forEach(activity => {
      const date = new Date(activity.timestamp);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      const key = `${dayOfWeek}-${hour}`;
      
      heatmapData.set(key, (heatmapData.get(key) || 0) + 1);
    });

    return Array.from(heatmapData.entries()).map(([key, count]) => {
      const [dayOfWeek, hour] = key.split('-');
      return {
        x: parseInt(hour),
        y: parseInt(dayOfWeek),
        label: `${count} activities`,
        metadata: { count, dayOfWeek, hour }
      };
    });
  }

  private createActivityBarData(activities: UserActivity[]): ChartDataPoint[] {
    const actionCounts = new Map<string, number>();

    activities.forEach(activity => {
      actionCounts.set(activity.action, (actionCounts.get(activity.action) || 0) + 1);
    });

    return Array.from(actionCounts.entries())
      .map(([action, count]) => ({
        x: action,
        y: count,
        label: `${action}: ${count}`
      }))
      .sort((a, b) => (b.y as number) - (a.y as number));
  }

  private getPeriodKey(date: Date, granularity: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');

    switch (granularity) {
      case 'hour':
        return `${year}-${month}-${day} ${hour}:00`;
      case 'day':
        return `${year}-${month}-${day}`;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${String(Math.ceil(weekStart.getDate() / 7)).padStart(2, '0')}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  private calculateTrend(values: number[], currentIndex: number): 'up' | 'down' | 'stable' {
    if (currentIndex === 0) return 'stable';
    
    const current = values[currentIndex];
    const previous = values[currentIndex - 1];
    
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'stable';
  }

  // ================== PUBLIC API ==================

  public getAllChartConfigurations(): ChartConfiguration[] {
    return Array.from(this.chartConfigurations.values());
  }

  public getChartConfigurationsByType(chartType: ChartType): ChartConfiguration[] {
    return Array.from(this.chartConfigurations.values())
      .filter(config => config.datasets.some(dataset => dataset.chartType === chartType));
  }

  public exportChartConfiguration(chartId: string): string | null {
    const config = this.chartConfigurations.get(chartId);
    return config ? JSON.stringify(config, null, 2) : null;
  }

  public importChartConfiguration(configJson: string): boolean {
    try {
      const config: ChartConfiguration = JSON.parse(configJson);
      this.createChartConfiguration(config);
      return true;
    } catch (error) {
      console.error('Failed to import chart configuration:', error);
      return false;
    }
  }

  // ================== CLEANUP ==================

  public destroy(): void {
    // Clear all intervals
    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals.clear();

    // Clear all data
    this.chartConfigurations.clear();
    this.realTimeManagers.clear();
    this.themes.clear();

    console.log('💀 Chart Visualization Service destroyed');
  }
}

// Export singleton instance
export const chartVisualizationService = new ChartVisualizationService();
export default chartVisualizationService;