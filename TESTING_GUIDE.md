# Testing Guide - Two-Step Approval Flow

## Prerequisites
1. Both portals running locally or deployed
2. Supabase database configured
3. Test data loaded (see below)

## Loading Test Data

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `insert_test_data.sql`
4. Click "Run" to execute the script

### Step 2: Verify Test Data
Run this query to verify clients were created:
```sql
SELECT * FROM clients WHERE status = 'active';
```

You should see 5 test clients including "Demo Company".

## Testing the Two-Step Approval Flow

### Phase 1: Content Generation (Ghostwriter Portal)

1. **Access Ghostwriter Portal**
   - URL: http://localhost:5173 (dev) or https://ghostwriter-portal.vercel.app (prod)
   - Log in as admin or ghostwriter

2. **Generate Content**
   - Navigate to "Generate" page
   - Select "Demo Client - Demo Company" from dropdown
   - Enter content idea: "The future of AI in business"
   - Click "Generate Variations"
   - Verify 4 variations are created
   - Check for green "Saved!" confirmation

3. **Admin Approval**
   - Navigate to "Approval" page
   - Filter by "draft" status
   - Find the generated content
   - Click "Approve" on desired variations
   - Status changes to "admin_approved"

### Phase 2: Client Approval (User Portal)

1. **Access User Portal**
   - URL: http://localhost:8080 (dev) or https://unified-linkedin-project.vercel.app (prod)
   - Sign in as demo@example.com

2. **Skip Onboarding (if needed)**
   - Use URL param: `?admin=true`
   - Or press Ctrl+Shift+A

3. **Review & Approve Content**
   - Navigate to "Approvals" page
   - Content approved by admin should appear
   - Swipe right to approve (or click approve button)
   - Status changes to "client_approved"
   - Content is auto-scheduled

4. **Verify Scheduled Posts**
   - Check database for scheduled_posts entries
   - Status should be "scheduled" with future date

## Test Accounts

### Ghostwriter Portal
- **Admin**: admin@ghostwriter.com
- **Writer**: writer1@ghostwriter.com

### User Portal  
- **Demo Client**: demo@example.com
- **TechCorp**: john@techcorp.com
- **Marketing Dynamics**: sarah@marketingdynamics.com

## Status Flow Verification

The correct status progression should be:
1. `draft` - Initial content generation
2. `admin_approved` - After ghostwriter/admin approval
3. `client_approved` - After client approval
4. `scheduled` - Auto-scheduled for publication
5. `published` - After publication (future implementation)

## Troubleshooting

### Content Not Appearing in Client Portal
- Verify content status is "admin_approved"
- Check client_id matches between content and user
- Ensure user.client.id is properly set

### Cannot Select Client in Generate Page
- Run the insert_test_data.sql script
- Verify clients table has active clients
- Check browser console for errors

### Approval Not Working
- Check RLS policies on generated_content table
- Verify user has proper role (admin/ghostwriter/client)
- Check browser console for API errors

### Database Connection Issues
- Verify VITE_SUPABASE_URL is correct
- Check VITE_SUPABASE_ANON_KEY is valid
- Ensure RLS policies allow operations

## SQL Queries for Debugging

### Check Content Status
```sql
SELECT id, client_id, status, created_at, content_text 
FROM generated_content 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Scheduled Posts
```sql
SELECT * FROM scheduled_posts 
WHERE scheduled_for > NOW() 
ORDER BY scheduled_for;
```

### Verify Client-User Relationship
```sql
SELECT u.email, u.role, c.name, c.company 
FROM users u 
LEFT JOIN clients c ON u.client_id = c.id 
WHERE u.role = 'client';
```

## Success Criteria

✅ Content generates with 4 variations
✅ Content saves to database as "draft"
✅ Admin can approve to "admin_approved"
✅ Client sees admin-approved content
✅ Client can approve to "client_approved"
✅ Approved content auto-schedules
✅ Status progression follows expected flow