// Core entity types
export interface User {
  id: string;
  email: string;
  role: 'customer' | 'provider' | 'admin';
  profile: UserProfile;
  addresses: Address[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: Date;
  preferences: {
    notifications: NotificationPreferences;
    language: string;
    timezone: string;
  };
}

export interface Address {
  id: string;
  userId: string;
  type: 'home' | 'work' | 'other';
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  marketing: boolean;
}

// Service-related types
export interface Service {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePrice: number;
  duration: number; // in minutes
  isActive: boolean;
  addOns: ServiceAddOn[];
  requirements: string[];
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
  services: Service[];
}

export interface ServiceAddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  isRequired: boolean;
}

// Booking-related types
export interface Booking {
  id: string;
  customerId: string;
  providerId?: string;
  serviceId: string;
  status: BookingStatus;
  scheduledDate: Date;
  scheduledTime: string;
  estimatedDuration: number;
  address: Address;
  pricing: BookingPricing;
  addOns: BookingAddOn[];
  notes?: string;
  specialInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

export type BookingStatus = 
  | 'pending'
  | 'quoted'
  | 'confirmed'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface BookingPricing {
  basePrice: number;
  addOnTotal: number;
  subtotal: number;
  tax: number;
  total: number;
  promoCode?: string;
  discount?: number;
}

export interface BookingAddOn {
  id: string;
  addOnId: string;
  name: string;
  price: number;
  quantity: number;
}

// Provider-specific types
export interface Provider extends User {
  providerProfile: ProviderProfile;
}

export interface ProviderProfile {
  businessName?: string;
  bio: string;
  specializations: string[];
  serviceAreas: ServiceArea[];
  availability: ProviderAvailability;
  verification: ProviderVerification;
  stats: ProviderStats;
  bankingInfo?: BankingInfo;
  isOnline: boolean;
}

export interface ServiceArea {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  radius: number; // in miles
}

export interface ProviderAvailability {
  schedule: WeeklySchedule;
  timeOff: TimeOffPeriod[];
  isAvailable: boolean;
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  isAvailable: boolean;
  startTime?: string;
  endTime?: string;
  breaks: TimeSlot[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface TimeOffPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface ProviderVerification {
  isVerified: boolean;
  backgroundCheck: VerificationItem;
  insurance: VerificationItem;
  license: VerificationItem;
  identity: VerificationItem;
}

export interface VerificationItem {
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  documentUrl?: string;
  expiryDate?: Date;
  notes?: string;
}

export interface ProviderStats {
  totalJobs: number;
  completedJobs: number;
  rating: number;
  totalReviews: number;
  totalEarnings: number;
  joinDate: Date;
  lastActiveDate: Date;
}

export interface BankingInfo {
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
}

// Financial types
export interface Transaction {
  id: string;
  bookingId: string;
  customerId: string;
  providerId?: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  paymentMethod: PaymentMethod;
  processingFee: number;
  netAmount: number;
  description: string;
  createdAt: Date;
  processedAt?: Date;
}

export type TransactionType = 
  | 'payment'
  | 'refund'
  | 'payout'
  | 'fee'
  | 'adjustment';

export type TransactionStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'digital_wallet';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface PromoCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  validFrom: Date;
  validUntil: Date;
}

// Communication types
export interface ChatThread {
  id: string;
  bookingId: string;
  participants: string[]; // user IDs
  messages: ChatMessage[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  attachments?: MessageAttachment[];
  isRead: boolean;
  createdAt: Date;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'document';
  url: string;
  filename: string;
  size: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

export type NotificationType = 
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'provider_assigned'
  | 'job_started'
  | 'job_completed'
  | 'payment_processed'
  | 'review_received'
  | 'message_received'
  | 'system_announcement';

// Review types
export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number; // 1-5
  comment?: string;
  categories: ReviewCategory[];
  isPublic: boolean;
  response?: ReviewResponse;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewCategory {
  name: string;
  rating: number;
}

export interface ReviewResponse {
  content: string;
  createdAt: Date;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form types
export interface BookingFormData {
  serviceId: string;
  scheduledDate: Date;
  scheduledTime: string;
  addressId: string;
  addOns: string[];
  notes?: string;
  specialInstructions?: string;
}

export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface AddressFormData {
  type: 'home' | 'work' | 'other';
  street: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

// Utility types
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FilterOptions {
  search?: string;
  category?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
