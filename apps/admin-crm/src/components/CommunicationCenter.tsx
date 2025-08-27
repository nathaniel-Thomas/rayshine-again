import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  MessageSquare,
  Mail,
  Phone,
  Send,
  Search,
  Filter,
  Plus,
  Clock,
  TrendingUp,
  Users,
  Star,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export default function CommunicationCenter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [newMessage, setNewMessage] = useState('');

  const messages = [
    {
      id: "MSG-001",
      sender: "Sarah Johnson",
      senderEmail: "sarah.j@email.com",
      subject: "Question about upcoming booking",
      preview: "Hi, I wanted to confirm the time for my house cleaning service tomorrow...",
      fullMessage: "Hi, I wanted to confirm the time for my house cleaning service tomorrow. Also, I have a few questions about the supplies you'll be bringing. Could you please use eco-friendly products? Thanks!",
      time: "2 hours ago",
      status: "unread",
      priority: "normal",
      category: "booking",
    },
    {
      id: "MSG-002",
      sender: "Mike Chen",
      senderEmail: "m.chen@business.com",
      subject: "Feedback on lawn care service",
      preview: "The service was excellent! Maria did a fantastic job with the landscaping...",
      fullMessage: "The service was excellent! Maria did a fantastic job with the landscaping. I'm very pleased with the results and would like to schedule regular weekly maintenance. Could you help me set this up?",
      time: "5 hours ago",
      status: "read",
      priority: "normal",
      category: "feedback",
    },
    {
      id: "MSG-003",
      sender: "Emily Rodriguez",
      senderEmail: "emily.r@home.net",
      subject: "Service complaint - urgent",
      preview: "I'm very disappointed with today's cleaning service. The provider arrived late and...",
      fullMessage: "I'm very disappointed with today's cleaning service. The provider arrived late and didn't complete all the requested tasks. I'd like to discuss this and possibly get a partial refund. Please contact me as soon as possible.",
      time: "1 day ago",
      status: "read",
      priority: "high",
      category: "complaint",
    },
    {
      id: "MSG-004",
      sender: "David Wilson",
      senderEmail: "david.w@email.com",
      subject: "New service inquiry",
      preview: "I'm interested in your carpet cleaning services. Could you provide a quote for...",
      fullMessage: "I'm interested in your carpet cleaning services. Could you provide a quote for a 2-bedroom apartment? I'm also curious about your availability next week. Looking forward to hearing from you!",
      time: "2 days ago",
      status: "unread",
      priority: "normal",
      category: "inquiry",
    },
  ];

  const campaigns = [
    {
      id: "CAMP-001",
      name: "Spring Cleaning Special",
      type: "Email Campaign",
      status: "active",
      sent: 2450,
      opened: 1470,
      clicked: 294,
      conversions: 47,
      startDate: "2024-03-01",
    },
    {
      id: "CAMP-002",
      name: "Customer Feedback Survey",
      type: "SMS Campaign",
      status: "completed",
      sent: 890,
      opened: 756,
      clicked: 234,
      conversions: 89,
      startDate: "2024-02-15",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'unread':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'read':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'normal':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'low':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'complaint':
        return 'bg-red-500/20 text-red-400';
      case 'feedback':
        return 'bg-green-500/20 text-green-400';
      case 'inquiry':
        return 'bg-blue-500/20 text-blue-400';
      case 'booking':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (selectedMessage) {
    const message = messages.find(m => m.id === selectedMessage);
    
    return (
      <div className="space-y-6">
        {/* Message Detail Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setSelectedMessage(null)}
            variant="outline"
            className="border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
          >
            ← Back to Messages
          </Button>
          <div className="flex gap-2">
            <Button className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30">
              <Phone className="w-4 h-4 mr-2" />
              Call Customer
            </Button>
            <Button className="bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30">
              <Mail className="w-4 h-4 mr-2" />
              Mark Resolved
            </Button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{message.subject}</span>
                  <div className="flex gap-2">
                    <Badge className={`border ${getPriorityColor(message.priority)}`}>
                      {message.priority}
                    </Badge>
                    <Badge className={`border ${getStatusColor(message.status)}`}>
                      {message.status}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Customer Info */}
                <div className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-teal-500 text-white">
                      {message.sender.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium text-white">{message.sender}</h4>
                    <p className="text-gray-400 text-sm">{message.senderEmail}</p>
                    <p className="text-gray-500 text-xs">{message.time}</p>
                  </div>
                  <div className="ml-auto">
                    <div className={`px-2 py-1 rounded text-xs ${getCategoryColor(message.category)}`}>
                      {message.category}
                    </div>
                  </div>
                </div>

                {/* Message Content */}
                <div className="p-4 bg-gray-800/30 rounded-lg">
                  <p className="text-gray-300 leading-relaxed">{message.fullMessage}</p>
                </div>

                {/* Reply Section */}
                <div className="border-t border-gray-700/50 pt-6">
                  <h4 className="font-medium text-gray-300 mb-3">Reply</h4>
                  <div className="space-y-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your response..."
                      rows={4}
                      className="w-full p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 resize-none"
                    />
                    <div className="flex justify-between">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-gray-700 text-gray-300">
                          Template
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-700 text-gray-300">
                          Attach
                        </Button>
                      </div>
                      <Button className="bg-gradient-to-r from-purple-500 to-teal-500">
                        <Send className="w-4 h-4 mr-2" />
                        Send Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
              <CardHeader>
                <CardTitle className="text-sm">Customer History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Bookings:</span>
                    <span className="text-white">18</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Lifetime Value:</span>
                    <span className="text-teal-400 font-medium">$2,450</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Customer Since:</span>
                    <span className="text-white">Mar 2023</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Rating:</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      <span className="text-yellow-400">4.9</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-700/50">
                  <Users className="w-4 h-4 mr-2" />
                  View Customer Profile
                </Button>
                <Button className="w-full bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-700/50">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message History
                </Button>
                <Button className="w-full bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-700/50">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Create Booking
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
      {/* Communication Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Communication Center</h1>
          <p className="text-gray-400 mt-1">Manage messages, notifications, and customer communications</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white">
          <MessageSquare className="w-4 h-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* Communication Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Unread Messages</p>
                <p className="text-2xl font-bold text-white">23</p>
                <p className="text-yellow-400 text-sm">3 high priority</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Active Campaigns</p>
                <p className="text-2xl font-bold text-white">5</p>
                <p className="text-teal-400 text-sm">2,450 sent today</p>
              </div>
              <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-teal-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Response Rate</p>
                <p className="text-2xl font-bold text-white">94%</p>
                <p className="text-green-400 text-sm">Above target</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Avg Response Time</p>
                <p className="text-2xl font-bold text-white">2.3h</p>
                <p className="text-green-400 text-sm">Excellent</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages */}
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              Recent Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800/30 border border-gray-700/50 text-white placeholder-gray-500"
              />
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages
                .filter(message => 
                  message.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  message.subject.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((message) => (
                <div
                  key={message.id}
                  onClick={() => setSelectedMessage(message.id)}
                  className="flex items-start gap-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-purple-500/50 transition-colors cursor-pointer"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-teal-500 text-white text-sm">
                      {message.sender.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-200 truncate">{message.sender}</h4>
                      <div className="flex gap-1">
                        {message.priority === 'high' && (
                          <AlertCircle className="w-3 h-3 text-red-400" />
                        )}
                        <span className="text-xs text-gray-500">{message.time}</span>
                      </div>
                    </div>
                    <p className="font-medium text-white text-sm mb-1">{message.subject}</p>
                    <p className="text-gray-400 text-sm truncate">{message.preview}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`border text-xs ${getStatusColor(message.status)}`}>
                        {message.status}
                      </Badge>
                      <div className={`px-1.5 py-0.5 rounded text-xs ${getCategoryColor(message.category)}`}>
                        {message.category}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-teal-400" />
              Marketing Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-200">{campaign.name}</h4>
                      <p className="text-sm text-gray-400">{campaign.type}</p>
                    </div>
                    <Badge variant="secondary" className={
                      campaign.status === 'active' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }>
                      {campaign.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Sent</p>
                      <p className="font-bold text-white">{campaign.sent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Opened</p>
                      <p className="font-bold text-teal-400">
                        {campaign.opened.toLocaleString()} ({((campaign.opened / campaign.sent) * 100).toFixed(1)}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Clicked</p>
                      <p className="font-bold text-purple-400">
                        {campaign.clicked.toLocaleString()} ({((campaign.clicked / campaign.opened) * 100).toFixed(1)}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Conversions</p>
                      <p className="font-bold text-green-400">
                        {campaign.conversions} ({((campaign.conversions / campaign.clicked) * 100).toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}