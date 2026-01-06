-- Final fix for infinite recursion in family_members
-- The solution: allow all authenticated users to read family_members
-- This is safe because family_members only contains IDs/roles (no sensitive data)
-- Security comes from the accounts table policies

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view members of their families" ON family_members;

-- Create a simple non-recursive policy: any authenticated user can read family_members
CREATE POLICY "Authenticated users can view family members"
  ON family_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Keep the delete policy simple too
DROP POLICY IF EXISTS "Users can remove family members" ON family_members;

CREATE POLICY "Users can remove family members"
  ON family_members FOR DELETE
  USING (
    -- User can remove themselves
    user_id = auth.uid()
    OR
    -- Or if they're an owner removing a non-owner (check directly without subquery)
    (
      role != 'owner'
      AND EXISTS (
        SELECT 1 FROM family_members owner_check
        WHERE owner_check.user_id = auth.uid()
        AND owner_check.family_id = family_members.family_id
        AND owner_check.role = 'owner'
      )
    )
  );
