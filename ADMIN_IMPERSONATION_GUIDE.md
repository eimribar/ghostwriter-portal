# Admin Impersonation System - User Guide

## Overview
The admin impersonation system allows administrators to view the client portal exactly as their clients see it. This is crucial for:
- Verifying content appears correctly
- Debugging client-specific issues
- Assisting clients with portal navigation
- Testing approval workflows

## Prerequisites

### 1. Database Setup
First, ensure the impersonation tables exist in Supabase:

1. Go to Supabase SQL Editor
2. Run the verification script: `verify_admin_impersonation.sql`
3. If tables don't exist, run: `Database Scripts/admin_impersonation_system.sql`

### 2. Admin Access
Your admin email must be registered in the system:
- Currently configured for: `eimrib@yess.ai`
- To add more admins, update the `admin_users` table in Supabase

## How to Use Admin Impersonation

### Step 1: Access Admin Client Auth Page
1. Navigate to Ghostwriter Portal: https://ghostwriter-portal.vercel.app
2. Go to `/admin-client-auth` or click "Admin Client Auth" in navigation
3. You'll see a list of all clients with their authentication status

### Step 2: Impersonate a Client
1. Find the client you want to impersonate
2. Ensure their status is "active" (green badge)
3. Click the purple "Login" button (impersonate icon)
4. A new tab will open with the client portal

### Step 3: Using Impersonation Mode
When impersonating, you'll see:
- **Purple banner** at the top showing:
  - Your admin email
  - Client you're viewing as
  - "Exit Impersonation" button
- Full access to client's content and approvals
- Ability to navigate their entire portal

### Step 4: Exit Impersonation
Two ways to exit:
1. Click "Exit Impersonation" in the purple banner
2. Close the tab and return to admin portal

## What You Can Do While Impersonating

✅ **Can Do:**
- View all client's pending approvals
- See their content history
- Navigate all portal pages
- Verify content displays correctly
- Check their analytics and metrics

❌ **Cannot/Should Not Do:**
- Approve or reject content on their behalf
- Change their settings
- Submit content ideas as them

## Security Features

### Audit Logging
Every impersonation session is logged:
- Start time and admin email
- Client being impersonated
- Duration of session
- IP address and browser info

### View Audit Log
1. In Admin Client Auth page
2. Click the "History" button for any client
3. See all authentication events including impersonations

### Token Expiration
- Impersonation tokens expire after 1 hour
- Only one active impersonation per client at a time
- Sessions end automatically when you close the browser

## Troubleshooting

### "Invalid or expired impersonation token"
**Solution:** Token has expired. Return to admin portal and create a new impersonation session.

### Client portal shows normal login page
**Possible causes:**
1. Token validation failed
2. Database functions not installed
3. Client portal not updated with impersonation code

**Solution:** Check browser console for errors and verify database setup.

### Cannot see impersonate button
**Causes:**
1. Client status is not "active"
2. Client hasn't completed signup
3. You're already impersonating someone

**Solution:** Check client status and ensure they've activated their account.

## Technical Details

### How It Works
1. Admin clicks impersonate → creates secure token in database
2. Token added to client portal URL as parameter
3. Client portal validates token via Supabase function
4. Valid token bypasses normal auth, loads client data
5. Impersonation context maintains session state
6. All actions logged for security audit

### Database Tables
- `admin_impersonation`: Active impersonation sessions
- `auth_audit_log`: All authentication events
- `admin_users`: Authorized admin emails

### Files Modified
**Ghostwriter Portal:**
- `/src/pages/AdminClientAuth.tsx`: Admin interface
- `/src/services/admin-auth.service.ts`: Impersonation logic

**Client Portal:**
- `/src/pages/Auth.tsx`: Token validation
- `/src/contexts/ImpersonationContext.tsx`: Session management
- `/src/components/ImpersonationBanner.tsx`: Visual indicator

## Best Practices

1. **Always exit properly** when done impersonating
2. **Document why** you impersonated (stored in audit log)
3. **Inform clients** if you made any changes while impersonating
4. **Use sparingly** - only when necessary for support
5. **Review audit logs** regularly for security

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify database tables exist
3. Ensure both portals are deployed with latest code
4. Check Supabase logs for function errors

---

**Last Updated:** December 2024
**Version:** 1.0.0