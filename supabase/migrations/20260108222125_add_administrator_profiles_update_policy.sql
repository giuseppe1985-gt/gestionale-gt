/*
  # Add Administrator Profiles Update Policy

  1. New Policies
    - Allow administrators to insert profiles in their organization
    - Allow administrators to update profiles in their organization

  2. Purpose
    - Fix CORS error when administrators try to update worker profiles
    - Ensure administrators have same permissions as admins for profile management

  3. Security
    - Policies check organization_id to ensure administrators can only manage profiles in their organization
    - Uses SECURITY DEFINER function get_user_organization_id() for organization validation
*/

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Administrators can insert profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Administrators can update profiles in their organization" ON profiles;

-- Allow administrators to insert profiles in their organization
CREATE POLICY "Administrators can insert profiles in their organization"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'administrator'
    )
  );

-- Allow administrators to update profiles in their organization
CREATE POLICY "Administrators can update profiles in their organization"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id() 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'administrator'
    )
  );
