#!/usr/bin/env node

// Patient test script for YouTube API (waits up to 3 minutes)
import fetch from 'node-fetch';

async function testYouTubeAPI() {
  const API_URL = 'https://admin.agentss.app/api/youtube-ideation';
  const TEST_VIDEO = 'https://www.youtube.com/watch?v=9uHIKahbVIY';
  
  console.log('🎬 Testing YouTube API with:', TEST_VIDEO);
  console.log('📡 Calling:', API_URL);
  console.log('⏰ Started at:', new Date().toISOString());
  console.log('⏳ This may take up to 2-3 minutes, please wait...\n');
  
  try {
    // Set a 3-minute timeout for the fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes
    
    const startTime = Date.now();
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videoUrl: TEST_VIDEO
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    const data = await response.json();
    
    console.log('\n⏱️  Response received after:', duration, 'seconds');
    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ SUCCESS!');
      console.log('Ideas generated:', data.totalIdeas);
      if (data.ideas && data.ideas.length > 0) {
        console.log('\n📝 Ideas Generated:');
        data.ideas.forEach((idea, index) => {
          console.log(`\n${index + 1}. ${idea.content ? idea.content.substring(0, 200) + '...' : idea}`);
        });
      } else {
        console.log('\n⚠️  Success but no ideas in response');
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
      if (data.promptUsed) {
        console.log('\n📝 Prompt Used:', data.promptUsed);
      }
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('\n⏱️  Request timed out after 3 minutes');
    } else {
      console.error('\n❌ Request failed:', error.message);
    }
  }
}

// Run the test
console.log('🚀 Starting YouTube API test...\n');
testYouTubeAPI();