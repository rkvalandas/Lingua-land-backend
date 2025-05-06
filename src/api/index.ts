import express, { Request, Response } from 'express';
import  processWithLangChain  from './langchain';
import { handleGenerateTTS } from './tts';
import db from '../db/client';

const router = express.Router();

// Process conversation
router.post("/conversation", async (req: Request, res: Response) => {
  try {
    const { text, userId, conversationId, language } = req.body;

    // 1. Store user message
    const userMsgResult = await db.query(
      "INSERT INTO messages (conversation_id, is_user, content) VALUES ($1, $2, $3) RETURNING id",
      [conversationId, true, text]
    );

    // 2. Process text with LLM
    const aiResponse = await processWithLangChain(conversationId, text, language);

    // 4. Store AI message
    await db.query(
      "INSERT INTO messages (conversation_id, is_user, content) VALUES ($1, $2, $3)",
      [conversationId, false, aiResponse]
    );

    res.json({ userText: text, aiResponse });
  } catch (error) {
    console.error("Error processing conversation:", error);
    res.status(500).json({ error: "Failed to process conversation" });
  }
});

router.post('/tts', handleGenerateTTS);

// Start a new conversation
router.post("/conversations", async (req: Request, res: Response) => {
  try {
    const { userId, language } = req.body;
    const result = await db.query(
      "INSERT INTO conversations (user_id, language) VALUES ($1, $2) RETURNING id",
      [userId, language]
    );
    res.json({ conversationId: result.rows[0].id });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

export default router;