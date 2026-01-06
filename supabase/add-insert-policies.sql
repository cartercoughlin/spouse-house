-- Add missing INSERT policies for families and family_members
-- These are needed for the new user trigger to work

-- Allow authenticated users to insert families (needed for new user trigger)
CREATE POLICY IF NOT EXISTS "Authenticated users can create families"
  ON families FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert family_members (needed for new user trigger and accepting invitations)
CREATE POLICY IF NOT EXISTS "Authenticated users can join families"
  ON family_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
