import { connectionManager, ConnectionMode, ConnectionState } from './connectionManager';
import { DashboardMetrics, LiveBooking, UserActivity, SystemAlert } from './realTimeDashboardService';

// Error classification system
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  CONNECTION = 'connection',
  DATA_SYNC = 'data_sync',
  TRANSACTION = 'transaction',
  SYSTEM = 'system',
  PROVIDER = 'provider',
  PAYMENT = 'payment',
  AUTHENTICATION = 'authentication',
  PERFORMANCE = 'performance'
}

export enum ErrorCode {
  // Connection errors
  WEBSOCKET_FAILED = 'WEBSOCKET_FAILED',
  POLLING_FAILED = 'POLLING_FAILED',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Data synchronization errors
  DATA_MISMATCH = 'DATA_MISMATCH',
  SYNC_FAILED = 'SYNC_FAILED',
  STALE_DATA = 'STALE_DATA',
  
  // Transaction errors
  BOOKING_FAILED = 'BOOKING_FAILED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  REFUND_FAILED = 'REFUND_FAILED',
  
  // System errors
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Provider errors
  PROVIDER_OFFLINE = 'PROVIDER_OFFLINE',
  PROVIDER_BUSY = 'PROVIDER_BUSY',
  PPS_CALCULATION_FAILED = 'PPS_CALCULATION_FAILED',
  
  // Performance issues
  HIGH_LATENCY = 'HIGH_LATENCY',
  SLOW_RESPONSE = 'SLOW_RESPONSE',
  MEMORY_LEAK = 'MEMORY_LEAK'
}

export interface ErrorReport {
  id: string;
  code: ErrorCode;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  stackTrace?: string;
  context?: {
    connectionMode?: ConnectionMode;
    connectionState?: ConnectionState;
    lastSuccessfulSync?: Date;
    retryAttempts?: number;
  };
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface RecoveryAction {
  id: string;
  name: string;
  description: string;
  execute: () => Promise<boolean>;
  canRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  priority: number;
}

export interface AlertConfig {
  errorCode: ErrorCode;
  severity: ErrorSeverity;
  threshold: number; // Number of occurrences before alerting
  timeWindow: number; // Time window in milliseconds
  escalationRules: {
    afterMinutes: number;
    escalateTo: ErrorSeverity;
  }[];
  autoResolve: boolean;
  autoResolveAfter: number; // Minutes
}

/**
 * Error Recovery Service handles error tracking, recovery mechanisms,
 * and alert management for the admin dashboard
 */
export class ErrorRecoveryService {
  private errors: Map<string, ErrorReport> = new Map();
  private recoveryActions: Map<ErrorCode, RecoveryAction[]> = new Map();
  private alertConfigs: Map<ErrorCode, AlertConfig> = new Map();
  private retryQueues: Map<string, NodeJS.Timeout> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  // Event listeners
  private errorListeners: Set<(error: ErrorReport) => void> = new Set();
  private recoveryListeners: Set<(action: RecoveryAction, success: boolean) => void> = new Set();
  private alertListeners: Set<(alert: SystemAlert) => void> = new Set();

  // Statistics tracking
  private stats = {
    totalErrors: 0,
    resolvedErrors: 0,
    activeErrors: 0,
    criticalErrors: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    averageResolutionTime: 0
  };

  constructor() {
    this.initializeRecoveryActions();
    this.initializeAlertConfigs();
    this.startPeriodicCleanup();
  }

  /**
   * Report an error to the recovery system
   */
  public reportError(
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    context?: ErrorReport['context']
  ): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const error: ErrorReport = {
      id: errorId,
      code,
      category: this.getCategoryForCode(code),
      severity: this.getSeverityForCode(code),
      message,
      details,
      timestamp: new Date(),
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stackTrace: new Error().stack,
      context: {
        connectionMode: connectionManager.getMode(),
        connectionState: connectionManager.getState(),
        lastSuccessfulSync: this.getLastSuccessfulSync(),
        retryAttempts: 0,
        ...context
      },
      resolved: false
    };

    this.errors.set(errorId, error);
    this.updateStats();

    // Notify error listeners
    this.notifyErrorListeners(error);

    // Check if this should trigger an alert
    this.checkForAlert(error);

    // Attempt automatic recovery if available
    this.attemptRecovery(error);

    // Log error for debugging
    this.logError(error);

    return errorId;
  }

