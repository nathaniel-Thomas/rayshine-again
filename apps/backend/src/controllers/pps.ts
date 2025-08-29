import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { PPSCalculationService, PPSCalculationParams } from '../services/ppsCalculation';
import { ApiResponse } from '../types/api';

const ppsService = new PPSCalculationService();

export const calculatePPS = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const params: PPSCalculationParams = req.body;
    
    let result;
    
    if (params.provider_id) {
      // Calculate PPS for single provider
      result = await ppsService.calculateSingleProviderPPS(params);
    } else {
      // Calculate PPS for all eligible providers
      result = await ppsService.calculateAllProvidersPPS(params);
    }

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'PPS calculated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('PPS calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'PPS calculation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getProviderPPSScore = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { providerId } = req.params;
    const userId = req.user!.id;

    // Check if user can access this provider's PPS data
    if (req.user!.role !== 'admin' && providerId !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    const result = await ppsService.calculateSingleProviderPPS({
      provider_id: providerId
    } as PPSCalculationParams);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get provider PPS error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get provider PPS score'
    });
  }
};

export const getProviderRanking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { 
      job_latitude, 
      job_longitude, 
      service_area_filter = true, 
      limit = 50 
    } = req.query;

    const params: PPSCalculationParams = {};
    
    if (job_latitude) params.job_latitude = Number(job_latitude);
    if (job_longitude) params.job_longitude = Number(job_longitude);
    params.service_area_filter = service_area_filter === 'true';
    params.limit = Number(limit);

    const rankedProviders = await ppsService.calculateAllProvidersPPS(params);

    res.json({
      success: true,
      data: rankedProviders,
      pagination: {
        total: rankedProviders.length,
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Get provider ranking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get provider ranking'
    });
  }
};