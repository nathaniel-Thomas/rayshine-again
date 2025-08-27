import { z } from 'zod';

// User schemas
export const userProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
  dateOfBirth: z.date().optional(),
  preferences: z.object({
    notifications: z.object({
      email: z.boolean(),
      sms: z.boolean(),
      push: z.boolean(),
      marketing: z.boolean(),
    }),
    language: z.string().default('en'),
    timezone: z.string().default('America/New_York'),
  }),
});

export const addressSchema = z.object({
  type: z.enum(['home', 'work', 'other']),
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(5, 'Valid zip code is required'),
  isDefault: z.boolean().default(false),
});

// Booking schemas
export const bookingFormSchema = z.object({
  serviceId: z.string().min(1, 'Service selection is required'),
  scheduledDate: z.date({
    required_error: 'Please select a date',
  }),
  scheduledTime: z.string().min(1, 'Time selection is required'),
  addressId: z.string().min(1, 'Address is required'),
  addOns: z.array(z.string()).default([]),
  notes: z.string().optional(),
  specialInstructions: z.string().optional(),
});

export const contactFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
});

// Authentication schemas
export const signInSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signUpSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email is required'),
});

export const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
  token: z.string().min(1, 'Reset token is required'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Provider schemas
export const providerProfileSchema = z.object({
  businessName: z.string().optional(),
  bio: z.string().min(50, 'Bio must be at least 50 characters'),
  specializations: z.array(z.string()).min(1, 'At least one specialization is required'),
  serviceAreas: z.array(z.object({
    name: z.string(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    radius: z.number().min(1).max(50),
  })).min(1, 'At least one service area is required'),
});

export const bankingInfoSchema = z.object({
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  routingNumber: z.string().length(9, 'Routing number must be 9 digits'),
  accountNumber: z.string().min(4, 'Account number is required'),
  accountType: z.enum(['checking', 'savings']),
});

// Service schemas
export const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  basePrice: z.number().min(0, 'Price must be positive'),
  duration: z.number().min(15, 'Duration must be at least 15 minutes'),
  categoryId: z.string().min(1, 'Category is required'),
  requirements: z.array(z.string()).default([]),
  addOns: z.array(z.object({
    name: z.string(),
    description: z.string(),
    price: z.number().min(0),
    isRequired: z.boolean(),
  })).default([]),
});

// Review schemas
export const reviewSchema = z.object({
  rating: z.number().min(1).max(5, 'Rating must be between 1 and 5'),
  comment: z.string().min(10, 'Comment must be at least 10 characters').optional(),
  categories: z.array(z.object({
    name: z.string(),
    rating: z.number().min(1).max(5),
  })).default([]),
  isPublic: z.boolean().default(true),
});

// Chat schemas
export const chatMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty'),
  type: z.enum(['text', 'image', 'file', 'system']).default('text'),
});

// Filter schemas
export const filterOptionsSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// Promo code schema
export const promoCodeSchema = z.object({
  code: z.string().min(3, 'Promo code must be at least 3 characters'),
});

// Export all schemas
export const schemas = {
  userProfile: userProfileSchema,
  address: addressSchema,
  bookingForm: bookingFormSchema,
  contactForm: contactFormSchema,
  signIn: signInSchema,
  signUp: signUpSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  providerProfile: providerProfileSchema,
  bankingInfo: bankingInfoSchema,
  service: serviceSchema,
  review: reviewSchema,
  chatMessage: chatMessageSchema,
  filterOptions: filterOptionsSchema,
  promoCode: promoCodeSchema,
};