  /**
   * Mark an error as resolved
   */
  public resolveError(errorId: string, resolvedBy?: string): boolean {
    const error = this.errors.get(errorId);
    if (!error || error.resolved) {
      return false;
    }

    error.resolved = true;
    error.resolvedAt = new Date();
    error.resolvedBy = resolvedBy || 'system';

    // Clear any escalation timers
    const escalationTimer = this.escalationTimers.get(errorId);
    if (escalationTimer) {
      clearTimeout(escalationTimer);
      this.escalationTimers.delete(errorId);
    }

    this.updateStats();
    return true;
  }

  /**
   * Get error statistics
   */
  public getStats() {
    return { ...this.stats };
  }

  /**
   * Get active (unresolved) errors
   */
  public getActiveErrors(): ErrorReport[] {
    return Array.from(this.errors.values()).filter(error => !error.resolved);
  }

  /**
   * Get critical errors
   */
  public getCriticalErrors(): ErrorReport[] {
    return this.getActiveErrors().filter(error => error.severity === ErrorSeverity.CRITICAL);
  }

  /**
   * Get errors by category
   */
  public getErrorsByCategory(category: ErrorCategory): ErrorReport[] {
    return Array.from(this.errors.values()).filter(error => error.category === category);
  }

  /**
   * Attempt automatic recovery for an error
   */
  private async attemptRecovery(error: ErrorReport): Promise<void> {
    const actions = this.recoveryActions.get(error.code);
    if (!actions || actions.length === 0) {
      console.log(`No recovery actions available for error: ${error.code}`);
      return;
    }

    // Sort actions by priority
    const sortedActions = actions.sort((a, b) => b.priority - a.priority);

    for (const action of sortedActions) {
      try {
        console.log(`🔧 Attempting recovery action: ${action.name}`);
        
        const success = await this.executeRecoveryAction(action, error);
        
        if (success) {
          console.log(`✅ Recovery successful: ${action.name}`);
          this.resolveError(error.id, `auto-recovery:${action.id}`);
          this.stats.successfulRecoveries++;
          this.notifyRecoveryListeners(action, true);
          return;
        } else {
          console.log(`❌ Recovery failed: ${action.name}`);
          this.stats.failedRecoveries++;
          this.notifyRecoveryListeners(action, false);
        }
      } catch (recoveryError) {
        console.error(`Error during recovery action ${action.name}:`, recoveryError);
        this.stats.failedRecoveries++;
        this.notifyRecoveryListeners(action, false);
      }
    }

    // If all recovery actions failed, schedule retry if appropriate
    this.scheduleRetry(error);
  }

  /**
   * Execute a recovery action with retry logic
   */
  private async executeRecoveryAction(action: RecoveryAction, error: ErrorReport): Promise<boolean> {
    const maxAttempts = action.maxRetries + 1;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const success = await action.execute();
        if (success) {
          return true;
        }
      } catch (actionError) {
        console.error(`Recovery action ${action.name} attempt ${attempts + 1} failed:`, actionError);
      }

