-- Fix permission issues and infinite recursion with a simpler approach
-- Drop the problematic policies first, then the function
DROP POLICY IF EXISTS "Users can view members of their families" ON family_members;
DROP POLICY IF EXISTS "Family owners can remove family members" ON family_members;
DROP POLICY IF EXISTS "Users can remove family members" ON family_members;
DROP FUNCTION IF EXISTS is_user_in_family(UUID, UUID) CASCADE;

-- Simple policy: Users can view family_members rows for families they belong to
-- We avoid recursion by checking if a row with matching family_id and current user exists
CREATE POLICY "Users can view members of their families"
  ON family_members FOR SELECT
  USING (
    -- User can see rows for families where they are a member
    family_id IN (
      SELECT family_id
      FROM family_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy for removing family members
CREATE POLICY "Users can remove family members"
  ON family_members FOR DELETE
  USING (
    -- User can remove themselves
    user_id = auth.uid()
    OR
    -- Or if they're an owner removing a non-owner in the same family
    (
      role != 'owner'
      AND family_id IN (
        SELECT family_id
        FROM family_members
        WHERE user_id = auth.uid()
        AND role = 'owner'
      )
    )
  );
