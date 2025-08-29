# Rayshine Backend API

Backend API server for the Rayshine marketplace platform.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   - Copy `.env.example` to `.env`
   - Fill in your Supabase credentials and other environment variables

3. **Required Environment Variables:**
   ```env
   # Supabase
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # Server
   PORT=3001
   NODE_ENV=development
   
   # JWT
   JWT_SECRET=your_jwt_secret
   
   # Stripe (optional for payments)
   STRIPE_SECRET_KEY=your_stripe_secret_key
   ```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## API Endpoints

### Health Check
- `GET /` - API information
- `GET /api/health` - Health check

### Services
- `GET /api/services` - Get all services
- `GET /api/services/categories` - Get service categories
- `GET /api/services/:id` - Get service by ID

### Providers
- `GET /api/providers/search` - Search providers
- `GET /api/providers/:id` - Get provider by ID
- `PUT /api/providers/profile` - Update provider profile (auth required)
- `GET /api/providers/me/bookings` - Get provider bookings (auth required)

### Bookings
- `POST /api/bookings` - Create booking (auth required)
- `GET /api/bookings` - Get user bookings (auth required)
- `GET /api/bookings/:id` - Get booking by ID (auth required)
- `PATCH /api/bookings/:id/status` - Update booking status (auth required)

### PPS (Provider Performance Scoring)
- `POST /api/pps/calculate` - Calculate PPS scores (admin only)
- `GET /api/pps/provider/:providerId` - Get provider PPS score
- `GET /api/pps/rankings` - Get provider rankings (admin only)
- `GET /api/pps/my-score` - Get current provider's PPS score (provider auth required)

### Job Assignment System
- `POST /api/job-assignments/assign` - Assign job to provider(s) (admin only)
- `POST /api/job-assignments/:assignmentId/respond` - Provider responds to assignment (provider auth required)
- `GET /api/job-assignments` - Get job assignments (role-based access)
- `GET /api/job-assignments/:id` - Get job assignment by ID
- `GET /api/job-assignments/my-assignments/pending` - Get provider's pending assignments

### System Management
- `POST /api/expired-assignments/process` - Process expired assignments (admin only)
- `POST /api/expired-assignments/cron` - Cron job for processing expired assignments
- `GET /api/expired-assignments/cron/health` - Health check for cron endpoint

## Authentication

The API uses Supabase Auth. Include the JWT token in the Authorization header:

```
Authorization: Bearer your_jwt_token
```

## Database

The backend connects to your Supabase database using the schema you provided. Make sure all tables, RLS policies, and functions are set up correctly.

## Features

- ✅ Express.js server with TypeScript
- ✅ Supabase integration with Row Level Security
- ✅ JWT authentication middleware
- ✅ Input validation with Joi
- ✅ Error handling and logging
- ✅ CORS configuration
- ✅ Security headers with Helmet
- ✅ RESTful API design
- ✅ Booking management
- ✅ Provider search and management
- ✅ Service catalog
- ✅ **PPS (Provider Performance Scoring) System**
- ✅ **Automated Job Assignment with 7-minute response window**
- ✅ **Geographic service area filtering**
- ✅ **Performance metrics tracking with time decay**
- ✅ **Expired assignment handling**
- ✅ **Real-time notifications for job assignments**

## Architecture

```
src/
├── config/          # Configuration files (Supabase, etc.)
├── controllers/     # Route handlers
├── middleware/      # Authentication, validation, etc.
├── routes/          # Express route definitions
├── services/        # Business logic services
├── types/           # TypeScript type definitions
└── index.ts         # Main application entry point
```