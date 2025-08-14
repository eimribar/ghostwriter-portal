#!/usr/bin/env node

// Test script to verify email API endpoints

const testEmailEndpoints = async () => {
  const baseUrl = 'https://ghostwriter-portal.vercel.app';
  
  console.log('🧪 Testing Email API Endpoints...\n');
  
  // Test 1: Check and Notify endpoint
  console.log('1. Testing /api/check-and-notify endpoint...');
  try {
    const response = await fetch(`${baseUrl}/api/check-and-notify`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Check-and-notify response:', data);
    } else {
      console.log('❌ Check-and-notify failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Check-and-notify error:', error.message);
  }
  
  console.log('\n2. Testing /api/send-email endpoint...');
  try {
    const response = await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: 'test-job-123',
        searchQuery: 'Test email notification',
        resultCount: 10,
        duration: '2 minutes',
        topIdeas: [
          {
            title: 'Test Idea 1',
            description: 'This is a test idea',
            score: 9
          }
        ]
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Send-email response:', data);
    } else {
      const error = await response.json();
      console.log('❌ Send-email failed:', error);
    }
  } catch (error) {
    console.log('❌ Send-email error:', error.message);
  }
  
  console.log('\n📧 Test complete! Check your email at: eimrib@yess.ai');
};

// Run the test
testEmailEndpoints();