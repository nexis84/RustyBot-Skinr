import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // For static/serverless, you would use a JWT or cookie-based session
  // This is a placeholder: always returns not logged in
  res.status(200).json({ character: null });
}
