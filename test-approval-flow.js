import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ifwscuvbtdokljwwbvex.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmd3NjdXZidGRva2xqd3didmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDI0NDMsImV4cCI6MjA3MDU3ODQ0M30.QzxtYT8nbLPx9T3-PLABLXx7XtkjAg77ffUlghnQ0Xc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testApprovalFlow() {
  console.log('🔍 Testing Two-Step Approval Flow\n');
  
  // Step 1: Check if clients exist
  console.log('1️⃣ Checking for test clients...');
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'active');
  
  if (clientError) {
    console.error('❌ Error fetching clients:', clientError);
    return;
  }
  
  console.log(`✅ Found ${clients?.length || 0} active clients`);
  if (clients && clients.length > 0) {
    console.log('   Sample client:', clients[0].name, '-', clients[0].company);
  }
  
  // Step 2: Check for draft content
  console.log('\n2️⃣ Checking for draft content...');
  const { data: draftContent, error: draftError } = await supabase
    .from('generated_content')
    .select('*')
    .eq('status', 'draft')
    .limit(5);
  
  if (draftError) {
    console.error('❌ Error fetching draft content:', draftError);
  } else {
    console.log(`✅ Found ${draftContent?.length || 0} draft posts`);
  }
  
  // Step 3: Check for admin-approved content
  console.log('\n3️⃣ Checking for admin-approved content...');
  const { data: adminApproved, error: adminError } = await supabase
    .from('generated_content')
    .select('*')
    .eq('status', 'admin_approved')
    .limit(5);
  
  if (adminError) {
    console.error('❌ Error fetching admin-approved content:', adminError);
  } else {
    console.log(`✅ Found ${adminApproved?.length || 0} admin-approved posts`);
  }
  
  // Step 4: Check for client-approved content
  console.log('\n4️⃣ Checking for client-approved content...');
  const { data: clientApproved, error: clientApprovedError } = await supabase
    .from('generated_content')
    .select('*')
    .eq('status', 'client_approved')
    .limit(5);
  
  if (clientApprovedError) {
    console.error('❌ Error fetching client-approved content:', clientApprovedError);
  } else {
    console.log(`✅ Found ${clientApproved?.length || 0} client-approved posts`);
  }
  
  // Step 5: Check scheduled posts
  console.log('\n5️⃣ Checking for scheduled posts...');
  const { data: scheduled, error: scheduledError } = await supabase
    .from('scheduled_posts')
    .select('*')
    .limit(5);
  
  if (scheduledError) {
    console.error('❌ Error fetching scheduled posts:', scheduledError);
  } else {
    console.log(`✅ Found ${scheduled?.length || 0} scheduled posts`);
  }
  
  // Summary
  console.log('\n📊 Approval Flow Status Summary:');
  console.log('================================');
  console.log(`Active Clients: ${clients?.length || 0}`);
  console.log(`Draft Content: ${draftContent?.length || 0}`);
  console.log(`Admin Approved: ${adminApproved?.length || 0}`);
  console.log(`Client Approved: ${clientApproved?.length || 0}`);
  console.log(`Scheduled Posts: ${scheduled?.length || 0}`);
  
  if (!clients || clients.length === 0) {
    console.log('\n⚠️  No clients found! Run insert_test_data.sql in Supabase');
  }
}

testApprovalFlow().catch(console.error);