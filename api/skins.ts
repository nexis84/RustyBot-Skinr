import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllSkins } from '../src/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const skins = await getAllSkins();
      res.status(200).json(skins);
    } catch (error) {
      console.error('Error in /api/skins:', error);
      res.status(500).json({ error: 'Failed to fetch skins', details: error.message });
    }
  } else {
    console.warn('Invalid method for /api/skins:', req.method);
    res.status(405).json({ error: 'Method not allowed' });
  }
}
