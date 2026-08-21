import { Router } from 'express';
import { getDb, isDbConnected } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/chat/conversations?userId=...
router.get('/chat/conversations', optionalAuth, async (req, res) => {
  const requestedUserId = req.query.userId || req.query.studentId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId) {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';

  if (!isDbConnected()) {
    return res.json({
      success: true,
      source: 'fallback',
      conversations: [],
    });
  }

  try {
    const db = getDb();
    const chatCollection = db.collection('chatMessages');

    const rawConvs = await chatCollection
      .aggregate([
        { $match: { userId } },
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: '$conversationId',
            lastActivity: { $max: '$createdAt' },
            messageCount: { $sum: 1 },
            firstUserMessage: {
              $first: {
                $cond: [{ $eq: ['$role', 'user'] }, '$content', null],
              },
            },
            messages: {
              $push: {
                role: '$role',
                content: '$content',
                createdAt: '$createdAt',
              },
            },
          },
        },
        { $sort: { lastActivity: -1 } },
      ])
      .toArray();

    const conversations = rawConvs.map((c) => {
      const convId = c._id;
      const isTopic = convId.startsWith('topic-');
      let topicId = null;

      if (isTopic) {
        const withoutPrefix = convId.replace(/^topic-/, '');
        const parts = withoutPrefix.split('-');
        if (parts.length > 1 && /^\d{13}$/.test(parts[parts.length - 1])) {
          topicId = parts.slice(0, -1).join('-');
        } else {
          topicId = withoutPrefix;
        }
      }

      const userMsgObj = c.messages.find((m) => m.role === 'user');
      const rawContent = userMsgObj ? userMsgObj.content : c.firstUserMessage || 'New Conversation';

      let title =
        typeof rawContent === 'string'
          ? rawContent.replace(/\[Attached\s+\d+\s+item\(s\)\]/gi, '').trim()
          : 'New Conversation';

      if (!title) title = 'Conversation';
      if (title.length > 40) title = title.slice(0, 37) + '...';

      return {
        conversationId: convId,
        title,
        lastActivity: c.lastActivity || Date.now(),
        messageCount: c.messageCount || 0,
        type: isTopic ? 'topic' : 'general',
        topicId,
      };
    });

    res.json({
      success: true,
      source: 'mongodb',
      conversations,
    });
  } catch (error) {
    console.error('Error in GET /api/chat/conversations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/chat/history?userId=...&conversationId=...
router.get('/chat/history', optionalAuth, async (req, res) => {
  const requestedUserId = req.query.userId || req.query.studentId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId) {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';
  const conversationId = req.query.conversationId || 'standalone';
  const limit = parseInt(req.query.limit, 10) || 50;

  if (!isDbConnected()) {
    return res.json({
      success: true,
      source: 'fallback',
      messages: [],
    });
  }

  try {
    const db = getDb();
    const chatCollection = db.collection('chatMessages');

    const messages = await chatCollection
      .find({ userId, conversationId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray();

    res.json({
      success: true,
      source: 'mongodb',
      messages,
    });
  } catch (error) {
    console.error('Error in GET /api/chat/history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/chat/messages - Save message & attachment metadata
router.post('/chat/messages', optionalAuth, async (req, res) => {
  const requestedUserId = req.body.userId || req.body.studentId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId) {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';
  const { conversationId = 'standalone', message } = req.body;

  if (!message || !message.id) {
    return res.status(400).json({ success: false, error: 'Invalid message payload' });
  }

  if (!isDbConnected()) {
    return res.json({
      success: true,
      source: 'fallback',
      message,
    });
  }

  try {
    const db = getDb();
    const chatCollection = db.collection('chatMessages');
    const attachmentsCollection = db.collection('attachments');

    const doc = {
      userId,
      conversationId,
      messageId: message.id,
      role: message.sender === 'user' ? 'user' : 'assistant',
      senderName: message.senderName || (message.sender === 'user' ? 'You' : 'AI Assistant'),
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      attachments: message.attachments || (message.attachment ? [message.attachment] : []),
      imageResults: message.imageResults || [],
      createdAt: message.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    await chatCollection.updateOne(
      { userId, conversationId, messageId: message.id },
      { $set: doc },
      { upsert: true }
    );

    // Save attachment metadata to `attachments` collection
    if (doc.attachments && doc.attachments.length > 0) {
      const attDocs = doc.attachments.map((att, idx) => ({
        attachmentId: `att-${message.id}-${idx}`,
        userId,
        conversationId,
        messageId: message.id,
        fileName: att.fileName || 'Attachment',
        fileType: att.fileType || 'other',
        fileSize: att.fileSize || '0 B',
        contentExcerpt: att.content ? att.content.slice(0, 300) : '',
        createdAt: Date.now(),
      }));

      for (const attDoc of attDocs) {
        await attachmentsCollection.updateOne(
          { attachmentId: attDoc.attachmentId },
          { $set: attDoc },
          { upsert: true }
        );
      }
    }

    res.json({
      success: true,
      source: 'mongodb',
      message: doc,
    });
  } catch (error) {
    console.error('Error in POST /api/chat/messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/chat/history?userId=...&conversationId=...
router.delete('/chat/history', optionalAuth, async (req, res) => {
  const requestedUserId = req.query.userId || req.body?.userId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId) {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';
  const conversationId = req.query.conversationId || req.body?.conversationId || 'standalone';

  if (!isDbConnected()) {
    return res.json({
      success: true,
      source: 'fallback',
      deletedCount: 0,
    });
  }

  try {
    const db = getDb();
    const chatCollection = db.collection('chatMessages');
    const attachmentsCollection = db.collection('attachments');

    const chatRes = await chatCollection.deleteMany({ userId, conversationId });
    await attachmentsCollection.deleteMany({ userId, conversationId });

    res.json({
      success: true,
      source: 'mongodb',
      deletedCount: chatRes.deletedCount || 0,
    });
  } catch (error) {
    console.error('Error in DELETE /api/chat/history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
