import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Extract name from email: take prefix until first '.' or '@'
function extractNameFromEmail(email: string): string {
  const dotIndex = email.indexOf('.');
  const atIndex = email.indexOf('@');

  // Find the first occurrence of '.' or '@'
  let endIndex = email.length;
  if (dotIndex !== -1) endIndex = Math.min(endIndex, dotIndex);
  if (atIndex !== -1) endIndex = Math.min(endIndex, atIndex);

  const name = email.substring(0, endIndex);
  // Capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1);
}

router.post('/login', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const name = extractNameFromEmail(email);
    const user = await prisma.user.upsert({
      where: { email },
      update: { name },
      create: { email, name },
    });
    res.json({ user });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
