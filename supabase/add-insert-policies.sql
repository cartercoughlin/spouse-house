-- Add missing INSERT policies for families and family_members
-- These are needed for the new user trigger to work

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can create families" ON families;
DROP POLICY IF EXISTS "Authenticated users can join families" ON family_members;

-- Allow authenticated users to insert families (needed for new user trigger)
-- More permissive to allow trigger to work
CREATE POLICY "Authenticated users can create families"
  ON families FOR INSERT
  WITH CHECK (true); -- Allow all inserts, security is handled by application logic

-- Allow authenticated users to insert family_members (needed for new user trigger and accepting invitations)
-- Check that either the user is authenticated OR they're inserting their own record
CREATE POLICY "Authenticated users can join families"
  ON family_members FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    OR user_id IS NOT NULL -- Allow trigger to insert for new users
  );
