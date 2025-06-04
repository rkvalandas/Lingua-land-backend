import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import db from "../db/client";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Verify user still exists
    const userResult = await db.query(
      "SELECT id, email, username FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next(); // Continue without authentication
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const userResult = await db.query(
      "SELECT id, email, username FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (userResult.rows.length > 0) {
      req.user = userResult.rows[0];
    }
  } catch (error) {
    // Invalid token, but continue without authentication
    console.log(
      "Optional auth failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  next();
};
