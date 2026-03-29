import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import { initDatabase, getAllSkins, getSkinsByCharacterId, createSkin, deleteSkin, addAdditionalImage, setMainImage, searchUsers } from './src/db.js';
import fs from 'fs';

dotenv.config();

const DATA_FILE = './skins-data.json';

// In-memory storage for skin metadata (fallback when no database)
interface Skin {
  id: string;
  imageUrl: string;
  cloudinaryId: string;
  additionalImages?: { url: string; cloudinaryId: string }[];
  name: string;
  description: string;
  characterName: string;
  characterId: number;
  uid: string;
  createdAt: string;
}

const skinsStore: Map<string, Skin> = new Map();

// Load skins from JSON file
function loadSkins() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      data.forEach((skin: Skin) => skinsStore.set(skin.id, skin));
      console.log(`Loaded ${data.length} skins from ${DATA_FILE}`);
    }
  } catch (error) {
    console.error('Error loading skins:', error);
  }
}

// Save skins to JSON file
function saveSkins() {
  try {
    const data = Array.from(skinsStore.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving skins:', error);
  }
}

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
  const PORT = parseInt(process.env.PORT || '3000');

  // Initialize database if DATABASE_URL is set
  let useDatabase = false;
  if (process.env.DATABASE_URL) {
    try {
      await initDatabase();
      useDatabase = true;
      console.log('Using PostgreSQL database');
    } catch (err) {
      console.warn('Failed to connect to database, falling back to in-memory storage:', err);
    }
  } else {
    console.log('No DATABASE_URL set, using in-memory storage with JSON persistence');
  }

  // Load existing skins from JSON if not using database
  if (!useDatabase) {
    loadSkins();
  }

  app.set('trust proxy', 1);

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  app.use(session({
    secret: 'eve-skinr-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'lax',
      httpOnly: true 
    }
  }));

  // --- API ROUTES FOR DATA ---

  // Get all skins
  app.get('/api/skins', async (req, res) => {
    try {
      const skins = await getAllSkins();
      res.json(skins);
    } catch (error: any) {
      console.error('Error fetching skins:', error);
      res.status(500).json({ error: 'Failed to fetch skins' });
    }
  });

  // Upload a skin (Cloudinary)
  app.post('/api/skins', async (req, res) => {
    const character = (req.session as any).character;
    console.log('Upload request received. Session character:', character);

    if (!character) {
      console.warn('Unauthorized upload attempt. Session ID:', req.sessionID);
      return res.status(401).json({ error: 'UNAUTHORIZED: Please login with EVE SSO' });
    }

    try {
      const { imageUrl, description, name } = req.body; // imageUrl is base64

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
        if (!result) {
          return res.status(500).json({ error: 'Cloudinary upload returned no result' });
        }
        
        // 3. Store metadata in database
        const newSkin = await createSkin({
          id: uuidv4(),
          imageUrl: result.secure_url,
          cloudinaryId: result.public_id,
          name: name || 'Unnamed Skin',
          description: description || '',
          characterName: character.name,
          characterId: parseInt(character.id),
          uid: `eve_${character.id}`,
          createdAt: new Date().toISOString()
        });
        
        res.json(newSkin);
      });
      streamifier.createReadStream(buffer).pipe(uploadStream);
    } catch (error: any) {
      console.error('Error uploading skin:', error);
      res.status(500).json({ error: `Failed to upload skin: ${error.message}` });
    }
  });

  // Delete a skin
  app.delete('/api/skins/:id', async (req, res) => {
    const character = (req.session as any).character;
    
    if (!character) {
      return res.status(401).json({ error: 'UNAUTHORIZED: Please login with EVE SSO' });
    }

    try {
      const { id } = req.params;
      const skins = await getAllSkins();
      const skin = skins.find(s => s.id === id);
      
      if (!skin) {
        return res.status(404).json({ error: 'Skin not found' });
      }
      
      // Check ownership
      if (skin.characterId.toString() !== character.id.toString()) {
        return res.status(403).json({ error: 'FORBIDDEN: You can only delete your own skins' });
      }
      
      // Delete from Cloudinary
      await cloudinary.uploader.destroy(skin.cloudinaryId);
      
      // Delete additional images from Cloudinary
      if (skin.additionalImages) {
        for (const img of skin.additionalImages) {
          await cloudinary.uploader.destroy(img.cloudinaryId);
        }
      }
      
      // Delete from database
      await deleteSkin(id);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting skin:', error);
      res.status(500).json({ error: 'Failed to delete skin' });
    }
  });

  // Add image to existing skin
  app.post('/api/skins/:id/images', async (req, res) => {
    const character = (req.session as any).character;
    
    if (!character) {
      return res.status(401).json({ error: 'UNAUTHORIZED: Please login with EVE SSO' });
    }

    try {
      const { id } = req.params;
      const { imageUrl } = req.body;
      
      if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ error: 'INVALID_PAYLOAD: imageUrl is required' });
      }
      
      const skins = await getAllSkins();
      const skin = skins.find(s => s.id === id);
      
      if (!skin) {
        return res.status(404).json({ error: 'Skin not found' });
      }
      
      // Check ownership
      if (skin.characterId.toString() !== character.id.toString()) {
        return res.status(403).json({ error: 'FORBIDDEN: You can only add images to your own skins' });
      }
      
      // Convert base64 to buffer
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const mimeType = imageUrl.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/png';

      // Upload to Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream({
        folder: `skins/${character.id}/${id}`,
        resource_type: 'image',
        format: mimeType.split('/')[1] || 'png',
      }, async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({ error: 'Failed to upload image to Cloudinary' });
        }
        if (!result) {
          return res.status(500).json({ error: 'Cloudinary upload returned no result' });
        }
        
        // Add to database
        await addAdditionalImage(id, result.secure_url, result.public_id);
        
        // Get updated skin
        const updatedSkins = await getAllSkins();
        const updatedSkin = updatedSkins.find(s => s.id === id);
        
        res.json(updatedSkin);
      });
      streamifier.createReadStream(buffer).pipe(uploadStream);
    } catch (error: any) {
      console.error('Error adding image to skin:', error);
      res.status(500).json({ error: `Failed to add image: ${error.message}` });
    }
  });

  // Set an image as the main image (reorder)
  app.post('/api/skins/:id/set-main-image', async (req, res) => {
    const character = (req.session as any).character;
    
    if (!character) {
      return res.status(401).json({ error: 'UNAUTHORIZED: Please login with EVE SSO' });
    }

    try {
      const { id } = req.params;
      const { imageIndex } = req.body;
      
      if (typeof imageIndex !== 'number' || imageIndex < 0) {
        return res.status(400).json({ error: 'INVALID_PAYLOAD: imageIndex is required' });
      }
      
      const skins = await getAllSkins();
      const skin = skins.find(s => s.id === id);
      
      if (!skin) {
        return res.status(404).json({ error: 'Skin not found' });
      }
      
      // Check ownership
      if (skin.characterId.toString() !== character.id.toString()) {
        return res.status(403).json({ error: 'FORBIDDEN: You can only modify your own skins' });
      }
      
      await setMainImage(id, imageIndex);
      
      // Get updated skin
      const updatedSkins = await getAllSkins();
      const updatedSkin = updatedSkins.find(s => s.id === id);
      
      res.json(updatedSkin);
    } catch (error: any) {
      console.error('Error setting main image:', error);
      res.status(500).json({ error: `Failed to set main image: ${error.message}` });
    }
  });

  // Get skins by character ID (public endpoint for profiles)
  app.get('/api/skins/character/:characterId', async (req, res) => {
    try {
      const { characterId } = req.params;
      const characterSkins = await getSkinsByCharacterId(parseInt(characterId));
      
      // Get unique character info from first skin (if any)
      const characterInfo = characterSkins.length > 0 ? {
        characterName: characterSkins[0].characterName,
        characterId: characterSkins[0].characterId
      } : null;
      
      res.json({ skins: characterSkins, character: characterInfo });
    } catch (error: any) {
      console.error('Error fetching character skins:', error);
      res.status(500).json({ error: 'Failed to fetch skins' });
    }
  });

  // Search users by name (returns unique character IDs with names)
  app.get('/api/users/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query required' });
      }
      
      const users = await searchUsers(q);
      
      res.json({ users });
    } catch (error: any) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Failed to search users' });
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
    const clientId = process.env.EVE_CLIENT_ID || '<your_eve_client_id>';
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
      const clientId = process.env.EVE_CLIENT_ID || '<your_eve_client_id>';
      const clientSecret = process.env.EVE_CLIENT_SECRET || '<your_eve_client_secret>';
      
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

        // Send success message to parent window and close popup
        res.send(`
          <html>
            <body style="background: #050505; color: #ffcc00; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh;">
              <div style="text-align: center;">
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
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
