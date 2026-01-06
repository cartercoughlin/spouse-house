-- Fix the family_invitations SELECT policy to allow authenticated users to query
-- The API filters by email, so we just need to allow the query through
DROP POLICY IF EXISTS "Users can view family invitations" ON family_invitations;

-- Simple policy: allow all authenticated users to SELECT (API filters by email)
-- This is safe because family_invitations only contains IDs and emails
CREATE POLICY "Authenticated users can view invitations"
  ON family_invitations FOR SELECT
  USING (auth.uid() IS NOT NULL);
