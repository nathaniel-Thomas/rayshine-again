import { errorRecoveryService, ErrorCode } from '../services/errorRecoveryService';
import { connectionManager, ConnectionMode } from '../services/connectionManager';

/**
 * Test suite for error recovery and alert systems
 */
export class ErrorRecoveryTests {
  
  /**
   * Run all error recovery tests
   */
  public static async runAllTests(): Promise<void> {
    console.log('🧪 Starting Error Recovery System Tests...');
    
    try {
      await this.testConnectionErrors();
      await this.sleep(2000);
      
      await this.testDataSyncErrors();
      await this.sleep(2000);
      
      await this.testSystemErrors();
      await this.sleep(2000);
      
      await this.testPerformanceErrors();
      await this.sleep(2000);
      
      await this.testErrorResolution();
      
      console.log('✅ All Error Recovery Tests Completed');
      this.logTestSummary();
      
    } catch (error) {
      console.error('❌ Error Recovery Tests Failed:', error);
    }
  }

  /**
   * Test connection-related errors
   */
  private static async testConnectionErrors(): Promise<void> {
    console.log('🔌 Testing Connection Errors...');
    
    // Simulate WebSocket connection failure
    errorRecoveryService.reportError(
      ErrorCode.WEBSOCKET_FAILED,
      'WebSocket connection failed - testing error recovery',
      { testCase: 'connection_failure', timestamp: Date.now() },
      {
        connectionMode: ConnectionMode.WEBSOCKET,
        retryAttempts: 0
      }
    );

    await this.sleep(1000);

    // Simulate network timeout
    errorRecoveryService.reportError(
      ErrorCode.TIMEOUT,
      'Request timeout - server not responding',
      { testCase: 'network_timeout', duration: 30000 },
      {
        connectionMode: ConnectionMode.WEBSOCKET,
        retryAttempts: 1
      }
    );

    await this.sleep(1000);

    // Simulate polling failure
    errorRecoveryService.reportError(
      ErrorCode.POLLING_FAILED,
      'HTTP polling failed - server unreachable',
      { testCase: 'polling_failure', statusCode: 503 },
      {
        connectionMode: ConnectionMode.POLLING,
        retryAttempts: 2
      }
    );

    console.log('✅ Connection error tests completed');
  }

  /**
   * Test data synchronization errors
   */
  private static async testDataSyncErrors(): Promise<void> {
    console.log('🔄 Testing Data Sync Errors...');
    
    // Simulate data mismatch
    errorRecoveryService.reportError(
      ErrorCode.DATA_MISMATCH,
      'Data integrity check failed - local and remote data out of sync',
      { 
        testCase: 'data_mismatch', 
        localCount: 150, 
        remoteCount: 148,
        lastSyncTime: new Date(Date.now() - 300000).toISOString()
      }
    );

    await this.sleep(500);

    // Simulate sync failure
    errorRecoveryService.reportError(
      ErrorCode.SYNC_FAILED,
      'Failed to synchronize dashboard metrics',
      { testCase: 'sync_failure', component: 'dashboard_metrics' }
    );

    await this.sleep(500);

    // Simulate stale data
    errorRecoveryService.reportError(
      ErrorCode.STALE_DATA,
      'Data appears to be stale - last update over 5 minutes ago',
      { 
        testCase: 'stale_data', 
        lastUpdate: new Date(Date.now() - 350000).toISOString(),
        component: 'live_bookings'
      }
    );

    console.log('✅ Data sync error tests completed');
  }

  /**
   * Test system-level errors
   */
  private static async testSystemErrors(): Promise<void> {
    console.log('🖥️ Testing System Errors...');
    
    // Simulate server error
    errorRecoveryService.reportError(
      ErrorCode.SERVER_ERROR,
      'Internal server error - API endpoint returned 500',
      { 
        testCase: 'server_error', 
        endpoint: '/api/dashboard/metrics',
        statusCode: 500,
        errorMessage: 'Database connection pool exhausted'
      }
    );

    await this.sleep(500);

    // Simulate database error
    errorRecoveryService.reportError(
      ErrorCode.DATABASE_ERROR,
      'Database query failed - connection timeout',
      { 
        testCase: 'database_error', 
        query: 'SELECT * FROM bookings WHERE status = ?',
        timeout: 30000
      }
    );

    await this.sleep(500);

    // Simulate service unavailable
    errorRecoveryService.reportError(
      ErrorCode.SERVICE_UNAVAILABLE,
      'Payment service is temporarily unavailable',
      { 
        testCase: 'service_unavailable', 
        service: 'payment_processor',
        retryAfter: 120
      }
    );

    console.log('✅ System error tests completed');
  }

  /**
   * Test performance-related errors
   */
  private static async testPerformanceErrors(): Promise<void> {
    console.log('⚡ Testing Performance Errors...');
    
    // Simulate high latency
    errorRecoveryService.reportError(
      ErrorCode.HIGH_LATENCY,
      'High response latency detected - performance degraded',
      { 
        testCase: 'high_latency', 
        averageLatency: 2500,
        threshold: 1000,
        endpoint: '/api/dashboard/bookings'
      }
    );

    await this.sleep(500);

    // Simulate slow response
    errorRecoveryService.reportError(
      ErrorCode.SLOW_RESPONSE,
      'API response time exceeds acceptable limits',
      { 
        testCase: 'slow_response', 
        responseTime: 8000,
        slowThreshold: 3000
      }
    );

    console.log('✅ Performance error tests completed');
  }

