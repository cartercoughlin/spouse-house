-- Migration: Add credentials and WebAuthn tables for Apple Passwords-like integration
-- Credentials are encrypted client-side before storage
-- WebAuthn enables biometric authentication (Face ID/Touch ID)

-- WebAuthn credentials table - stores passkey/biometric credentials for users
CREATE TABLE webauthn_credentials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  device_type TEXT, -- 'platform' (built-in) or 'cross-platform' (security key)
  backed_up BOOLEAN DEFAULT FALSE,
  transports TEXT[], -- array of transport types (usb, ble, nfc, internal)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Account credentials table - stores encrypted login credentials for accounts
-- Passwords are encrypted client-side using a key derived from WebAuthn
CREATE TABLE account_credentials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username_encrypted TEXT, -- Encrypted username/email
  password_encrypted TEXT, -- Encrypted password
  notes_encrypted TEXT, -- Encrypted notes (security questions, PINs, etc.)
  iv TEXT NOT NULL, -- Initialization vector for AES-GCM decryption
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(account_id) -- One credential per account
);

-- Indexes for better performance
CREATE INDEX webauthn_credentials_user_id_idx ON webauthn_credentials(user_id);
CREATE INDEX webauthn_credentials_credential_id_idx ON webauthn_credentials(credential_id);
CREATE INDEX account_credentials_account_id_idx ON account_credentials(account_id);
CREATE INDEX account_credentials_user_id_idx ON account_credentials(user_id);

-- Enable Row Level Security
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_credentials ENABLE ROW LEVEL SECURITY;

-- WebAuthn credential policies - users can only manage their own credentials
CREATE POLICY "Users can view their own webauthn credentials"
  ON webauthn_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webauthn credentials"
  ON webauthn_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webauthn credentials"
  ON webauthn_credentials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webauthn credentials"
  ON webauthn_credentials FOR DELETE
  USING (auth.uid() = user_id);

-- Account credentials policies - family members can access credentials for family accounts
CREATE POLICY "Family members can view family account credentials"
  ON account_credentials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid()
      AND fm2.user_id = account_credentials.user_id
    )
  );

CREATE POLICY "Users can insert their own account credentials"
  ON account_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own account credentials"
  ON account_credentials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own account credentials"
  ON account_credentials FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update account_credentials.updated_at
CREATE TRIGGER update_account_credentials_updated_at
  BEFORE UPDATE ON account_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
