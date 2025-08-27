export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  rating: number;
  isOnline: boolean;
  phone: string;
}

export interface JobDetails {
  id: string;
  customerId: string;
  customerName: string;
  customerRating: number;
  serviceType: string;
  address: string;
  scheduledTime: Date;
  duration: number; // minutes
  price: number;
  status: JobStatus;
  checklist: ChecklistItem[];
  chatMessages: ChatMessage[];
  beforePhotos: string[];
  afterPhotos: string[];
  specialInstructions?: string;
  distance?: string;
}

export type JobStatus = 'available' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface ChecklistItem {
  id: string;
  description: string;
  completed: boolean;
  required: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system';
}

export interface Expense {
  id: string;
  date: Date;
  amount: number;
  category: ExpenseCategory;
  description: string;
  receiptUrl?: string;
}

export type ExpenseCategory = 'gas' | 'supplies' | 'equipment' | 'marketing' | 'other';

export interface PayoutBreakdown {
  jobId: string;
  basePay: number;
  tips: number;
  bonuses: number;
  platformFees: number;
  total: number;
  date: Date;
}

export interface PerformanceMetrics {
  acceptanceRate: number;
  onTimeRate: number;
  completionRate: number;
  customerRating: number;
  totalJobs: number;
  totalEarnings: number;
}