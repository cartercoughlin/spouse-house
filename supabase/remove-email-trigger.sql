-- Drop the set_family_member_email trigger that tries to query auth.users
-- We now pass email directly when inserting into family_members, so this trigger is not needed

DROP TRIGGER IF EXISTS set_family_member_email_trigger ON family_members;
DROP FUNCTION IF EXISTS set_family_member_email();
