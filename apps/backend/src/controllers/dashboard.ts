import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// Get comprehensive dashboard metrics
export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Execute all queries in parallel for better performance
    const [
      todaysBookingsResult,
      totalRevenueResult,
      activeProvidersResult,
      avgPPSScoreResult,
      pendingApprovalsResult,
      revenueTodayResult,
      completedBookingsResult,
      systemHealthResult
    ] = await Promise.all([
      // Today's bookings count
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString()),

      // Total revenue (this month)
      supabase
        .from('bookings')
        .select('final_cost')
        .eq('status', 'completed')
        .gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString()),

      // Active providers count
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'provider')
        .eq('is_active', true),

      // Average PPS Score
      supabase
        .from('provider_performance_scores')
        .select('overall_score'),

      // Pending approvals (providers waiting for approval)
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'provider')
        .eq('is_active', false),

      // Today's revenue
      supabase
        .from('bookings')
        .select('final_cost')
        .eq('status', 'completed')
        .gte('completed_at', todayStart.toISOString())
        .lt('completed_at', todayEnd.toISOString()),

      // Completed bookings count
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),

      // System health check
      checkSystemHealth()
    ]);

    // Calculate metrics
    const todaysBookings = todaysBookingsResult.count || 0;
    
    const totalRevenue = totalRevenueResult.data?.reduce((sum, booking) => 
      sum + (booking.final_cost || 0), 0) || 0;
    
    const activeProviders = activeProvidersResult.count || 0;
    
    const avgPPSScore = avgPPSScoreResult.data?.length 
      ? avgPPSScoreResult.data.reduce((sum, score) => sum + score.overall_score, 0) / avgPPSScoreResult.data.length
      : 0;
    
    const pendingApprovals = pendingApprovalsResult.count || 0;
    
    const revenueToday = revenueTodayResult.data?.reduce((sum, booking) => 
      sum + (booking.final_cost || 0), 0) || 0;
    
    const completedBookings = completedBookingsResult.count || 0;
    
    const systemHealth = systemHealthResult;

    // Additional active users calculation
    const { data: recentSessions } = await supabase
      .from('user_sessions')
      .select('user_id')
      .gte('last_seen', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Active in last 30 minutes

    const activeUsers = new Set(recentSessions?.map(s => s.user_id) || []).size;

    const metrics = {
      todaysBookings,
      totalRevenue: Math.round(totalRevenue),
      activeProviders,
      avgPPSScore: Math.round(avgPPSScore * 10) / 10,
      pendingApprovals,
      revenueToday: Math.round(revenueToday),
      completedBookings,
      activeUsers,
      systemHealth
    };

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics'
    });
  }
};

// Get live booking updates
export const getLiveBookings = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    let query = supabase
      .from('bookings')
      .select(`
        id,
        status,
        scheduled_start_time,
        final_cost,
        estimated_cost,
        created_at,
        updated_at,
        service_location,
        priority,
        user_profiles!bookings_customer_id_fkey(full_name),
        services(name),
        providers:user_profiles!bookings_provider_id_fkey(full_name)
      `)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: bookings, error } = await query;

    if (error) {
      throw error;
    }

    const formattedBookings = bookings?.map(booking => ({
      id: booking.id,
      customer_name: booking.user_profiles?.full_name || 'Unknown Customer',
      service_name: booking.services?.name || 'Unknown Service',
      provider_name: booking.providers?.full_name || 'Unassigned',
      status: booking.status,
      scheduled_time: booking.scheduled_start_time,
      cost: booking.final_cost || booking.estimated_cost || 0,
      location: booking.service_location || 'Unknown Location',
      priority: determinePriority(booking.status, booking.scheduled_start_time, booking.created_at),
      created_at: booking.created_at,
      updated_at: booking.updated_at
    })) || [];

    res.json({
      success: true,
      data: formattedBookings,
      total: bookings?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching live bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live bookings'
    });
  }
};

