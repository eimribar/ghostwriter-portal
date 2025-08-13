import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ifwscuvbtdokljwwbvex.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmd3NjdXZidGRva2xqd3didmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDI0NDMsImV4cCI6MjA3MDU3ODQ0M30.QzxtYT8nbLPx9T3-PLABLXx7XtkjAg77ffUlghnQ0Xc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestData() {
  console.log('🚀 Setting up test data for approval flow testing\n');
  
  // Step 1: Insert test clients
  console.log('1️⃣ Inserting test clients...');
  const testClients = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'John Smith',
      company: 'TechCorp Solutions',
      email: 'john@techcorp.com',
      industry: 'Technology',
      status: 'active'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Sarah Johnson',
      company: 'Marketing Dynamics',
      email: 'sarah@marketingdynamics.com',
      industry: 'Marketing',
      status: 'active'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440005',
      name: 'Demo Client',
      company: 'Demo Company',
      email: 'demo@example.com',
      industry: 'General',
      status: 'active'
    }
  ];
  
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .upsert(testClients, { onConflict: 'email' })
    .select();
  
  if (clientError) {
    console.error('❌ Error inserting clients:', clientError);
  } else {
    console.log(`✅ Inserted/updated ${clientData.length} clients`);
  }
  
  // Step 2: Insert test users
  console.log('\n2️⃣ Inserting test users...');
  const testUsers = [
    {
      id: '660e8400-e29b-41d4-a716-446655440001',
      email: 'admin@ghostwriter.com',
      full_name: 'Admin User',
      role: 'admin',
      has_completed_onboarding: true
    },
    {
      id: '660e8400-e29b-41d4-a716-446655440002',
      email: 'writer1@ghostwriter.com',
      full_name: 'Writer One',
      role: 'ghostwriter',
      has_completed_onboarding: true
    },
    {
      id: '660e8400-e29b-41d4-a716-446655440005',
      email: 'demo@example.com',
      full_name: 'Demo User',
      role: 'client',
      client_id: '550e8400-e29b-41d4-a716-446655440005',
      has_completed_onboarding: true
    }
  ];
  
  const { data: userData, error: userError } = await supabase
    .from('users')
    .upsert(testUsers, { onConflict: 'email' })
    .select();
  
  if (userError) {
    console.error('❌ Error inserting users:', userError);
  } else {
    console.log(`✅ Inserted/updated ${userData.length} users`);
  }
  
  // Step 3: Insert sample content ideas
  console.log('\n3️⃣ Inserting sample content ideas...');
  const contentIdeas = [
    {
      id: '770e8400-e29b-41d4-a716-446655440001',
      client_id: '550e8400-e29b-41d4-a716-446655440005',
      user_id: '660e8400-e29b-41d4-a716-446655440002',
      title: 'AI in Customer Service',
      description: 'How artificial intelligence is revolutionizing customer support and engagement',
      source: 'manual',
      priority: 'high',
      status: 'draft'
    },
    {
      id: '770e8400-e29b-41d4-a716-446655440002',
      client_id: '550e8400-e29b-41d4-a716-446655440005',
      user_id: '660e8400-e29b-41d4-a716-446655440002',
      title: 'Remote Work Best Practices',
      description: 'Essential tips for managing distributed teams effectively',
      source: 'manual',
      priority: 'medium',
      status: 'draft'
    }
  ];
  
  const { data: ideaData, error: ideaError } = await supabase
    .from('content_ideas')
    .upsert(contentIdeas, { onConflict: 'id' })
    .select();
  
  if (ideaError) {
    console.error('❌ Error inserting content ideas:', ideaError);
  } else {
    console.log(`✅ Inserted/updated ${ideaData.length} content ideas`);
  }
  
  // Step 4: Create sample generated content for testing approval flow
  console.log('\n4️⃣ Creating sample generated content...');
  const generatedContent = [
    {
      idea_id: '770e8400-e29b-41d4-a716-446655440001',
      client_id: '550e8400-e29b-41d4-a716-446655440005',
      ghostwriter_id: '660e8400-e29b-41d4-a716-446655440002',
      variant_number: 1,
      content_text: `🤖 The AI Revolution in Customer Service Has Arrived

Did you know that 80% of customer inquiries can now be handled by AI?

But here's what most companies get wrong:
They treat AI as a replacement for humans, not an enhancement.

The winning formula:
• AI handles routine queries (password resets, order tracking)
• Humans focus on complex, emotional situations
• AI assists humans with real-time suggestions
• Result: 40% faster resolution, 90% satisfaction

We implemented this hybrid approach last quarter.
Customer satisfaction went from 72% to 91%.
Response time dropped from 4 hours to 15 minutes.

The future isn't AI vs. Humans.
It's AI + Humans = Exceptional Service.

What's your take on AI in customer service?

#CustomerService #AI #Innovation #CustomerExperience #TechTrends`,
      hook: 'The AI Revolution in Customer Service Has Arrived',
      hashtags: ['CustomerService', 'AI', 'Innovation', 'CustomerExperience', 'TechTrends'],
      estimated_read_time: 1,
      llm_provider: 'google',
      llm_model: 'gemini-2.5-pro',
      generation_prompt: 'AI in Customer Service',
      status: 'draft'
    },
    {
      idea_id: '770e8400-e29b-41d4-a716-446655440001',
      client_id: '550e8400-e29b-41d4-a716-446655440005',
      ghostwriter_id: '660e8400-e29b-41d4-a716-446655440002',
      variant_number: 2,
      content_text: `We replaced our entire customer service team with AI.

It was a disaster. Here's what we learned:

Month 1: 50% cost reduction! Management celebrated.
Month 2: Customer complaints skyrocketed 300%.
Month 3: We lost 20% of our clients.
Month 4: Emergency meeting. Complete strategy reversal.

The painful lessons:
1. AI can't handle angry customers
2. Complex problems need human creativity
3. Empathy can't be programmed
4. Brand loyalty requires human connection

Our new approach:
- AI as first-line support (handles 60% of tickets)
- Instant escalation to humans when needed
- AI helps agents with knowledge and suggestions
- Humans review all AI interactions daily

Results after 6 months:
✅ 85% first-contact resolution
✅ Customer satisfaction at all-time high
✅ Support costs down 30% (not 50%, but sustainable)
✅ Team morale improved - they do meaningful work

The lesson? AI amplifies human capability. It doesn't replace it.

#CustomerSuccess #AILessons #Leadership #BusinessStrategy`,
      hook: 'We replaced our entire customer service team with AI',
      hashtags: ['CustomerSuccess', 'AILessons', 'Leadership', 'BusinessStrategy'],
      estimated_read_time: 1,
      llm_provider: 'google',
      llm_model: 'gemini-2.5-pro',
      generation_prompt: 'AI in Customer Service',
      status: 'admin_approved',
      approved_at: new Date(),
      approved_by: '660e8400-e29b-41d4-a716-446655440001'
    }
  ];
  
  const { data: contentData, error: contentError } = await supabase
    .from('generated_content')
    .insert(generatedContent)
    .select();
  
  if (contentError) {
    console.error('❌ Error inserting generated content:', contentError);
  } else {
    console.log(`✅ Created ${contentData.length} sample posts`);
    console.log('   - 1 draft (needs admin approval)');
    console.log('   - 1 admin_approved (ready for client approval)');
  }
  
  console.log('\n✨ Test data setup complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Open Ghostwriter Portal (http://localhost:5175)');
  console.log('2. Go to Approval page to approve draft content');
  console.log('3. Open User Portal (http://localhost:8080)');
  console.log('4. Sign in as demo@example.com');
  console.log('5. Go to Approvals to see admin-approved content');
  console.log('6. Approve content to complete the flow');
}

setupTestData().catch(console.error);