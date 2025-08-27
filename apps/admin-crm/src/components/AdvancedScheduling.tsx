import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  Star,
} from 'lucide-react';

export default function AdvancedScheduling() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState(null);

  const bookings = [
    {
      id: "BOOK-001",
      time: "09:00 AM",
      duration: 120,
      service: "House Cleaning",
      customer: "Sarah Johnson",
      provider: "Maria Santos",
      price: 120,
      status: "confirmed",
      address: "123 Oak Street, Kansas City, MO",
      notes: "Please bring eco-friendly supplies",
      customerPhone: "(816) 555-0123",
      rating: 4.9,
    },
    {
      id: "BOOK-002",
      time: "11:30 AM",
      duration: 90,
      service: "Lawn Care",
      customer: "Mike Chen",
      provider: "David Wilson",
      price: 65,
      status: "in_progress",
      address: "456 Pine Avenue, Overland Park, KS",
      notes: "Large backyard, mow and edge",
      customerPhone: "(913) 555-0456",
      rating: 4.7,
    },
    {
      id: "BOOK-003",
      time: "02:00 PM",
      duration: 60,
      service: "Pool Maintenance",
      customer: "Emily Rodriguez",
      provider: "Carlos Rodriguez",
      price: 95,
      status: "pending",
      address: "789 Elm Drive, Lee's Summit, MO",
      notes: "Weekly maintenance check",
      customerPhone: "(816) 555-0789",
      rating: 4.8,
    },
    {
      id: "BOOK-004",
      time: "04:30 PM",
      duration: 180,
      service: "Deep Cleaning",
      customer: "David Wilson",
      provider: "Maria Santos",
      price: 180,
      status: "confirmed",
      address: "321 Maple Court, Olathe, KS",
      notes: "Move-out cleaning service",
      customerPhone: "(913) 555-0234",
      rating: 4.6,
    },
  ];

  const providers = [
    {
      id: "PROV-001",
      name: "Maria Santos",
      services: ["House Cleaning", "Deep Cleaning"],
      status: "available",
      rating: 4.9,
      completedJobs: 156,
      location: "Kansas City, MO",
      nextAvailable: "10:00 AM",
    },
    {
      id: "PROV-002",
      name: "David Wilson",
      services: ["Lawn Care", "Landscaping"],
      status: "busy",
      rating: 4.7,
      completedJobs: 89,
      location: "Overland Park, KS",
      nextAvailable: "03:00 PM",
    },
    {
      id: "PROV-003",
      name: "Carlos Rodriguez",
      services: ["Pool Maintenance", "Pressure Washing"],
      status: "available",
      rating: 4.8,
      completedJobs: 73,
      location: "Lee's Summit, MO",
      nextAvailable: "Now",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completed':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getProviderStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'busy':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'offline':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (selectedBooking) {
    const booking = bookings.find(b => b.id === selectedBooking);
    
    return (
      <div className="space-y-6">
        {/* Booking Detail Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setSelectedBooking(null)}
            variant="outline"
            className="border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
          >
            ← Back to Schedule
          </Button>
          <div className="flex gap-2">
            <Button className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30">
              Reschedule
            </Button>
            <Button className="bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30">
              Contact Customer
            </Button>
          </div>
        </div>

        {/* Booking Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Booking #{booking.id.split('-')[1]}</span>
                  <Badge className={`border ${getStatusColor(booking.status)}`}>
                    {booking.status.replace('_', ' ')}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Service & Timing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-300 mb-3">Service Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        <span className="font-medium text-white">{booking.service}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-teal-400" />
                        <span className="text-gray-300">{booking.time} ({booking.duration} min)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-400 font-bold">${booking.price}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-300 mb-3">Customer</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-teal-500 text-white text-sm">
                            {booking.customer.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-white">{booking.customer}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">{booking.customerPhone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-yellow-400">{booking.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Provider & Location */}
                <div className="border-t border-gray-700/50 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-300 mb-3">Assigned Provider</h4>
                      <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gradient-to-br from-teal-500 to-purple-500 text-white">
                            {booking.provider.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-200">{booking.provider}</p>
                          <p className="text-sm text-gray-400">Service Provider</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-300 mb-3">Service Location</h4>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-teal-400 mt-1 flex-shrink-0" />
                        <span className="text-gray-300">{booking.address}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {booking.notes && (
                  <div className="border-t border-gray-700/50 pt-6">
                    <h4 className="font-medium text-gray-300 mb-3">Special Notes</h4>
                    <p className="text-gray-400 bg-gray-800/30 p-3 rounded-lg">{booking.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
              <CardHeader>
                <CardTitle className="text-sm">Booking Status</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <Badge className={`border text-lg px-4 py-2 ${getStatusColor(booking.status)}`}>
                  {booking.status.replace('_', ' ')}
                </Badge>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-700/50">
                  <Clock className="w-4 h-4 mr-2" />
                  Update Status
                </Button>
                <Button className="w-full bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-700/50">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Reassign Provider
                </Button>
                <Button className="w-full bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-700/50">
                  <MapPin className="w-4 h-4 mr-2" />
                  View on Map
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scheduling Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Advanced Scheduling</h1>
          <p className="text-gray-400 mt-1">Manage bookings, calendar, and provider availability</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </div>

      {/* Scheduling Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Today's Bookings</p>
                <p className="text-2xl font-bold text-white">24</p>
                <p className="text-green-400 text-sm">4 confirmed</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Available Slots</p>
                <p className="text-2xl font-bold text-white">18</p>
                <p className="text-teal-400 text-sm">Next: 3:00 PM</p>
              </div>
              <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-teal-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Provider Utilization</p>
                <p className="text-2xl font-bold text-white">87%</p>
                <p className="text-green-400 text-sm">Above target</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">No-Show Rate</p>
                <p className="text-2xl font-bold text-white">3.2%</p>
                <p className="text-yellow-400 text-sm">Improving</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Scheduling Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  Today's Schedule
                </span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="border-gray-700 text-gray-300">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-400 px-2">
                    {currentDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                  <Button size="sm" variant="outline" className="border-gray-700 text-gray-300">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    onClick={() => setSelectedBooking(booking.id)}
                    className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-purple-500/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {booking.time.split(' ')[0]}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-200">{booking.service}</h4>
                        <p className="text-sm text-gray-400">{booking.customer}</p>
                        <p className="text-xs text-gray-500">Provider: {booking.provider}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-500">{booking.duration} min</span>
                          <MapPin className="w-3 h-3 text-gray-500 ml-2" />
                          <span className="text-xs text-gray-500 truncate max-w-32">{booking.address.split(',')[1]}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-teal-400">${booking.price}</p>
                      <Badge className={`border mt-1 ${getStatusColor(booking.status)}`}>
                        {booking.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Provider Availability */}
        <div>
          <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-400" />
                Provider Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {providers.map((provider) => (
                  <div key={provider.id} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-gradient-to-br from-teal-500 to-purple-500 text-white text-sm">
                            {provider.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h5 className="font-medium text-gray-200 text-sm">{provider.name}</h5>
                          <p className="text-xs text-gray-400">{provider.location}</p>
                        </div>
                      </div>
                      <Badge className={`border text-xs ${getProviderStatusColor(provider.status)}`}>
                        {provider.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-yellow-400">{provider.rating}</span>
                        <span className="text-gray-400">({provider.completedJobs})</span>
                      </div>
                      <span className="text-teal-400">Next: {provider.nextAvailable}</span>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">{provider.services.join(', ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}