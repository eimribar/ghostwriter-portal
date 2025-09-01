#!/usr/bin/env node

// Test script to debug YouTube API locally
const fetch = require('node-fetch');

async function testYouTubeAPI() {
  const API_URL = 'https://admin.agentss.app/api/youtube-ideation';
  const TEST_VIDEO = 'https://www.youtube.com/watch?v=9uHIKahbVIY';
  
  console.log('🎬 Testing YouTube API with:', TEST_VIDEO);
  console.log('📡 Calling:', API_URL);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videoUrl: TEST_VIDEO
      })
    });
    
    const data = await response.json();
    
    console.log('\n📊 Response Status:', response.status);
    console.log('📋 Response Data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ SUCCESS!');
      console.log('Ideas generated:', data.totalIdeas);
      if (data.ideas && data.ideas.length > 0) {
        console.log('\nFirst idea preview:', data.ideas[0]);
      }
    } else {
      console.log('\n❌ ERROR:', data.error);
      if (data.responsePreview) {
        console.log('\n📝 GPT-5 Response Preview:');
        console.log(data.responsePreview);
      }
      if (data.details) {
        console.log('\n📍 Details:', data.details);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
}

// Run the test
testYouTubeAPI();