import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectRedis from 'connect-redis';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

dotenv.config();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '<your_cloud_name>',
  api_key: process.env.CLOUDINARY_API_KEY || '<your_api_key>',
  api_secret: process.env.CLOUDINARY_API_SECRET || '<your_api_secret>'
});

const upload = multer();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  let sessionOptions: any = {
    secret: process.env.SESSION_SECRET || 'eve-skinr-secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: true,
      sameSite: 'none',
      httpOnly: true
    }
  };

  // Use Redis session store in production (Render)
  if (process.env.REDIS_URL) {
    const RedisStore = connectRedis(session);
    const redisClient = new Redis(process.env.REDIS_URL);
    sessionOptions.store = new RedisStore({ client: redisClient });
    console.log('Using Redis session store');
  } else {
    console.log('Using default in-memory session store');
  }

  app.use(session(sessionOptions));

  // --- API ROUTES FOR DATA ---

  // Get all skins
  app.get('/api/skins', async (req, res) => {
    try {
      const snapshot = await db.collection('skins').orderBy('createdAt', 'desc').get();
      const skins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(skins);
    } catch (error: any) {
      console.error('Error fetching skins:', error);
      res.status(500).json({ error: 'Failed to fetch skins' });
    }
  });

  // Upload a skin
  app.post('/api/skins', async (req, res) => {
    const character = (req.session as any).character;
    console.log('Upload request received. Session character:', character);
    
    if (!character) {
      console.warn('Unauthorized upload attempt. Session ID:', req.sessionID);
      return res.status(401).json({ error: 'UNAUTHORIZED: Please login with EVE SSO' });
    }

    try {
      const { imageUrl, description } = req.body; // imageUrl is base64
      
      if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ error: 'INVALID_PAYLOAD: imageUrl is required' });
      }

      console.log('Starting upload for character:', character.id);
      
      // 1. Convert base64 to buffer
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const mimeType = imageUrl.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/png';
      
      // 2. Upload to Firebase Storage
      const extension = mimeType.split('/')[1] || 'png';
      const fileName = `skins/${character.id}/${uuidv4()}.${extension}`;
      const file = bucket.file(fileName);
      
      console.log('Uploading to bucket:', bucket.name, 'path:', fileName);
      
      // Upload a skin (Cloudinary)
      app.post('/api/skins', upload.none(), async (req, res) => {
        const character = (req.session as any).character;
        console.log('Upload request received. Session character:', character);
    
        if (!character) {
          console.warn('Unauthorized upload attempt. Session ID:', req.sessionID);
          return res.status(401).json({ error: 'UNAUTHORIZED: Please login with EVE SSO' });
        }

        try {
          const { imageUrl, description } = req.body; // imageUrl is base64
      
          if (!imageUrl || typeof imageUrl !== 'string') {
            return res.status(400).json({ error: 'INVALID_PAYLOAD: imageUrl is required' });
          }

          console.log('Starting upload for character:', character.id);

          // 1. Convert base64 to buffer
          const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const mimeType = imageUrl.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/png';

          // 2. Upload to Cloudinary
          const uploadStream = cloudinary.uploader.upload_stream({
            folder: `skins/${character.id}`,
            resource_type: 'image',
            format: mimeType.split('/')[1] || 'png',
          }, async (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              return res.status(500).json({ error: 'Failed to upload image to Cloudinary' });
            }
            // 3. Store metadata (for now, just return the Cloudinary URL)
            const newSkin = {
              imageUrl: result.secure_url,
              cloudinaryId: result.public_id,
              description: description || '',
              characterName: character.name,
              characterId: parseInt(character.id),
              uid: `eve_${character.id}`,
              createdAt: new Date().toISOString()
            };
            // TODO: Store newSkin in a database if needed
            res.json({ ...newSkin });
          });
          streamifier.createReadStream(buffer).pipe(uploadStream);
        } catch (error: any) {
          console.error('Error uploading skin:', error);
          res.status(500).json({ error: `Failed to upload skin: ${error.message}` });
        }
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting skin:', error);
      res.status(500).json({ error: 'Failed to delete skin' });
    }
  });

  // Get current session character
  app.get('/api/auth/me', (req, res) => {
    const character = (req.session as any).character;
    console.log('Session check (/api/auth/me). Character:', character, 'Session ID:', req.sessionID);
    res.json({ character: character || null });
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: 'Logout failed' });
      res.json({ success: true });
    });
  });

  // EVE SSO Auth URL
  app.get('/api/auth/eve/url', (req, res) => {
    const clientId = process.env.EVE_CLIENT_ID || '35216ef7be2a46d1a36467ed172f077a';
    const origin = req.query.origin as string;
    const redirectUri = `${origin}/auth/eve/callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      redirect_uri: redirectUri,
      client_id: clientId,
      scope: 'publicData',
      state: JSON.stringify({ origin })
    });

    res.json({ url: `https://login.eveonline.com/v2/oauth/authorize?${params.toString()}` });
  });

  // EVE SSO Callback
  app.get('/auth/eve/callback', async (req, res) => {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('No code provided');

    let origin: string | null = null;
    try {
      const stateData = JSON.parse(state as string);
      origin = stateData.origin;
    } catch (e) {
      console.error('Invalid state:', state);
    }

    try {
      const clientId = process.env.EVE_CLIENT_ID || '35216ef7be2a46d1a36467ed172f077a';
      const clientSecret = process.env.EVE_CLIENT_SECRET || 'eat_1VZ6bntTQn0TGIfXMz3d6y6mRASRCvRKN_4NEvB7';
      
      const currentOrigin = origin || process.env.APP_URL || `https://${req.get('host')}`;
      const redirectUri = `${currentOrigin}/auth/eve/callback`;

      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const tokenResponse = await axios.post('https://login.eveonline.com/v2/oauth/token', 
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

      const { access_token } = tokenResponse.data;

      const verifyResponse = await axios.get('https://login.eveonline.com/oauth/verify', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const characterData = verifyResponse.data;
      const characterId = characterData.CharacterID.toString();
      const characterName = characterData.CharacterName;
      const portraitUrl = `https://images.evetech.net/characters/${characterId}/portrait?size=256`;

      // Store character in session
      (req.session as any).character = {
        id: characterId,
        name: characterName,
        portraitUrl: portraitUrl
      };

      // Explicitly save session before sending response
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).send('Failed to save session');
        }

        // Send postMessage to opener window with character data and close popup
        res.send(`
          <html>
            <body style="background: #050505; color: #ffcc00; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh;">
              <div style="text-align: center;">
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
                  }
                </script>
                <h2 style="letter-spacing: 0.2em;">IDENTITY_VERIFIED</h2>
                <p style="font-size: 10px; opacity: 0.5;">TRANSMITTING_DATA_TO_TERMINAL...</p>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({ 
                      type: 'EVE_AUTH_SUCCESS', 
                      character: ${JSON.stringify({
                        id: characterId,
                        name: characterName,
                        portraitUrl: portraitUrl
                      })} 
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
      });
    } catch (error: any) {
      const errorDetail = error.response?.data || error.message;
      console.error('EVE SSO Error:', errorDetail);
      res.status(500).send(`Authentication failed: ${JSON.stringify(errorDetail)}`);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
