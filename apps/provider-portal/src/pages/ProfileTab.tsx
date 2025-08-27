import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/store/auth';
import { formatCurrency } from '@/lib/utils';
import { 
  User, 
  Star, 
  TrendingUp, 
  Award,
  Share,
  Settings,
  HelpCircle,
  LogOut,
  Phone,
  Mail,
  Calendar,
  Target,
  Users,
  Gift
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from 'recharts';

// Mock performance data
const performanceData = {
  acceptanceRate: 94,
  onTimeRate: 98,
  completionRate: 99,
  customerRating: 4.8,
  totalJobs: 127,
  totalEarnings: 8450,
};

const ratingTrend = [
  { month: 'Jul', rating: 4.6 },
  { month: 'Aug', rating: 4.7 },
  { month: 'Sep', rating: 4.7 },
  { month: 'Oct', rating: 4.8 },
  { month: 'Nov', rating: 4.8 },
  { month: 'Dec', rating: 4.8 },
];

export function ProfileTab() {
  const { user, signOut } = useAuthStore();

  if (!user) return null;

  return (
    <div className="pb-24 px-4 pt-6 space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600">Manage your account and performance</p>
        </div>
        <Button size="sm" variant="outline">
          <Settings size={16} />
        </Button>
      </div>

      {/* Profile Card */}
      <Card className="bg-gradient-to-r from-blue-600 to-teal-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt="Profile" 
                className="w-16 h-16 rounded-full border-2 border-white/20"
              />
            ) : (
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <User size={32} />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold">{user.firstName} {user.lastName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Star size={16} className="fill-current" />
                <span className="font-medium">{user.rating} rating</span>
                <span className="text-white/70">•</span>
                <span className="text-white/70">{performanceData.totalJobs} jobs</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{formatCurrency(performanceData.totalEarnings)}</p>
              <p className="text-white/80 text-sm">Total Earned</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-lg font-bold">
                  {user.isOnline ? 'Online' : 'Offline'}
                </span>
                <Switch checked={user.isOnline} />
              </div>
              <p className="text-white/80 text-sm">Availability</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={18} />
            Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <p className="text-2xl font-bold text-green-700">{performanceData.acceptanceRate}%</p>
              <p className="text-sm text-green-600">Acceptance Rate</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-2xl font-bold text-blue-700">{performanceData.onTimeRate}%</p>
              <p className="text-sm text-blue-600">On-Time Rate</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <p className="text-2xl font-bold text-purple-700">{performanceData.completionRate}%</p>
              <p className="text-sm text-purple-600">Completion Rate</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-xl">
              <p className="text-2xl font-bold text-orange-700">{performanceData.customerRating}</p>
              <p className="text-sm text-orange-600">Avg Rating</p>
            </div>
          </div>

          {/* Rating Trend */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Rating Trend (6 months)</h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ratingTrend}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis domain={[4.0, 5.0]} hide />
                  <Line 
                    type="monotone" 
                    dataKey="rating" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award size={18} />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star size={16} className="text-white fill-current" />
              </div>
              <p className="font-medium text-yellow-700">Top Rated</p>
              <p className="text-xs text-yellow-600">4.8+ rating</p>
            </div>
            <div className="text-center p-3 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border border-green-200">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Target size={16} className="text-white" />
              </div>
              <p className="font-medium text-green-700">Reliable</p>
              <p className="text-xs text-green-600">98% on-time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Program */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift size={18} />
            Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-purple-900">Your Referral Code</span>
              <Badge variant="outline" className="bg-white">3 referrals</Badge>
            </div>
            <div className="bg-white p-3 rounded-lg border-2 border-dashed border-purple-300 mb-3">
              <p className="text-center text-lg font-mono font-bold text-purple-700">SAM-REF-2024</p>
            </div>
            <p className="text-sm text-purple-600 mb-3">
              Earn $25 for each provider you refer who completes 5 jobs
            </p>
            <Button className="w-full bg-purple-600 hover:bg-purple-700">
              <Share size={16} className="mr-2" />
              Share Code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-gray-400" />
            <span className="text-gray-900">{user.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-gray-400" />
            <span className="text-gray-900">{user.phone}</span>
          </div>
        </CardContent>
      </Card>

      {/* Support & Settings */}
      <div className="space-y-3">
        <Card>
          <CardContent className="p-4">
            <Button variant="ghost" className="w-full justify-start h-12">
              <HelpCircle size={18} className="mr-3" />
              Help & Support
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Button 
              variant="ghost" 
              className="w-full justify-start h-12 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={signOut}
            >
              <LogOut size={18} className="mr-3" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}