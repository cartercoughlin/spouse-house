-- Add user_email column to family_members to avoid admin lookups
ALTER TABLE family_members
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Create a function to automatically set user_email when inserting
CREATE OR REPLACE FUNCTION set_family_member_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_email := (SELECT email FROM auth.users WHERE id = NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-populate email on insert
DROP TRIGGER IF EXISTS set_family_member_email_trigger ON family_members;
CREATE TRIGGER set_family_member_email_trigger
  BEFORE INSERT ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION set_family_member_email();

-- Update existing rows to populate user_email
UPDATE family_members fm
SET user_email = (SELECT email FROM auth.users WHERE id = fm.user_id)
WHERE user_email IS NULL;
