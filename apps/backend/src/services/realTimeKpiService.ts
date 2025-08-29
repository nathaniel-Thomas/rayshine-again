import { supabase } from '../config/supabase';
import { WebSocketService } from './websocket';
import { EventEmitter } from 'events';

export interface KPIMetrics {
  todaysBookings: number;
  totalRevenue: number;
  activeProviders: number;
  avgPPSScore: number;
  pendingApprovals: number;
  revenueToday: number;
  completedBookings: number;
  activeUsers: number;
  providerUtilization: number;
  systemHealth: {
    database: 'online' | 'offline';
    api: 'online' | 'offline';
    websocket: 'online' | 'offline';
    ppsSystem: 'online' | 'offline';
  };
  trends: {
    bookingsTrend: number; // Percentage change from yesterday
    revenueTrend: number; // Percentage change from yesterday
    providerTrend: number; // Percentage change from last week
  };
}

export interface KPICache {
  metrics: KPIMetrics;
  lastCalculated: Date;
  isStale: boolean;
}

class RealTimeKPIService extends EventEmitter {
  private webSocketService: WebSocketService | null = null;
  private cache: KPICache | null = null;
  private calculationInterval: NodeJS.Timeout | null = null;
  private dbChangeListeners: any[] = [];
  private readonly CACHE_TTL = 30000; // 30 seconds
  private readonly CALCULATION_INTERVAL = 15000; // 15 seconds
  private isCalculating = false;
  
  constructor() {
    super();
    this.setupDatabaseChangeListeners();
  }

  public setWebSocketService(wsService: WebSocketService) {
    this.webSocketService = wsService;
  }

  public async initialize() {
    console.log('🚀 Initializing Real-Time KPI Service...');
    
    // Calculate initial metrics
    await this.calculateAndCacheKPIs();
    
    // Start periodic calculations
    this.startPeriodicCalculations();
    
    console.log('✅ Real-Time KPI Service initialized');
  }

  private async setupDatabaseChangeListeners() {
    try {
      // Listen to bookings changes
      const bookingsSubscription = supabase
        .channel('bookings-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'bookings' },
          (payload) => {
            console.log('📊 Bookings table changed:', payload.eventType);
            this.handleDatabaseChange('bookings', payload);
          }
        )
        .subscribe();

      // Listen to user_profiles changes (providers)
      const providersSubscription = supabase
        .channel('providers-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'user_profiles', filter: 'role=eq.provider' },
          (payload) => {
            console.log('👥 Providers table changed:', payload.eventType);
            this.handleDatabaseChange('providers', payload);
          }
        )
        .subscribe();

      // Listen to provider_performance_scores changes
      const ppsSubscription = supabase
        .channel('pps-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'provider_performance_scores' },
          (payload) => {
            console.log('⭐ PPS table changed:', payload.eventType);
            this.handleDatabaseChange('pps', payload);
          }
        )
        .subscribe();

      // Listen to user_sessions changes (for active users)
      const sessionsSubscription = supabase
        .channel('sessions-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'user_sessions' },
          (payload) => {
            console.log('🔐 Sessions table changed:', payload.eventType);
            this.handleDatabaseChange('sessions', payload);
          }
        )
        .subscribe();

      this.dbChangeListeners = [
        bookingsSubscription,
        providersSubscription,
        ppsSubscription,
        sessionsSubscription
      ];

      console.log('📡 Database change listeners set up');
    } catch (error) {
      console.error('❌ Error setting up database listeners:', error);
    }
  }

  private async handleDatabaseChange(table: string, payload: any) {
    // Debounce rapid changes - only recalculate if cache is stale
    if (this.cache && !this.isCacheStale() && !this.shouldRecalculateForChange(table, payload)) {
      return;
    }

    console.log(`🔄 Recalculating KPIs due to ${table} change`);
    
    // Delay slightly to allow for bulk operations to complete
    setTimeout(async () => {
      await this.calculateAndCacheKPIs();
      this.broadcastKPIUpdates();
    }, 1000);
  }

  private shouldRecalculateForChange(table: string, payload: any): boolean {
    // Only recalculate for significant changes
    switch (table) {
      case 'bookings':
        // Recalculate for status changes, new bookings, or payment updates
        return ['INSERT', 'UPDATE'].includes(payload.eventType) &&
               (payload.new?.status !== payload.old?.status || 
                payload.new?.final_cost !== payload.old?.final_cost ||
                payload.eventType === 'INSERT');
                
      case 'providers':
        // Recalculate for active status changes
        return payload.new?.is_active !== payload.old?.is_active;
        
      case 'pps':
        // Always recalculate for PPS changes
        return true;
        
      case 'sessions':
        // Only for session updates that affect active status
        return payload.eventType === 'UPDATE' && 
               payload.new?.last_seen !== payload.old?.last_seen;
               
      default:
        return false;
    }
  }

  private startPeriodicCalculations() {
    this.calculationInterval = setInterval(async () => {
      if (this.isCacheStale()) {
        console.log('🕐 Cache is stale, recalculating KPIs...');
        await this.calculateAndCacheKPIs();
        this.broadcastKPIUpdates();
      }
    }, this.CALCULATION_INTERVAL);
  }

