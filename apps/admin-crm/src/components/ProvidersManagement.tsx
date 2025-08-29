import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  Users,
  Star,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  BarChart3,
  Activity,
  Target,
} from 'lucide-react';

interface PPSMetrics {
  provider_id: string;
  current_pps_score: number;
  distance_score: number;
  performance_score: number;
  reliability_score: number;
  jobs_completed: number;
  jobs_accepted: number;
  jobs_offered: number;
  on_time_arrivals: number;
  late_arrivals: number;
}

interface Provider {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  bio: string;
  is_verified: boolean;
  onboarding_status: 'started' | 'documents_submitted' | 'verified' | 'active';
  hourly_rate: number;
  created_at: string;
  pps_metrics?: PPSMetrics;
}

export default function ProvidersManagement() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  // Mock data for now - will connect to API
  const mockProviders: Provider[] = [
    {
      id: '1',
      full_name: 'Maria Santos',
      email: 'maria.santos@email.com',
      phone_number: '(816) 555-0123',
      bio: 'Professional house cleaner with 8+ years experience',
      is_verified: true,
      onboarding_status: 'active',
      hourly_rate: 25.00,
      created_at: '2023-06-15',
      pps_metrics: {
        provider_id: '1',
        current_pps_score: 87.5,
        distance_score: 85.0,
        performance_score: 92.0,
        reliability_score: 95.0,
        jobs_completed: 145,
        jobs_accepted: 160,
        jobs_offered: 180,
        on_time_arrivals: 138,
        late_arrivals: 7,
      }
    },
    {
      id: '2',
      full_name: 'James Wilson',
      email: 'james.wilson@email.com',
      phone_number: '(913) 555-0456',
      bio: 'Experienced landscaper and lawn care specialist',
      is_verified: true,
      onboarding_status: 'active',
      hourly_rate: 30.00,
      created_at: '2023-04-22',
      pps_metrics: {
        provider_id: '2',
        current_pps_score: 75.2,
        distance_score: 72.0,
        performance_score: 80.0,
        reliability_score: 78.0,
        jobs_completed: 89,
        jobs_accepted: 95,
        jobs_offered: 120,
        on_time_arrivals: 82,
        late_arrivals: 7,
      }
    },
    {
      id: '3',
      full_name: 'David Thompson',
      email: 'david.thompson@email.com',
      phone_number: '(816) 555-0789',
      bio: 'Licensed plumber with emergency service availability',
      is_verified: false,
      onboarding_status: 'documents_submitted',
      hourly_rate: 45.00,
      created_at: '2024-01-10',
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setProviders(mockProviders);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = provider.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         provider.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || provider.onboarding_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string, isVerified: boolean) => {
    if (status === 'active' && isVerified) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
    }
    if (status === 'verified') {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Verified</Badge>;
    }
    if (status === 'documents_submitted') {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending Review</Badge>;
    }
    return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Started</Badge>;
  };

  const getPPSScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Providers Management</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-800/50 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Providers Management</h1>
          <p className="text-gray-400">Manage service providers and PPS scores</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600">
          <Users className="mr-2 h-4 w-4" />
          Add Provider
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Providers</p>
                <div className="text-2xl font-bold text-white">{providers.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Active</p>
                <div className="text-2xl font-bold text-white">
                  {providers.filter(p => p.onboarding_status === 'active').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-yellow-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Pending Review</p>
                <div className="text-2xl font-bold text-white">
                  {providers.filter(p => p.onboarding_status === 'documents_submitted').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-purple-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Avg PPS Score</p>
                <div className="text-2xl font-bold text-white">
                  {(providers.filter(p => p.pps_metrics).reduce((sum, p) => sum + (p.pps_metrics?.current_pps_score || 0), 0) / providers.filter(p => p.pps_metrics).length || 0).toFixed(1)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search providers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-900/50 border-gray-800 text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-gray-900/50 border border-gray-800 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="verified">Verified</option>
          <option value="documents_submitted">Pending Review</option>
          <option value="started">Started</option>
        </select>
      </div>

      {/* Providers List */}
      <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">All Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer"
                onClick={() => setSelectedProvider(provider)}
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-r from-purple-500 to-teal-500 text-white">
                      {provider.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-white">{provider.full_name}</h3>
                      {getStatusBadge(provider.onboarding_status, provider.is_verified)}
                    </div>
                    <p className="text-sm text-gray-400">{provider.email}</p>
                    <p className="text-sm text-gray-500">{provider.bio}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Hourly Rate</p>
                    <p className="font-semibold text-white">${provider.hourly_rate}</p>
                  </div>

                  {provider.pps_metrics && (
                    <div className="text-right">
                      <p className="text-sm text-gray-400">PPS Score</p>
                      <p className={`text-2xl font-bold ${getPPSScoreColor(provider.pps_metrics.current_pps_score)}`}>
                        {provider.pps_metrics.current_pps_score}
                      </p>
                    </div>
                  )}

                  {provider.pps_metrics && (
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Jobs Completed</p>
                      <p className="font-semibold text-white">{provider.pps_metrics.jobs_completed}</p>
                    </div>
                  )}

                  {provider.pps_metrics && (
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Acceptance Rate</p>
                      <p className="font-semibold text-white">
                        {((provider.pps_metrics.jobs_accepted / provider.pps_metrics.jobs_offered) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Provider Detail Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900/95 backdrop-blur-xl border-gray-800/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-gradient-to-r from-purple-500 to-teal-500 text-white text-xl">
                      {selectedProvider.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl text-white">{selectedProvider.full_name}</CardTitle>
                    <p className="text-gray-400">{selectedProvider.email}</p>
                    {getStatusBadge(selectedProvider.onboarding_status, selectedProvider.is_verified)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedProvider(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedProvider.pps_metrics && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics (PPS)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800/30 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Target className="h-5 w-5 text-purple-400" />
                        <span className="text-sm text-gray-400">Overall PPS</span>
                      </div>
                      <p className={`text-2xl font-bold ${getPPSScoreColor(selectedProvider.pps_metrics.current_pps_score)}`}>
                        {selectedProvider.pps_metrics.current_pps_score}
                      </p>
                    </div>
                    <div className="bg-gray-800/30 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Activity className="h-5 w-5 text-blue-400" />
                        <span className="text-sm text-gray-400">Performance</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-400">{selectedProvider.pps_metrics.performance_score}</p>
                    </div>
                    <div className="bg-gray-800/30 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span className="text-sm text-gray-400">Reliability</span>
                      </div>
                      <p className="text-2xl font-bold text-green-400">{selectedProvider.pps_metrics.reliability_score}</p>
                    </div>
                    <div className="bg-gray-800/30 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-5 w-5 text-teal-400" />
                        <span className="text-sm text-gray-400">Distance</span>
                      </div>
                      <p className="text-2xl font-bold text-teal-400">{selectedProvider.pps_metrics.distance_score}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-gray-800/30 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Jobs Completed</p>
                      <p className="text-xl font-bold text-white">{selectedProvider.pps_metrics.jobs_completed}</p>
                    </div>
                    <div className="bg-gray-800/30 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Jobs Offered</p>
                      <p className="text-xl font-bold text-white">{selectedProvider.pps_metrics.jobs_offered}</p>
                    </div>
                    <div className="bg-gray-800/30 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Acceptance Rate</p>
                      <p className="text-xl font-bold text-white">
                        {((selectedProvider.pps_metrics.jobs_accepted / selectedProvider.pps_metrics.jobs_offered) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-gray-800/30 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">On-Time Arrivals</p>
                      <p className="text-xl font-bold text-white">{selectedProvider.pps_metrics.on_time_arrivals}</p>
                    </div>
                    <div className="bg-gray-800/30 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Late Arrivals</p>
                      <p className="text-xl font-bold text-white">{selectedProvider.pps_metrics.late_arrivals}</p>
                    </div>
                    <div className="bg-gray-800/30 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Punctuality Rate</p>
                      <p className="text-xl font-bold text-white">
                        {((selectedProvider.pps_metrics.on_time_arrivals / (selectedProvider.pps_metrics.on_time_arrivals + selectedProvider.pps_metrics.late_arrivals)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <Button className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                  {selectedProvider.is_verified ? 'Verified' : 'Approve Provider'}
                </Button>
                <Button variant="outline" className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800">
                  View Details
                </Button>
                <Button variant="outline" className="flex-1 border-red-500 text-red-400 hover:bg-red-500/10">
                  Suspend
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}