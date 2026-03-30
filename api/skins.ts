import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { getAllSkins, createSkin } from '../src/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('[/api/skins] Received request:', req.method);
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

  if (req.method === 'GET') {
    try {
      const skins = await getAllSkins();
      res.status(200).json(skins);
    } catch (error: any) {
      console.error('Error in GET /api/skins:', error);
      res.status(500).json({ error: 'Failed to fetch skins', details: error.message });
    }
  } else if (req.method === 'POST') {
    try {
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
