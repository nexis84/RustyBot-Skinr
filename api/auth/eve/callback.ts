import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

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

  const { code, state } = req.query;
  
  if (!code) {
    return res.status(400).send('No authorization code provided');
  }

  let origin: string | null = null;
  try {
    const stateData = JSON.parse(state as string);
    origin = stateData.origin;
  } catch (e) {
    console.error('Invalid state:', state);
  }

  const clientId = process.env.EVE_CLIENT_ID;
  const clientSecret = process.env.EVE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('EVE_CLIENT_ID or EVE_CLIENT_SECRET not set');
    return res.status(500).send(`Server configuration error: ${!clientId ? 'EVE_CLIENT_ID' : 'EVE_CLIENT_SECRET'} not set`);
  }

  const currentOrigin = origin || 'https://rusty-bot-skinr.vercel.app';
  const redirectUri = `${currentOrigin}/auth/eve/callback`;

  // DEBUG logging
  console.log('EVE Callback Debug:');
  console.log('  code:', code ? 'Present (length: ' + (code as string).length + ')' : 'Missing');
  console.log('  origin:', origin);
  console.log('  redirectUri:', redirectUri);
  console.log('  clientId:', clientId ? 'Set' : 'Missing');
  console.log('  clientSecret:', clientSecret ? 'Set (length: ' + clientSecret.length + ')' : 'Missing');

  try {
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    console.log('  authHeader length:', authHeader.length);
    console.log('  Making token request to EVE...');

    const tokenResponse = await axios.post(
      'https://login.eveonline.com/v2/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        }
      }
    );

    console.log('  Token response received');

    const { access_token } = tokenResponse.data;

    const verifyResponse = await axios.get('https://login.eveonline.com/oauth/verify', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const characterData = verifyResponse.data;
    const characterId = characterData.CharacterID.toString();
    const characterName = characterData.CharacterName;
    const portraitUrl = `https://images.evetech.net/characters/${characterId}/portrait?size=256`;

    // Return HTML that sends message to parent window and closes
    res.send(`
      <html>
        <body style="background: #050505; color: #ffcc00; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center;">
            <h2 style="letter-spacing: 0.2em;">IDENTITY_VERIFIED</h2>
            <p style="font-size: 10px; opacity: 0.5;">TRANSMITTING_DATA_TO_TERMINAL...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'EVE_AUTH_SUCCESS', 
                  character: {
                    id: '${characterId}',
                    name: '${characterName}',
                    portraitUrl: '${portraitUrl}'
                  }
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('EVE SSO Error:', error.response?.data || error.message);
    res.status(500).send(`Authentication failed: ${JSON.stringify(error.response?.data || error.message)}`);
  }
}
