-- Migration: Add family system with invitations
-- This migration creates a proper family structure where users can invite others to share accounts

-- Families table - represents each family group
CREATE TABLE families (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My Family',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Family members table - tracks which users belong to which families
CREATE TABLE family_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(family_id, user_id)
);

-- Family invitations table - tracks pending invitations
CREATE TABLE family_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invitee_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for better performance
CREATE INDEX family_members_family_id_idx ON family_members(family_id);
CREATE INDEX family_members_user_id_idx ON family_members(user_id);
CREATE INDEX family_invitations_family_id_idx ON family_invitations(family_id);
CREATE INDEX family_invitations_invitee_email_idx ON family_invitations(invitee_email);
CREATE INDEX family_invitations_status_idx ON family_invitations(status);

-- Enable Row Level Security
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_invitations ENABLE ROW LEVEL SECURITY;

-- Drop the overly permissive policies from shared-accounts-migration
DROP POLICY IF EXISTS "All authenticated users can view all accounts" ON accounts;
DROP POLICY IF EXISTS "All authenticated users can insert accounts" ON accounts;
DROP POLICY IF EXISTS "All authenticated users can update all accounts" ON accounts;
DROP POLICY IF EXISTS "All authenticated users can delete all accounts" ON accounts;
DROP POLICY IF EXISTS "All authenticated users can view all emails" ON emails;
DROP POLICY IF EXISTS "All authenticated users can insert emails" ON emails;
DROP POLICY IF EXISTS "All authenticated users can update emails" ON emails;
DROP POLICY IF EXISTS "All authenticated users can delete emails" ON emails;

-- New policies for accounts: Only family members can access accounts of users in their family
CREATE POLICY "Family members can view family accounts"
  ON accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid()
      AND fm2.user_id = accounts.user_id
    )
  );

CREATE POLICY "Family members can insert accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Family members can update family accounts"
  ON accounts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid()
      AND fm2.user_id = accounts.user_id
    )
  );

CREATE POLICY "Family members can delete family accounts"
  ON accounts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid()
      AND fm2.user_id = accounts.user_id
    )
  );

-- New policies for emails: Only family members can access emails
CREATE POLICY "Family members can view family emails"
  ON emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      JOIN family_members fm1 ON accounts.user_id = fm1.user_id
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE emails.account_id = accounts.id
      AND fm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can insert emails"
  ON emails FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts
      JOIN family_members fm1 ON accounts.user_id = fm1.user_id
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE emails.account_id = accounts.id
      AND fm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can update emails"
  ON emails FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      JOIN family_members fm1 ON accounts.user_id = fm1.user_id
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE emails.account_id = accounts.id
      AND fm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can delete emails"
  ON emails FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      JOIN family_members fm1 ON accounts.user_id = fm1.user_id
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE emails.account_id = accounts.id
      AND fm2.user_id = auth.uid()
    )
  );

-- Policies for families
CREATE POLICY "Users can view their own families"
  ON families FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family owners can update their families"
  ON families FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.id
      AND family_members.user_id = auth.uid()
      AND family_members.role = 'owner'
    )
  );

-- Policies for family_members
CREATE POLICY "Users can view members of their families"
  ON family_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Family owners can remove family members"
  ON family_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'owner'
    )
  );

-- Policies for family_invitations
CREATE POLICY "Users can view invitations for their families"
  ON family_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = family_invitations.family_id
      AND family_members.user_id = auth.uid()
    )
    OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Family members can create invitations"
  ON family_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = family_invitations.family_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invitations for their families or their own invitations"
  ON family_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = family_invitations.family_id
      AND family_members.user_id = auth.uid()
    )
    OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Trigger to update families.updated_at
CREATE TRIGGER update_families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update family_invitations.updated_at
CREATE TRIGGER update_family_invitations_updated_at
  BEFORE UPDATE ON family_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create a family for new users
CREATE OR REPLACE FUNCTION create_family_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_family_id UUID;
BEGIN
  -- Create a new family
  INSERT INTO families (name)
  VALUES ('My Family')
  RETURNING id INTO new_family_id;

  -- Add the user as the family owner
  INSERT INTO family_members (family_id, user_id, role)
  VALUES (new_family_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create family when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_family_for_new_user();
