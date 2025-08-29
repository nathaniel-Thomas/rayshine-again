// Data Transformation Utilities for Rayshine Admin CRM
// Comprehensive utilities for transforming, formatting, and processing dashboard data

import {
  DataTransformationRule,
  TransformationType,
  TransformationConfig,
  FormatConfig,
  AggregateConfig,
  FilterConfig,
  SortConfig,
  GroupConfig,
  CalculateConfig,
  ChartDataPoint,
  ChartDataSet,
  KPIHistoricalPoint
} from '../types/dashboardTypes';

export interface TransformationContext {
  timezone?: string;
  locale?: string;
  currency?: string;
  dateFormat?: string;
  numberFormat?: Intl.NumberFormatOptions;
}

export interface TransformationResult<T = any> {
  data: T;
  metadata: {
    originalCount: number;
    transformedCount: number;
    transformationTime: number;
    appliedRules: string[];
    dataQuality: 'high' | 'medium' | 'low';
    errors: string[];
    warnings: string[];
  };
}

export class DataTransformationEngine {
  private transformationRules: Map<string, DataTransformationRule> = new Map();
  private context: TransformationContext;

  constructor(context: TransformationContext = {}) {
    this.context = {
      timezone: 'UTC',
      locale: 'en-US',
      currency: 'USD',
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      ...context
    };
  }

  // ================== RULE MANAGEMENT ==================

  public addTransformationRule(rule: DataTransformationRule): void {
    this.transformationRules.set(rule.name, rule);
  }

  public removeTransformationRule(ruleName: string): boolean {
    return this.transformationRules.delete(ruleName);
  }

  public getTransformationRule(ruleName: string): DataTransformationRule | undefined {
    return this.transformationRules.get(ruleName);
  }

  // ================== MAIN TRANSFORMATION METHODS ==================

  public transform<T = any>(data: any[], rules: string[]): TransformationResult<T[]> {
    const startTime = Date.now();
    const originalCount = data.length;
    const appliedRules: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    let transformedData = [...data];

    // Apply each rule in sequence
    for (const ruleName of rules) {
      const rule = this.transformationRules.get(ruleName);
      if (!rule) {
        errors.push(`Transformation rule not found: ${ruleName}`);
        continue;
      }

      try {
        transformedData = this.applyTransformationRule(transformedData, rule);
        appliedRules.push(ruleName);
      } catch (error) {
        errors.push(`Error applying rule ${ruleName}: ${error.message}`);
      }
    }

    const transformationTime = Date.now() - startTime;
    const dataQuality = this.assessDataQuality(transformedData, errors, warnings);

    return {
      data: transformedData as T[],
      metadata: {
        originalCount,
        transformedCount: transformedData.length,
        transformationTime,
        appliedRules,
        dataQuality,
        errors,
        warnings
      }
    };
  }

  private applyTransformationRule(data: any[], rule: DataTransformationRule): any[] {
    switch (rule.transformationType) {
      case 'format':
        return this.applyFormat(data, rule.sourceField, rule.targetField, rule.transformationConfig.format!);
      
      case 'aggregate':
        return this.applyAggregate(data, rule.transformationConfig.aggregate!);
      
      case 'filter':
        return this.applyFilter(data, rule.sourceField, rule.transformationConfig.filter!);
      
      case 'sort':
        return this.applySort(data, rule.sourceField, rule.transformationConfig.sort!);
      
      case 'group':
        return this.applyGroup(data, rule.transformationConfig.group!);
      
      case 'calculate':
        return this.applyCalculate(data, rule.targetField, rule.transformationConfig.calculate!);
      
      case 'normalize':
        return this.applyNormalize(data, rule.sourceField, rule.targetField);
      
      default:
        throw new Error(`Unsupported transformation type: ${rule.transformationType}`);
    }
  }

  // ================== FORMAT TRANSFORMATIONS ==================

  private applyFormat(data: any[], sourceField: string, targetField: string, config: FormatConfig): any[] {
    return data.map(item => {
      const value = this.getNestedValue(item, sourceField);
      const formattedValue = this.formatValue(value, config);
      
      return {
        ...item,
        [targetField]: formattedValue
      };
    });
  }

