import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  Download,
  Calendar,
  Target,
  Star,
  Clock,
  Percent,
} from 'lucide-react';

export default function AnalyticsReporting() {
  const keyMetrics = [
    {
      title: "Revenue Growth",
      value: "+23.5%",
      subtitle: "vs last quarter",
      icon: TrendingUp,
      color: "text-green-400",
      bgColor: "bg-green-500/20",
    },
    {
      title: "Customer Retention",
      value: "89.2%",
      subtitle: "+5.1% improvement",
      icon: Users,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
    },
    {
      title: "Avg Order Value",
      value: "$156",
      subtitle: "+8.3% increase",
      icon: DollarSign,
      color: "text-teal-400",
      bgColor: "bg-teal-500/20",
    },
    {
      title: "Market Share",
      value: "12.8%",
      subtitle: "Leading in KC",
      icon: Target,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
    },
  ];

  const serviceMetrics = [
    {
      service: "House Cleaning",
      bookings: 450,
      revenue: 54000,
      satisfaction: 4.9,
      growth: 15.2,
    },
    {
      service: "Lawn Care",
      bookings: 320,
      revenue: 25600,
      satisfaction: 4.7,
      growth: 8.7,
    },
    {
      service: "Deep Cleaning",
      bookings: 180,
      revenue: 32400,
      satisfaction: 4.8,
      growth: 22.1,
    },
    {
      service: "Pool Maintenance",
      bookings: 95,
      revenue: 9025,
      satisfaction: 4.6,
      growth: 5.3,
    },
  ];

  const customerSegments = [
    {
      segment: "VIP Customers",
      count: 124,
      percentage: 4.3,
      avgSpend: 3240,
      retention: 96.8,
    },
    {
      segment: "Regular Customers",
      count: 1456,
      percentage: 51.2,
      avgSpend: 1840,
      retention: 89.2,
    },
    {
      segment: "New Customers",
      count: 1267,
      percentage: 44.5,
      avgSpend: 420,
      retention: 67.4,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics & Reporting</h1>
          <p className="text-gray-400 mt-1">Business intelligence and performance insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-700 bg-transparent">
            <Calendar className="w-4 h-4 mr-2" />
            Date Range
          </Button>
          <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">{metric.title}</p>
                    <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                    <p className="text-green-400 text-sm flex items-center mt-1">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {metric.subtitle}
                    </p>
                  </div>
                  <div className={`w-12 h-12 ${metric.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Performance */}
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Service Performance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceMetrics.map((service, index) => (
                <div key={index} className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-200">{service.service}</h4>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-yellow-400 text-sm">{service.satisfaction}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Bookings</p>
                      <p className="font-bold text-white">{service.bookings}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Revenue</p>
                      <p className="font-bold text-teal-400">${service.revenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Growth</p>
                      <p className="font-bold text-green-400">+{service.growth}%</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full h-2 bg-gray-700 rounded-full">
                      <div 
                        className="h-2 bg-gradient-to-r from-purple-500 to-teal-500 rounded-full"
                        style={{ width: `${(service.bookings / 500) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Customer Segments */}
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-400" />
              Customer Segmentation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {customerSegments.map((segment, index) => (
                <div key={index} className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-200">{segment.segment}</h4>
                    <span className="text-purple-400 font-bold">{segment.percentage}%</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Count</p>
                      <p className="font-bold text-white">{segment.count.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Avg Spend</p>
                      <p className="font-bold text-teal-400">${segment.avgSpend.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Retention</p>
                      <p className="font-bold text-green-400">{segment.retention}%</p>
                    </div>
                  </div>
                  
                  {/* Segment Bar */}
                  <div className="mt-3">
                    <div className="w-full h-2 bg-gray-700 rounded-full">
                      <div 
                        className="h-2 bg-gradient-to-r from-teal-500 to-purple-500 rounded-full"
                        style={{ width: `${segment.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Revenue Trends (6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">Revenue trend visualization</p>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Current Month: $127,450 (+12.5%)</p>
                  <p>Best Month: $142,300 (March 2024)</p>
                  <p>6-Month Average: $118,200</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-400" />
              Operational Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Efficiency Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                  <p className="text-2xl font-bold text-green-400">94.2%</p>
                  <p className="text-gray-400 text-sm">On-time completion</p>
                </div>
                <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                  <p className="text-2xl font-bold text-purple-400">87%</p>
                  <p className="text-gray-400 text-sm">Provider utilization</p>
                </div>
                <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                  <p className="text-2xl font-bold text-teal-400">2.3h</p>
                  <p className="text-gray-400 text-sm">Avg response time</p>
                </div>
                <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-400">3.2%</p>
                  <p className="text-gray-400 text-sm">Cancellation rate</p>
                </div>
              </div>

              {/* Quality Metrics */}
              <div className="border-t border-gray-700/50 pt-4">
                <h5 className="font-medium text-gray-300 mb-3">Quality Metrics</h5>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Customer Satisfaction</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-700 rounded-full">
                        <div className="w-19 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-green-400 text-sm">94%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Service Quality</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-700 rounded-full">
                        <div className="w-19 h-2 bg-purple-500 rounded-full"></div>
                      </div>
                      <span className="text-purple-400 text-sm">4.8/5</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">First-time Fix Rate</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-700 rounded-full">
                        <div className="w-18 h-2 bg-teal-500 rounded-full"></div>
                      </div>
                      <span className="text-teal-400 text-sm">91%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Analysis */}
      <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Market Analysis & Competitive Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Market Share */}
            <div className="text-center">
              <h4 className="font-medium text-gray-300 mb-4">Market Share (Kansas City)</h4>
              <div className="relative w-32 h-32 mx-auto mb-4">
                <div className="w-full h-full bg-gray-700 rounded-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-teal-400">12.8%</p>
                    <p className="text-xs text-gray-400">Market Leader</p>
                  </div>
                </div>
              </div>
              <p className="text-gray-400 text-sm">Leading in home services</p>
            </div>

            {/* Growth Metrics */}
            <div>
              <h4 className="font-medium text-gray-300 mb-4">Growth Metrics</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">YoY Revenue Growth</span>
                  <span className="text-green-400 font-bold">+28.3%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Customer Base Growth</span>
                  <span className="text-purple-400 font-bold">+19.7%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Service Expansion</span>
                  <span className="text-teal-400 font-bold">+3 new services</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Geographic Expansion</span>
                  <span className="text-yellow-400 font-bold">+2 new markets</span>
                </div>
              </div>
            </div>

            {/* Competitive Advantage */}
            <div>
              <h4 className="font-medium text-gray-300 mb-4">Competitive Advantages</h4>
              <div className="space-y-3">
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-white font-medium">Service Quality</span>
                  </div>
                  <p className="text-gray-400 text-sm">4.8/5 average rating vs 4.2/5 industry avg</p>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-teal-400" />
                    <span className="text-white font-medium">Response Time</span>
                  </div>
                  <p className="text-gray-400 text-sm">2.3h vs 6.2h industry average</p>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="w-4 h-4 text-purple-400" />
                    <span className="text-white font-medium">Retention Rate</span>
                  </div>
                  <p className="text-gray-400 text-sm">89.2% vs 72% industry average</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}