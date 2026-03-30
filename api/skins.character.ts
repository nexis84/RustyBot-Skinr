import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSkinsByCharacterId } from '../src/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing character id' });
  }
  try {
    const skins = await getSkinsByCharacterId(Number(id));
    res.status(200).json({ skins });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch skins by character' });
  }
}
