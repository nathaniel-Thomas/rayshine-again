import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import routes from './routes';
import { WebSocketService } from './services/websocket';
import { CronJobService } from './services/cronJobs';
import { RealTimeNotificationService } from './services/realtimeNotificationService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-production-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Rayshine Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      bookings: '/api/bookings',
      providers: '/api/providers',
      services: '/api/services'
    }
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket service
const websocketService = new WebSocketService(httpServer);

// Initialize real-time notification service
const realtimeNotificationService = new RealTimeNotificationService(websocketService);

// Initialize and start cron jobs
const cronJobService = new CronJobService(websocketService);
cronJobService.startAllJobs();

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Rayshine Backend API server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/`);
  console.log(`🔌 WebSocket server initialized`);
  console.log(`⏰ Cron jobs started`);
  console.log(`👥 Connected providers: ${websocketService.getConnectedUsersCount('provider')}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  cronJobService.stopAllJobs();
  realtimeNotificationService.cleanup();
  await websocketService.cleanup();
  httpServer.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  cronJobService.stopAllJobs();
  realtimeNotificationService.cleanup();
  await websocketService.cleanup();
  httpServer.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

export default app;
export { websocketService, realtimeNotificationService };
 
