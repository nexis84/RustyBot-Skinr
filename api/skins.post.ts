import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { createSkin } from '../src/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
  } catch (error) {
    res.status(500).json({ error: 'Failed to create skin' });
  }
}
