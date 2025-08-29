import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface AnimatedMetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  trend?: number;
  icon: LucideIcon;
  iconColor: string;
  format?: 'number' | 'currency' | 'percentage';
  suffix?: string;
  className?: string;
  animationDuration?: number;
}

export default function AnimatedMetricCard({
  title,
  value,
  previousValue,
  trend,
  icon: Icon,
  iconColor,
  format = 'number',
  suffix = '',
  className = '',
  animationDuration = 1000
}: AnimatedMetricCardProps) {
  const [displayValue, setDisplayValue] = useState(previousValue || value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (displayValue !== value) {
      setIsAnimating(true);
      animateValue(displayValue, value);
    }
  }, [value]);

  const animateValue = (start: number, end: number) => {
    const startTime = Date.now();
    const difference = end - start;
    
    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentValue = start + (difference * easeOutQuart);
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
        setIsAnimating(false);
      }
    };
    
    requestAnimationFrame(animate);
  };

  const formatValue = (val: number): string => {
    switch (format) {
      case 'currency':
        return `$${Math.round(val).toLocaleString()}`;
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'number':
      default:
        return Math.round(val).toLocaleString() + suffix;
    }
  };

  const getTrendInfo = () => {
    if (trend === undefined) return null;
    
    const isPositive = trend > 0;
    const isNegative = trend < 0;
    const isNeutral = Math.abs(trend) < 0.1;
    
    let TrendIcon = Minus;
    let trendColor = 'text-gray-400';
    let bgColor = 'bg-gray-500/20 border-gray-500/30';
    
    if (isPositive && !isNeutral) {
      TrendIcon = TrendingUp;
      trendColor = 'text-green-400';
      bgColor = 'bg-green-500/20 border-green-500/30';
    } else if (isNegative && !isNeutral) {
      TrendIcon = TrendingDown;
      trendColor = 'text-red-400';
      bgColor = 'bg-red-500/20 border-red-500/30';
    }
    
    return {
      icon: TrendIcon,
      color: trendColor,
      bgColor,
      value: Math.abs(trend),
      isPositive,
      isNegative,
      isNeutral
    };
  };

  const trendInfo = getTrendInfo();
  const hasChanged = previousValue !== undefined && value !== previousValue;
  const changeDirection = hasChanged ? (value > previousValue! ? 'increase' : 'decrease') : null;

  return (
    <Card className={`bg-gray-900/50 backdrop-blur-xl border-gray-800/50 transition-all duration-300 hover:bg-gray-900/60 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-gray-800/40 ${isAnimating ? 'animate-pulse' : ''}`}>
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">{title}</p>
              <div className="flex items-center space-x-2 mt-1">
                <div 
                  className={`text-2xl font-bold text-white transition-all duration-300 ${
                    isAnimating ? 'scale-110' : 'scale-100'
                  } ${
                    changeDirection === 'increase' ? 'text-green-400' : 
                    changeDirection === 'decrease' ? 'text-red-400' : ''
                  }`}
                >
                  {formatValue(displayValue)}
                </div>
                {hasChanged && (
                  <div className={`transition-all duration-300 ${isAnimating ? 'animate-bounce' : ''}`}>
                    {changeDirection === 'increase' ? (
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {trendInfo && (
            <div className="text-right">
              <Badge className={`${trendInfo.bgColor} ${trendInfo.color} text-xs`}>
                <trendInfo.icon className="w-3 h-3 mr-1" />
                {trendInfo.value.toFixed(1)}%
              </Badge>
              <div className="text-xs text-gray-500 mt-1">
                {trendInfo.isNeutral ? 'No change' :
                 trendInfo.isPositive ? 'vs yesterday' :
                 'vs yesterday'}
              </div>
            </div>
          )}
        </div>
        
        {/* Progress bar for visual feedback */}
        {hasChanged && (
          <div className="mt-4">
            <div className="w-full bg-gray-800 rounded-full h-1">
              <div 
                className={`h-1 rounded-full transition-all duration-1000 ease-out ${
                  changeDirection === 'increase' ? 'bg-green-400' : 'bg-red-400'
                }`}
                style={{ 
                  width: `${Math.min(Math.abs(((value - previousValue!) / previousValue!) * 100), 100)}%` 
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Previous: {formatValue(previousValue!)}</span>
              <span>Change: {((value - previousValue!) / previousValue! * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}