  private stopPeriodicCalculations() {
    if (this.calculationInterval) {
      clearInterval(this.calculationInterval);
      this.calculationInterval = null;
    }
  }

  public async calculateAndCacheKPIs(): Promise<KPIMetrics> {
    if (this.isCalculating) {
      // Return cached data if currently calculating
      return this.cache?.metrics || this.getDefaultMetrics();
    }

    this.isCalculating = true;

    try {
      console.log('📊 Calculating KPIs...');
      const startTime = Date.now();

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Execute all queries in parallel for maximum performance
      const [
        todaysBookingsResult,
        yesterdaysBookingsResult,
        totalRevenueResult,
        revenueTodayResult,
        revenueYesterdayResult,
        activeProvidersResult,
        providersLastWeekResult,
        avgPPSScoreResult,
        pendingApprovalsResult,
        completedBookingsResult,
        recentSessionsResult,
        systemHealthResult
      ] = await Promise.all([
        // Today's bookings
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', todayStart.toISOString())
          .lt('created_at', todayEnd.toISOString()),

        // Yesterday's bookings for trend
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', yesterdayStart.toISOString())
          .lt('created_at', todayStart.toISOString()),

        // Total revenue (this month)
        supabase
          .from('bookings')
          .select('final_cost')
          .eq('status', 'completed')
          .gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString()),

        // Today's revenue
        supabase
          .from('bookings')
          .select('final_cost')
          .eq('status', 'completed')
          .gte('completed_at', todayStart.toISOString())
          .lt('completed_at', todayEnd.toISOString()),

        // Yesterday's revenue for trend
        supabase
          .from('bookings')
          .select('final_cost')
          .eq('status', 'completed')
          .gte('completed_at', yesterdayStart.toISOString())
          .lt('completed_at', todayStart.toISOString()),

        // Active providers
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'provider')
          .eq('is_active', true),

        // Providers count a week ago for trend
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'provider')
          .eq('is_active', true)
          .lte('created_at', weekAgo.toISOString()),

        // Average PPS Score
        supabase
          .from('provider_performance_scores')
          .select('overall_score'),

        // Pending approvals
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'provider')
          .eq('is_active', false),

        // Completed bookings
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed'),

        // Active users (last 30 minutes)
        supabase
          .from('user_sessions')
          .select('user_id')
          .gte('last_seen', new Date(Date.now() - 30 * 60 * 1000).toISOString()),

