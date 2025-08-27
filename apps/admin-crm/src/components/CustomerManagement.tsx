import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  Users,
  UserCheck,
  UserPlus,
  DollarSign,
  Search,
  Filter,
  Eye,
  Edit,
  Plus,
  Star,
  Calendar,
  Mail,
  Phone,
} from 'lucide-react';

export default function CustomerManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const customers = [
    {
      id: "CUST-001",
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      phone: "(816) 555-0123",
      totalSpent: 2450,
      bookings: 18,
      status: "VIP",
      joinDate: "2023-03-15",
      lastBooking: "2024-01-18",
      rating: 4.9,
      location: "Kansas City, MO",
      preferredServices: ["House Cleaning", "Deep Cleaning"],
    },
    {
      id: "CUST-002",
      name: "Mike Chen",
      email: "m.chen@business.com",
      phone: "(913) 555-0456",
      totalSpent: 3840,
      bookings: 32,
      status: "Active",
      joinDate: "2023-01-22",
      lastBooking: "2024-01-20",
      rating: 4.7,
      location: "Overland Park, KS",
      preferredServices: ["Lawn Care", "Landscaping"],
    },
    {
      id: "CUST-003",
      name: "Emily Rodriguez",
      email: "emily.r@home.net",
      phone: "(816) 555-0789",
      totalSpent: 1890,
      bookings: 14,
      status: "Active",
      joinDate: "2023-06-10",
      lastBooking: "2024-01-15",
      rating: 4.8,
      location: "Lee's Summit, MO",
      preferredServices: ["House Cleaning", "Window Cleaning"],
    },
    {
      id: "CUST-004",
      name: "David Wilson",
      email: "david.w@email.com",
      phone: "(913) 555-0234",
      totalSpent: 890,
      bookings: 6,
      status: "New",
      joinDate: "2024-01-05",
      lastBooking: "2024-01-12",
      rating: 4.5,
      location: "Olathe, KS",
      preferredServices: ["Carpet Cleaning"],
    },
  ];

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || customer.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'VIP':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'New':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (selectedCustomer) {
    const customer = customers.find(c => c.id === selectedCustomer);
    
    return (
      <div className="space-y-6">
        {/* Customer Detail Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setSelectedCustomer(null)}
            variant="outline"
            className="border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
          >
            ← Back to Customers
          </Button>
          <div className="flex gap-2">
            <Button className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30">
              <Edit className="w-4 h-4 mr-2" />
              Edit Customer
            </Button>
            <Button className="bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30">
              <Calendar className="w-4 h-4 mr-2" />
              Book Service
            </Button>
          </div>
        </div>

        {/* Customer Profile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-teal-500 text-white">
                      {customer.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold text-white">{customer.name}</h2>
                    <p className="text-gray-400">{customer.email}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-300 mb-3">Contact Information</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">{customer.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-300 mb-3">Customer Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Spent:</span>
                        <span className="font-bold text-teal-400">${customer.totalSpent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Bookings:</span>
                        <span className="font-medium text-gray-300">{customer.bookings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Rating:</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="font-medium text-yellow-400">{customer.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preferred Services */}
                <div>
                  <h4 className="font-medium text-gray-300 mb-3">Preferred Services</h4>
                  <div className="flex flex-wrap gap-2">
                    {customer.preferredServices.map((service, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-purple-500/20 text-purple-400 border-purple-500/30"
                      >
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Account Details */}
                <div className="border-t border-gray-700/50 pt-6">
                  <h4 className="font-medium text-gray-300 mb-3">Account Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Member Since</p>
                      <p className="font-medium text-gray-300">{customer.joinDate}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Last Booking</p>
                      <p className="font-medium text-gray-300">{customer.lastBooking}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Status</p>
                      <Badge className={`border ${getStatusColor(customer.status)}`}>
                        {customer.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Location</p>
                      <p className="font-medium text-gray-300">{customer.location}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-700/50">
                  <Calendar className="w-4 h-4 mr-2" />
                  View Bookings
                </Button>
                <Button className="w-full bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-700/50">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                <Button className="w-full bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-700/50">
                  <DollarSign className="w-4 h-4 mr-2" />
                  View Invoices
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
              <CardHeader>
                <CardTitle className="text-sm">Customer Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-teal-400">${customer.totalSpent}</p>
                  <p className="text-sm text-gray-400">Lifetime Value</p>
                  <p className="text-sm text-purple-400 mt-2">
                    ${(customer.totalSpent / customer.bookings).toFixed(0)} avg per booking
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customer Management Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Customer Management</h1>
          <p className="text-gray-400 mt-1">Manage customer profiles, history, and relationships</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Customers</p>
                <p className="text-2xl font-bold text-white">2,847</p>
                <p className="text-green-400 text-sm">+12.5% this month</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Active This Month</p>
                <p className="text-2xl font-bold text-white">1,923</p>
                <p className="text-teal-400 text-sm">67.5% active rate</p>
              </div>
              <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-teal-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">New This Week</p>
                <p className="text-2xl font-bold text-white">127</p>
                <p className="text-green-400 text-sm">Above target</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Avg. Lifetime Value</p>
                <p className="text-2xl font-bold text-white">$2,340</p>
                <p className="text-yellow-400 text-sm">+8.7% growth</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Search and Filters */}
      <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search customers by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800/30 border border-gray-700/50 text-white placeholder-gray-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-gray-800/30 border border-gray-700/50 rounded-md text-white"
            >
              <option value="all">All Status</option>
              <option value="VIP">VIP</option>
              <option value="Active">Active</option>
              <option value="New">New</option>
            </select>
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-700 bg-transparent">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
        <CardContent className="p-6">
          <div className="space-y-4">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => setSelectedCustomer(customer.id)}
                className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-purple-500/50 transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-teal-500 text-white font-semibold">
                      {customer.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-white font-semibold">{customer.name}</h3>
                    <p className="text-gray-400 text-sm">{customer.email}</p>
                    <p className="text-gray-500 text-xs">{customer.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">${customer.totalSpent.toLocaleString()}</p>
                  <p className="text-gray-400 text-sm">{customer.bookings} bookings</p>
                  <Badge className={`border mt-1 ${getStatusColor(customer.status)}`}>
                    {customer.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}