import type { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function searchUsers(query: string) {
  const result = await pool.query(`
    SELECT 
      character_id as "characterId",
      character_name as "characterName",
      COUNT(*) as "skinCount"
    FROM skins
    WHERE LOWER(character_name) LIKE LOWER($1)
    GROUP BY character_id, character_name
    ORDER BY COUNT(*) DESC
    LIMIT 10
  `, [`%${query}%`]);
  
  return result.rows;
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

  const { q } = req.query;
  
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query parameter required' });
  }

  try {
    const users = await searchUsers(q);
    res.status(200).json({ users });
  } catch (error: any) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users', details: error.message });
  }
}
