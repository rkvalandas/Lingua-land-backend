import express, { Request, Response, NextFunction } from "express";
import apiRoutes from "./api/index";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
const corsConfig = {
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow cookies to be sent with requests
};

app.options("", cors(corsConfig));
app.use(cors(corsConfig));
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
