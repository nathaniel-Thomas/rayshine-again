import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Target,
  TrendingUp,
  Users,
  DollarSign,
  Mail,
  Share2,
  Gift,
  Plus,
  Search,
  Eye,
  Edit,
  BarChart3,
  Calendar,
  Percent,
  Star,
  UserPlus,
} from 'lucide-react';

export default function MarketingGrowthTools() {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const campaigns = [
    {
      id: 1,
      name: "Spring Cleaning Special",
      type: "Email Campaign",
      status: "active",
      budget: 5000,
      spent: 3200,
      startDate: "2024-03-01",
      endDate: "2024-04-30",
      metrics: {
        impressions: 15000,
        clicks: 750,
        conversions: 45,
        revenue: 5400,
        roi: 68.75,
        ctr: 5.0,
        conversionRate: 6.0,
      },
      audience: "Homeowners 25-55",
      channels: ["email", "social_media"],
    },
    {
      id: 2,
      name: "New Customer Acquisition",
      type: "Digital Ads",
      status: "active",
      budget: 8000,
      spent: 4800,
      startDate: "2024-02-15",
      endDate: "2024-05-15",
      metrics: {
        impressions: 45000,
        clicks: 2250,
        conversions: 127,
        revenue: 15240,
        roi: 217.5,
        ctr: 5.0,
        conversionRate: 5.6,
      },
      audience: "First-time service users",
      channels: ["google_ads", "facebook_ads"],
    },
    {
      id: 3,
      name: "Summer Lawn Care Promotion",
      type: "SMS Campaign",
      status: "paused",
      budget: 3000,
      spent: 1800,
      startDate: "2024-05-01",
      endDate: "2024-07-31",
      metrics: {
        impressions: 8500,
        clicks: 340,
        conversions: 22,
        revenue: 1760,
        roi: -2.22,
        ctr: 4.0,
        conversionRate: 6.5,
      },
      audience: "Existing customers with yards",
      channels: ["sms", "direct_mail"],
    },
  ];

  const leads = [
    {
      id: 1,
      name: "Jennifer Martinez",
      email: "jennifer.m@email.com",
      phone: "(816) 555-0191",
      source: "Website",
      status: "qualified",
      score: 85,
      interestedServices: ["House Cleaning", "Deep Cleaning"],
      estimatedValue: 450,
      notes: "Interested in bi-weekly cleaning service",
      createdAt: "2024-01-20",
      location: "Kansas City, MO",
    },
    {
      id: 2,
      name: "Robert Kim",
      email: "rob.kim@business.com",
      phone: "(913) 555-0192",
      source: "Referral",
      status: "converted",
      score: 92,
      interestedServices: ["Lawn Care", "Landscaping"],
      estimatedValue: 1200,
      notes: "Converted to monthly lawn care plan",
      createdAt: "2024-01-18",
      location: "Overland Park, KS",
    },
    {
      id: 3,
      name: "Amanda Foster",
      email: "amanda.f@home.net",
      phone: "(816) 555-0193",
      source: "Social Media",
      status: "new",
      score: 67,
      interestedServices: ["Pool Maintenance"],
      estimatedValue: 380,
      notes: "New pool owner, needs weekly service",
      createdAt: "2024-01-22",
      location: "Lee's Summit, MO",
    },
  ];

  const loyaltyProgram = {
    name: "RayShine Rewards",
    type: "Points-based",
    totalMembers: 1247,
    activeMembers: 892,
    pointsIssued: 45600,
    pointsRedeemed: 23400,
    conversionRate: 68.2,
    tiers: [
      { name: "Bronze", minSpend: 0, benefits: ["5% discount", "Priority booking"] },
      { name: "Silver", minSpend: 500, benefits: ["10% discount", "Free deep cleaning"] },
      { name: "Gold", minSpend: 1000, benefits: ["15% discount", "Concierge service"] },
      { name: "Diamond", minSpend: 2500, benefits: ["20% discount", "VIP treatment"] },
    ],
  };

  const referralProgram = {
    name: "Friend Referral Program",
    type: "Cash Reward",
    totalReferrals: 156,
    successfulReferrals: 89,
    conversionRate: 57.1,
    rewardAmount: 25,
    totalRewardsPaid: 2225,
    description: "Refer a friend and both get $25 credit",
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'qualified':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'converted':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'new':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const marketingMetrics = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    totalBudget: campaigns.reduce((sum, c) => sum + c.budget, 0),
    totalSpent: campaigns.reduce((sum, c) => sum + c.spent, 0),
    totalRevenue: campaigns.reduce((sum, c) => sum + c.metrics.revenue, 0),
    averageROI: (campaigns.reduce((sum, c) => sum + c.metrics.roi, 0) / campaigns.length).toFixed(0),
    totalLeads: leads.length,
    qualifiedLeads: leads.filter(l => l.status === 'qualified').length,
    convertedLeads: leads.filter(l => l.status === 'converted').length,
    conversionRate: ((leads.filter(l => l.status === 'converted').length / leads.length) * 100).toFixed(1),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Marketing & Growth Tools</h1>
          <p className="text-gray-400 mt-1">Manage campaigns, referrals, loyalty programs, and lead generation</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
          <Button className="bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30">
            <Target className="w-4 h-4 mr-2" />
            Create Audience
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-1">
        <div className="flex space-x-1">
          {[
            { id: 'campaigns', label: 'Campaigns', icon: Target },
            { id: 'leads', label: 'Leads', icon: UserPlus },
            { id: 'loyalty', label: 'Loyalty', icon: Gift },
            { id: 'referrals', label: 'Referrals', icon: Share2 },
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

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Active Campaigns</p>
                <p className="text-2xl font-bold text-white">{marketingMetrics.activeCampaigns}</p>
                <p className="text-teal-400 text-sm">ROI: {marketingMetrics.averageROI}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Marketing Revenue</p>
                <p className="text-2xl font-bold text-white">${marketingMetrics.totalRevenue.toLocaleString()}</p>
                <p className="text-green-400 text-sm">+{marketingMetrics.averageROI}% ROI</p>
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
                <p className="text-gray-400 text-sm font-medium">Total Leads</p>
                <p className="text-2xl font-bold text-white">{marketingMetrics.totalLeads}</p>
                <p className="text-purple-400 text-sm">{marketingMetrics.qualifiedLeads} qualified</p>
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
                <p className="text-gray-400 text-sm font-medium">Conversion Rate</p>
                <p className="text-2xl font-bold text-white">{marketingMetrics.conversionRate}%</p>
                <p className="text-green-400 text-sm">{marketingMetrics.convertedLeads} converted</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Content */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {/* Search */}
          <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800/30 border border-gray-700/50 text-white placeholder-gray-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Campaigns Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCampaigns.map((campaign) => (
              <Card key={campaign.id} className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50 hover:border-purple-500/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                      <p className="text-gray-400 text-sm">{campaign.type}</p>
                    </div>
                    <Badge className={`border ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-gray-400 text-sm">Budget</p>
                      <p className="text-teal-400 font-bold">${campaign.budget.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Spent</p>
                      <p className="text-white font-medium">${campaign.spent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Revenue</p>
                      <p className="text-green-400 font-bold">${campaign.metrics.revenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">ROI</p>
                      <p className={`font-bold ${campaign.metrics.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {campaign.metrics.roi > 0 ? '+' : ''}{campaign.metrics.roi}%
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                    <div className="text-center p-2 bg-gray-800/30 rounded">
                      <p className="text-purple-400 font-bold">{campaign.metrics.impressions.toLocaleString()}</p>
                      <p className="text-gray-400 text-xs">Impressions</p>
                    </div>
                    <div className="text-center p-2 bg-gray-800/30 rounded">
                      <p className="text-teal-400 font-bold">{campaign.metrics.clicks.toLocaleString()}</p>
                      <p className="text-gray-400 text-xs">Clicks</p>
                    </div>
                    <div className="text-center p-2 bg-gray-800/30 rounded">
                      <p className="text-green-400 font-bold">{campaign.metrics.conversions}</p>
                      <p className="text-gray-400 text-xs">Conversions</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      <p>Target: {campaign.audience}</p>
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

                  {/* Budget Progress */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Budget Used</span>
                      <span>{((campaign.spent / campaign.budget) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full">
                      <div 
                        className="h-2 bg-gradient-to-r from-purple-500 to-teal-500 rounded-full"
                        style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'leads' && (
        <div className="space-y-6">
          {/* Search */}
          <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800/30 border border-gray-700/50 text-white placeholder-gray-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Leads List */}
          <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-400" />
                Lead Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredLeads.map((lead) => (
                  <div key={lead.id} className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-teal-500/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-white">{lead.name}</h4>
                        <p className="text-gray-400 text-sm">{lead.email}</p>
                        <p className="text-gray-500 text-xs">{lead.phone}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={`border ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </Badge>
                        <p className="text-teal-400 font-bold mt-1">${lead.estimatedValue}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Source</p>
                        <p className="text-white font-medium">{lead.source}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Lead Score</p>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-700 rounded-full">
                            <div 
                              className="h-2 bg-gradient-to-r from-purple-500 to-teal-500 rounded-full"
                              style={{ width: `${lead.score}%` }}
                            ></div>
                          </div>
                          <span className="text-purple-400 font-medium">{lead.score}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-400">Location</p>
                        <p className="text-white font-medium">{lead.location}</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-gray-400 text-sm">Services of Interest:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lead.interestedServices.map((service, index) => (
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

                    {lead.notes && (
                      <div className="mt-3 p-2 bg-gray-700/30 rounded text-sm">
                        <p className="text-gray-300">{lead.notes}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700/50">
                      <span className="text-gray-500 text-xs">Created: {lead.createdAt}</span>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30">
                          Convert
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-400 hover:bg-gray-700/50">
                          Contact
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'loyalty' && (
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-teal-400" />
              Loyalty Program Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Program Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                <p className="text-2xl font-bold text-purple-400">{loyaltyProgram.totalMembers.toLocaleString()}</p>
                <p className="text-gray-400 text-sm">Total Members</p>
              </div>
              <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                <p className="text-2xl font-bold text-teal-400">{loyaltyProgram.activeMembers.toLocaleString()}</p>
                <p className="text-gray-400 text-sm">Active Members</p>
              </div>
              <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                <p className="text-2xl font-bold text-green-400">{loyaltyProgram.pointsIssued.toLocaleString()}</p>
                <p className="text-gray-400 text-sm">Points Issued</p>
              </div>
              <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                <p className="text-2xl font-bold text-yellow-400">{loyaltyProgram.conversionRate}%</p>
                <p className="text-gray-400 text-sm">Engagement Rate</p>
              </div>
            </div>

            {/* Membership Tiers */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Membership Tiers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {loyaltyProgram.tiers.map((tier, index) => (
                  <div key={index} className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                    <h4 className="font-medium text-white mb-2">{tier.name}</h4>
                    <p className="text-gray-400 text-sm mb-3">Min Spend: ${tier.minSpend}+</p>
                    <div className="space-y-1">
                      {tier.benefits.map((benefit, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Star className="w-3 h-3 text-teal-400 fill-current" />
                          <span className="text-gray-300 text-sm">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'referrals' && (
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-purple-400" />
              Referral Program Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Referral Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                <p className="text-2xl font-bold text-purple-400">{referralProgram.totalReferrals}</p>
                <p className="text-gray-400 text-sm">Total Referrals</p>
              </div>
              <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                <p className="text-2xl font-bold text-teal-400">{referralProgram.successfulReferrals}</p>
                <p className="text-gray-400 text-sm">Successful</p>
              </div>
              <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                <p className="text-2xl font-bold text-green-400">{referralProgram.conversionRate}%</p>
                <p className="text-gray-400 text-sm">Conversion Rate</p>
              </div>
              <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                <p className="text-2xl font-bold text-yellow-400">${referralProgram.totalRewardsPaid.toLocaleString()}</p>
                <p className="text-gray-400 text-sm">Rewards Paid</p>
              </div>
            </div>

            {/* Program Details */}
            <div className="p-6 bg-gray-800/30 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">{referralProgram.name}</h3>
              <p className="text-gray-300 mb-4">{referralProgram.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Reward Amount</p>
                  <p className="text-teal-400 font-bold text-xl">${referralProgram.rewardAmount}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Program Type</p>
                  <p className="text-white font-medium">{referralProgram.type}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}