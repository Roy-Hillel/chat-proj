import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { runAgent } from '../agent/service';

const router = Router();
const prisma = new PrismaClient();

router.post('/', async (req, res) => {
  const { message, conversationId, userId } = req.body;
  
  if (!message || !conversationId || !userId) {
     return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    // 1. Save User Message
    await prisma.message.create({
      data: {
        content: message,
        role: 'user',
        conversationId
      }
    });

    // 2. Fetch History
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    // 2.5 Auto-update title if still "New Chat" (use first user message as title)
    const userMessages = conversation.messages.filter(m => m.role === 'user');
    if (conversation.title === 'New Chat' && userMessages.length === 1) {
      const newTitle = message.substring(0, 50).trim() || 'New Chat';
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { title: newTitle }
      });
    }

    const history = conversation.messages.map(m => ({
      role: m.role as any,
      content: m.content
    }));

    // 3. Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullResponse = '';

    const generator = runAgent(history, { userId });

    for await (const event of generator) {
      if (event.type === 'content') {
        fullResponse += event.content;
        res.write(`event: content\ndata: ${JSON.stringify({ content: event.content })}\n\n`);
      } else if (event.type === 'tool_start') {
        res.write(`event: tool_start\ndata: ${JSON.stringify({ tool: event.tool, input: event.input })}\n\n`);
      } else if (event.type === 'tool_end') {
        res.write(`event: tool_end\ndata: ${JSON.stringify({ tool: event.tool, output: event.output })}\n\n`);
      } else if (event.type === 'error') {
        res.write(`event: error\ndata: ${JSON.stringify({ error: event.error })}\n\n`);
      } else if (event.type === 'done') {
        res.write(`event: done\ndata: [DONE]\n\n`);
      }
    }

    // 4. Save Assistant Message
    if (fullResponse) {
      await prisma.message.create({
        data: {
          content: fullResponse,
          role: 'assistant',
          conversationId
        }
      });
    }

    res.end();
  } catch (error: any) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

export default router;