      attempts++;
      if (attempts < maxAttempts && action.canRetry) {
        console.log(`⏳ Retrying recovery action ${action.name} in ${action.retryDelay}ms (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, action.retryDelay));
      }
    }

    return false;
  }

  /**
   * Schedule retry for failed recovery
   */
  private scheduleRetry(error: ErrorReport): void {
    const retryKey = `retry_${error.id}`;
    const existingRetry = this.retryQueues.get(retryKey);
    
    if (existingRetry) {
      clearTimeout(existingRetry);
    }

    // Calculate retry delay with exponential backoff
    const retryAttempts = (error.context?.retryAttempts || 0) + 1;
    const baseDelay = 5000; // 5 seconds
    const maxDelay = 300000; // 5 minutes
    const delay = Math.min(baseDelay * Math.pow(2, retryAttempts - 1), maxDelay);

    console.log(`⏰ Scheduling retry for error ${error.code} in ${delay}ms (attempt ${retryAttempts})`);

    const retryTimer = setTimeout(() => {
      error.context!.retryAttempts = retryAttempts;
      this.attemptRecovery(error);
      this.retryQueues.delete(retryKey);
    }, delay);

    this.retryQueues.set(retryKey, retryTimer);
  }

  /**
   * Check if error should trigger an alert
   */
  private checkForAlert(error: ErrorReport): void {
    const config = this.alertConfigs.get(error.code);
    if (!config) {
      return;
    }

    // Count recent occurrences of this error
    const recentErrors = this.getRecentErrors(error.code, config.timeWindow);
    
    if (recentErrors.length >= config.threshold) {
      this.triggerAlert(error, recentErrors.length);
    }

    // Schedule escalation if configured
    if (config.escalationRules.length > 0) {
      this.scheduleEscalation(error, config);
    }
  }

  /**
   * Trigger an alert for the error
   */
  private triggerAlert(error: ErrorReport, occurrences: number): void {
    const alert: SystemAlert = {
      id: `alert_${error.id}`,
      type: this.getAlertTypeForSeverity(error.severity),
      title: `${error.category.toUpperCase()}: ${error.code}`,
      message: `${error.message} (${occurrences} occurrences)`,
      timestamp: new Date().toISOString(),
      severity: error.severity,
      category: error.category as any,
      resolved: false
    };

    console.log(`🚨 Triggering alert: ${alert.title}`);
    this.notifyAlertListeners(alert);
  }

  /**
   * Schedule alert escalation
   */
  private scheduleEscalation(error: ErrorReport, config: AlertConfig): void {
    config.escalationRules.forEach(rule => {
      const escalationTimer = setTimeout(() => {
        if (!error.resolved) {
          // Escalate the error
          const originalSeverity = error.severity;
          error.severity = rule.escalateTo;
          
          console.log(`⬆️ Escalating error ${error.id} from ${originalSeverity} to ${rule.escalateTo}`);
          
          // Trigger escalated alert
          this.triggerAlert(error, 1);
        }
      }, rule.afterMinutes * 60 * 1000);

      this.escalationTimers.set(`${error.id}_${rule.afterMinutes}`, escalationTimer);
    });
  }

  /**
   * Initialize recovery actions
   */
  private initializeRecoveryActions(): void {
    // Connection recovery actions
    this.addRecoveryAction(ErrorCode.WEBSOCKET_FAILED, {
      id: 'switch_to_polling',
      name: 'Switch to Polling Mode',
      description: 'Fall back to HTTP polling when WebSocket fails',
      execute: async () => {
        return await connectionManager.switchToMode(ConnectionMode.POLLING);
      },
      canRetry: true,
      maxRetries: 2,
      retryDelay: 5000,
      priority: 10
    });

    this.addRecoveryAction(ErrorCode.POLLING_FAILED, {
      id: 'retry_websocket',
      name: 'Retry WebSocket Connection',
      description: 'Attempt to restore WebSocket connection',
      execute: async () => {
        return await connectionManager.switchToMode(ConnectionMode.WEBSOCKET);
      },
      canRetry: true,
      maxRetries: 3,
      retryDelay: 10000,
      priority: 8
    });

    // Data sync recovery actions
    this.addRecoveryAction(ErrorCode.DATA_MISMATCH, {
      id: 'force_data_refresh',
      name: 'Force Data Refresh',
      description: 'Force refresh of all dashboard data',
      execute: async () => {
        try {
          // This would be implemented to refresh all dashboard data
          console.log('🔄 Forcing complete data refresh...');
          return true;
        } catch {
          return false;
        }
      },
      canRetry: true,
      maxRetries: 2,
      retryDelay: 3000,
      priority: 7
    });

    // System recovery actions
    this.addRecoveryAction(ErrorCode.SERVER_ERROR, {
      id: 'health_check',
      name: 'Server Health Check',
      description: 'Check server availability and switch endpoints if needed',
      execute: async () => {
        try {
          const response = await fetch('/api/health');
          return response.ok;
        } catch {
          return false;
        }
      },
      canRetry: true,
      maxRetries: 5,
      retryDelay: 2000,
      priority: 6
    });
  }

  /**
   * Initialize alert configurations
   */
  private initializeAlertConfigs(): void {
    // Critical system alerts
    this.alertConfigs.set(ErrorCode.SERVER_ERROR, {
      errorCode: ErrorCode.SERVER_ERROR,
      severity: ErrorSeverity.CRITICAL,
      threshold: 3,
      timeWindow: 60000, // 1 minute
      escalationRules: [
        { afterMinutes: 5, escalateTo: ErrorSeverity.CRITICAL }
      ],
      autoResolve: true,
      autoResolveAfter: 30
    });

    // Connection alerts
    this.alertConfigs.set(ErrorCode.WEBSOCKET_FAILED, {
      errorCode: ErrorCode.WEBSOCKET_FAILED,
      severity: ErrorSeverity.HIGH,
      threshold: 2,
      timeWindow: 120000, // 2 minutes
      escalationRules: [
        { afterMinutes: 10, escalateTo: ErrorSeverity.CRITICAL }
      ],
      autoResolve: true,
      autoResolveAfter: 15
    });

    // Performance alerts
    this.alertConfigs.set(ErrorCode.HIGH_LATENCY, {
      errorCode: ErrorCode.HIGH_LATENCY,
      severity: ErrorSeverity.MEDIUM,
      threshold: 5,
      timeWindow: 300000, // 5 minutes
      escalationRules: [
        { afterMinutes: 15, escalateTo: ErrorSeverity.HIGH }
      ],
      autoResolve: true,
      autoResolveAfter: 10
    });
  }

  /**
   * Add a recovery action for an error code
   */
  private addRecoveryAction(errorCode: ErrorCode, action: RecoveryAction): void {
    const actions = this.recoveryActions.get(errorCode) || [];
    actions.push(action);
    this.recoveryActions.set(errorCode, actions);
  }

  /**
   * Get recent errors for a specific code
   */
  private getRecentErrors(code: ErrorCode, timeWindow: number): ErrorReport[] {
    const cutoffTime = Date.now() - timeWindow;
    return Array.from(this.errors.values()).filter(
      error => error.code === code && error.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Helper methods
   */
  private getCategoryForCode(code: ErrorCode): ErrorCategory {
    const categoryMap: Record<string, ErrorCategory> = {
      'WEBSOCKET_FAILED': ErrorCategory.CONNECTION,
      'POLLING_FAILED': ErrorCategory.CONNECTION,
      'TIMEOUT': ErrorCategory.CONNECTION,
      'NETWORK_ERROR': ErrorCategory.CONNECTION,
      'DATA_MISMATCH': ErrorCategory.DATA_SYNC,
      'SYNC_FAILED': ErrorCategory.DATA_SYNC,
      'STALE_DATA': ErrorCategory.DATA_SYNC,
      'BOOKING_FAILED': ErrorCategory.TRANSACTION,
      'PAYMENT_FAILED': ErrorCategory.PAYMENT,
      'REFUND_FAILED': ErrorCategory.PAYMENT,
      'SERVER_ERROR': ErrorCategory.SYSTEM,
      'DATABASE_ERROR': ErrorCategory.SYSTEM,
      'SERVICE_UNAVAILABLE': ErrorCategory.SYSTEM,
      'PROVIDER_OFFLINE': ErrorCategory.PROVIDER,
      'PROVIDER_BUSY': ErrorCategory.PROVIDER,
      'PPS_CALCULATION_FAILED': ErrorCategory.PROVIDER,
      'HIGH_LATENCY': ErrorCategory.PERFORMANCE,
      'SLOW_RESPONSE': ErrorCategory.PERFORMANCE,
      'MEMORY_LEAK': ErrorCategory.PERFORMANCE
    };

    return categoryMap[code] || ErrorCategory.SYSTEM;
  }

  private getSeverityForCode(code: ErrorCode): ErrorSeverity {
    const severityMap: Record<string, ErrorSeverity> = {
      'WEBSOCKET_FAILED': ErrorSeverity.HIGH,
      'POLLING_FAILED': ErrorSeverity.HIGH,
      'SERVER_ERROR': ErrorSeverity.CRITICAL,
      'DATABASE_ERROR': ErrorSeverity.CRITICAL,
      'PAYMENT_FAILED': ErrorSeverity.HIGH,
      'BOOKING_FAILED': ErrorSeverity.MEDIUM,
      'DATA_MISMATCH': ErrorSeverity.MEDIUM,
      'PROVIDER_OFFLINE': ErrorSeverity.LOW,
      'HIGH_LATENCY': ErrorSeverity.MEDIUM,
      'TIMEOUT': ErrorSeverity.MEDIUM,
      'NETWORK_ERROR': ErrorSeverity.MEDIUM
    };

    return severityMap[code] || ErrorSeverity.LOW;
  }

  private getAlertTypeForSeverity(severity: ErrorSeverity): SystemAlert['type'] {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return 'error';
      case ErrorSeverity.HIGH: return 'warning';
      case ErrorSeverity.MEDIUM: return 'warning';
      case ErrorSeverity.LOW: return 'info';
      default: return 'info';
    }
  }

  private getCurrentUserId(): string | undefined {
    // This would be implemented to get current user ID
    return 'admin_user'; // Placeholder
  }

  private getSessionId(): string {
    // Generate or retrieve session ID
    return sessionStorage.getItem('sessionId') || `session_${Date.now()}`;
  }

  private getLastSuccessfulSync(): Date | undefined {
    // This would be implemented to track last successful data sync
    return connectionManager.getHealth().lastSuccessfulConnection;
  }

  private logError(error: ErrorReport): void {
    const logLevel = error.severity === ErrorSeverity.CRITICAL ? 'error' : 
                    error.severity === ErrorSeverity.HIGH ? 'warn' : 'info';
    
    console[logLevel](`[ErrorRecovery] ${error.code}: ${error.message}`, {
      id: error.id,
      category: error.category,
      severity: error.severity,
      context: error.context,
      details: error.details
    });
  }

  private updateStats(): void {
    const allErrors = Array.from(this.errors.values());
    const activeErrors = allErrors.filter(e => !e.resolved);
    const resolvedErrors = allErrors.filter(e => e.resolved);
    const criticalErrors = activeErrors.filter(e => e.severity === ErrorSeverity.CRITICAL);

    this.stats = {
      totalErrors: allErrors.length,
      resolvedErrors: resolvedErrors.length,
      activeErrors: activeErrors.length,
      criticalErrors: criticalErrors.length,
      successfulRecoveries: this.stats.successfulRecoveries,
      failedRecoveries: this.stats.failedRecoveries,
      averageResolutionTime: this.calculateAverageResolutionTime(resolvedErrors)
    };
  }

  private calculateAverageResolutionTime(resolvedErrors: ErrorReport[]): number {
    if (resolvedErrors.length === 0) return 0;

    const totalTime = resolvedErrors.reduce((sum, error) => {
      if (error.resolvedAt) {
        return sum + (error.resolvedAt.getTime() - error.timestamp.getTime());
      }
      return sum;
    }, 0);

    return Math.round(totalTime / resolvedErrors.length / 1000); // Return in seconds
  }

  /**
   * Start periodic cleanup of old resolved errors
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupOldErrors();
    }, 300000); // Clean up every 5 minutes
  }

  private cleanupOldErrors(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    let cleanedCount = 0;

    for (const [id, error] of this.errors) {
      if (error.resolved && error.timestamp.getTime() < cutoffTime) {
        this.errors.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old resolved errors`);
      this.updateStats();
    }
  }

  /**
   * Event listener management
   */
  public onError(callback: (error: ErrorReport) => void): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  public onRecovery(callback: (action: RecoveryAction, success: boolean) => void): () => void {
    this.recoveryListeners.add(callback);
    return () => this.recoveryListeners.delete(callback);
  }

  public onAlert(callback: (alert: SystemAlert) => void): () => void {
    this.alertListeners.add(callback);
    return () => this.alertListeners.delete(callback);
  }

  private notifyErrorListeners(error: ErrorReport): void {
    this.errorListeners.forEach(callback => {
      try {
        callback(error);
      } catch (error) {
        console.error('Error in error listener callback:', error);
      }
    });
  }

  private notifyRecoveryListeners(action: RecoveryAction, success: boolean): void {
    this.recoveryListeners.forEach(callback => {
      try {
        callback(action, success);
      } catch (error) {
        console.error('Error in recovery listener callback:', error);
      }
    });
  }

  private notifyAlertListeners(alert: SystemAlert): void {
    this.alertListeners.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert listener callback:', error);
      }
    });
  }

  /**
   * Shutdown and cleanup
   */
  public shutdown(): void {
    console.log('🔌 Shutting down Error Recovery Service...');

    // Clear all timers
    for (const timer of this.retryQueues.values()) {
      clearTimeout(timer);
    }
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }

    // Clear collections
    this.retryQueues.clear();
    this.escalationTimers.clear();
    this.errorListeners.clear();
    this.recoveryListeners.clear();
    this.alertListeners.clear();

    console.log('✅ Error Recovery Service shutdown complete');
  }
}

// Export singleton instance
export const errorRecoveryService = new ErrorRecoveryService();
export default errorRecoveryService;