import express, { Request, Response } from "express";
import processWithLangChain, {
  checkGrammar,
  translateText,
  summariseText,
  paraphraseText,
} from "./aiservices";
import { handleGenerateTTS } from "./tts";
import { AuthRequest, authenticateToken } from "../middleware/auth";
import authRoutes from "./auth";
import db from "../db/client";

const router = express.Router();

// Auth routes
router.use("/auth", authRoutes);

// Process conversation - protected route
router.post(
  "/conversation",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { text, language } = req.body;

      if (!text || !language) {
        return res
          .status(400)
          .json({ error: "Text and language are required" });
      }

      // Get or create user's conversation for the specific language
      let conversationResult = await db.query(
        "SELECT id FROM conversations WHERE user_id = $1 AND language = $2",
        [req.user.id, language]
      );

      let conversationId;
      if (conversationResult.rows.length === 0) {
        // Create new conversation for this language if none exists
        const newConversationResult = await db.query(
          "INSERT INTO conversations (user_id, language, title) VALUES ($1, $2, $3) RETURNING id",
          [req.user.id, language, `${language} Conversation`]
        );
        conversationId = newConversationResult.rows[0].id;
      } else {
        conversationId = conversationResult.rows[0].id;
        // Update conversation's updated_at timestamp
        await db.query(
          "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [conversationId]
        );
      }

      // Store user message
      const userMsgResult = await db.query(
        "INSERT INTO messages (conversation_id, is_user, content) VALUES ($1, $2, $3) RETURNING id",
        [conversationId, true, text]
      );

      // Process text with LLM
      const aiResponse = await processWithLangChain(
        conversationId,
        text,
        language
      );

      // Store AI message
      await db.query(
        "INSERT INTO messages (conversation_id, is_user, content) VALUES ($1, $2, $3)",
        [conversationId, false, aiResponse]
      );

      res.json({ userText: text, aiResponse, conversationId });
    } catch (error) {
      console.error("Error processing conversation:", error);
      res.status(500).json({ error: "Failed to process conversation" });
    }
  }
);

// Get conversation history - protected route
router.get(
  "/conversation",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { language } = req.query;

      if (!language) {
        // Return all conversations if no specific language requested
        const conversationsResult = await db.query(
          "SELECT id, language, title, created_at, updated_at FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC",
          [req.user.id]
        );

        return res.json({ conversations: conversationsResult.rows });
      }

      // Get specific conversation by language
      const conversationResult = await db.query(
        "SELECT id, language, title, created_at, updated_at FROM conversations WHERE user_id = $1 AND language = $2",
        [req.user.id, language]
      );

      if (conversationResult.rows.length === 0) {
        return res.json({ conversation: null, messages: [] });
      }

      const conversation = conversationResult.rows[0];

      // Get messages for the conversation
      const messagesResult = await db.query(
        "SELECT id, is_user, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
        [conversation.id]
      );

      res.json({
        conversation,
        messages: messagesResult.rows,
      });
    } catch (error) {
      console.error("Error getting conversation:", error);
      res.status(500).json({ error: "Failed to get conversation" });
    }
  }
);

// Start a new conversation (clear existing for specific language) - protected route
router.post(
  "/conversation/new",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { language, title } = req.body;

      if (!language) {
        return res.status(400).json({ error: "Language is required" });
      }

      // Use provided title or default to language name
      const conversationTitle = title || `${language} Conversation`;

      // Delete existing conversation for this language (cascade will handle messages)
      await db.query(
        "DELETE FROM conversations WHERE user_id = $1 AND language = $2",
        [req.user.id, language]
      );

      // Create new conversation for this language
      const result = await db.query(
        "INSERT INTO conversations (user_id, language, title) VALUES ($1, $2, $3) RETURNING id",
        [req.user.id, language, conversationTitle]
      );

      res.json({
        conversationId: result.rows[0].id,
        message: "New conversation started",
      });
    } catch (error) {
      console.error("Error creating new conversation:", error);
      res.status(500).json({ error: "Failed to create new conversation" });
    }
  }
);

// Delete a specific conversation - protected route
router.delete(
  "/conversation/:language",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { language } = req.params;

      if (!language) {
        return res.status(400).json({ error: "Language is required" });
      }

      // Delete conversation for this language (cascade will handle messages)
      const result = await db.query(
        "DELETE FROM conversations WHERE user_id = $1 AND language = $2 RETURNING id",
        [req.user.id, language]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json({
        message: `Conversation for ${language} deleted successfully`,
      });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  }
);

// Update conversation title - protected route
router.put(
  "/conversation/:language/title",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { language } = req.params;
      const { title } = req.body;

      if (!language || !title) {
        return res
          .status(400)
          .json({ error: "Language and title are required" });
      }

      // Update conversation title
      const result = await db.query(
        "UPDATE conversations SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND language = $3 RETURNING id",
        [title, req.user.id, language]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json({
        message: "Conversation title updated successfully",
      });
    } catch (error) {
      console.error("Error updating conversation title:", error);
      res.status(500).json({ error: "Failed to update conversation title" });
    }
  }
);

// Grammar checker endpoint - protected route
router.post(
  "/grammar-check",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { text, language = "English" } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const result = await checkGrammar(text, language);
      res.json({ result, originalText: text, language });
    } catch (error) {
      console.error("Error checking grammar:", error);
      res.status(500).json({ error: "Failed to check grammar" });
    }
  }
);

// Translator endpoint - protected route
router.post(
  "/translate",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const {
        text,
        sourceLanguage = "English",
        targetLanguage = "Spanish",
      } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const result = await translateText(text, sourceLanguage, targetLanguage);
      res.json({
        result,
        originalText: text,
        sourceLanguage,
        targetLanguage,
      });
    } catch (error) {
      console.error("Error translating text:", error);
      res.status(500).json({ error: "Failed to translate text" });
    }
  }
);

// Summariser endpoint - protected route
router.post(
  "/summarise",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { text, language = "English" } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const result = await summariseText(text, language);
      res.json({ result, originalText: text, language });
    } catch (error) {
      console.error("Error summarising text:", error);
      res.status(500).json({ error: "Failed to summarise text" });
    }
  }
);

// Paraphraser endpoint - protected route
router.post(
  "/paraphrase",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { text, language = "English" } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const result = await paraphraseText(text, language);
      res.json({ result, originalText: text, language });
    } catch (error) {
      console.error("Error paraphrasing text:", error);
      res.status(500).json({ error: "Failed to paraphrase text" });
    }
  }
);

// TTS endpoint - protected route
router.post("/tts", authenticateToken, handleGenerateTTS);

export default router;
