import React, { useEffect, useState } from 'react';
import { useWebSocket } from './WebSocketProvider';

export interface JobAssignment {
  id: number;
  booking_id: number;
  provider_id: string;
  assigned_at: string;
  response_deadline: string;
  response_status: 'pending' | 'accepted' | 'declined' | 'expired';
  booking_details: {
    service_type: string;
    customer_name: string;
    location: string;
    scheduled_date: string;
    estimated_duration: number;
    description?: string;
  };
}

interface JobAssignmentNotificationProps {
  onJobAssignmentReceived?: (assignment: JobAssignment) => void;
  onAutoDecline?: (assignmentId: number) => void;
  autoDeclineAfter?: number; // seconds, default 420 (7 minutes)
  showNotification?: boolean;
  className?: string;
}

export function JobAssignmentNotification({
  onJobAssignmentReceived,
  onAutoDecline,
  autoDeclineAfter = 420,
  showNotification = true,
  className = ''
}: JobAssignmentNotificationProps) {
  const { respondToJobAssignment } = useWebSocket();
  const [activeAssignment, setActiveAssignment] = useState<JobAssignment | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (activeAssignment && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Auto-decline when time expires
            respondToJobAssignment(activeAssignment.id, 'decline', 'Response time expired');
            onAutoDecline?.(activeAssignment.id);
            setActiveAssignment(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeAssignment, timeRemaining, respondToJobAssignment, onAutoDecline]);

  const handleJobAssignment = (assignment: JobAssignment) => {
    setActiveAssignment(assignment);
    setTimeRemaining(autoDeclineAfter);
    onJobAssignmentReceived?.(assignment);
  };

  const handleAccept = () => {
    if (activeAssignment) {
      respondToJobAssignment(activeAssignment.id, 'accept');
      setActiveAssignment(null);
      setTimeRemaining(0);
    }
  };

  const handleDecline = (reason?: string) => {
    if (activeAssignment) {
      respondToJobAssignment(activeAssignment.id, 'decline', reason || 'Declined by provider');
      setActiveAssignment(null);
      setTimeRemaining(0);
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Register WebSocket callback (this would typically be done in a parent component)
  useEffect(() => {
    // This is a placeholder - in practice, you'd set up the WebSocket callback
    // in a parent component or through a global event system
  }, []);

  if (!showNotification || !activeAssignment) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 bg-white rounded-lg shadow-lg border-l-4 border-blue-500 p-6 max-w-md z-50 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">New Job Assignment</h3>
        <div className="text-sm text-red-600 font-medium">
          Time remaining: {formatTimeRemaining(timeRemaining)}
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <div>
          <span className="font-medium">Service:</span> {activeAssignment.booking_details.service_type}
        </div>
        <div>
          <span className="font-medium">Customer:</span> {activeAssignment.booking_details.customer_name}
        </div>
        <div>
          <span className="font-medium">Location:</span> {activeAssignment.booking_details.location}
        </div>
        <div>
          <span className="font-medium">Date:</span> {new Date(activeAssignment.booking_details.scheduled_date).toLocaleDateString()}
        </div>
        <div>
          <span className="font-medium">Duration:</span> {activeAssignment.booking_details.estimated_duration} minutes
        </div>
        {activeAssignment.booking_details.description && (
          <div>
            <span className="font-medium">Description:</span> {activeAssignment.booking_details.description}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleAccept}
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 font-medium"
        >
          Accept Job
        </button>
        <button
          onClick={() => handleDecline()}
          className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 font-medium"
        >
          Decline
        </button>
      </div>
    </div>
  );
}

export default JobAssignmentNotification;