-- Fix the trigger to explicitly reference public schema
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_family_for_new_user();

-- Updated function with explicit schema references
CREATE OR REPLACE FUNCTION create_family_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_family_id UUID;
BEGIN
  -- Create a new family (explicitly reference public schema)
  INSERT INTO public.families (name)
  VALUES ('My Family')
  RETURNING id INTO new_family_id;

  -- Add the user as the family owner with their email (explicitly reference public schema)
  INSERT INTO public.family_members (family_id, user_id, user_email, role)
  VALUES (new_family_id, NEW.id, NEW.email, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_family_for_new_user();
