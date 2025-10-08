-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create conversations table
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language VARCHAR(50) NOT NULL,
  title VARCHAR(255) DEFAULT 'My Conversation',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_language UNIQUE (user_id, language)
);

-- Create messages table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  is_user BOOLEAN NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_settings table
CREATE TABLE user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language_preference VARCHAR(50) DEFAULT 'English',
  theme_preference VARCHAR(20) DEFAULT 'auto',
  auto_listen BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_language ON conversations(language);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Insert a test user (password is 'password123')
-- Password hash for 'password123' using bcrypt
INSERT INTO users (username, email, password_hash) 
VALUES (
  'testuser', 
  'test@example.com', 
  '$2a$10$K7L1/BTyOhN1jkz9mFJJ7z.XYZaBCDefGHijklMNOpqrstuvwxyzABC'
) 
ON CONFLICT (email) DO NOTHING;