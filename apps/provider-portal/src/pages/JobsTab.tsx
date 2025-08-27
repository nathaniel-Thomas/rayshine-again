import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useJobStore } from '@/store/jobs';
import { formatCurrency, formatTime } from '@/lib/utils';
import { 
  Search, 
  MapPin, 
  Clock, 
  Star, 
  Phone, 
  Navigation,
  ArrowLeft,
  MessageCircle,
  Camera,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { JobDetailsView } from '@/components/JobDetailsView';

export function JobsTab() {
  const { upcomingJobs, availableJobs, activeJob, setActiveJob } = useJobStore();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'available'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  const currentJobs = activeTab === 'upcoming' ? upcomingJobs : availableJobs;
  const filteredJobs = currentJobs.filter(job =>
    job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (activeJob) {
    return <JobDetailsView job={activeJob} onBack={() => setActiveJob(null)} />;
  }

  return (
    <div className="pb-24 px-4 pt-6 space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <p className="text-gray-600">Manage your work schedule</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-3 text-gray-400" />
        <Input
          placeholder="Search jobs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12"
        />
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'upcoming'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600'
          }`}
        >
          Upcoming ({upcomingJobs.length})
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'available'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600'
          }`}
        >
          Available ({availableJobs.length})
        </button>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {activeTab === 'upcoming' ? (
                  <Clock className="w-8 h-8 text-gray-400" />
                ) : (
                  <Search className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <h3 className="font-medium text-gray-900 mb-2">
                {searchQuery 
                  ? 'No jobs match your search'
                  : `No ${activeTab} jobs`
                }
              </h3>
              <p className="text-sm text-gray-500">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : activeTab === 'upcoming' 
                    ? 'New job assignments will appear here'
                    : 'Check back later for new opportunities'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map((job) => (
            <Card 
              key={job.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveJob(job)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant={activeTab === 'upcoming' ? 'default' : 'outline'}
                        className={activeTab === 'upcoming' ? 'bg-blue-600' : ''}
                      >
                        {job.serviceType}
                      </Badge>
                      {job.status === 'in_progress' && (
                        <Badge variant="warning">In Progress</Badge>
                      )}
                      {job.distance && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin size={12} />
                          <span>{job.distance}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{job.customerName}</h3>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                      <MapPin size={14} />
                      <span className="truncate">{job.address}</span>
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{formatTime(job.scheduledTime)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star size={14} className="fill-current text-yellow-400" />
                        <span>{job.customerRating}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600 mb-1">
                      {formatCurrency(job.price)}
                    </p>
                    <p className="text-sm text-gray-500">{job.duration}min</p>
                  </div>
                </div>

                {activeTab === 'upcoming' ? (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveJob(job);
                      }}
                    >
                      <MessageCircle size={16} className="mr-2" />
                      Details
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="px-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Navigation size={16} />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="px-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone size={16} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Accept Job
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="px-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Navigation size={16} />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}