        // System health
        this.checkSystemHealth()
      ]);

      // Calculate basic metrics
      const todaysBookings = todaysBookingsResult.count || 0;
      const yesterdaysBookings = yesterdaysBookingsResult.count || 0;
      
      const totalRevenue = totalRevenueResult.data?.reduce((sum, booking) => 
        sum + (booking.final_cost || 0), 0) || 0;
      
      const revenueToday = revenueTodayResult.data?.reduce((sum, booking) => 
        sum + (booking.final_cost || 0), 0) || 0;
      
      const revenueYesterday = revenueYesterdayResult.data?.reduce((sum, booking) => 
        sum + (booking.final_cost || 0), 0) || 0;

      const activeProviders = activeProvidersResult.count || 0;
      const providersLastWeek = providersLastWeekResult.count || 0;
      
      const avgPPSScore = avgPPSScoreResult.data?.length 
        ? avgPPSScoreResult.data.reduce((sum, score) => sum + score.overall_score, 0) / avgPPSScoreResult.data.length
        : 0;
      
      const pendingApprovals = pendingApprovalsResult.count || 0;
      const completedBookings = completedBookingsResult.count || 0;
      
      const activeUsers = new Set(recentSessionsResult?.data?.map(s => s.user_id) || []).size;

      // Calculate provider utilization
      const providerUtilization = await this.calculateProviderUtilization();

      // Calculate trends
      const bookingsTrend = yesterdaysBookings > 0 
        ? ((todaysBookings - yesterdaysBookings) / yesterdaysBookings) * 100 
        : 0;
        
      const revenueTrend = revenueYesterday > 0 
        ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100 
        : 0;
        
      const providerTrend = providersLastWeek > 0 
        ? ((activeProviders - providersLastWeek) / providersLastWeek) * 100 
        : 0;

      const metrics: KPIMetrics = {
        todaysBookings,
        totalRevenue: Math.round(totalRevenue),
        activeProviders,
        avgPPSScore: Math.round(avgPPSScore * 10) / 10,
        pendingApprovals,
        revenueToday: Math.round(revenueToday),
        completedBookings,
        activeUsers,
        providerUtilization: Math.round(providerUtilization * 10) / 10,
        systemHealth: systemHealthResult,
        trends: {
          bookingsTrend: Math.round(bookingsTrend * 10) / 10,
          revenueTrend: Math.round(revenueTrend * 10) / 10,
          providerTrend: Math.round(providerTrend * 10) / 10
        }
      };

      // Update cache
      this.cache = {
        metrics,
        lastCalculated: new Date(),
        isStale: false
      };

      const calculationTime = Date.now() - startTime;
      console.log(`✅ KPIs calculated in ${calculationTime}ms`);

      // Emit event for any listeners
      this.emit('kpi-updated', metrics);

      return metrics;

    } catch (error) {
      console.error('❌ Error calculating KPIs:', error);
      
      // Return cached data or defaults on error
      return this.cache?.metrics || this.getDefaultMetrics();
    } finally {
      this.isCalculating = false;
    }
  }

  private async calculateProviderUtilization(): Promise<number> {
    try {
      // Get active providers who have bookings in the last 7 days
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [activeProvidersResult, workingProvidersResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'provider')
          .eq('is_active', true),
          
        supabase
          .from('bookings')
          .select('provider_id')
          .neq('provider_id', null)
          .gte('created_at', weekAgo.toISOString())
      ]);

      const totalActive = activeProvidersResult.count || 0;
      const uniqueWorkingProviders = new Set(
        workingProvidersResult.data?.map(b => b.provider_id).filter(Boolean) || []
      ).size;

      return totalActive > 0 ? (uniqueWorkingProviders / totalActive) * 100 : 0;
    } catch (error) {
      console.error('Error calculating provider utilization:', error);
      return 0;
    }
  }

  private async checkSystemHealth() {
    const health = {
      database: 'online' as 'online' | 'offline',
      api: 'online' as 'online' | 'offline',  
      websocket: 'online' as 'online' | 'offline',
      ppsSystem: 'online' as 'online' | 'offline'
    };

    try {
      // Check database
      const { error: dbError } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      
      health.database = dbError ? 'offline' : 'online';

      // API is online if we're executing
      health.api = 'online';

      // Check WebSocket
      health.websocket = this.webSocketService ? 'online' : 'offline';

      // Check PPS system
      const { error: ppsError } = await supabase
        .from('provider_performance_scores')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      
      health.ppsSystem = ppsError ? 'offline' : 'online';

    } catch (error) {
      console.error('Error checking system health:', error);
      health.database = 'offline';
    }

    return health;
  }

  private getDefaultMetrics(): KPIMetrics {
    return {
      todaysBookings: 0,
      totalRevenue: 0,
      activeProviders: 0,
      avgPPSScore: 0,
      pendingApprovals: 0,
      revenueToday: 0,
      completedBookings: 0,
      activeUsers: 0,
      providerUtilization: 0,
      systemHealth: {
        database: 'offline',
        api: 'offline',
        websocket: 'offline',
        ppsSystem: 'offline'
      },
      trends: {
        bookingsTrend: 0,
        revenueTrend: 0,
        providerTrend: 0
      }
    };
  }

  private isCacheStale(): boolean {
    if (!this.cache) return true;
    
    const age = Date.now() - this.cache.lastCalculated.getTime();
    return age > this.CACHE_TTL;
  }

  public getCachedMetrics(): KPIMetrics | null {
    if (!this.cache || this.isCacheStale()) {
      return null;
    }
    return this.cache.metrics;
  }

  public async getMetrics(forceRecalculate = false): Promise<KPIMetrics> {
    if (forceRecalculate || !this.cache || this.isCacheStale()) {
      return await this.calculateAndCacheKPIs();
    }
    return this.cache.metrics;
  }

  public broadcastKPIUpdates() {
    if (!this.webSocketService || !this.cache) {
      return;
    }

    console.log('📡 Broadcasting KPI updates to admins');
    
    // Send to all connected admin users
    this.webSocketService.notifyAdmins('dashboard_metrics_update', this.cache.metrics);
    
    // Also emit as events for other services
    this.emit('kpi-broadcast', this.cache.metrics);
  }

  public async forceKPIRecalculation(): Promise<KPIMetrics> {
    console.log('🔄 Forcing KPI recalculation...');
    const metrics = await this.calculateAndCacheKPIs();
    this.broadcastKPIUpdates();
    return metrics;
  }

  public getKPIStats() {
    return {
      hasCache: !!this.cache,
      lastCalculated: this.cache?.lastCalculated,
      cacheAge: this.cache ? Date.now() - this.cache.lastCalculated.getTime() : null,
      isStale: this.isCacheStale(),
      isCalculating: this.isCalculating,
      listenersCount: this.dbChangeListeners.length
    };
  }

  public async cleanup() {
    console.log('🧹 Cleaning up Real-Time KPI Service...');
    
    this.stopPeriodicCalculations();
    
    // Unsubscribe from database listeners
    this.dbChangeListeners.forEach(listener => {
      if (listener && typeof listener.unsubscribe === 'function') {
        listener.unsubscribe();
      }
    });
    
    this.dbChangeListeners = [];
    this.cache = null;
    this.webSocketService = null;
    
    console.log('✅ Real-Time KPI Service cleanup complete');
  }
}

// Export singleton instance
export const realTimeKPIService = new RealTimeKPIService();
export default realTimeKPIService;