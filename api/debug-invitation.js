// DEBUG VERSION - Log everything
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('🔍 DEBUG: Invitation API called');
  console.log('Body size:', JSON.stringify(req.body).length, 'characters');
  
  const { to, subject, html, text, clientName } = req.body;
  
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('HTML length:', html?.length || 0);
  console.log('Text length:', text?.length || 0);
  console.log('Client:', clientName);
  
  try {
    const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    console.log('API Key exists:', !!apiKey);
    
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    
    // Try with a simple version first
    console.log('Sending simple version...');
    const simpleResult = await resend.emails.send({
      from: 'Ghostwriter Portal <onboarding@resend.dev>',
      to: [to],
      subject: subject + ' (Simple)',
      html: '<p>This is a simple test. If you get this, basic email works.</p>'
    });
    
    console.log('Simple email result:', simpleResult);
    
    // Now try with the full HTML
    console.log('Sending full version...');
    const fullResult = await resend.emails.send({
      from: 'Ghostwriter Portal <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: html || '<p>No HTML provided</p>',
      text: text
    });
    
    console.log('Full email result:', fullResult);
    
    return res.status(200).json({ 
      success: true,
      simple: simpleResult,
      full: fullResult
    });
    
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ 
      error: err.message,
      details: err.stack
    });
  }
}