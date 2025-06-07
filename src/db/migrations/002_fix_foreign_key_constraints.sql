-- Migration: Fix foreign key constraints to enable CASCADE DELETE
-- Created: 2025-06-05

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

-- Step 2: Re-create the foreign key constraint with CASCADE DELETE
ALTER TABLE messages ADD CONSTRAINT messages_conversation_id_fkey 
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- Verify the constraint is correct
-- This query should show confdeltype = 'c' for CASCADE
-- SELECT conname, confdeltype FROM pg_constraint WHERE conname = 'messages_conversation_id_fkey';
