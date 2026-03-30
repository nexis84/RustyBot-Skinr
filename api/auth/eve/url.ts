import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clientId = process.env.EVE_CLIENT_ID;
    if (!clientId) {
      console.error('EVE_CLIENT_ID not set');
      return res.status(500).json({ error: 'Server configuration error: EVE_CLIENT_ID missing' });
    }

    const origin = req.query.origin as string;
    if (!origin) {
      return res.status(400).json({ error: 'Missing origin parameter' });
    }

    const redirectUri = `${origin}/api/auth/eve/callback`;
    
    // DEBUG: Log what's being sent
    console.log('EVE Auth Debug:');
    console.log('  origin:', origin);
    console.log('  redirectUri:', redirectUri);
    console.log('  clientId:', clientId ? 'Set' : 'Missing');

    const params = new URLSearchParams({
      response_type: 'code',
      redirect_uri: redirectUri,
      client_id: clientId,
      scope: 'publicData',
      state: JSON.stringify({ origin })
    });

    const url = `https://login.eveonline.com/v2/oauth/authorize?${params.toString()}`;
    res.status(200).json({ url, debug: { redirectUri, origin } });
  } catch (error: any) {
    console.error('Error generating EVE auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL', details: error.message });
  }
}
