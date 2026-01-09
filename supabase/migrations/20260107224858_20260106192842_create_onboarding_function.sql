/*
  # Create Onboarding Function

  This migration creates a secure RPC function to handle the complete onboarding process.
  The function bypasses RLS restrictions during initial setup while maintaining security.

  1. New Functions
    - `complete_onboarding`: Creates organization and profile for new users
  
  2. Security
    - Uses SECURITY DEFINER to bypass RLS during onboarding
    - Validates that user is authenticated
    - Ensures user doesn't already have an organization
    - Creates both organization and profile in a single transaction
*/

-- Drop function if exists
DROP FUNCTION IF EXISTS complete_onboarding(text, text);

-- Create onboarding function
CREATE OR REPLACE FUNCTION complete_onboarding(
  company_name text,
  company_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_user_full_name text;
  v_org_id uuid;
  v_existing_profile profiles;
  v_result jsonb;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get user details from auth.users
  SELECT email, raw_user_meta_data->>'full_name'
  INTO v_user_email, v_user_full_name
  FROM auth.users
  WHERE id = v_user_id;
  
  -- Check if user already has a profile
  SELECT * INTO v_existing_profile
  FROM profiles
  WHERE id = v_user_id;
  
  IF v_existing_profile IS NOT NULL THEN
    RAISE EXCEPTION 'User already has a profile';
  END IF;
  
  -- Create organization
  INSERT INTO organizations (name, slug, owner_id)
  VALUES (company_name, company_slug, v_user_id)
  RETURNING id INTO v_org_id;
  
  -- Create profile
  INSERT INTO profiles (id, email, full_name, role, organization_id)
  VALUES (v_user_id, v_user_email, COALESCE(v_user_full_name, 'User'), 'admin', v_org_id);
  
  -- Return success with organization details
  v_result := jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'user_id', v_user_id
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION complete_onboarding(text, text) TO authenticated;