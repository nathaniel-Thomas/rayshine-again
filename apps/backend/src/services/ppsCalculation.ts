import { supabase } from '../config/supabase';

export interface PPSCalculationParams {
  provider_id?: string;
  job_latitude?: number;
  job_longitude?: number;
  service_area_filter?: boolean;
  limit?: number;
}

export interface ProviderPPSData {
  provider_id: string;
  distance_miles?: number;
  jobs_completed: number;
  jobs_offered: number;
  jobs_accepted: number;
  on_time_arrivals: number;
  late_arrivals: number;
  last_minute_cancellations: number;
  performance_history: PerformanceRecord[];
}

export interface PerformanceRecord {
  customer_rating: number;
  was_on_time: boolean;
  was_completed: boolean;
  created_at: string;
  distance_miles: number;
  decay_weight?: number;
}

export interface PPSResult {
  provider_id: string;
  pps_score: number;
  distance_score: number;
  performance_score: number;
  reliability_score: number;
  consistency_score: number;
  availability_score: number;
  distance_miles?: number;
  rank: number;
}

export class PPSCalculationService {
  
  async calculateSingleProviderPPS(params: PPSCalculationParams): Promise<PPSResult> {
    if (!params.provider_id) {
      throw new Error('Provider ID is required for single provider calculation');
    }

    const providerData = await this.getProviderPPSData(
      params.provider_id, 
      params.job_latitude, 
      params.job_longitude
    );
    
    return this.calculatePPS(providerData, 1);
  }

  async calculateAllProvidersPPS(params: PPSCalculationParams): Promise<PPSResult[]> {
    // Get all active, verified providers
    let query = supabase
      .from('providers')
      .select(`
        id,
        user_profiles!inner(role),
        provider_service_coverage(*)
      `)
      .eq('is_verified', true)
      .eq('onboarding_status', 'active');

    const { data: providers, error } = await query;

    if (error) throw error;

    const ppsResults: PPSResult[] = [];

    for (const provider of providers || []) {
      try {
        const providerData = await this.getProviderPPSData(
          provider.id, 
          params.job_latitude, 
          params.job_longitude
        );
        
        // Check if provider is within service area
        if (params.service_area_filter && params.job_latitude && params.job_longitude) {
          const withinServiceArea = await this.checkServiceArea(
            provider.id,
            params.job_latitude,
            params.job_longitude
          );
          if (!withinServiceArea) continue;
        }

        const ppsResult = this.calculatePPS(providerData, 0);
        ppsResults.push(ppsResult);
      } catch (error) {
        console.error(`Error calculating PPS for provider ${provider.id}:`, error);
      }
    }

    // Sort by PPS score descending and add rank
    ppsResults.sort((a, b) => b.pps_score - a.pps_score);
    ppsResults.forEach((result, index) => {
      result.rank = index + 1;
    });

    return ppsResults.slice(0, params.limit || 50);
  }

  private async getProviderPPSData(
    providerId: string, 
    jobLat?: number, 
    jobLng?: number
  ): Promise<ProviderPPSData> {
    
    // Get current performance metrics
    const { data: metrics } = await supabase
      .from('provider_performance_metrics')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    // Get performance history with time decay
    const { data: history } = await supabase
      .from('provider_performance_history')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(100); // Last 100 jobs for calculation

    // Calculate distance if job location provided
    let distance_miles: number | undefined;

    if (jobLat && jobLng) {
      // Get provider's typical service area center or last known location
      const { data: coverage } = await supabase
        .from('provider_service_coverage')
        .select('center_latitude, center_longitude')
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .single();

      if (coverage?.center_latitude && coverage?.center_longitude) {
        distance_miles = this.calculateDistance(
          jobLat, jobLng,
          coverage.center_latitude, coverage.center_longitude
        );
      }
    }

    return {
      provider_id: providerId,
      distance_miles,
      jobs_completed: metrics?.jobs_completed || 0,
      jobs_offered: metrics?.jobs_offered || 0,
      jobs_accepted: metrics?.jobs_accepted || 0,
      on_time_arrivals: metrics?.on_time_arrivals || 0,
      late_arrivals: metrics?.late_arrivals || 0,
      last_minute_cancellations: metrics?.last_minute_cancellations || 0,
      performance_history: history || []
    };
  }

