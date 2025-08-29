// KPI Calculation Service for Rayshine Admin CRM
// Real-time KPI calculation and monitoring with comprehensive metrics

import { 
  KPICalculationConfig, 
  CalculatedKPI, 
  KPIHistoricalPoint, 
  DashboardMetrics,
  TrendDirection,
  KPIStatus,
  DataSource,
  KPIThresholds
} from '../types/dashboardTypes';

export interface KPICalculationResult {
  kpiName: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercentage: number;
  trend: TrendDirection;
  status: KPIStatus;
  calculatedAt: string;
  confidence: number; // 0-100
  dataQuality: 'high' | 'medium' | 'low';
  metadata: Record<string, any>;
}

export interface KPIAggregation {
  sum: number;
  average: number;
  count: number;
  min: number;
  max: number;
  median: number;
  standardDeviation: number;
}

class KPICalculationService {
  private kpiConfigs: Map<string, KPICalculationConfig> = new Map();
  private calculatedKPIs: Map<string, CalculatedKPI> = new Map();
  private calculationCache: Map<string, { value: any; timestamp: number; ttl: number }> = new Map();
  private calculationQueue: Array<{ kpiName: string; priority: number; requestedAt: number }> = [];
  private isCalculating = false;

  constructor() {
    this.initializeKPIConfigurations();
    this.startPeriodicCalculations();
  }

  // ================== INITIALIZATION ==================

  private initializeKPIConfigurations(): void {
    // Revenue KPIs
    this.registerKPI({
      name: 'daily_revenue',
      description: 'Total revenue generated today',
      formula: 'SUM(bookings.final_cost WHERE created_at >= TODAY)',
      dataSource: [
        {
          name: 'bookings_table',
          type: 'database',
          query: `
            SELECT COALESCE(SUM(final_cost), 0) as revenue 
            FROM bookings 
            WHERE DATE(created_at) = CURRENT_DATE 
            AND status IN ('completed', 'paid')
          `
        }
      ],
      refreshInterval: 300, // 5 minutes
      thresholds: {
        excellent: 5000,
        good: 3000,
        warning: 1000,
        critical: 500
      },
      historicalPeriods: [
        { name: 'last_7_days', duration: 7, granularity: 'day' },
        { name: 'last_30_days', duration: 30, granularity: 'day' },
        { name: 'last_12_months', duration: 365, granularity: 'month' }
      ]
    });

    this.registerKPI({
      name: 'booking_conversion_rate',
      description: 'Percentage of inquiries that become bookings',
      formula: '(confirmed_bookings / total_inquiries) * 100',
      dataSource: [
        {
          name: 'booking_conversions',
          type: 'database',
          query: `
            SELECT 
              COUNT(CASE WHEN status != 'inquiry' THEN 1 END) as confirmed,
              COUNT(*) as total
            FROM bookings 
            WHERE DATE(created_at) = CURRENT_DATE
          `
        }
      ],
      refreshInterval: 600, // 10 minutes
      thresholds: {
        excellent: 80,
        good: 65,
        warning: 45,
        critical: 30
      },
      historicalPeriods: [
        { name: 'last_7_days', duration: 7, granularity: 'day' },
        { name: 'last_30_days', duration: 30, granularity: 'day' }
      ]
    });

    // Provider Performance KPIs
    this.registerKPI({
      name: 'average_pps_score',
      description: 'Average Provider Performance Score across all active providers',
      formula: 'AVG(providers.pps_score WHERE status = active)',
      dataSource: [
        {
          name: 'provider_scores',
          type: 'database',
          query: `
            SELECT AVG(pps_score) as avg_score 
            FROM providers 
            WHERE status = 'active' AND pps_score > 0
          `
        }
      ],
      refreshInterval: 1800, // 30 minutes
      thresholds: {
        excellent: 85,
        good: 75,
        warning: 60,
        critical: 45
      },
      historicalPeriods: [
        { name: 'last_30_days', duration: 30, granularity: 'day' },
        { name: 'last_12_months', duration: 365, granularity: 'month' }
      ]
    });

    // Customer Satisfaction KPIs
    this.registerKPI({
      name: 'customer_satisfaction',
      description: 'Average customer rating from completed bookings',
      formula: 'AVG(reviews.rating WHERE created_at >= TODAY)',
      dataSource: [
        {
          name: 'customer_reviews',
          type: 'database',
          query: `
            SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
            FROM reviews 
            WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL 7 DAY
          `
        }
      ],
      refreshInterval: 900, // 15 minutes
      thresholds: {
        excellent: 4.5,
        good: 4.0,
        warning: 3.5,
        critical: 3.0
      },
      historicalPeriods: [
        { name: 'last_30_days', duration: 30, granularity: 'day' }
      ]
    });

    // Operational KPIs
    this.registerKPI({
      name: 'active_provider_count',
      description: 'Number of providers currently online and available',
      formula: 'COUNT(providers WHERE status = online)',
      dataSource: [
        {
          name: 'active_providers',
          type: 'database',
          query: `
            SELECT COUNT(*) as active_count 
            FROM providers 
            WHERE last_seen >= NOW() - INTERVAL 15 MINUTE 
            AND availability_status = 'available'
          `
        }
      ],
      refreshInterval: 120, // 2 minutes
      thresholds: {
        excellent: 20,
        good: 15,
        warning: 10,
        critical: 5
      },
      historicalPeriods: [
        { name: 'last_24_hours', duration: 1, granularity: 'hour' },
        { name: 'last_7_days', duration: 7, granularity: 'day' }
      ]
    });

    this.registerKPI({
      name: 'booking_fulfillment_rate',
      description: 'Percentage of bookings successfully completed',
      formula: '(completed_bookings / total_bookings) * 100',
      dataSource: [
        {
          name: 'booking_fulfillment',
          type: 'database',
          query: `
            SELECT 
              COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
              COUNT(*) as total
            FROM bookings 
            WHERE DATE(scheduled_start_time) = CURRENT_DATE
          `
        }
      ],
      refreshInterval: 600, // 10 minutes
      thresholds: {
        excellent: 95,
        good: 85,
        warning: 70,
        critical: 60
      },
      historicalPeriods: [
        { name: 'last_7_days', duration: 7, granularity: 'day' },
        { name: 'last_30_days', duration: 30, granularity: 'day' }
      ]
    });

    // System Performance KPIs
    this.registerKPI({
      name: 'response_time',
      description: 'Average API response time in milliseconds',
      formula: 'AVG(api_logs.response_time WHERE timestamp >= 1_HOUR_AGO)',
      dataSource: [
        {
          name: 'api_metrics',
          type: 'cache',
          query: 'api_response_times_1h'
        }
      ],
      refreshInterval: 60, // 1 minute
      thresholds: {
        excellent: 200,
        good: 500,
        warning: 1000,
        critical: 2000
      },
      historicalPeriods: [
        { name: 'last_24_hours', duration: 1, granularity: 'hour' }
      ]
    });
  }

