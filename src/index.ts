import express, { Request, Response, NextFunction } from "express";
import apiRoutes from "./api/index";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();

// Allowed origins - add all your frontend URLs
const allowedOrigins = [
  "https://lingualand.vercel.app",
  "https://lingua-land.vercel.app", // Add other variations if needed
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean); // Remove undefined values

// CORS configuration with proper preflight handling
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("Blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false,
};

// Apply CORS before all routes
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options("*", cors(corsOptions));



app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Handle API routes
app.use("/api", apiRoutes);

// Frontend URL
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

app.get("/", (req: Request, res: Response) => {
  res.send("Language Learning App Backend is running.");
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
