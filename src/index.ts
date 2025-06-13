import express, { Request, Response, NextFunction } from "express";
import apiRoutes from "./api/index";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();

// CORS Configuration
const allowedOrigins = [
  "http://localhost:3000", // Local development
  "https://lingualand.vercel.app", // Production frontend
  process.env.FRONTEND_URL, // Environment variable
].filter(Boolean); // Remove undefined values

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Handle API routes
app.use("/api", apiRoutes);

// Frontend URL
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// For all other routes, redirect to the frontend
app.get("*", (req: Request, res: Response) => {
  // If this is an API request that wasn't caught by the API router, return 404
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }

  // Redirect to the frontend URL
  res.redirect(FRONTEND_URL);
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
});
