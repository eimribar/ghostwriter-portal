export default async function handler(req, res) {
  // Simple debug endpoint to check environment
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasViteOpenAI = !!process.env.VITE_OPENAI_API_KEY;
  const hasApify = !!process.env.APIFY_API_KEY;
  const hasViteApify = !!process.env.VITE_APIFY_API_KEY;
  
  return res.status(200).json({
    success: true,
    environment: {
      OPENAI_API_KEY: hasOpenAI,
      VITE_OPENAI_API_KEY: hasViteOpenAI,
      APIFY_API_KEY: hasApify,
      VITE_APIFY_API_KEY: hasViteApify,
      NODE_ENV: process.env.NODE_ENV
    },
    timestamp: new Date().toISOString()
  });
}