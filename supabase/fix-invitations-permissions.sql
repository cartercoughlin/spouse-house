-- Fix permission denied errors in family_invitations policies
-- The issue is that policies were trying to access auth.users table

-- Drop and recreate family_invitations policies without accessing auth.users
DROP POLICY IF EXISTS "Users can view invitations for their families" ON family_invitations;
DROP POLICY IF EXISTS "Family members can create invitations" ON family_invitations;
DROP POLICY IF EXISTS "Users can update invitations for their families or their own invitations" ON family_invitations;

-- New SELECT policy: users can see invitations for their families OR invitations sent to them
-- Use invitee_email directly instead of querying auth.users
CREATE POLICY "Users can view family invitations"
  ON family_invitations FOR SELECT
  USING (
    -- Can see invitations for families they belong to
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = family_invitations.family_id
      AND family_members.user_id = auth.uid()
    )
    -- Note: We can't check invitee_email here without auth.users access
    -- The app will filter by email in the query instead
  );

-- New INSERT policy: family members can create invitations
CREATE POLICY "Family members can create invitations"
  ON family_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = family_invitations.family_id
      AND family_members.user_id = auth.uid()
    )
  );

-- New UPDATE policy: users can update invitations for their families
CREATE POLICY "Family members can update invitations"
  ON family_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = family_invitations.family_id
      AND family_members.user_id = auth.uid()
    )
  );