  /**
   * Test error resolution mechanisms
   */
  private static async testErrorResolution(): Promise<void> {
    console.log('🔧 Testing Error Resolution...');
    
    // Get active errors
    const activeErrors = errorRecoveryService.getActiveErrors();
    console.log(`Found ${activeErrors.length} active errors for resolution testing`);

    if (activeErrors.length > 0) {
      // Resolve some errors manually to test the resolution system
      const errorsToResolve = activeErrors.slice(0, Math.min(3, activeErrors.length));
      
      for (const error of errorsToResolve) {
        console.log(`🔧 Resolving error: ${error.code}`);
        const resolved = errorRecoveryService.resolveError(error.id, 'test-system');
        
        if (resolved) {
          console.log(`✅ Successfully resolved error: ${error.id}`);
        } else {
          console.log(`❌ Failed to resolve error: ${error.id}`);
        }
        
        await this.sleep(500);
      }
    }

    console.log('✅ Error resolution tests completed');
  }

  /**
   * Log test summary and statistics
   */
  private static logTestSummary(): void {
    const stats = errorRecoveryService.getStats();
    
    console.log('\n📊 Error Recovery Test Summary:');
    console.log('================================');
    console.log(`Total Errors: ${stats.totalErrors}`);
    console.log(`Active Errors: ${stats.activeErrors}`);
    console.log(`Resolved Errors: ${stats.resolvedErrors}`);
    console.log(`Critical Errors: ${stats.criticalErrors}`);
    console.log(`Successful Recoveries: ${stats.successfulRecoveries}`);
    console.log(`Failed Recoveries: ${stats.failedRecoveries}`);
    console.log(`Average Resolution Time: ${stats.averageResolutionTime}s`);
    
    // Connection health
    const connectionHealth = connectionManager.getHealth();
    console.log('\n🔌 Connection Health:');
    console.log(`Mode: ${connectionHealth.mode}`);
    console.log(`State: ${connectionHealth.state}`);
    console.log(`Healthy: ${connectionHealth.isHealthy}`);
    console.log(`Latency: ${connectionHealth.latency}ms`);
    console.log(`Consecutive Failures: ${connectionHealth.consecutiveFailures}`);
  }

  /**
   * Simulate different types of errors in sequence
   */
  public static async simulateErrorSequence(): Promise<void> {
    console.log('🎭 Starting Error Simulation Sequence...');
    
    // Simulate a cascade of connection issues
    const errors = [
      {
        code: ErrorCode.HIGH_LATENCY,
        message: 'Network latency increased',
        delay: 1000
      },
      {
        code: ErrorCode.TIMEOUT,
        message: 'Request timeout detected',
        delay: 2000
      },
      {
        code: ErrorCode.WEBSOCKET_FAILED,
        message: 'WebSocket connection lost',
        delay: 1500
      },
      {
        code: ErrorCode.POLLING_FAILED,
        message: 'Fallback polling failed',
        delay: 3000
      },
      {
        code: ErrorCode.DATA_MISMATCH,
        message: 'Data synchronization issues detected',
        delay: 2500
      }
    ];

    for (const error of errors) {
      errorRecoveryService.reportError(
        error.code,
        error.message,
        { simulation: true, timestamp: Date.now() }
      );
      
      console.log(`⚠️ Simulated ${error.code}: ${error.message}`);
      await this.sleep(error.delay);
    }

    console.log('✅ Error simulation sequence completed');
  }

  /**
   * Test connection fallback mechanism
   */
  public static async testConnectionFallback(): Promise<void> {
    console.log('🔀 Testing Connection Fallback...');
    
    try {
      // Simulate WebSocket failure leading to polling fallback
      console.log('1. Simulating WebSocket failure...');
      await connectionManager.switchToMode(ConnectionMode.WEBSOCKET);
      await this.sleep(1000);
      
      // Force a failure
      errorRecoveryService.reportError(
        ErrorCode.WEBSOCKET_FAILED,
        'WebSocket connection test failure',
        { test: 'fallback_simulation' }
      );
      
      await this.sleep(2000);
      
      // Test polling mode
      console.log('2. Testing polling mode...');
      await connectionManager.switchToMode(ConnectionMode.POLLING);
      await this.sleep(2000);
      
      // Test recovery back to WebSocket
      console.log('3. Testing recovery to WebSocket...');
      await connectionManager.switchToMode(ConnectionMode.WEBSOCKET);
      await this.sleep(1000);
      
      console.log('✅ Connection fallback test completed');
      
    } catch (error) {
      console.error('❌ Connection fallback test failed:', error);
    }
  }

  /**
   * Utility method to pause execution
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export the test runner for use in the console
export default ErrorRecoveryTests;