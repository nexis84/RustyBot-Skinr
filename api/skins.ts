import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function getAllSkins() {
  const result = await pool.query(`
    SELECT s.*, 
      COALESCE(
        json_agg(
          json_build_object('url', ai.url, 'cloudinaryId', ai.cloudinary_id)
        ) FILTER (WHERE ai.id IS NOT NULL),
        '[]'
      ) as additional_images
    FROM skins s
    LEFT JOIN additional_images ai ON s.id = ai.skin_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `);
  
  return result.rows.map(row => ({
    id: row.id,
    imageUrl: row.image_url,
    cloudinaryId: row.cloudinary_id,
    additionalImages: row.additional_images || [],
    name: row.name,
    description: row.description,
    characterName: row.character_name,
    characterId: row.character_id,
    uid: row.uid,
    createdAt: row.created_at
  }));
}

async function createSkin(skin: any) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const result = await client.query(`
      INSERT INTO skins (id, image_url, cloudinary_id, name, description, character_name, character_id, uid)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      skin.id,
      skin.imageUrl,
      skin.cloudinaryId,
      skin.name,
      skin.description,
      skin.characterName,
      skin.characterId,
      skin.uid
    ]);
    
    await client.query('COMMIT');
    
    return {
      ...result.rows[0],
      imageUrl: result.rows[0].image_url,
      cloudinaryId: result.rows[0].cloudinary_id,
      characterName: result.rows[0].character_name,
      characterId: result.rows[0].character_id,
      createdAt: result.rows[0].created_at,
      additionalImages: []
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

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
