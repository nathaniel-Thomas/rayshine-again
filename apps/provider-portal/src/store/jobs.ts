import { create } from 'zustand';
import type { JobDetails, ChecklistItem, ChatMessage } from '@/types';
import { addHours, addDays, startOfDay } from 'date-fns';

interface JobStore {
  activeJob: JobDetails | null;
  upcomingJobs: JobDetails[];
  availableJobs: JobDetails[];
  setActiveJob: (job: JobDetails | null) => void;
  updateJobProgress: (jobId: string, updates: Partial<JobDetails>) => void;
  addChatMessage: (jobId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateChecklist: (jobId: string, itemId: string, completed: boolean) => void;
}

// Mock data
const createMockJobs = (): { upcoming: JobDetails[], available: JobDetails[] } => {
  const now = new Date();
  
  const upcomingJobs: JobDetails[] = [
    {
      id: '1',
      customerId: 'c1',
      customerName: 'Emily Johnson',
      customerRating: 4.9,
      serviceType: 'House Cleaning',
      address: '123 Oak Street, Downtown',
      scheduledTime: addHours(now, 2),
      duration: 120,
      price: 85,
      status: 'accepted',
      specialInstructions: 'Please focus on the kitchen and bathrooms. Key is under the mat.',
      distance: '1.2 miles',
      checklist: [
        { id: 'c1', description: 'Clean all bathrooms', completed: false, required: true },
        { id: 'c2', description: 'Vacuum all carpets', completed: false, required: true },
        { id: 'c3', description: 'Kitchen deep clean', completed: false, required: true },
        { id: 'c4', description: 'Take before/after photos', completed: false, required: false },
      ],
      chatMessages: [
        {
          id: 'm1',
          senderId: 'c1',
          senderName: 'Emily Johnson',
          content: 'Hi! Looking forward to the cleaning today. The key is under the front door mat.',
          timestamp: addHours(now, -1),
          type: 'text',
        },
        {
          id: 'm2',
          senderId: '1',
          senderName: 'Sam Wilson',
          content: 'Perfect! I\'ll be there right on time. Thank you!',
          timestamp: addHours(now, -0.5),
          type: 'text',
        },
      ],
      beforePhotos: [],
      afterPhotos: [],
    },
    {
      id: '2',
      customerId: 'c2',
      customerName: 'Michael Chen',
      customerRating: 4.7,
      serviceType: 'Handyman Services',
      address: '456 Pine Avenue, Midtown',
      scheduledTime: addDays(now, 1),
      duration: 90,
      price: 120,
      status: 'accepted',
      distance: '0.8 miles',
      checklist: [
        { id: 'c5', description: 'Fix leaky faucet', completed: false, required: true },
        { id: 'c6', description: 'Install new light fixture', completed: false, required: true },
        { id: 'c7', description: 'Patch wall holes', completed: false, required: true },
      ],
      chatMessages: [],
      beforePhotos: [],
      afterPhotos: [],
    },
  ];

  const availableJobs: JobDetails[] = [
    {
      id: '3',
      customerId: 'c3',
      customerName: 'Sarah Davis',
      customerRating: 4.6,
      serviceType: 'Garden Maintenance',
      address: '789 Maple Drive, Suburb',
      scheduledTime: addDays(now, 2),
      duration: 180,
      price: 95,
      status: 'available',
      distance: '2.1 miles',
      checklist: [
        { id: 'c8', description: 'Mow lawn', completed: false, required: true },
        { id: 'c9', description: 'Trim hedges', completed: false, required: true },
        { id: 'c10', description: 'Weed flower beds', completed: false, required: true },
      ],
      chatMessages: [],
      beforePhotos: [],
      afterPhotos: [],
    },
  ];

  return { upcoming: upcomingJobs, available: availableJobs };
};

export const useJobStore = create<JobStore>((set, get) => {
  const mockJobs = createMockJobs();
  
  return {
    activeJob: null,
    upcomingJobs: mockJobs.upcoming,
    availableJobs: mockJobs.available,
    setActiveJob: (job) => set({ activeJob: job }),
    updateJobProgress: (jobId, updates) => {
      set((state) => ({
        upcomingJobs: state.upcomingJobs.map((job) =>
          job.id === jobId ? { ...job, ...updates } : job
        ),
        activeJob: state.activeJob?.id === jobId 
          ? { ...state.activeJob, ...updates }
          : state.activeJob,
      }));
    },
    addChatMessage: (jobId, message) => {
      const newMessage: ChatMessage = {
        ...message,
        id: Date.now().toString(),
        timestamp: new Date(),
      };
      
      set((state) => ({
        upcomingJobs: state.upcomingJobs.map((job) =>
          job.id === jobId
            ? { ...job, chatMessages: [...job.chatMessages, newMessage] }
            : job
        ),
        activeJob: state.activeJob?.id === jobId
          ? { ...state.activeJob, chatMessages: [...state.activeJob.chatMessages, newMessage] }
          : state.activeJob,
      }));
    },
    updateChecklist: (jobId, itemId, completed) => {
      set((state) => ({
        upcomingJobs: state.upcomingJobs.map((job) =>
          job.id === jobId
            ? {
                ...job,
                checklist: job.checklist.map((item) =>
                  item.id === itemId ? { ...item, completed } : item
                ),
              }
            : job
        ),
        activeJob: state.activeJob?.id === jobId
          ? {
              ...state.activeJob,
              checklist: state.activeJob.checklist.map((item) =>
                item.id === itemId ? { ...item, completed } : item
              ),
            }
          : state.activeJob,
      }));
    },
  };
});