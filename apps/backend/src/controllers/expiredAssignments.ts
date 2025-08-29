import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ExpiredAssignmentService } from '../services/expiredAssignments';
import { ApiResponse } from '../types/api';

const expiredAssignmentService = new ExpiredAssignmentService();

export const processExpiredAssignments = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    // Only admins or system processes can trigger this
    if (req.user && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Only administrators can process expired assignments'
      });
      return;
    }

    const result = await expiredAssignmentService.processExpiredAssignments();

    const response: ApiResponse = {
      success: true,
      data: result,
      message: `Processed ${result.processed_assignments} expired assignments`
    };

    res.json(response);
  } catch (error) {
    console.error('Process expired assignments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process expired assignments',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// This endpoint can be called without authentication for cron jobs
export const processExpiredAssignmentsCron = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Verify cron secret if provided in environment
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const providedSecret = req.headers['x-cron-secret'] || req.query.secret;
      if (providedSecret !== cronSecret) {
        res.status(401).json({
          success: false,
          error: 'Invalid cron secret'
        });
        return;
      }
    }

    const result = await expiredAssignmentService.processExpiredAssignments();

    console.log('Cron job processed expired assignments:', result);

    res.json({
      success: true,
      data: result,
      message: `Cron job processed ${result.processed_assignments} expired assignments`
    });
  } catch (error) {
    console.error('Cron expired assignments error:', error);
    res.status(500).json({
      success: false,
      error: 'Cron job failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};