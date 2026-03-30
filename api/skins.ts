import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';

// Check DATABASE_URL before importing DB functions
if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is not set');
}

// Lazy import to avoid crashing on module load
let dbModule: any = null;
async function getDbModule() {
  if (!dbModule) {
    dbModule = await import('../src/db');
  }
  return dbModule;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('[/api/skins] DATABASE_URL not set');
    return res.status(500).json({ 
      error: 'Server configuration error: DATABASE_URL not set',
      details: 'Please set the DATABASE_URL environment variable in Vercel'
    });
  }

  if (req.method === 'GET') {
    try {
      const { getAllSkins } = await getDbModule();
      const skins = await getAllSkins();
      res.status(200).json(skins);
    } catch (error: any) {
      console.error('Error in GET /api/skins:', error);
      res.status(500).json({ error: 'Failed to fetch skins', details: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { createSkin } = await getDbModule();
      const { imageUrl, cloudinaryId, name, description, characterName, characterId, uid } = req.body;
      
      if (!imageUrl || !cloudinaryId || !characterName || !characterId || !uid) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const skin = {
        id: uuidv4(),
        imageUrl,
        cloudinaryId,
        name: name || 'Unnamed Skin',
        description: description || '',
        characterName,
        characterId,
        uid
      };

      const result = await createSkin(skin);
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Error in POST /api/skins:', error);
      res.status(500).json({ error: 'Failed to create skin', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
