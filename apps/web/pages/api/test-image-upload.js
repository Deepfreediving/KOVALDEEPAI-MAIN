// Simple image upload test without file processing
export default async function handler(req, res) {
  try {
    console.log('🔍 Testing image upload process...');
    console.log('Method:', req.method);
    console.log('Content-Type:', req.headers['content-type']);
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const contentType = req.headers['content-type'] || '';
    
    if (contentType.includes('application/json')) {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      const parsedBody = JSON.parse(body);
      console.log('Body keys:', Object.keys(parsedBody));
      console.log('ImageData length:', parsedBody.imageData?.length || 0);
      
      if (!parsedBody.imageData) {
        return res.status(400).json({ error: 'imageData required' });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Image data received successfully',
        imageDataLength: parsedBody.imageData.length,
        userId: parsedBody.userId || 'not provided'
      });
    }
    
    return res.status(400).json({ error: 'Unsupported content type' });
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
