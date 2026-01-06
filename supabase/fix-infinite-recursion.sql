-- Fix infinite recursion in family_members RLS policy
-- The issue is that the policy references itself, creating a circular dependency

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view members of their families" ON family_members;
DROP POLICY IF EXISTS "Family owners can remove family members" ON family_members;

-- Create a helper function that bypasses RLS to check family membership
CREATE OR REPLACE FUNCTION is_user_in_family(check_family_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = check_family_id
    AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New policy: Users can view members of families they belong to
-- This uses the SECURITY DEFINER function to avoid recursion
CREATE POLICY "Users can view members of their families"
  ON family_members FOR SELECT
  USING (
    is_user_in_family(family_id, auth.uid())
  );

-- Policy for removing family members (owners only)
CREATE POLICY "Family owners can remove family members"
  ON family_members FOR DELETE
  USING (
    -- User can remove themselves
    user_id = auth.uid()
    OR
    -- Or if they're an owner in the same family
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'owner'
    )
  );
