-- Migration: Enable household sharing - all authenticated users can see all accounts
-- This is perfect for a spouse/household app where all users should see all accounts

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can view emails for their accounts" ON emails;
DROP POLICY IF EXISTS "Users can insert emails for their accounts" ON emails;

-- New policies: All authenticated users can access all accounts
CREATE POLICY "All authenticated users can view all accounts"
  ON accounts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can insert accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can update all accounts"
  ON accounts FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can delete all accounts"
  ON accounts FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- New policies: All authenticated users can access all emails
CREATE POLICY "All authenticated users can view all emails"
  ON emails FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can insert emails"
  ON emails FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can update emails"
  ON emails FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can delete emails"
  ON emails FOR DELETE
  USING (auth.uid() IS NOT NULL);
