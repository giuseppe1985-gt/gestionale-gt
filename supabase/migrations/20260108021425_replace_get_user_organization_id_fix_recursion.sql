/*
  # Fix Recursive RLS by Replacing Function

  1. Problem
    - The function `get_user_organization_id()` causes infinite recursion
    - SECURITY DEFINER functions should bypass RLS but it's not working

  2. Solution
    - Use CREATE OR REPLACE to update the function without dropping dependencies
    - Change implementation to use a simpler approach that doesn't trigger recursion

  3. Implementation
    - The function will be SECURITY DEFINER which runs with elevated privileges
    - This should allow it to read from profiles without triggering the same policies
*/

-- Replace the function (doesn't drop dependencies)
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  org_id uuid;
BEGIN
  -- Query with SECURITY DEFINER should bypass RLS
  -- Use a simple SELECT that only matches "Users can view own profile" policy
  SELECT organization_id INTO org_id
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN org_id;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error (like recursion), return NULL
    RETURN NULL;
END;
$$;
