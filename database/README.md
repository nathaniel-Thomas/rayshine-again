# Database Setup Guide

This guide will help you set up the complete Rayshine marketplace database with PPS (Provider Performance Scoring) extensions.

## Prerequisites

1. **Supabase Project**: You should have a Supabase project created
2. **PostGIS Extension**: Ensure PostGIS is enabled for geographic features
3. **Admin Access**: You need admin access to your Supabase project

## Setup Order

Execute the SQL files in this exact order:

### 1. Core Database Schema
First, execute the main database schema that was provided by Claude chat. This includes all the core tables, RLS policies, and triggers.

### 2. PPS Extensions
Then execute the PPS extensions:

```sql
-- Execute the PPS extensions SQL file
\i pps-extensions.sql
```

## Manual Setup Steps

### Step 1: Enable PostGIS Extension

```sql
CREATE EXTENSION IF NOT EXISTS "postgis";
```

### Step 2: Verify Core Tables

Make sure these core tables exist before running PPS extensions:
- `user_profiles`
- `providers`  
- `bookings`
- `user_addresses`
- `services`
- `service_categories`

### Step 3: Execute PPS Extensions

Run the `pps-extensions.sql` file in your Supabase SQL editor.

### Step 4: Verify Installation

Check that these new tables were created:

```sql
-- Verify PPS tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'provider_performance_metrics',
    'provider_performance_history', 
    'job_assignment_queue',
    'provider_service_coverage'
);
```

### Step 5: Create Seed Data (Optional)

Run the seed data script to create test data for development:

```sql
-- See seed-data.sql for sample data
\i seed-data.sql
```

## Environment Configuration

Update your `.env` file with the correct Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Testing the Setup

After setup, test the PPS system:

1. **Create a test provider**
2. **Create performance metrics**  
3. **Test PPS calculation API**
4. **Verify job assignment flow**

## Troubleshooting

### Common Issues:

**PostGIS not enabled:**
```sql
CREATE EXTENSION IF NOT EXISTS "postgis";
```

**RLS policies blocking access:**
- Verify user authentication
- Check RLS policy conditions
- Use service role key for admin operations

**Missing foreign key references:**
- Ensure core tables exist first
- Check table creation order

## Production Considerations

1. **Backup Strategy**: Set up automated backups
2. **Performance**: Monitor query performance with proper indexing
3. **Security**: Review RLS policies for production use
4. **Monitoring**: Set up database monitoring and alerts

## Next Steps

After database setup:
1. Start the backend server
2. Test API endpoints
3. Connect frontend applications
4. Set up real-time subscriptions