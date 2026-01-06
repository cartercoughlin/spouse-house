-- Add inviter_email column to family_invitations to avoid needing admin lookups
ALTER TABLE family_invitations
ADD COLUMN IF NOT EXISTS inviter_email TEXT;

-- Update existing rows to populate inviter_email
-- This will fail for existing rows, but that's okay since we'll populate it going forward
