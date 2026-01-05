-- Add emoji column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS emoji text;
