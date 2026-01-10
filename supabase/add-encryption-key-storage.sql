-- Migration: Store encryption keys in database for cross-device support
-- The encryption key is stored encrypted, tied to the user's account

-- Add encryption_key column to store the base64-encoded key
-- This key is used to encrypt/decrypt all credentials for this user
ALTER TABLE webauthn_credentials
ADD COLUMN IF NOT EXISTS encryption_key TEXT;

-- Also create a standalone table for users who want a master password fallback
CREATE TABLE IF NOT EXISTS user_encryption_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  encryption_key TEXT NOT NULL, -- Base64-encoded AES-256 key
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE user_encryption_keys ENABLE ROW LEVEL SECURITY;

-- Users can only access their own encryption key
CREATE POLICY "Users can view their own encryption key"
  ON user_encryption_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own encryption key"
  ON user_encryption_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own encryption key"
  ON user_encryption_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own encryption key"
  ON user_encryption_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS user_encryption_keys_user_id_idx ON user_encryption_keys(user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_user_encryption_keys_updated_at
  BEFORE UPDATE ON user_encryption_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
