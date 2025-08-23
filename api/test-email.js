// SIMPLE TEST - EXACTLY FROM RESEND DOCS
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('🔥 TEST EMAIL FUNCTION CALLED!');
  console.log('Method:', req.method);
  console.log('Body:', req.body);
  
  try {
    // Get API key
    const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || 're_Vawe4nHB_BiRgoqiZmw1cWXjTyHZFBzS1';
    console.log('API Key exists:', !!apiKey);
    console.log('API Key starts with:', apiKey.substring(0, 10));
    
    // Import Resend
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    
    // Send email - EXACTLY like the docs
    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: ['eimrib@yess.ai'],
      subject: 'Test Email - Debug SSO Issue',
      html: '<strong>If you get this, the API is working!</strong>',
    });
    
    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json({ error });
    }
    
    console.log('Success! Email ID:', data.id);
    return res.status(200).json({ 
      success: true, 
      id: data.id,
      message: 'Test email sent successfully!' 
    });
    
  } catch (err) {
    console.error('Catch block error:', err);
    return res.status(500).json({ 
      error: err.message,
      stack: err.stack 
    });
  }
}