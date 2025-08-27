import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Settings,
  Package,
  Plus,
  Search,
  Star,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Eye,
  Edit,
  BarChart3,
  Users,
  Clock,
  TrendingUp,
} from 'lucide-react';

export default function ServiceInventoryManagement() {
  const [activeTab, setActiveTab] = useState('services');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const services = [
    {
      id: 1,
      name: "Premium House Cleaning",
      category: "Cleaning",
      basePrice: 120,
      duration: 120,
      status: "active",
      bookings: 145,
      revenue: 17400,
      rating: 4.9,
      description: "Comprehensive house cleaning with premium supplies",
      providers: 8,
      lastUpdated: "2024-01-15",
    },
    {
      id: 2,
      name: "Lawn Care & Maintenance",
      category: "Landscaping",
      basePrice: 80,
      duration: 90,
      status: "active",
      bookings: 98,
      revenue: 7840,
      rating: 4.7,
      description: "Complete lawn maintenance and landscaping services",
      providers: 5,
      lastUpdated: "2024-01-12",
    },
    {
      id: 3,
      name: "Deep Cleaning Service",
      category: "Cleaning",
      basePrice: 180,
      duration: 180,
      status: "active",
      bookings: 67,
      revenue: 12060,
      rating: 4.8,
      description: "Intensive deep cleaning for move-ins/outs",
      providers: 6,
      lastUpdated: "2024-01-10",
    },
    {
      id: 4,
      name: "Pool Maintenance",
      category: "Maintenance",
      basePrice: 95,
      duration: 60,
      status: "active",
      bookings: 43,
      revenue: 4085,
      rating: 4.6,
      description: "Weekly pool cleaning and chemical balancing",
      providers: 3,
      lastUpdated: "2024-01-08",
    },
  ];

  const inventory = [
    {
      id: 1,
      name: "Professional Vacuum Cleaner",
      category: "Equipment",
      type: "equipment",
      currentStock: 8,
      minStock: 3,
      maxStock: 12,
      costPerUnit: 350,
      status: "in_stock",
      supplier: "CleanTech Solutions",
      location: "Main Warehouse",
      lastOrdered: "2024-01-10",
      condition: "excellent",
    },
    {
      id: 2,
      name: "Eco-Friendly Cleaning Supplies",
      category: "Cleaning Supplies",
      type: "consumable",
      currentStock: 2,
      minStock: 10,
      maxStock: 50,
      costPerUnit: 25,
      status: "low_stock",
      supplier: "GreenClean Co",
      location: "Supply Room A",
      lastOrdered: "2024-01-05",
      usageRate: "15 units/week",
    },
    {
      id: 3,
      name: "Commercial Lawn Mower",
      category: "Landscaping Equipment",
      type: "equipment",
      currentStock: 0,
      minStock: 2,
      maxStock: 6,
      costPerUnit: 850,
      status: "out_of_stock",
      supplier: "LawnPro Equipment",
      location: "Equipment Bay",
      lastOrdered: "2023-12-15",
      condition: "needs_maintenance",
    },
    {
      id: 4,
      name: "Pool Chemical Kit",
      category: "Pool Maintenance",
      type: "consumable",
      currentStock: 15,
      minStock: 8,
      maxStock: 25,
      costPerUnit: 45,
      status: "in_stock",
      supplier: "AquaChem Supply",
      location: "Chemical Storage",
      lastOrdered: "2024-01-12",
      usageRate: "8 kits/week",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'in_stock':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'low_stock':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'out_of_stock':
      case 'inactive':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const serviceMetrics = {
    totalServices: services.length,
    activeServices: services.filter(s => s.status === 'active').length,
    totalBookings: services.reduce((sum, s) => sum + s.bookings, 0),
    totalRevenue: services.reduce((sum, s) => sum + s.revenue, 0),
    avgRating: (services.reduce((sum, s) => sum + s.rating, 0) / services.length).toFixed(1),
  };

  const inventoryMetrics = {
    totalItems: inventory.length,
    lowStockItems: inventory.filter(i => i.status === 'low_stock').length,
    outOfStockItems: inventory.filter(i => i.status === 'out_of_stock').length,
    totalValue: inventory.reduce((sum, i) => sum + (i.currentStock * i.costPerUnit), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Service & Inventory Management</h1>
          <p className="text-gray-400 mt-1">Manage service catalog, pricing, and inventory tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30">
            <Plus className="w-4 h-4 mr-2" />
            New Service
          </Button>
          <Button className="bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30">
            <Package className="w-4 h-4 mr-2" />
            Add Inventory
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-1">
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            className={`flex-1 py-3 px-6 rounded-lg transition-all ${
              activeTab === 'services'
                ? 'bg-gradient-to-r from-purple-500/20 to-teal-500/20 text-white border border-purple-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
            }`}
            onClick={() => setActiveTab('services')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Services
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 py-3 px-6 rounded-lg transition-all ${
              activeTab === 'inventory'
                ? 'bg-gradient-to-r from-purple-500/20 to-teal-500/20 text-white border border-purple-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
            }`}
            onClick={() => setActiveTab('inventory')}
          >
            <Package className="w-4 h-4 mr-2" />
            Inventory
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 py-3 px-6 rounded-lg transition-all ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-purple-500/20 to-teal-500/20 text-white border border-purple-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
            }`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Active Services</p>
                <p className="text-2xl font-bold text-white">{serviceMetrics.activeServices}</p>
                <p className="text-purple-400 text-sm">Avg Rating: {serviceMetrics.avgRating}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Service Revenue</p>
                <p className="text-2xl font-bold text-white">${serviceMetrics.totalRevenue.toLocaleString()}</p>
                <p className="text-green-400 text-sm">{serviceMetrics.totalBookings} bookings</p>
              </div>
              <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-teal-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Inventory Items</p>
                <p className="text-2xl font-bold text-white">{inventoryMetrics.totalItems}</p>
                <p className="text-yellow-400 text-sm">{inventoryMetrics.lowStockItems} low stock</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Inventory Value</p>
                <p className="text-2xl font-bold text-white">${inventoryMetrics.totalValue.toLocaleString()}</p>
                <p className="text-red-400 text-sm">{inventoryMetrics.outOfStockItems} out of stock</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Content */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* Search */}
          <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800/30 border border-gray-700/50 text-white placeholder-gray-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Services Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredServices.map((service) => (
              <Card key={service.id} className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50 hover:border-purple-500/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                      <p className="text-gray-400 text-sm">{service.category}</p>
                    </div>
                    <Badge className={`border ${getStatusColor(service.status)}`}>
                      {service.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-gray-400 text-sm">Base Price</p>
                      <p className="text-teal-400 font-bold text-lg">${service.basePrice}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Duration</p>
                      <p className="text-white font-medium">{service.duration} min</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Bookings</p>
                      <p className="text-white font-medium">{service.bookings}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Rating</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-yellow-400 font-medium">{service.rating}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>{service.providers} providers</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <p className="text-gray-400 text-sm">{service.description}</p>
                    <p className="text-gray-500 text-xs mt-2">Last updated: {service.lastUpdated}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Search */}
          <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800/30 border border-gray-700/50 text-white placeholder-gray-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Inventory Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredInventory.map((item) => (
              <Card key={item.id} className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50 hover:border-teal-500/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                      <p className="text-gray-400 text-sm">{item.category}</p>
                    </div>
                    <Badge className={`border ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-gray-400 text-sm">Current Stock</p>
                      <p className={`font-bold text-lg ${
                        item.status === 'out_of_stock' ? 'text-red-400' :
                        item.status === 'low_stock' ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {item.currentStock}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Cost/Unit</p>
                      <p className="text-teal-400 font-bold">${item.costPerUnit}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Min/Max Stock</p>
                      <p className="text-white font-medium">{item.minStock}/{item.maxStock}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Total Value</p>
                      <p className="text-white font-medium">${(item.currentStock * item.costPerUnit).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Supplier:</span>
                      <span className="text-gray-300">{item.supplier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Location:</span>
                      <span className="text-gray-300">{item.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Ordered:</span>
                      <span className="text-gray-300">{item.lastOrdered}</span>
                    </div>
                    {item.usageRate && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Usage Rate:</span>
                        <span className="text-purple-400">{item.usageRate}</span>
                      </div>
                    )}
                  </div>

                  {/* Stock Level Indicator */}
                  <div className="mt-4">
                    <div className="w-full h-2 bg-gray-700 rounded-full">
                      <div 
                        className={`h-2 rounded-full ${
                          item.status === 'out_of_stock' ? 'bg-red-500' :
                          item.status === 'low_stock' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((item.currentStock / item.maxStock) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Service Performance */}
          <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                Top Performing Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {services.sort((a, b) => b.revenue - a.revenue).map((service, index) => (
                  <div key={service.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <span className="text-purple-400 font-bold text-sm">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-200">{service.name}</p>
                        <p className="text-sm text-gray-400">{service.bookings} bookings</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-teal-400">${service.revenue.toLocaleString()}</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-yellow-400">{service.rating}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Inventory Alerts */}
          <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                Inventory Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inventory.filter(item => item.status !== 'in_stock').map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.status === 'out_of_stock' ? 'bg-red-500/20' : 'bg-yellow-500/20'
                      }`}>
                        <AlertCircle className={`w-4 h-4 ${
                          item.status === 'out_of_stock' ? 'text-red-400' : 'text-yellow-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-200">{item.name}</p>
                        <p className="text-sm text-gray-400">{item.currentStock} in stock</p>
                      </div>
                    </div>
                    <Badge className={`border ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
                {inventory.filter(item => item.status !== 'in_stock').length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                    <p>All inventory levels are healthy!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}