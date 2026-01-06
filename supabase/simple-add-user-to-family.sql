-- Simpler migration: manually create family and add user
-- Replace 'cocoughlin@me.com' with your actual email

DO $$
DECLARE
  user_id_var UUID;
  new_family_id UUID;
  user_email TEXT := 'cocoughlin@me.com'; -- CHANGE THIS TO YOUR EMAIL
BEGIN
  -- Get user ID by email
  SELECT id INTO user_id_var FROM auth.users WHERE email = user_email;

  IF user_id_var IS NULL THEN
    RAISE NOTICE 'User not found with email: %', user_email;
    RETURN;
  END IF;

  -- Create a new family
  INSERT INTO public.families (name)
  VALUES ('My Family')
  RETURNING id INTO new_family_id;

  -- Add user as owner
  INSERT INTO public.family_members (family_id, user_id, user_email, role)
  VALUES (new_family_id, user_id_var, user_email, 'owner');

  RAISE NOTICE 'Created family % and added user %', new_family_id, user_email;
END $$;
