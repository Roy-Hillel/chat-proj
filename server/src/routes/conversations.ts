import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Create Conversation
router.post('/', async (req, res) => {
  const { userId, title } = req.body;
  try {
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: title || 'New Chat',
      }
    });
    res.json(conversation);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// List Conversations
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(conversations);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get Conversation Details
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    if (!conversation) return res.status(404).json({ error: 'Not found' });
    res.json(conversation);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Delete Conversation
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Delete all messages first (due to foreign key constraint)
    await prisma.message.deleteMany({
      where: { conversationId: id }
    });
    // Then delete the conversation
    await prisma.conversation.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
