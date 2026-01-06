-- Migration: Add existing users to families
-- This migration creates families for users who existed before the family system was implemented

-- Create families for all existing users who don't have one yet
DO $$
DECLARE
  user_record RECORD;
  new_family_id UUID;
BEGIN
  -- Loop through all users who are not yet in a family
  FOR user_record IN
    SELECT id
    FROM auth.users
    WHERE id NOT IN (SELECT user_id FROM family_members)
  LOOP
    -- Create a new family for this user
    INSERT INTO families (name)
    VALUES ('My Family')
    RETURNING id INTO new_family_id;

    -- Add the user as the family owner
    INSERT INTO family_members (family_id, user_id, role)
    VALUES (new_family_id, user_record.id, 'owner');

    RAISE NOTICE 'Created family % for user %', new_family_id, user_record.id;
  END LOOP;
END $$;
