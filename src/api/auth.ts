import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import db from "../db/client";
import { AuthRequest, authenticateToken } from "../middleware/auth";

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: "Too many authentication attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: { error: "Too many registration attempts, please try again later" },
});

// Register endpoint
router.post(
  "/register",
  registerLimiter,
  async (req: Request, res: Response) => {
    try {
      const { username, email, password } = req.body;

      // Validation
      if (!username || !email || !password) {
        return res
          .status(400)
          .json({ error: "Username, email, and password are required" });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters long" });
      }

      // Check if user already exists
      const existingUser = await db.query(
        "SELECT id FROM users WHERE email = $1",
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        return res
          .status(409)
          .json({ error: "User already exists with this email" });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const userResult = await db.query(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
        [username.trim(), email.toLowerCase(), passwordHash]
      );

      const user = userResult.rows[0];

      // Create user settings
      await db.query("INSERT INTO user_settings (user_id) VALUES ($1)", [
        user.id,
      ]);

      // Generate JWT token
      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET not configured");
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  }
);

// Login endpoint
router.post("/login", authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const userResult = await db.query(
      "SELECT id, username, email, password_hash FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

// Get current user endpoint
router.get(
  "/me",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get user settings
      const settingsResult = await db.query(
        "SELECT language_preference, theme_preference, auto_listen FROM user_settings WHERE user_id = $1",
        [req.user.id]
      );

      const settings = settingsResult.rows[0] || {};

      res.json({
        user: req.user,
        settings,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user data" });
    }
  }
);

// Update user settings
router.put(
  "/settings",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { language_preference, theme_preference, auto_listen } = req.body;

      await db.query(
        `UPDATE user_settings 
       SET language_preference = COALESCE($1, language_preference),
           theme_preference = COALESCE($2, theme_preference),
           auto_listen = COALESCE($3, auto_listen),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $4`,
        [language_preference, theme_preference, auto_listen, req.user.id]
      );

      res.json({ message: "Settings updated successfully" });
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  }
);

// Refresh token endpoint
router.post(
  "/refresh",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET not configured");
      }

      const token = jwt.sign(
        { userId: req.user.id, email: req.user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({ token });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(500).json({ error: "Failed to refresh token" });
    }
  }
);

export default router;
