# SSO Authentication & Admin Impersonation Setup Guide

## 🚀 Complete Production-Ready SSO Setup

This guide will walk you through setting up the complete SSO authentication system with admin impersonation capabilities for both the Ghostwriter Portal (admin) and Client Portal.

## Prerequisites

- Supabase project with database access
- Vercel project for both portals
- Resend API key for sending emails
- Admin email address (e.g., eimrib@yess.ai)

## Step 1: Database Migration

Run these SQL scripts in your Supabase SQL Editor **in this exact order**:

### 1.1 Add SSO Authentication Fields

```sql
-- File: add_sso_auth_integration.sql
-- This adds auth fields to the clients table and creates invitation tracking

-- Run the complete script from:
-- ghostwriter-portal/Database Scripts/add_sso_auth_integration.sql
```

### 1.2 Create Admin Impersonation System

```sql
-- File: admin_impersonation_system.sql
-- This creates the impersonation tracking and audit system

-- Run the complete script from:
-- ghostwriter-portal/Database Scripts/admin_impersonation_system.sql
```

### 1.3 Verify Installation

After running both scripts, verify the installation:

```sql
-- Check if all required tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('client_invitations', 'admin_impersonation', 'auth_audit_log', 'admin_users');

-- Check if client table has auth fields
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name IN ('auth_user_id', 'invitation_status', 'auth_status', 'last_login_at');

-- Verify admin user exists
SELECT * FROM admin_users WHERE email = 'eimrib@yess.ai';
```

## Step 2: Environment Variables

### 2.1 Ghostwriter Portal (Admin)

Add these to your Vercel environment variables:

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For admin operations

# Frontend (VITE_ prefix)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email Service
RESEND_API_KEY=your_resend_api_key
ADMIN_EMAIL=eimrib@yess.ai

# SSO Configuration
VITE_CLIENT_PORTAL_URL=https://unified-linkedin-project.vercel.app
```

### 2.2 Client Portal

Add these to your Vercel environment variables:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Portal URLs
VITE_ADMIN_PORTAL_URL=https://ghostwriter-portal.vercel.app
```

## Step 3: Supabase Auth Configuration

### 3.1 Enable Auth Providers

In Supabase Dashboard → Authentication → Providers:

1. **Email Provider**
   - Enable Email auth
   - Configure email templates for:
     - Confirmation email
     - Password reset
     - Magic link

2. **Google OAuth**
   - Enable Google provider
   - Add OAuth credentials from Google Cloud Console
   - Set redirect URL: `https://unified-linkedin-project.vercel.app/auth`

3. **GitHub OAuth**
   - Enable GitHub provider
   - Add OAuth App credentials from GitHub
   - Set redirect URL: `https://unified-linkedin-project.vercel.app/auth`

### 3.2 Configure Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

```
Site URL: https://unified-linkedin-project.vercel.app
Redirect URLs:
- https://unified-linkedin-project.vercel.app/auth
- https://unified-linkedin-project.vercel.app/client-approve
- https://ghostwriter-portal.vercel.app
- http://localhost:5173/* (for development)
- http://localhost:8080/* (for development)
```

## Step 4: Email Domain Configuration

### 4.1 Resend Setup

1. Create a Resend account at https://resend.com
2. Add and verify your domain (e.g., yess.ai)
3. Create an API key with send permissions
4. Configure sender address: `noreply@updates.yess.ai`

### 4.2 Email Templates

The system uses professional HTML email templates for invitations. These are automatically included in the `email-invitation.service.ts` file.

## Step 5: Complete Workflow

### 5.1 Creating a New Client with SSO

1. **Admin creates client profile**:
   - Go to Ghostwriter Portal → Clients
   - Click "Add New Client"
   - Enter client details including email
   - Enable "Send Invitation" option
   - Submit

2. **System sends invitation**:
   - Creates invitation record in database
   - Generates secure token
   - Sends professional email with SSO setup link

3. **Client receives invitation**:
   - Opens email with invitation
   - Clicks "Complete Your Account Setup" button
   - Redirected to: `https://unified-linkedin-project.vercel.app/auth?invitation=TOKEN`

4. **Client completes SSO signup**:
   - Chooses auth method (Google, GitHub, or Email/Password)
   - Creates account
   - System links auth user to client record
   - Client gains portal access

### 5.2 Admin Impersonation Flow

1. **Start impersonation**:
   - Go to Ghostwriter Portal → Clients
   - Find client with active SSO
   - Click "Login as Client" button
   - System creates impersonation token

2. **Access client portal**:
   - New tab opens with client portal
   - Purple banner shows "ADMIN MODE"
   - Full access to client's view
   - All actions are logged

3. **Exit impersonation**:
   - Click "Exit Impersonation" in purple banner
   - Returns to admin portal
   - Session logged in audit trail

## Step 6: Testing

### 6.1 Test Client Invitation

```bash
# 1. Create test client
- Name: Test Client
- Email: test@example.com
- Company: Test Company

# 2. Check invitation was created
SELECT * FROM client_invitations WHERE email = 'test@example.com';

# 3. Verify email was sent
- Check Resend dashboard for sent email
- Or check email inbox
```

### 6.2 Test Impersonation

```bash
# 1. Check impersonation token creation
SELECT * FROM admin_impersonation WHERE admin_email = 'eimrib@yess.ai';

# 2. Verify audit log
SELECT * FROM auth_audit_log ORDER BY created_at DESC LIMIT 10;
```

## Step 7: Security Considerations

### 7.1 Production Security Checklist

- [ ] Enable RLS on all tables
- [ ] Set up proper CORS configuration
- [ ] Use HTTPS for all URLs
- [ ] Enable rate limiting on auth endpoints
- [ ] Regular audit log reviews
- [ ] Implement session timeout (1 hour for impersonation)
- [ ] Use secure token generation
- [ ] Enable 2FA for admin accounts (optional)

### 7.2 Monitoring

Set up monitoring for:
- Failed login attempts
- Impersonation sessions
- Invitation acceptance rate
- Auth provider usage

## Troubleshooting

### Common Issues

**Issue: Invitation email not sending**
- Check RESEND_API_KEY is set in Vercel
- Verify domain is configured in Resend
- Check Vercel function logs

**Issue: Client can't sign up with invitation**
- Verify invitation token is valid (not expired)
- Check client_invitations table
- Ensure auth providers are enabled

**Issue: Impersonation not working**
- Verify admin email in admin_users table
- Check RLS policies
- Ensure client has auth_user_id set

**Issue: OAuth redirect not working**
- Check redirect URLs in Supabase
- Verify OAuth credentials
- Check browser console for errors

## Support

For additional support or questions:
- Check the CLAUDE.md documentation
- Review the CHANGELOG.md for recent updates
- Contact the development team

---

## Quick Commands Reference

```bash
# Check system status
SELECT 
  (SELECT COUNT(*) FROM clients WHERE auth_status = 'active') as active_clients,
  (SELECT COUNT(*) FROM client_invitations WHERE status = 'pending') as pending_invitations,
  (SELECT COUNT(*) FROM admin_impersonation WHERE is_active = true) as active_impersonations;

# Clean up expired sessions
SELECT cleanup_expired_impersonation_sessions();

# View recent auth events
SELECT * FROM auth_audit_log 
ORDER BY created_at DESC 
LIMIT 20;
```

## Next Steps

After completing this setup:
1. Test the complete flow with a real client
2. Set up monitoring dashboards
3. Create client documentation
4. Schedule regular security audits
5. Implement backup procedures

---

*Last updated: August 23, 2025*
*Version: 1.0.0 - Production Ready*