-- Add inviter_email column to family_invitations to avoid needing admin lookups
ALTER TABLE family_invitations
ADD COLUMN IF NOT EXISTS inviter_email TEXT;

-- Update existing rows to populate inviter_email with cocoughlin@me.com
UPDATE family_invitations
SET inviter_email = 'cocoughlin@me.com'
WHERE inviter_email IS NULL;