  // ================== KPI REGISTRATION & MANAGEMENT ==================

  public registerKPI(config: KPICalculationConfig): void {
    this.kpiConfigs.set(config.name, config);
    console.log(`✅ Registered KPI: ${config.name}`);
  }

  public removeKPI(kpiName: string): boolean {
    const removed = this.kpiConfigs.delete(kpiName);
    this.calculatedKPIs.delete(kpiName);
    return removed;
  }

  public getKPIConfig(kpiName: string): KPICalculationConfig | undefined {
    return this.kpiConfigs.get(kpiName);
  }

  public getAllKPINames(): string[] {
    return Array.from(this.kpiConfigs.keys());
  }

  // ================== CALCULATION ENGINE ==================

  public async calculateKPI(kpiName: string, forceRefresh = false): Promise<KPICalculationResult | null> {
    const config = this.kpiConfigs.get(kpiName);
    if (!config) {
      console.error(`KPI configuration not found: ${kpiName}`);
      return null;
    }

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = this.getFromCache(`kpi_${kpiName}`);
        if (cached) {
          return cached as KPICalculationResult;
        }
      }

      console.log(`📊 Calculating KPI: ${kpiName}`);
      const startTime = Date.now();

      // Fetch data from all sources
      const sourceData = await this.fetchDataSources(config.dataSource);
      
      // Calculate current value
      const currentValue = await this.executeCalculation(config.formula, sourceData);
      
      // Get previous value for comparison
      const previousValue = await this.getPreviousValue(kpiName);
      
      // Calculate change and trend
      const change = currentValue - previousValue;
      const changePercentage = previousValue > 0 ? (change / previousValue) * 100 : 0;
      const trend = this.calculateTrend(change, Math.abs(changePercentage));
      
      // Determine status based on thresholds
      const status = this.calculateStatus(currentValue, config.thresholds);
      
      // Calculate confidence and data quality
      const confidence = this.calculateConfidence(sourceData, config);
      const dataQuality = this.assessDataQuality(sourceData);
      
