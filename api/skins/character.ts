import type { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function getSkinsByCharacterId(characterId: number) {
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
    WHERE s.character_id = $1
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `, [characterId]);
  
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

  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Character ID required' });
  }

  try {
    const skins = await getSkinsByCharacterId(Number(id));
    
    // Get character info from first skin, or return placeholder
    const character = skins.length > 0 ? {
      characterId: skins[0].characterId,
      characterName: skins[0].characterName
    } : {
      characterId: Number(id),
      characterName: 'Unknown Pilot'
    };
    
    res.status(200).json({ skins, character });
  } catch (error: any) {
    console.error('Error fetching character skins:', error);
    res.status(500).json({ error: 'Failed to fetch skins', details: error.message });
  }
}
