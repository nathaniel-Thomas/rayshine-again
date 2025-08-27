import { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useJobStore } from '@/store/jobs';
import { CalendarDays, Clock, Plus, Settings } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    'en-US': enUS,
  },
});

const customStyles = {
  style: {
    height: '500px',
    backgroundColor: 'white',
    borderRadius: '16px',
    border: 'none',
    fontFamily: 'inherit',
  }
};

export function ScheduleTab() {
  const { upcomingJobs } = useJobStore();
  const [view, setView] = useState<'week' | 'month'>('week');

  // Transform jobs into calendar events
  const events = upcomingJobs.map(job => ({
    id: job.id,
    title: `${job.serviceType} - ${job.customerName}`,
    start: job.scheduledTime,
    end: new Date(job.scheduledTime.getTime() + job.duration * 60000),
    resource: job,
  }));

  const eventStyleGetter = (event: any) => {
    const job = event.resource;
    let backgroundColor = '#3b82f6';
    
    switch (job.status) {
      case 'completed':
        backgroundColor = '#10b981';
        break;
      case 'in_progress':
        backgroundColor = '#f59e0b';
        break;
      case 'cancelled':
        backgroundColor = '#ef4444';
        break;
      default:
        backgroundColor = '#3b82f6';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '8px',
        border: 'none',
        color: 'white',
        fontSize: '12px',
        padding: '2px 6px',
      }
    };
  };

  const CustomEvent = ({ event }: any) => {
    const job = event.resource;
    return (
      <div className="p-1">
        <div className="font-medium text-xs truncate">{job.customerName}</div>
        <div className="text-xs opacity-90 truncate">{job.serviceType}</div>
      </div>
    );
  };

  return (
    <div className="pb-24 px-4 pt-6 space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays size={24} />
            Schedule
          </h1>
          <p className="text-gray-600">Manage your availability and jobs</p>
        </div>
        <Button size="sm" variant="outline">
          <Settings size={16} />
        </Button>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setView('week')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              view === 'week'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView('month')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              view === 'month'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            Month
          </button>
        </div>
        
        <Button size="sm" className="flex items-center gap-2">
          <Plus size={16} />
          Block Time
        </Button>
      </div>

      {/* Calendar */}
      <Card className="p-4 overflow-hidden">
        <div className="calendar-container">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={setView}
            views={['week', 'month']}
            defaultDate={new Date()}
            eventPropGetter={eventStyleGetter}
            components={{
              event: CustomEvent,
            }}
            {...customStyles}
          />
        </div>
      </Card>

      {/* Availability Controls */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock size={18} />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12">
            Set Regular Hours
          </Button>
          <Button variant="outline" className="h-12">
            Block Tomorrow
          </Button>
          <Button variant="outline" className="h-12">
            Add Break
          </Button>
          <Button variant="outline" className="h-12">
            View Blocked Time
          </Button>
        </div>
      </Card>

      {/* Status Legend */}
      <Card className="p-4">
        <h4 className="font-medium mb-3">Status Legend</h4>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-sm text-gray-600">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-600">Cancelled</span>
          </div>
        </div>
      </Card>
    </div>
  );
}