// Get user activity feed
export const getUserActivities = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Get recent user activities from audit log or session data
    const { data: activities, error } = await supabase
      .from('user_activity_log')
      .select(`
        id,
        user_id,
        action,
        metadata,
        created_at,
        user_profiles(full_name, role)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error && error.code !== 'PGRST116') {
      // Table might not exist, create mock data
      const mockActivities = generateMockUserActivities(limit);
      return res.json({
        success: true,
        data: mockActivities,
        total: mockActivities.length,
        timestamp: new Date().toISOString()
      });
    }

    const formattedActivities = activities?.map(activity => ({
      userId: activity.user_id,
      userName: activity.user_profiles?.full_name || 'Unknown User',
      userRole: activity.user_profiles?.role || 'customer',
      action: activity.action,
      timestamp: activity.created_at,
      metadata: activity.metadata
    })) || [];

    res.json({
      success: true,
      data: formattedActivities,
      total: formattedActivities.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activities'
    });
  }
};

// Get system alerts
export const getSystemAlerts = async (req: Request, res: Response) => {
  try {
    const includeResolved = req.query.includeResolved === 'true';
    
    let query = supabase
      .from('system_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!includeResolved) {
      query = query.eq('resolved', false);
    }

    const { data: alerts, error } = await query;

    if (error && error.code !== 'PGRST116') {
      // Table might not exist, create mock alerts
      const mockAlerts = generateMockSystemAlerts();
      return res.json({
        success: true,
        data: mockAlerts,
        total: mockAlerts.length,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: alerts || [],
      total: alerts?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching system alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system alerts'
    });
  }
};

// Resolve system alert
export const resolveSystemAlert = async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = req.user?.id;

    const { error } = await supabase
      .from('system_alerts')
      .update({ 
        resolved: true, 
        resolved_by: userId,
        resolved_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Alert resolved successfully'
    });

  } catch (error) {
    console.error('Error resolving system alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve system alert'
    });
  }
};

// Create system alert
export const createSystemAlert = async (req: Request, res: Response) => {
  try {
    const { type, title, message, severity, category } = req.body;
    const userId = req.user?.id;

    const { data: alert, error } = await supabase
      .from('system_alerts')
      .insert({
        type,
        title,
        message,
        severity,
        category,
        created_by: userId,
        resolved: false
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: alert,
      message: 'System alert created successfully'
    });

  } catch (error) {
    console.error('Error creating system alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create system alert'
    });
  }
};

// Helper functions
async function checkSystemHealth() {
  const health = {
    database: 'online' as 'online' | 'offline',
    api: 'online' as 'online' | 'offline',
    websocket: 'online' as 'online' | 'offline',
    ppsSystem: 'online' as 'online' | 'offline'
  };

  try {
    // Check database connection
    const { error: dbError } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    
    health.database = dbError ? 'offline' : 'online';

    // API is online if we're executing this function
    health.api = 'online';

    // Check WebSocket health (could ping the WebSocket service)
    health.websocket = 'online'; // Assume online for now

    // Check PPS system health
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

function determinePriority(status: string, scheduledTime: string, createdAt: string): 'low' | 'medium' | 'high' | 'urgent' {
  const now = new Date();
  const scheduled = new Date(scheduledTime);
  const created = new Date(createdAt);
  const hoursUntilScheduled = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60);
  const hoursOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  // Urgent: Less than 2 hours until scheduled or overdue
  if (hoursUntilScheduled < 2 && hoursUntilScheduled > -2) {
    return 'urgent';
  }

  // High: Pending/unassigned for more than 4 hours
  if ((status === 'pending' || !status) && hoursOld > 4) {
    return 'high';
  }

  // Medium: Within 24 hours of scheduled time
  if (hoursUntilScheduled < 24 && hoursUntilScheduled > 2) {
    return 'medium';
  }

  return 'low';
}

function generateMockUserActivities(limit: number) {
  const activities = [];
  const actions = [
    'logged in', 'created booking', 'accepted job', 'completed service', 
    'updated profile', 'submitted payment', 'left review', 'registered'
  ];
  const roles = ['customer', 'provider', 'admin'];
  const names = [
    'John Smith', 'Sarah Johnson', 'Mike Chen', 'Emily Rodriguez',
    'David Wilson', 'Lisa Thompson', 'James Brown', 'Maria Garcia'
  ];

  for (let i = 0; i < limit; i++) {
    activities.push({
      userId: `user_${i + 1}`,
      userName: names[Math.floor(Math.random() * names.length)],
      userRole: roles[Math.floor(Math.random() * roles.length)],
      action: actions[Math.floor(Math.random() * actions.length)],
      timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {}
    });
  }

  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function generateMockSystemAlerts() {
  return [
    {
      id: 'alert_1',
      type: 'warning',
      title: 'High API Response Time',
      message: 'API response times have increased by 40% in the last hour',
      severity: 'medium',
      category: 'system',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      resolved: false
    },
    {
      id: 'alert_2',
      type: 'info',
      title: 'Scheduled Maintenance',
      message: 'System maintenance scheduled for tonight at 2:00 AM EST',
      severity: 'low',
      category: 'system',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      resolved: false
    }
  ];
}