      const result: KPICalculationResult = {
        kpiName,
        currentValue,
        previousValue,
        change,
        changePercentage,
        trend,
        status,
        calculatedAt: new Date().toISOString(),
        confidence,
        dataQuality,
        metadata: {
          calculationTime: Date.now() - startTime,
          sourceCount: config.dataSource.length,
          formula: config.formula,
          thresholds: config.thresholds
        }
      };

      // Cache the result
      this.setCache(`kpi_${kpiName}`, result, config.refreshInterval * 1000);
      
      // Store for historical tracking
      await this.storeCalculatedKPI(kpiName, result);
      
      console.log(`✅ KPI calculated: ${kpiName} = ${currentValue} (${changePercentage.toFixed(2)}% change)`);
      
      return result;

    } catch (error) {
      console.error(`❌ Error calculating KPI ${kpiName}:`, error);
      return null;
    }
  }

  public async calculateAllKPIs(forceRefresh = false): Promise<Map<string, KPICalculationResult>> {
    const results = new Map<string, KPICalculationResult>();
    
    console.log(`📊 Calculating ${this.kpiConfigs.size} KPIs...`);
    
    for (const kpiName of this.kpiConfigs.keys()) {
      try {
        const result = await this.calculateKPI(kpiName, forceRefresh);
        if (result) {
          results.set(kpiName, result);
        }
      } catch (error) {
        console.error(`Error calculating KPI ${kpiName}:`, error);
      }
    }
    
    console.log(`✅ Calculated ${results.size} KPIs successfully`);
    return results;
  }

  // ================== DATA SOURCE MANAGEMENT ==================

  private async fetchDataSources(dataSources: DataSource[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    for (const source of dataSources) {
      try {
        const data = await this.fetchDataSource(source);
        results.set(source.name, data);
      } catch (error) {
        console.error(`Error fetching data source ${source.name}:`, error);
        results.set(source.name, null);
      }
    }
    
    return results;
  }

  private async fetchDataSource(source: DataSource): Promise<any> {
    // Check cache first
    const cached = this.getFromCache(`datasource_${source.name}`);
    if (cached) {
      return cached;
    }

    let result: any;

    switch (source.type) {
      case 'database':
        result = await this.executeDatabaseQuery(source.query!, source.filters);
        break;
        
      case 'api':
        result = await this.fetchFromAPI(source.endpoint!, source.filters);
        break;
        
      case 'cache':
        result = this.getFromCache(source.query!);
        break;
        
      case 'realtime':
        result = await this.fetchRealTimeData(source.name);
        break;
        
      default:
        throw new Error(`Unsupported data source type: ${source.type}`);
    }

    // Cache for 5 minutes by default
    this.setCache(`datasource_${source.name}`, result, 300000);
    
    return result;
  }

  private async executeDatabaseQuery(query: string, filters?: Record<string, any>): Promise<any> {
    // Mock implementation - replace with actual database connection
    console.log(`🔍 Executing database query: ${query.substring(0, 50)}...`);
    
    // Simulate database query based on query content
    if (query.includes('SUM(final_cost)')) {
      return { revenue: Math.floor(Math.random() * 5000) + 1000 };
    } else if (query.includes('AVG(pps_score)')) {
      return { avg_score: Math.floor(Math.random() * 40) + 60 };
    } else if (query.includes('COUNT(*)')) {
      return { count: Math.floor(Math.random() * 50) + 10 };
    } else if (query.includes('AVG(rating)')) {
      return { avg_rating: (Math.random() * 1.5 + 3.5).toFixed(2), review_count: Math.floor(Math.random() * 20) + 5 };
    }
    
    return { value: Math.floor(Math.random() * 100) };
  }

  private async fetchFromAPI(endpoint: string, filters?: Record<string, any>): Promise<any> {
    // Mock implementation - replace with actual API calls
    console.log(`🌐 Fetching from API: ${endpoint}`);
    
    // Simulate API response delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    return {
      data: { value: Math.floor(Math.random() * 1000) },
      timestamp: new Date().toISOString()
    };
  }

  private async fetchRealTimeData(sourceName: string): Promise<any> {
    // Mock implementation - would connect to real-time data streams
    console.log(`⚡ Fetching real-time data: ${sourceName}`);
    
    return {
      value: Math.floor(Math.random() * 100),
      timestamp: new Date().toISOString(),
      quality: 'high'
    };
  }

  // ================== CALCULATION LOGIC ==================

  private async executeCalculation(formula: string, sourceData: Map<string, any>): Promise<number> {
    // Simple formula parser - in production, use a proper expression parser
    console.log(`🧮 Executing formula: ${formula}`);
    
    // Extract the main operation and source
    if (formula.includes('SUM(')) {
      const data = sourceData.get('bookings_table') || sourceData.get('booking_fulfillment');
      return data?.revenue || data?.completed || data?.value || 0;
    }
    
    if (formula.includes('AVG(')) {
      const data = sourceData.values().next().value;
      return data?.avg_score || data?.avg_rating || data?.value || 0;
    }
    
    if (formula.includes('COUNT(')) {
      const data = sourceData.values().next().value;
      return data?.active_count || data?.count || data?.value || 0;
    }
    
    if (formula.includes('* 100')) {
      // Percentage calculations
      const data = sourceData.values().next().value;
      if (data?.completed !== undefined && data?.total !== undefined) {
        return data.total > 0 ? (data.completed / data.total) * 100 : 0;
      }
    }
    
    return Math.floor(Math.random() * 100); // Fallback mock value
  }

  private calculateTrend(change: number, changePercentage: number): TrendDirection {
    if (Math.abs(changePercentage) < 2) {
      return 'stable';
    } else if (changePercentage > 15) {
      return 'volatile';
    } else if (change > 0) {
      return 'up';
    } else {
      return 'down';
    }
  }

  private calculateStatus(value: number, thresholds: KPIThresholds): KPIStatus {
    if (value >= thresholds.excellent) return 'excellent';
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.warning) return 'warning';
    if (value >= thresholds.critical) return 'critical';
    return 'critical';
  }

  private calculateConfidence(sourceData: Map<string, any>, config: KPICalculationConfig): number {
    let confidence = 100;
    
    // Reduce confidence for null/missing data sources
    sourceData.forEach((data, sourceName) => {
      if (!data) {
        confidence -= 20;
      }
    });
    
    // Reduce confidence for old data
    const now = Date.now();
    const maxAge = config.refreshInterval * 2000; // 2x refresh interval
    
    sourceData.forEach((data) => {
      if (data?.timestamp) {
        const age = now - new Date(data.timestamp).getTime();
        if (age > maxAge) {
          confidence -= 10;
        }
      }
    });
    
    return Math.max(0, Math.min(100, confidence));
  }

  private assessDataQuality(sourceData: Map<string, any>): 'high' | 'medium' | 'low' {
    const nullSources = Array.from(sourceData.values()).filter(data => !data).length;
    const totalSources = sourceData.size;
    const nullRatio = nullSources / totalSources;
    
    if (nullRatio === 0) return 'high';
    if (nullRatio < 0.3) return 'medium';
    return 'low';
  }

  // ================== HISTORICAL DATA MANAGEMENT ==================

  private async getPreviousValue(kpiName: string): Promise<number> {
    const stored = this.calculatedKPIs.get(kpiName);
    if (stored?.historicalData && stored.historicalData.length > 0) {
      // Get the most recent historical value
      const sorted = stored.historicalData.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return sorted[0]?.value || 0;
    }
    return 0;
  }

  private async storeCalculatedKPI(kpiName: string, result: KPICalculationResult): Promise<void> {
    const existing = this.calculatedKPIs.get(kpiName) || {
      name: kpiName,
      currentValue: result.currentValue,
      previousValue: result.previousValue,
      change: result.change,
      changePercentage: result.changePercentage,
      trend: result.trend,
      status: result.status,
      lastCalculated: result.calculatedAt,
      historicalData: []
    };

    // Add new historical point
    const newPoint: KPIHistoricalPoint = {
      timestamp: result.calculatedAt,
      value: result.currentValue,
      period: 'current'
    };

    existing.historicalData.push(newPoint);
    
    // Keep only last 100 points
    existing.historicalData = existing.historicalData
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 100);

    // Update current values
    existing.currentValue = result.currentValue;
    existing.previousValue = result.previousValue;
    existing.change = result.change;
    existing.changePercentage = result.changePercentage;
    existing.trend = result.trend;
    existing.status = result.status;
    existing.lastCalculated = result.calculatedAt;

    this.calculatedKPIs.set(kpiName, existing);
  }

  // ================== AGGREGATION UTILITIES ==================

  public calculateAggregations(values: number[]): KPIAggregation {
    if (values.length === 0) {
      return {
        sum: 0, average: 0, count: 0,
        min: 0, max: 0, median: 0, standardDeviation: 0
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / values.length;
    
    // Calculate median
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];

    // Calculate standard deviation
    const squaredDiffs = values.map(val => Math.pow(val - average, 2));
    const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
    const standardDeviation = Math.sqrt(avgSquaredDiff);

    return {
      sum,
      average,
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median,
      standardDeviation
    };
  }

  // ================== CACHE MANAGEMENT ==================

  private getFromCache(key: string): any | null {
    const cached = this.calculationCache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      this.calculationCache.delete(key);
      return null;
    }
    
    return cached.value;
  }

  private setCache(key: string, value: any, ttl: number): void {
    this.calculationCache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  private clearCache(): void {
    this.calculationCache.clear();
    console.log('🧹 KPI calculation cache cleared');
  }

  // ================== PERIODIC CALCULATIONS ==================

  private startPeriodicCalculations(): void {
    // Calculate all KPIs every 5 minutes
    setInterval(async () => {
      console.log('🔄 Running periodic KPI calculations...');
      await this.calculateAllKPIs(false);
    }, 300000);

    // Clean up expired cache entries every hour
    setInterval(() => {
      this.cleanupCache();
    }, 3600000);
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, cached] of this.calculationCache.entries()) {
      if (now > cached.timestamp + cached.ttl) {
        this.calculationCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  // ================== PUBLIC API ==================

  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    const kpiResults = await this.calculateAllKPIs(false);
    
    // Transform KPI results into dashboard metrics format
    const metrics: DashboardMetrics = {
      todaysBookings: kpiResults.get('booking_conversion_rate')?.currentValue || 0,
      totalRevenue: kpiResults.get('daily_revenue')?.currentValue || 0,
      activeProviders: kpiResults.get('active_provider_count')?.currentValue || 0,
      avgPPSScore: kpiResults.get('average_pps_score')?.currentValue || 0,
      pendingApprovals: Math.floor(Math.random() * 10), // Mock data
      revenueToday: kpiResults.get('daily_revenue')?.currentValue || 0,
      completedBookings: Math.floor(Math.random() * 50), // Mock data
      activeUsers: Math.floor(Math.random() * 100), // Mock data
      
      systemHealth: {
        database: 'online',
        api: 'online',
        websocket: 'online',
        ppsSystem: 'online'
      },
      
      performance: {
        avgResponseTime: kpiResults.get('response_time')?.currentValue || 250,
        apiSuccessRate: 99.5,
        systemLoad: 45,
        memoryUsage: 68,
        diskUsage: 35,
        activeConnections: Math.floor(Math.random() * 100) + 50,
        requestsPerMinute: Math.floor(Math.random() * 1000) + 500
      },
      
      trends: {
        bookingsTrend: this.createTrendFromKPI(kpiResults.get('booking_conversion_rate')),
        revenueTrend: this.createTrendFromKPI(kpiResults.get('daily_revenue')),
        userGrowthTrend: {
          current: 100, previous: 95, change: 5, direction: 'up', periodType: 'day'
        },
        customerSatisfactionTrend: this.createTrendFromKPI(kpiResults.get('customer_satisfaction'))
      },
      
      lastUpdated: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      dataFreshness: {
        realTimeData: true,
        lastSyncTimestamp: new Date().toISOString(),
        stalenessLevel: 'fresh',
        syncStatus: 'synced'
      }
    };
    
    return metrics;
  }

  private createTrendFromKPI(kpi?: KPICalculationResult): any {
    if (!kpi) {
      return { current: 0, previous: 0, change: 0, direction: 'stable', periodType: 'day' };
    }
    
    return {
      current: kpi.currentValue,
      previous: kpi.previousValue,
      change: kpi.changePercentage,
      direction: kpi.trend === 'up' ? 'up' : kpi.trend === 'down' ? 'down' : 'stable',
      periodType: 'day'
    };
  }

  public getCalculatedKPI(kpiName: string): CalculatedKPI | undefined {
    return this.calculatedKPIs.get(kpiName);
  }

  public getAllCalculatedKPIs(): Map<string, CalculatedKPI> {
    return new Map(this.calculatedKPIs);
  }

  // ================== CLEANUP ==================

  public destroy(): void {
    this.clearCache();
    this.calculatedKPIs.clear();
    this.calculationQueue = [];
    console.log('💀 KPI Calculation Service destroyed');
  }
}

// Export singleton instance
export const kpiCalculationService = new KPICalculationService();
export default kpiCalculationService;