// Real-Time Dashboard Data Models for Rayshine Admin CRM
// Comprehensive TypeScript interfaces for dashboard metrics, KPIs, and system monitoring

// ================== CORE DASHBOARD METRICS ==================

export interface DashboardMetrics {
  // Primary KPIs
  todaysBookings: number;
  totalRevenue: number;
  activeProviders: number;
  avgPPSScore: number;
  pendingApprovals: number;
  revenueToday: number;
  completedBookings: number;
  activeUsers: number;
  
  // System health
  systemHealth: SystemHealthStatus;
  
  // Performance metrics
  performance: PerformanceMetrics;
  
  // Time-based metrics
  trends: TrendMetrics;
  
  // Metadata
  lastUpdated: string;
  generatedAt: string;
  dataFreshness: DataFreshnessIndicator;
}

export interface PerformanceMetrics {
  avgResponseTime: number; // milliseconds
  apiSuccessRate: number; // percentage
  systemLoad: number; // percentage
  memoryUsage: number; // percentage
  diskUsage: number; // percentage
  activeConnections: number;
  requestsPerMinute: number;
}

export interface TrendMetrics {
  bookingsTrend: TrendData;
  revenueTrend: TrendData;
  userGrowthTrend: TrendData;
  customerSatisfactionTrend: TrendData;
}

export interface TrendData {
  current: number;
  previous: number;
  change: number; // percentage change
  direction: 'up' | 'down' | 'stable';
  periodType: 'hour' | 'day' | 'week' | 'month';
}

export interface DataFreshnessIndicator {
  realTimeData: boolean;
  lastSyncTimestamp: string;
  stalenessLevel: 'fresh' | 'recent' | 'stale' | 'outdated';
  syncStatus: 'synced' | 'syncing' | 'failed' | 'pending';
}

// ================== BOOKING MANAGEMENT ==================

export interface LiveBooking {
  id: number;
  bookingReference: string;
  customer: CustomerInfo;
  provider: ProviderInfo | null;
  service: ServiceInfo;
  
  // Scheduling
  scheduledStartTime: string;
  scheduledEndTime: string;
  estimatedDuration: number; // minutes
  
  // Status and priority
  status: BookingStatus;
  priority: PriorityLevel;
  urgencyLevel: UrgencyLevel;
  
  // Location and logistics
  location: LocationInfo;
  
  // Financial
  pricing: BookingPricing;
  
  // Tracking
  timeline: BookingTimeline[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  tags: string[];
  notes?: string;
}

export type BookingStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'assigned' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show' 
  | 'rescheduled';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
export type UrgencyLevel = 'normal' | 'asap' | 'flexible' | 'critical';

export interface CustomerInfo {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatar?: string;
  membershipTier: 'standard' | 'premium' | 'vip';
  totalBookings: number;
  avgRating: number;
}

export interface ProviderInfo {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatar?: string;
  ppsScore: number;
  specializations: string[];
  isOnline: boolean;
  currentLocation?: LocationInfo;
  availabilityStatus: 'available' | 'busy' | 'offline' | 'break';
}

export interface ServiceInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  estimatedDuration: number;
  requirements: string[];
  tags: string[];
}

export interface LocationInfo {
  address: string;
  city: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
  locationNotes?: string;
}

export interface BookingPricing {
  basePrice: number;
  addOns: AddOnPricing[];
  discounts: DiscountInfo[];
  taxes: TaxInfo[];
  totalEstimated: number;
  finalCost?: number;
  paymentStatus: PaymentStatus;
}

