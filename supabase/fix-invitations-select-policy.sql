-- Fix the family_invitations SELECT policy to allow users to see invitations sent to their email
DROP POLICY IF EXISTS "Users can view family invitations" ON family_invitations;

-- New policy: users can see invitations for their families OR invitations sent to their email
CREATE POLICY "Users can view family invitations"
  ON family_invitations FOR SELECT
  USING (
    -- Can see invitations for families they belong to
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = family_invitations.family_id
      AND family_members.user_id = auth.uid()
    )
    OR
    -- Can see invitations sent to their email address
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