  private formatValue(value: any, config: FormatConfig): string {
    if (value == null) return '';

    const { type, locale = this.context.locale, decimals = 2, prefix = '', suffix = '' } = config;

    let formatted: string;

    switch (type) {
      case 'currency':
        formatted = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: this.context.currency,
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(Number(value));
        break;

      case 'percentage':
        formatted = new Intl.NumberFormat(locale, {
          style: 'percent',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(Number(value) / 100);
        break;

      case 'datetime':
        formatted = this.formatDateTime(value, locale);
        break;

      case 'number':
        formatted = new Intl.NumberFormat(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(Number(value));
        break;

      case 'text':
      default:
        formatted = String(value);
        break;
    }

    return `${prefix}${formatted}${suffix}`;
  }

  private formatDateTime(value: any, locale: string): string {
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(date);
  }

  // ================== AGGREGATE TRANSFORMATIONS ==================

  private applyAggregate(data: any[], config: AggregateConfig): any[] {
    const { function: aggFunction, groupBy = [], timeWindow } = config;

    if (groupBy.length === 0) {
      // Simple aggregation without grouping
      const result = this.calculateAggregation(data, aggFunction, null);
      return [{ aggregated_value: result, count: data.length }];
    }

    // Group by specified fields
    const groups = this.groupByFields(data, groupBy);
    const results: any[] = [];

    for (const [groupKey, groupData] of groups) {
      const aggregatedValue = this.calculateAggregation(groupData, aggFunction, null);
      const groupKeyParts = groupKey.split('|');
      
      const resultItem: any = {
        aggregated_value: aggregatedValue,
        count: groupData.length
      };

      // Add group fields to result
      groupBy.forEach((field, index) => {
        resultItem[field] = groupKeyParts[index];
      });

      results.push(resultItem);
    }

    return results;
  }

  private calculateAggregation(data: any[], aggFunction: string, field: string | null): number {
    if (data.length === 0) return 0;

    const values = field ? data.map(item => this.getNestedValue(item, field)).filter(v => v != null) : [data.length];

    switch (aggFunction) {
      case 'sum':
        return values.reduce((acc, val) => acc + Number(val), 0);
      
      case 'average':
        return values.length > 0 ? values.reduce((acc, val) => acc + Number(val), 0) / values.length : 0;
      
      case 'count':
        return field ? values.length : data.length;
      
      case 'min':
        return values.length > 0 ? Math.min(...values.map(Number)) : 0;
      
      case 'max':
        return values.length > 0 ? Math.max(...values.map(Number)) : 0;
      
      case 'median':
        if (values.length === 0) return 0;
        const sorted = values.map(Number).sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      
      default:
        return 0;
    }
  }

  // ================== FILTER TRANSFORMATIONS ==================

  private applyFilter(data: any[], sourceField: string, config: FilterConfig): any[] {
    const { condition, value, operator = 'and' } = config;

    return data.filter(item => {
      const itemValue = this.getNestedValue(item, sourceField);
      return this.evaluateCondition(itemValue, condition, value);
    });
  }

  private evaluateCondition(itemValue: any, condition: string, value: any): boolean {
    switch (condition) {
      case 'equals':
        return itemValue === value;
      
      case 'not_equals':
        return itemValue !== value;
      
      case 'greater':
        return Number(itemValue) > Number(value);
      
      case 'less':
        return Number(itemValue) < Number(value);
      
      case 'contains':
        return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
      
      case 'range':
        if (Array.isArray(value) && value.length === 2) {
          const numValue = Number(itemValue);
          return numValue >= Number(value[0]) && numValue <= Number(value[1]);
        }
        return false;
      
      default:
        return true;
    }
  }

  // ================== SORT TRANSFORMATIONS ==================

  private applySort(data: any[], sourceField: string, config: SortConfig): any[] {
    const { direction, priority } = config;
    
    return [...data].sort((a, b) => {
      const valueA = this.getNestedValue(a, sourceField);
      const valueB = this.getNestedValue(b, sourceField);
      
      let comparison = 0;
      
      if (valueA < valueB) comparison = -1;
      else if (valueA > valueB) comparison = 1;
      
      return direction === 'desc' ? -comparison : comparison;
    });
  }

  // ================== GROUP TRANSFORMATIONS ==================

  private applyGroup(data: any[], config: GroupConfig): any[] {
    const { by, aggregations } = config;
    const groups = this.groupByFields(data, by);
    const results: any[] = [];

    for (const [groupKey, groupData] of groups) {
      const groupKeyParts = groupKey.split('|');
      const resultItem: any = {};

      // Add group fields
      by.forEach((field, index) => {
        resultItem[field] = groupKeyParts[index];
      });

      // Apply aggregations
      aggregations.forEach((aggConfig, aggIndex) => {
        const aggResult = this.calculateAggregation(groupData, aggConfig.function, null);
        resultItem[`agg_${aggIndex}`] = aggResult;
      });

      resultItem.group_size = groupData.length;
      results.push(resultItem);
    }

    return results;
  }

  private groupByFields(data: any[], fields: string[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    for (const item of data) {
      const groupKey = fields.map(field => String(this.getNestedValue(item, field))).join('|');
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      
      groups.get(groupKey)!.push(item);
    }

    return groups;
  }

  // ================== CALCULATE TRANSFORMATIONS ==================

  private applyCalculate(data: any[], targetField: string, config: CalculateConfig): any[] {
    const { expression, dependencies, resultType } = config;

    return data.map(item => {
      try {
        const calculatedValue = this.evaluateExpression(expression, item, dependencies);
        const typedValue = this.convertToType(calculatedValue, resultType);
        
        return {
          ...item,
          [targetField]: typedValue
        };
      } catch (error) {
        return {
          ...item,
          [targetField]: null,
          [`${targetField}_error`]: error.message
        };
      }
    });
  }

  private evaluateExpression(expression: string, item: any, dependencies: string[]): any {
    // Simple expression evaluator - in production, use a proper expression parser
    let result = expression;

    // Replace field references with actual values
    dependencies.forEach(field => {
      const value = this.getNestedValue(item, field);
      const placeholder = new RegExp(`\\b${field}\\b`, 'g');
      result = result.replace(placeholder, String(value || 0));
    });

    // Evaluate basic mathematical expressions
    try {
      // Security note: In production, use a safe expression evaluator
      return Function(`"use strict"; return (${result})`)();
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error.message}`);
    }
  }

  private convertToType(value: any, type: 'number' | 'string' | 'boolean' | 'date'): any {
    switch (type) {
      case 'number':
        return Number(value);
      
      case 'string':
        return String(value);
      
      case 'boolean':
        return Boolean(value);
      
      case 'date':
        return new Date(value);
      
      default:
        return value;
    }
  }

  // ================== NORMALIZE TRANSFORMATIONS ==================

  private applyNormalize(data: any[], sourceField: string, targetField: string): any[] {
    // Calculate min and max values
    const values = data
      .map(item => this.getNestedValue(item, sourceField))
      .filter(val => val != null)
      .map(Number);

    if (values.length === 0) return data;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    return data.map(item => {
      const value = this.getNestedValue(item, sourceField);
      const normalizedValue = range === 0 ? 0 : (Number(value) - min) / range;
      
      return {
        ...item,
        [targetField]: normalizedValue
      };
    });
  }

  // ================== CHART DATA TRANSFORMATION ==================

  public transformToChartData(
    data: any[], 
    xField: string, 
    yField: string, 
    options: {
      labelField?: string;
      sortByX?: boolean;
      maxPoints?: number;
      fillGaps?: boolean;
    } = {}
  ): ChartDataPoint[] {
    const { labelField, sortByX = true, maxPoints, fillGaps = false } = options;

    let chartData: ChartDataPoint[] = data
      .filter(item => {
        const x = this.getNestedValue(item, xField);
        const y = this.getNestedValue(item, yField);
        return x != null && y != null;
      })
      .map(item => ({
        x: this.getNestedValue(item, xField),
        y: Number(this.getNestedValue(item, yField)),
        label: labelField ? String(this.getNestedValue(item, labelField)) : undefined,
        metadata: { ...item }
      }));

    // Sort by X values if requested
    if (sortByX) {
      chartData.sort((a, b) => {
        if (typeof a.x === 'string' && typeof b.x === 'string') {
          return a.x.localeCompare(b.x);
        }
        return Number(a.x) - Number(b.x);
      });
    }

    // Fill gaps in time series data if requested
    if (fillGaps && chartData.length > 1) {
      chartData = this.fillTimeSeriesGaps(chartData);
    }

    // Limit number of points if specified
    if (maxPoints && chartData.length > maxPoints) {
      chartData = this.downsampleData(chartData, maxPoints);
    }

    return chartData;
  }

  private fillTimeSeriesGaps(data: ChartDataPoint[]): ChartDataPoint[] {
    if (data.length < 2) return data;

    const result: ChartDataPoint[] = [data[0]];
    
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      
      // Check if there's a significant gap (assuming timestamps)
      if (typeof prev.x === 'string' && typeof curr.x === 'string') {
        const prevTime = new Date(prev.x).getTime();
        const currTime = new Date(curr.x).getTime();
        const gap = currTime - prevTime;
        
        // If gap is more than expected interval, fill with interpolated points
        if (gap > 3600000) { // More than 1 hour
          const expectedInterval = 3600000; // 1 hour
          const pointsToAdd = Math.floor(gap / expectedInterval) - 1;
          
          for (let j = 1; j <= pointsToAdd; j++) {
            const interpolatedTime = prevTime + (j * expectedInterval);
            const interpolatedY = prev.y + ((curr.y - prev.y) * j / (pointsToAdd + 1));
            
            result.push({
              x: new Date(interpolatedTime).toISOString(),
              y: interpolatedY,
              label: 'interpolated'
            });
          }
        }
      }
      
      result.push(curr);
    }

    return result;
  }

  private downsampleData(data: ChartDataPoint[], maxPoints: number): ChartDataPoint[] {
    if (data.length <= maxPoints) return data;

    const step = data.length / maxPoints;
    const result: ChartDataPoint[] = [];

    for (let i = 0; i < maxPoints; i++) {
      const index = Math.floor(i * step);
      result.push(data[index]);
    }

    return result;
  }

  // ================== TIME SERIES UTILITIES ==================

  public transformToTimeSeriesData(
    data: any[],
    timestampField: string,
    valueField: string,
    granularity: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): ChartDataPoint[] {
    // Group data by time periods
    const groups = new Map<string, number[]>();

    data.forEach(item => {
      const timestamp = new Date(this.getNestedValue(item, timestampField));
      const value = Number(this.getNestedValue(item, valueField));
      
      if (isNaN(timestamp.getTime()) || isNaN(value)) return;

      const periodKey = this.getPeriodKey(timestamp, granularity);
      
      if (!groups.has(periodKey)) {
        groups.set(periodKey, []);
      }
      
      groups.get(periodKey)!.push(value);
    });

    // Convert to chart data points
    const chartData: ChartDataPoint[] = [];
    
    for (const [periodKey, values] of groups) {
      const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
      
      chartData.push({
        x: periodKey,
        y: avgValue,
        metadata: {
          count: values.length,
          sum: values.reduce((sum, val) => sum + val, 0),
          min: Math.min(...values),
          max: Math.max(...values)
        }
      });
    }

    return chartData.sort((a, b) => String(a.x).localeCompare(String(b.x)));
  }

  private getPeriodKey(date: Date, granularity: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');

    switch (granularity) {
      case 'hour':
        return `${year}-${month}-${day} ${hour}:00`;
      
      case 'day':
        return `${year}-${month}-${day}`;
      
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${String(Math.ceil(weekStart.getDate() / 7)).padStart(2, '0')}`;
      
      case 'month':
        return `${year}-${month}`;
      
      default:
        return `${year}-${month}-${day}`;
    }
  }

  // ================== UTILITY METHODS ==================

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private assessDataQuality(data: any[], errors: string[], warnings: string[]): 'high' | 'medium' | 'low' {
    const errorRate = errors.length / Math.max(data.length, 1);
    const warningRate = warnings.length / Math.max(data.length, 1);

    if (errorRate === 0 && warningRate < 0.1) return 'high';
    if (errorRate < 0.05 && warningRate < 0.2) return 'medium';
    return 'low';
  }

  // ================== BATCH TRANSFORMATION ==================

  public transformBatch(
    datasets: Array<{ name: string; data: any[]; rules: string[] }>
  ): Map<string, TransformationResult> {
    const results = new Map<string, TransformationResult>();

    datasets.forEach(dataset => {
      try {
        const result = this.transform(dataset.data, dataset.rules);
        results.set(dataset.name, result);
      } catch (error) {
        results.set(dataset.name, {
          data: [],
          metadata: {
            originalCount: dataset.data.length,
            transformedCount: 0,
            transformationTime: 0,
            appliedRules: [],
            dataQuality: 'low',
            errors: [error.message],
            warnings: []
          }
        });
      }
    });

    return results;
  }
}

// ================== EXPORT UTILITIES ==================

export const dataTransformationEngine = new DataTransformationEngine();

export const transformationPresets = {
  // Common transformation rule presets
  currencyFormatter: {
    name: 'currency_formatter',
    sourceField: 'amount',
    targetField: 'formatted_amount',
    transformationType: 'format' as TransformationType,
    transformationConfig: {
      format: {
        type: 'currency' as const,
        decimals: 2
      }
    }
  },

  percentageFormatter: {
    name: 'percentage_formatter',
    sourceField: 'rate',
    targetField: 'formatted_rate',
    transformationType: 'format' as TransformationType,
    transformationConfig: {
      format: {
        type: 'percentage' as const,
        decimals: 1
      }
    }
  },

  dateTimeFormatter: {
    name: 'datetime_formatter',
    sourceField: 'timestamp',
    targetField: 'formatted_date',
    transformationType: 'format' as TransformationType,
    transformationConfig: {
      format: {
        type: 'datetime' as const
      }
    }
  }
};

export default DataTransformationEngine;