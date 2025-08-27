import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useJobStore } from '@/store/jobs';
import { formatCurrency, formatTime } from '@/lib/utils';
import type { JobDetails } from '@/types';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Star, 
  Phone, 
  Navigation,
  MessageCircle,
  Camera,
  CheckCircle2,
  Circle,
  Send,
  User
} from 'lucide-react';
import { format } from 'date-fns';

interface JobDetailsViewProps {
  job: JobDetails;
  onBack: () => void;
}

export function JobDetailsView({ job, onBack }: JobDetailsViewProps) {
  const { updateChecklist, addChatMessage } = useJobStore();
  const [messageText, setMessageText] = useState('');
  const [activeSection, setActiveSection] = useState<'details' | 'chat' | 'checklist'>('details');

  const handleChecklistToggle = (itemId: string, completed: boolean) => {
    updateChecklist(job.id, itemId, completed);
  };

  const handleSendMessage = () => {
    if (messageText.trim()) {
      addChatMessage(job.id, {
        senderId: '1',
        senderName: 'Sam Wilson',
        content: messageText.trim(),
        type: 'text',
      });
      setMessageText('');
    }
  };

  const completedTasks = job.checklist.filter(item => item.completed).length;
  const totalTasks = job.checklist.length;

  return (
    <div className="pb-24 px-4 pt-6 space-y-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onBack}
          className="px-3"
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Job Details</h1>
          <p className="text-sm text-gray-600">
            {format(job.scheduledTime, 'MMM d, yyyy')} at {formatTime(job.scheduledTime)}
          </p>
        </div>
        <Badge variant={job.status === 'in_progress' ? 'warning' : 'default'}>
          {job.status === 'in_progress' ? 'In Progress' : 'Scheduled'}
        </Badge>
      </div>

      {/* Customer Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <User size={24} className="text-gray-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{job.customerName}</h3>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Star size={14} className="fill-current text-yellow-400" />
                  <span>{job.customerRating} rating</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(job.price)}</p>
              <p className="text-sm text-gray-500">{job.duration}min job</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Location</p>
                <p className="text-sm text-gray-600">{job.address}</p>
                {job.distance && (
                  <p className="text-sm text-blue-600">{job.distance} away</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock size={16} className="text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Service</p>
                <p className="text-sm text-gray-600">{job.serviceType}</p>
              </div>
            </div>

            {job.specialInstructions && (
              <div className="p-3 bg-blue-50 rounded-xl">
                <p className="font-medium text-blue-900 mb-1">Special Instructions</p>
                <p className="text-sm text-blue-700">{job.specialInstructions}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button size="sm" className="flex-1">
              <Navigation size={16} className="mr-2" />
              Directions
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <Phone size={16} className="mr-2" />
              Call
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {[
          { key: 'details', label: 'Details' },
          { key: 'chat', label: `Chat ${job.chatMessages.length > 0 ? `(${job.chatMessages.length})` : ''}` },
          { key: 'checklist', label: `Tasks ${totalTasks > 0 ? `(${completedTasks}/${totalTasks})` : ''}` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key as any)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeSection === key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content Sections */}
      {activeSection === 'details' && (
        <Card>
          <CardHeader>
            <CardTitle>Job Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full h-12 bg-green-600 hover:bg-green-700">
              <Navigation size={18} className="mr-2" />
              I'm on my way
            </Button>
            <Button variant="outline" className="w-full h-12">
              <Camera size={18} className="mr-2" />
              Take Photos
            </Button>
            <Button variant="outline" className="w-full h-12">
              Mark as Complete
            </Button>
          </CardContent>
        </Card>
      )}

      {activeSection === 'chat' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle size={18} />
              Chat with Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Messages */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {job.chatMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No messages yet</p>
                  <p className="text-sm">Start a conversation with your customer</p>
                </div>
              ) : (
                job.chatMessages.map((message) => {
                  const isFromMe = message.senderId === '1';
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs p-3 rounded-xl ${
                          isFromMe
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${isFromMe ? 'text-blue-100' : 'text-gray-500'}`}>
                          {format(message.timestamp, 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button 
                size="sm" 
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                className="px-3"
              >
                <Send size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === 'checklist' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} />
                Task Checklist
              </div>
              <Badge variant="outline">
                {completedTasks}/{totalTasks} complete
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {job.checklist.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No tasks defined</p>
                <p className="text-sm">Complete the job according to customer requirements</p>
              </div>
            ) : (
              job.checklist.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                    item.completed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => handleChecklistToggle(item.id, !item.completed)}
                    className="mt-0.5 text-gray-400 hover:text-green-600 transition-colors"
                  >
                    {item.completed ? (
                      <CheckCircle2 size={20} className="text-green-600" />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        item.completed
                          ? 'text-green-700 line-through'
                          : 'text-gray-900'
                      }`}
                    >
                      {item.description}
                    </p>
                    {item.required && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {totalTasks > 0 && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-600">
                    {Math.round((completedTasks / totalTasks) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}