export interface AddOnPricing {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface DiscountInfo {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  appliedAmount: number;
}

export interface TaxInfo {
  name: string;
  rate: number;
  amount: number;
}

export type PaymentStatus = 
  | 'pending' 
  | 'authorized' 
  | 'paid' 
  | 'partial' 
  | 'refunded' 
  | 'failed' 
  | 'disputed';

export interface BookingTimeline {
  timestamp: string;
  event: string;
  description: string;
  actor: {
    type: 'system' | 'customer' | 'provider' | 'admin';
    name: string;
    id?: string;
  };
  metadata?: Record<string, any>;
}

// ================== SYSTEM HEALTH MONITORING ==================

export interface SystemHealthStatus {
  overall: HealthLevel;
  components: SystemComponentStatus[];
  lastHealthCheck: string;
  uptime: number; // seconds
  version: string;
  environment: 'development' | 'staging' | 'production';
}

export type HealthLevel = 'healthy' | 'warning' | 'critical' | 'offline';

export interface SystemComponentStatus {
  name: string;
  status: HealthLevel;
  responseTime?: number; // milliseconds
  lastCheck: string;
  errorCount: number;
  details: ComponentHealthDetails;
}

export interface ComponentHealthDetails {
  database?: DatabaseHealth;
  api?: APIHealth;
  websocket?: WebSocketHealth;
  ppsSystem?: PPSSystemHealth;
  paymentGateway?: PaymentGatewayHealth;
  notifications?: NotificationSystemHealth;
  storage?: StorageHealth;
}

export interface DatabaseHealth {
  connectionPool: number;
  activeConnections: number;
  queryResponseTime: number;
  replicationLag?: number;
  diskSpace: number; // percentage used
}

export interface APIHealth {
  endpointsOnline: number;
  endpointsTotal: number;
  avgResponseTime: number;
  errorRate: number; // percentage
  requestsPerMinute: number;
}

export interface WebSocketHealth {
  activeConnections: number;
  messageLatency: number;
  connectionDropRate: number;
  heartbeatStatus: 'active' | 'inactive';
}

export interface PPSSystemHealth {
  scoringEngine: HealthLevel;
  lastScoreUpdate: string;
  providersInQueue: number;
  avgCalculationTime: number;
}

export interface PaymentGatewayHealth {
  gateway: string;
  status: HealthLevel;
  transactionSuccessRate: number;
  avgProcessingTime: number;
  lastFailure?: string;
}

export interface NotificationSystemHealth {
  pushNotifications: HealthLevel;
  emailService: HealthLevel;
  smsService: HealthLevel;
  inAppNotifications: HealthLevel;
  queueSize: number;
}

export interface StorageHealth {
  fileStorage: HealthLevel;
  imageProcessing: HealthLevel;
  backupStatus: 'current' | 'pending' | 'failed';
  lastBackup: string;
}

// ================== USER ACTIVITY TRACKING ==================

export interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  actionType: ActivityType;
  
  // Context
  resourceType?: ResourceType;
  resourceId?: string;
  resourceName?: string;
  
  // Details
  details: ActivityDetails;
  metadata?: Record<string, any>;
  
  // Location and device
  ipAddress?: string;
  userAgent?: string;
  location?: ActivityLocation;
  
  // Timing
  timestamp: string;
  duration?: number; // milliseconds for long-running actions
  
  // Security
  riskLevel: RiskLevel;
  flagged: boolean;
}

export type UserRole = 'customer' | 'provider' | 'admin' | 'support' | 'system';

export type ActivityType = 
  | 'authentication'
  | 'booking_action'
  | 'payment_action'
  | 'profile_update'
  | 'system_action'
  | 'communication'
  | 'admin_action'
  | 'api_request';

