-- Migration: Update conversations schema to support multiple conversations per user
-- Created: 2025-06-01

-- Step 1: Drop the old unique constraint on user_id
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_key;

-- Step 2: Add the new composite unique constraint for user_id + language
ALTER TABLE conversations ADD CONSTRAINT unique_user_language UNIQUE (user_id, language);

-- Step 3: Add updated_at column if it doesn't exist
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Step 4: Update existing conversations to have meaningful titles
UPDATE conversations SET title = CONCAT(language, ' Conversation') WHERE title = 'My Conversation' OR title IS NULL;

-- Step 5: Add index for better performance on the new constraint
CREATE INDEX IF NOT EXISTS idx_conversations_user_language ON conversations(user_id, language);
