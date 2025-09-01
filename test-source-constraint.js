// Test if the database accepts 'youtube' as a source value
import { createClient } from '@supabase/supabase-js';

async function testYouTubeSource() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('Testing source constraint with youtube value...');
  
  // Try to insert a test idea with source: 'youtube'
  const { data, error } = await supabase
    .from('content_ideas')
    .insert({
      title: 'Test YouTube Idea',
      description: 'Test to check if youtube source is allowed',
      source: 'youtube',
      priority: 'medium',
      status: 'draft'
    })
    .select()
    .single();
    
  if (error) {
    console.error('❌ Database constraint error:', error);
    console.error('This confirms youtube is not yet allowed as a source value');
    
    if (error.message.includes('violates check constraint')) {
      console.log('📝 Need to run the database migration to update the constraint');
    }
  } else {
    console.log('✅ Successfully inserted test YouTube idea:', data.id);
    
    // Clean up test data
    await supabase
      .from('content_ideas')
      .delete()
      .eq('id', data.id);
      
    console.log('🧹 Cleaned up test data');
  }
}

testYouTubeSource().catch(console.error);