  private calculatePPS(data: ProviderPPSData, rank: number): PPSResult {
    // Apply time decay to performance history
    const decayedHistory = this.applyTimeDecay(data.performance_history);
    
    // Calculate each pillar score
    const distance_score = this.calculateDistanceScore(data.distance_miles);
    const performance_score = this.calculatePerformanceScore(decayedHistory, data.jobs_completed);
    const reliability_score = this.calculateReliabilityScore(
      data.on_time_arrivals, 
      data.late_arrivals, 
      data.last_minute_cancellations, 
      data.jobs_completed
    );
    const consistency_score = this.calculateConsistencyScore(decayedHistory);
    const availability_score = this.calculateAvailabilityScore(data.jobs_accepted, data.jobs_offered);

    // Calculate final PPS score with weightings
    const pps_score = Math.round(
      (distance_score * 0.25) +
      (performance_score * 0.30) +
      (reliability_score * 0.25) +
      (consistency_score * 0.10) +
      (availability_score * 0.10)
    );

    return {
      provider_id: data.provider_id,
      pps_score,
      distance_score,
      performance_score,
      reliability_score,
      consistency_score,
      availability_score,
      distance_miles: data.distance_miles,
      rank
    };
  }

  private applyTimeDecay(history: PerformanceRecord[]): (PerformanceRecord & { decay_weight: number })[] {
    const now = new Date();
    
    return history.map(record => {
      const recordDate = new Date(record.created_at);
      const daysDiff = Math.floor((now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let decayWeight = 1.0;
      if (daysDiff <= 30) decayWeight = 1.0;      // 100% weight
      else if (daysDiff <= 90) decayWeight = 0.5;  // 50% weight  
      else if (daysDiff <= 180) decayWeight = 0.25; // 25% weight
      else decayWeight = 0.1;                       // 10% weight
      
      return {
        ...record,
        decay_weight: decayWeight
      };
    });
  }

  private calculateDistanceScore(distanceMiles?: number): number {
    if (distanceMiles === undefined) return 50; // Neutral score if no distance data
    return Math.max(0, 100 - (distanceMiles * 2));
  }

  private calculatePerformanceScore(decayedHistory: (PerformanceRecord & { decay_weight: number })[], jobsCompleted: number): number {
    if (jobsCompleted === 0) return 50; // Neutral score for new providers
    
    let totalWeightedRating = 0;
    let totalWeight = 0;
    let completionCount = 0;
    
    decayedHistory.forEach(record => {
      if (record.customer_rating && record.decay_weight) {
        totalWeightedRating += record.customer_rating * record.decay_weight;
        totalWeight += record.decay_weight;
      }
      if (record.was_completed) {
        completionCount++;
      }
    });
    
    const avgRating = totalWeight > 0 ? totalWeightedRating / totalWeight : 0;
    const completionRate = jobsCompleted > 0 ? completionCount / jobsCompleted : 0;
    
    // Combine rating (0-5 scale) and completion rate
    const ratingScore = (avgRating / 5) * 100;
    const completionScore = completionRate * 100;
    
    return Math.round((ratingScore * 0.6) + (completionScore * 0.4));
  }

  private calculateReliabilityScore(onTimeArrivals: number, lateArrivals: number, cancellations: number, totalJobs: number): number {
    if (totalJobs === 0) return 50; // Neutral score for new providers
    
    const onTimeRate = totalJobs > 0 ? onTimeArrivals / totalJobs : 0;
    const cancellationRate = totalJobs > 0 ? cancellations / totalJobs : 0;
    
    const reliabilityScore = Math.max(0, (onTimeRate * 100) - (cancellationRate * 100));
    return Math.round(Math.min(100, reliabilityScore));
  }

  private calculateConsistencyScore(decayedHistory: (PerformanceRecord & { decay_weight: number })[]): number {
    if (decayedHistory.length < 3) return 50; // Need minimum data for consistency
    
    const ratings = decayedHistory
      .filter(record => record.customer_rating && record.decay_weight)
      .map(record => record.customer_rating);
    
    if (ratings.length < 3) return 50;
    
    const mean = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    const variance = ratings.reduce((sum, rating) => sum + Math.pow(rating - mean, 2), 0) / ratings.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation = higher consistency
    // Scale to 0-100 where 0 stddev = 100 score, 2+ stddev = 0 score
    const consistencyScore = Math.max(0, 100 - (standardDeviation * 50));
    return Math.round(consistencyScore);
  }

  private calculateAvailabilityScore(jobsAccepted: number, jobsOffered: number): number {
    if (jobsOffered === 0) return 50; // Neutral score if no offers yet
    
    const acceptanceRate = jobsAccepted / jobsOffered;
    return Math.round(acceptanceRate * 100);
  }

  private async checkServiceArea(providerId: string, lat: number, lng: number): Promise<boolean> {
    const { data: coverage } = await supabase
      .from('provider_service_coverage')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_active', true)
      .single();

    if (!coverage) return false;

    if (coverage.coverage_type === 'radius') {
      if (!coverage.center_latitude || !coverage.center_longitude || !coverage.max_radius_miles) {
        return false;
      }
      
      const distance = this.calculateDistance(lat, lng, coverage.center_latitude, coverage.center_longitude);
      return distance <= coverage.max_radius_miles;
    }

    // For zip_codes and polygon types, you'd implement additional logic here
    return true; // Placeholder
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}