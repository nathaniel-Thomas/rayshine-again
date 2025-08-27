import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  Users,
  UserCheck,
  Shield,
  Plus,
  Search,
  Eye,
  Edit,
  Star,
  CheckCircle,
  Clock,
  Ban,
  Check,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

export default function PeopleCommand() {
  const [activeTab, setActiveTab] = useState('customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [teamMemberEmail, setTeamMemberEmail] = useState('');
  const [teamMemberRole, setTeamMemberRole] = useState('Support/VA');

  const customers = [
    {
      id: "CUST-001",
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      phone: "(816) 555-0123",
      market: "Kansas City, MO",
      status: "VIP",
      totalBookings: 24,
      totalSpent: 2880,
      avgRating: 4.9,
      joinDate: "2023-06-15",
      lastBooking: "2024-01-15",
    },
    {
      id: "CUST-002",
      name: "Mike Chen",
      email: "m.chen@business.com",
      phone: "(913) 555-0456",
      market: "Overland Park, KS",
      status: "Active",
      totalBookings: 18,
      totalSpent: 2160,
      avgRating: 4.7,
      joinDate: "2023-04-22",
      lastBooking: "2024-01-12",
    },
    {
      id: "CUST-003",
      name: "Emily Rodriguez",
      email: "emily.r@home.net",
      phone: "(816) 555-0789",
      market: "Lee's Summit, MO",
      status: "Active",
      totalBookings: 12,
      totalSpent: 1440,
      avgRating: 4.8,
      joinDate: "2023-08-10",
      lastBooking: "2024-01-08",
    },
  ];

  const providers = [
    {
      id: "PROV-001",
      name: "Maria Santos",
      email: "maria.santos@email.com",
      phone: "(555) 234-5678",
      market: "Kansas City, MO",
      services: ["House Cleaning", "Deep Cleaning"],
      status: "Active",
      rating: 4.9,
      completedJobs: 156,
      totalEarnings: 18720,
      backgroundCheck: "Verified",
      joinDate: "2023-03-10",
    },
    {
      id: "PROV-002",
      name: "James Wilson",
      email: "james.wilson@email.com",
      phone: "(555) 345-6789",
      market: "Overland Park, KS",
      services: ["Lawn Care", "Landscaping"],
      status: "Pending Approval",
      rating: 0,
      completedJobs: 0,
      totalEarnings: 0,
      backgroundCheck: "In Progress",
      joinDate: "2024-01-20",
    },
    {
      id: "PROV-003",
      name: "Carlos Rodriguez",
      email: "carlos.r@email.com",
      phone: "(555) 456-7890",
      market: "Lee's Summit, MO",
      services: ["Pool Maintenance", "Pressure Washing"],
      status: "Active",
      rating: 4.8,
      completedJobs: 89,
      totalEarnings: 10680,
      backgroundCheck: "Verified",
      joinDate: "2023-07-15",
    },
  ];

  const teamMembers = [
    {
      id: 1,
      name: "Alex Johnson",
      email: "alex.johnson@rayshine.com",
      role: "Admin",
      department: "Operations",
      status: "active",
      joinDate: "2023-01-15",
      lastLogin: "2024-01-20 09:30",
    },
    {
      id: 2,
      name: "Sarah Mitchell",
      email: "sarah.mitchell@rayshine.com",
      role: "Manager",
      department: "Customer Service",
      status: "active",
      joinDate: "2023-04-20",
      lastLogin: "2024-01-20 08:45",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'VIP':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'New':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Pending Approval':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Suspended':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProviders = providers.filter(provider =>
    provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.market.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderCustomersTab = () => (
    <div className="space-y-6">
      {/* Search */}
      <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800/30 border border-gray-700/50 text-white placeholder-gray-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50 hover:border-purple-500/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-teal-500 text-white">
                    {customer.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">{customer.name}</h3>
                    <Badge className={`border ${getStatusColor(customer.status)}`}>
                      {customer.status}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-sm">{customer.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-gray-400 text-sm">Total Bookings</p>
                  <p className="text-white font-medium">{customer.totalBookings}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Spent</p>
                  <p className="text-teal-400 font-bold">${customer.totalSpent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-yellow-400 font-medium">{customer.avgRating}</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Market</p>
                  <p className="text-white font-medium">{customer.market}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Member since {customer.joinDate}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderProvidersTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Provider Management</h2>
          <p className="text-gray-400">Manage service providers and onboarding</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Onboard Provider
        </Button>
      </div>

      {/* Search */}
      <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search providers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800/30 border border-gray-700/50 text-white placeholder-gray-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProviders.map((provider) => (
          <Card key={provider.id} className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50 hover:border-teal-500/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-gradient-to-br from-teal-500 to-purple-500 text-white">
                    {provider.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">{provider.name}</h3>
                    <Badge className={`border ${getStatusColor(provider.status)}`}>
                      {provider.status}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-sm">{provider.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-gray-400 text-sm">Completed Jobs</p>
                  <p className="text-white font-medium">{provider.completedJobs}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Earnings</p>
                  <p className="text-teal-400 font-bold">${provider.totalEarnings.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Rating</p>
                  {provider.rating > 0 ? (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-yellow-400 font-medium">{provider.rating}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500">N/A</span>
                  )}
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Background Check</p>
                  <div className="flex items-center gap-1">
                    {provider.backgroundCheck === 'Verified' ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-sm">Verified</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 text-sm">In Progress</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-2">Services</p>
                <div className="flex flex-wrap gap-1">
                  {provider.services.map((service, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-xs"
                    >
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  <p>Market: {provider.market}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                    <Eye className="w-4 h-4" />
                  </Button>
                  {provider.status === 'Pending Approval' && (
                    <Button size="sm" className="bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30">
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300">
                    <Ban className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderTeamTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Team Management</h2>
          <p className="text-gray-400">Manage internal staff and permissions</p>
        </div>
        <Button
          onClick={() => setShowInviteModal(true)}
          className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Invite Team Member
        </Button>
      </div>

      {/* Team Members List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {teamMembers.map((member) => (
          <Card key={member.id} className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-teal-500 text-white">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{member.name}</h3>
                  <p className="text-gray-400 text-sm">{member.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-gray-400 text-sm">Role</p>
                  <select
                    defaultValue={member.role}
                    className="bg-gray-800/30 border border-gray-700/50 rounded px-2 py-1 text-white text-sm"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Support/VA">Support/VA</option>
                  </select>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Department</p>
                  <p className="text-white font-medium">{member.department}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Join Date</p>
                  <p className="text-white font-medium">{member.joinDate}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Last Login</p>
                  <p className="text-green-400 font-medium">{member.lastLogin}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Invite Team Member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Email Address</label>
                <Input
                  type="email"
                  placeholder="Enter email address..."
                  value={teamMemberEmail}
                  onChange={(e) => setTeamMemberEmail(e.target.value)}
                  className="bg-gray-700/50 border border-gray-600/50 text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Role</label>
                <select
                  value={teamMemberRole}
                  onChange={(e) => setTeamMemberRole(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-md text-white"
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Support/VA">Support/VA</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowInviteModal(false)}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700/50"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowInviteModal(false);
                  setTeamMemberEmail('');
                  setTeamMemberRole('Support/VA');
                }}
                className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
              >
                Send Invite
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">People Command</h1>
          <p className="text-gray-400 mt-1">Central hub for managing all marketplace users</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-1">
        <div className="flex space-x-1">
          {[
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'providers', label: 'Providers', icon: UserCheck },
            { id: 'team', label: 'Team Roles', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                className={`flex-1 py-3 px-6 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-500/20 to-teal-500/20 text-white border border-purple-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'customers' && renderCustomersTab()}
        {activeTab === 'providers' && renderProvidersTab()}
        {activeTab === 'team' && renderTeamTab()}
      </div>
    </div>
  );
}