export type ResourceType = 
  | 'booking'
  | 'user_profile'
  | 'payment'
  | 'service'
  | 'provider'
  | 'system_setting'
  | 'notification'
  | 'report';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ActivityDetails {
  description: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  changesDescription?: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

export interface ActivityLocation {
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
}

// ================== SYSTEM ALERTS ==================

export interface SystemAlert {
  id: string;
  title: string;
  message: string;
  
  // Classification
  type: AlertType;
  severity: AlertSeverity;
  category: AlertCategory;
  priority: PriorityLevel;
  
  // Status
  status: AlertStatus;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  
  // Context
  source: AlertSource;
  affectedServices: string[];
  affectedUsers?: number;
  estimatedImpact: ImpactLevel;
  
  // Actions
  suggestedActions: string[];
  automatedActions: AutomatedAction[];
  manualActions: ManualAction[];
  
  // Metadata
  timestamp: string;
  firstOccurrence: string;
  lastOccurrence: string;
  occurrenceCount: number;
  tags: string[];
  relatedAlerts: string[];
}

export type AlertType = 'error' | 'warning' | 'info' | 'success' | 'security';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertCategory = 
  | 'system' 
  | 'booking' 
  | 'payment' 
  | 'provider' 
  | 'customer' 
  | 'security' 
  | 'performance' 
  | 'integration';

export type AlertStatus = 'active' | 'investigating' | 'resolved' | 'suppressed';

export interface AlertSource {
  system: string;
  component: string;
  instance?: string;
  version?: string;
}

export type ImpactLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface AutomatedAction {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  executedAt?: string;
  result?: string;
}

export interface ManualAction {
  name: string;
  description: string;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: string;
  notes?: string;
}

// ================== REAL-TIME EVENT PAYLOADS ==================

export interface RealTimeEvent<T = any> {
  id: string;
  type: EventType;
  timestamp: string;
  source: EventSource;
  payload: T;
  metadata: EventMetadata;
}

export type EventType = 
  | 'metrics_update'
  | 'booking_created'
  | 'booking_updated'
  | 'booking_cancelled'
  | 'provider_online'
  | 'provider_offline'
  | 'payment_processed'
  | 'system_alert'
  | 'user_activity'
  | 'system_health_change'
  | 'notification_sent';

export interface EventSource {
  service: string;
  instance: string;
  version: string;
  userId?: string;
  sessionId?: string;
}

export interface EventMetadata {
  priority: PriorityLevel;
  broadcast: boolean;
  targetAudience: EventAudience[];
  retryCount: number;
  expiresAt?: string;
  correlationId?: string;
  causationId?: string;
}

export type EventAudience = 'admin' | 'provider' | 'customer' | 'support' | 'system';

// Specific event payloads
export interface MetricsUpdatePayload extends DashboardMetrics {
  updateType: 'full' | 'partial' | 'delta';
  changedFields?: string[];
}

export interface BookingEventPayload {
  booking: LiveBooking;
  changeType: 'created' | 'updated' | 'status_changed' | 'cancelled';
  previousValues?: Partial<LiveBooking>;
  affectedUsers: string[];
}

export interface ProviderStatusPayload {
  providerId: string;
  providerName: string;
  previousStatus?: string;
  newStatus: string;
  location?: LocationInfo;
  timestamp: string;
}

export interface PaymentEventPayload {
  bookingId: number;
  paymentId: string;
  customerId: string;
  amount: number;
  status: PaymentStatus;
  method: string;
  timestamp: string;
}

// ================== KPI CALCULATION MODELS ==================

export interface KPICalculationConfig {
  name: string;
  description: string;
  formula: string;
  dataSource: DataSource[];
  refreshInterval: number; // seconds
  thresholds: KPIThresholds;
  historicalPeriods: HistoricalPeriod[];
}

export interface DataSource {
  name: string;
  type: 'database' | 'api' | 'cache' | 'realtime';
  query?: string;
  endpoint?: string;
  filters?: Record<string, any>;
}

export interface KPIThresholds {
  excellent: number;
  good: number;
  warning: number;
  critical: number;
}

export interface HistoricalPeriod {
  name: string;
  duration: number; // days
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface CalculatedKPI {
  name: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercentage: number;
  trend: TrendDirection;
  status: KPIStatus;
  lastCalculated: string;
  historicalData: KPIHistoricalPoint[];
}

export type TrendDirection = 'up' | 'down' | 'stable' | 'volatile';
export type KPIStatus = 'excellent' | 'good' | 'warning' | 'critical' | 'unknown';

export interface KPIHistoricalPoint {
  timestamp: string;
  value: number;
  period: string;
}

// ================== CHART VISUALIZATION MODELS ==================

export interface ChartDataSet {
  id: string;
  label: string;
  data: ChartDataPoint[];
  chartType: ChartType;
  color: ChartColor;
  options: ChartOptions;
}

export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'pie' 
  | 'doughnut' 
  | 'area' 
  | 'scatter' 
  | 'heatmap' 
  | 'gauge' 
  | 'sparkline';

export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface ChartColor {
  primary: string;
  secondary?: string;
  gradient?: {
    start: string;
    end: string;
    direction: 'horizontal' | 'vertical' | 'radial';
  };
}

export interface ChartOptions {
  realTimeUpdate: boolean;
  updateInterval?: number; // milliseconds
  maxDataPoints?: number;
  animations: ChartAnimations;
  responsive: boolean;
  legend: LegendOptions;
  axes: AxisOptions;
}

export interface ChartAnimations {
  enabled: boolean;
  duration: number;
  easing: 'linear' | 'easeInOut' | 'bounce';
}

export interface LegendOptions {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  align: 'start' | 'center' | 'end';
}

export interface AxisOptions {
  x: AxisConfig;
  y: AxisConfig;
}

export interface AxisConfig {
  show: boolean;
  label?: string;
  min?: number;
  max?: number;
  format?: 'number' | 'currency' | 'percentage' | 'datetime';
  grid: GridOptions;
}

export interface GridOptions {
  show: boolean;
  color: string;
  width: number;
}

// ================== DATA TRANSFORMATION UTILITIES ==================

export interface DataTransformationRule {
  name: string;
  sourceField: string;
  targetField: string;
  transformationType: TransformationType;
  transformationConfig: TransformationConfig;
}

export type TransformationType = 
  | 'format' 
  | 'aggregate' 
  | 'filter' 
  | 'sort' 
  | 'group' 
  | 'calculate' 
  | 'normalize';

export interface TransformationConfig {
  format?: FormatConfig;
  aggregate?: AggregateConfig;
  filter?: FilterConfig;
  sort?: SortConfig;
  group?: GroupConfig;
  calculate?: CalculateConfig;
}

export interface FormatConfig {
  type: 'currency' | 'percentage' | 'datetime' | 'number' | 'text';
  locale?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export interface AggregateConfig {
  function: 'sum' | 'average' | 'count' | 'min' | 'max' | 'median';
  groupBy?: string[];
  timeWindow?: string;
}

export interface FilterConfig {
  condition: 'equals' | 'not_equals' | 'greater' | 'less' | 'contains' | 'range';
  value: any;
  operator?: 'and' | 'or';
}

export interface SortConfig {
  direction: 'asc' | 'desc';
  priority: number;
}

export interface GroupConfig {
  by: string[];
  aggregations: AggregateConfig[];
}

export interface CalculateConfig {
  expression: string;
  dependencies: string[];
  resultType: 'number' | 'string' | 'boolean' | 'date';
}

// ================== WEBSOCKET CONNECTION MANAGEMENT ==================

export interface WebSocketConnectionState {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  connectionId?: string;
  lastConnected?: string;
  lastDisconnected?: string;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  connectionQuality: ConnectionQuality;
  latency: number; // milliseconds
}

export interface ConnectionQuality {
  level: 'excellent' | 'good' | 'poor' | 'bad';
  score: number; // 0-100
  factors: QualityFactor[];
}

export interface QualityFactor {
  name: string;
  impact: 'positive' | 'negative';
  weight: number;
  description: string;
}

// ================== FALLBACK POLLING CONFIGURATION ==================

export interface FallbackPollingConfig {
  enabled: boolean;
  interval: number; // milliseconds
  maxRetries: number;
  backoffMultiplier: number;
  endpoints: PollingEndpoint[];
  conditions: FallbackCondition[];
}

export interface PollingEndpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  priority: number;
  timeout: number;
}

export interface FallbackCondition {
  type: 'connection_lost' | 'high_latency' | 'error_rate' | 'manual';
  threshold?: number;
  duration?: number; // milliseconds
  enabled: boolean;
}

// ================== ERROR RECOVERY MECHANISMS ==================

export interface ErrorRecoveryStrategy {
  name: string;
  triggers: ErrorTrigger[];
  actions: RecoveryAction[];
  maxAttempts: number;
  cooldownPeriod: number; // milliseconds
  escalation?: EscalationStrategy;
}

export interface ErrorTrigger {
  errorType: string;
  pattern?: string;
  threshold?: number;
  timeWindow?: number; // milliseconds
}

export interface RecoveryAction {
  name: string;
  type: 'retry' | 'fallback' | 'alert' | 'restart' | 'escalate';
  config: RecoveryActionConfig;
  order: number;
}

export interface RecoveryActionConfig {
  delay?: number;
  maxAttempts?: number;
  fallbackEndpoint?: string;
  alertLevel?: AlertSeverity;
  restartComponent?: string;
}

export interface EscalationStrategy {
  levels: EscalationLevel[];
  autoEscalate: boolean;
  escalationDelay: number; // milliseconds
}

export interface EscalationLevel {
  level: number;
  name: string;
  actions: string[];
  contacts: string[];
  timeLimit?: number; // milliseconds
}

// ================== EXPORT ALL TYPES ==================

export default {
  // Core types
  DashboardMetrics,
  LiveBooking,
  UserActivity,
  SystemAlert,
  
  // Event types
  RealTimeEvent,
  
  // Chart types
  ChartDataSet,
  
  // Configuration types
  KPICalculationConfig,
  FallbackPollingConfig,
  ErrorRecoveryStrategy
};