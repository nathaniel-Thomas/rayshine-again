import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { useJobStore } from '@/store/jobs';
import { formatCurrency, formatTime } from '@/lib/utils';
import { 
  MapPin, 
  Clock, 
  Star, 
  TrendingUp, 
  Calendar,
  Briefcase,
  CheckCircle2,
  Phone,
  Navigation
} from 'lucide-react';
import { format } from 'date-fns';

export function DashboardTab() {
  const { user } = useAuthStore();
  const { upcomingJobs, availableJobs } = useJobStore();

  const todaysJobs = upcomingJobs.filter(job => 
    format(job.scheduledTime, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  const todaysEarnings = todaysJobs.reduce((total, job) => total + job.price, 0);
  const completedJobs = upcomingJobs.filter(job => job.status === 'completed').length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="pb-24 px-4 pt-6 space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {user?.firstName}
          </h1>
          <p className="text-gray-600">Ready to make today great?</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {user?.isOnline ? 'Online' : 'Offline'}
            </p>
            <p className="text-xs text-gray-500">Availability</p>
          </div>
          <Switch 
            checked={user?.isOnline} 
            aria-label="Toggle availability status"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center w-8 h-8 bg-green-600 rounded-full mx-auto mb-2">
              <TrendingUp size={16} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(todaysEarnings)}</p>
            <p className="text-xs text-green-600">Today's Earnings</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full mx-auto mb-2">
              <Calendar size={16} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-blue-700">{todaysJobs.length}</p>
            <p className="text-xs text-blue-600">Upcoming Jobs</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center w-8 h-8 bg-purple-600 rounded-full mx-auto mb-2">
              <CheckCircle2 size={16} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-purple-700">{completedJobs}</p>
            <p className="text-xs text-purple-600">Completed Jobs</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar size={20} />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {todaysJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No jobs scheduled for today</p>
              <p className="text-sm">Check available jobs to book more work</p>
            </div>
          ) : (
            todaysJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {job.serviceType}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {formatTime(job.scheduledTime)}
                    </Badge>
                  </div>
                  <p className="font-medium text-gray-900">{job.customerName}</p>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin size={14} />
                    <span className="truncate">{job.address}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatCurrency(job.price)}</p>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Star size={12} className="fill-current" />
                    <span>{job.customerRating}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Available Jobs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase size={20} />
              Available Jobs
            </CardTitle>
            <Badge variant="secondary">{availableJobs.length} available</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {availableJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No available jobs right now</p>
              <p className="text-sm">New jobs will appear here automatically</p>
            </div>
          ) : (
            availableJobs.slice(0, 2).map((job) => (
              <div key={job.id} className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-600">{job.serviceType}</Badge>
                      {job.distance && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin size={14} />
                          <span>{job.distance}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900">{job.customerName}</h3>
                    <p className="text-sm text-gray-600 truncate">{job.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{formatCurrency(job.price)}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock size={12} />
                      <span>{job.duration}min</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    Accept Job
                  </Button>
                  <Button size="sm" variant="outline" className="px-3">
                    <Navigation size={16} />
                  </Button>
                  <Button size="sm" variant="outline" className="px-3">
                    <Phone size={16} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}