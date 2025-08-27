import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  TrendingUp,
  UserPlus,
  Star,
  Users,
  BarChart3,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  FileText,
} from 'lucide-react';

export default function DashboardOverview() {
  const todaysBookings = [
    {
      id: 1,
      customer: "Sarah Johnson",
      service: "House Cleaning",
      time: "9:00 AM",
      provider: "Maria Santos",
      status: "confirmed",
      value: 120,
    },
    {
      id: 2,
      customer: "Mike Chen",
      service: "Lawn Care",
      time: "2:00 PM",
      provider: "James Wilson",
      status: "in_progress",
      value: 80,
    },
    {
      id: 3,
      customer: "Emily Rodriguez",
      service: "Deep Cleaning",
      time: "4:00 PM",
      provider: "Maria Santos",
      status: "pending",
      value: 180,
    },
  ];

  const pendingProviders = [
    {
      id: 1,
      name: "David Thompson",
      service: "Plumbing",
      experience: "5 years",
      rating: 4.8,
      status: "pending_review",
    },
    {
      id: 2,
      name: "Lisa Park",
      service: "Electrical",
      experience: "3 years",
      rating: 4.6,
      status: "background_check",
    },
  ];

  const supportTickets = [
    {
      id: 1,
      customer: "John Doe",
      subject: "Booking Issue",
      priority: "high",
      status: "open",
      created: "2 hours ago",
    },
    {
      id: 2,
      customer: "Jane Smith",
      subject: "Payment Problem",
      priority: "medium",
      status: "in_progress",
      created: "4 hours ago",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-gray-400 mt-1">Real-time insights into your business performance</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white">
          <FileText className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50 hover:border-purple-500/30 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Monthly Revenue</p>
                <p className="text-2xl font-bold text-white">$127,450</p>
                <p className="text-green-400 text-sm flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12.5% from last month
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50 hover:border-teal-500/30 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">New Customers</p>
                <p className="text-2xl font-bold text-white">247</p>
                <p className="text-green-400 text-sm flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +8% from last month
                </p>
              </div>
              <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-teal-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50 hover:border-yellow-500/30 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Service Rating</p>
                <p className="text-2xl font-bold text-white">4.8</p>
                <p className="text-green-400 text-sm">Excellent performance</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50 hover:border-purple-500/30 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Customer Satisfaction</p>
                <p className="text-2xl font-bold text-white">94%</p>
                <p className="text-green-400 text-sm">Above industry avg</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Bookings */}
        <Card className="lg:col-span-2 bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              Today's Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {todaysBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-purple-500/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {booking.time.split(' ')[0]}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-200">{booking.service}</h4>
                    <p className="text-sm text-gray-400">{booking.customer}</p>
                    <p className="text-xs text-gray-500">Provider: {booking.provider}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-teal-400">${booking.value}</p>
                  <Badge
                    variant="secondary"
                    className={`
                      ${booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
                      ${booking.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : ''}
                      ${booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : ''}
                    `}
                  >
                    {booking.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-6">
          {/* Pending Providers */}
          <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-teal-400" />
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingProviders.map((provider) => (
                <div key={provider.id} className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-200 text-sm">{provider.name}</h5>
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                      Review
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400">{provider.service}</p>
                  <div className="flex justify-between mt-2">
                    <Button size="sm" className="bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 text-xs">
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="border-gray-600 text-gray-400 hover:bg-gray-700/50 text-xs">
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Support Tickets */}
          <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                Recent Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {supportTickets.map((ticket) => (
                <div key={ticket.id} className="p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-200 text-sm">{ticket.subject}</h5>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        ticket.priority === 'high'
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : ticket.priority === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          : 'bg-green-500/20 text-green-400 border-green-500/30'
                      }`}
                    >
                      {ticket.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400">{ticket.customer}</p>
                  <p className="text-xs text-gray-500 mt-1">{ticket.created}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Revenue Trend (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500">Revenue visualization would appear here</p>
                <p className="text-sm text-gray-600 mt-2">Showing steady growth of +12.5% MoM</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-400" />
              Customer Acquisition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500">Customer growth chart would appear here</p>
                <p className="text-sm text-gray-600 mt-2">247 new customers this month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}