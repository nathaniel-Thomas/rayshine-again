# RayShine Service Marketplace Platform

A comprehensive three-application marketplace ecosystem for service booking and management.

## Architecture

This monorepo contains three interconnected applications:

- **Customer Website** (`apps/customer-website`) - Desktop-first booking platform
- **Provider Portal** (`apps/provider-portal`) - Mobile-first PWA for service providers
- **Admin CRM** (`apps/admin-crm`) - Desktop-optimized management dashboard

## Tech Stack

- **Framework**: React 18+ with Vite
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand + React Query
- **Routing**: React Router DOM v6
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **Dates**: date-fns
- **Backend**: Designed for Supabase

## Design System

### Customer & Provider Apps (Claymorphism)
- Soft, heavily rounded corners (`rounded-2xl`, `rounded-3xl`)
- Light inner shadows + diffused outer shadows
- Light backgrounds (`bg-slate-100`, `bg-gray-50`)

### Admin CRM (Glassmorphism)
- Semi-transparent backgrounds with backdrop blur
- Subtle light borders for "lit edge" effect
- Gradient/abstract pattern backgrounds

### Color Palette
- Primary: `#2563eb` (Professional blue)
- Secondary: `#ea580c` (Warm orange)
- Success: `#16a34a` (Green)
- Warning: `#d97706` (Amber)
- Error: `#dc2626` (Red)

## Getting Started

### Installation
```bash
# Install root dependencies
npm install

# Install all app dependencies
npm run install:apps
```

### Development
```bash
# Run all applications
npm run dev

# Run individual applications
npm run dev:customer
npm run dev:provider
npm run dev:admin
```

### Build
```bash
npm run build
```

## Applications

### Environment Setup
Each application needs environment variables. Copy the `.env.example` files:
```bash
cp apps/customer-website/.env.example apps/customer-website/.env.local
cp apps/provider-portal/.env.example apps/provider-portal/.env.local
cp apps/admin-crm/.env.example apps/admin-crm/.env.local
```

### Customer Website (www.rayshine.com)
Desktop-first responsive design for service booking with claymorphism aesthetics.

**Key Features:**
- Multi-step booking wizard
- Service categories and add-ons
- Account dashboard with booking management
- Payment processing and history

### Provider Portal (portal.rayshine.com)
Mobile-first PWA with offline considerations for service providers.

**Key Features:**
- Bottom navigation optimized for thumb use
- Job management and earnings tracking
- Real-time availability toggle
- Location-based job matching

### Admin CRM (admin.rayshine.com)
Desktop-optimized internal operations tool with glassmorphism design.

**Key Features:**
- Comprehensive dashboard with KPIs
- User and provider management
- Booking and service administration
- Financial oversight and reporting

## Data Model

The platform manages:
- **Users**: Three roles (customer, provider, admin)
- **Services**: Categorized with pricing and add-ons
- **Bookings**: Full lifecycle management
- **Financial**: Transactions and payouts
- **Communication**: Chat and notifications
- **Reviews**: Bidirectional rating system

## Accessibility

All applications comply with WCAG 2.1 AA standards:
- Keyboard navigation support
- Screen reader optimization
- Color contrast validation
- Focus management
- Motion preferences respected
