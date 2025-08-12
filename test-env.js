// Test if .env.local is being read
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Read .env.local directly
const envFile = readFileSync('.env.local', 'utf8');
console.log('Raw .env.local content:');
console.log(envFile);
console.log('\n---\n');

// Parse it
const parsed = dotenv.parse(envFile);
console.log('Parsed environment variables:');
Object.keys(parsed).forEach(key => {
  if (key.includes('API_KEY')) {
    console.log(`${key}: ${parsed[key].substring(0, 10)}...`);
  } else {
    console.log(`${key}: ${parsed[key]}`);
  }
});