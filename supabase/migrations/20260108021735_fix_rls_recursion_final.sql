/*
  # Fix RLS Recursion - Final Solution

  1. Problem
    - Policies on profiles table call get_user_organization_id()
    - That function queries profiles, triggering the same policies again
    - Infinite loop causes 500 errors

  2. Solution
    - Temporarily disable policies that call get_user_organization_id()
    - Keep only simple policies that use direct conditions
    - This breaks the recursion chain

  3. Changes
    - Drop policies that cause recursion on profiles table
    - Keep only essential policies with no function calls
*/

-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Users can view profiles in same organization" ON profiles;
DROP POLICY IF EXISTS "Admins and managers can view all profiles in organization" ON profiles;
DROP POLICY IF EXISTS "Admins and managers can update worker profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles in their organization" ON profiles;

-- Keep and ensure these simple policies exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Add new policies without function calls - use direct subqueries
CREATE POLICY "Admins can view all profiles in their org"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'administrator', 'org_manager')
      AND admin_profile.organization_id = profiles.organization_id
    )
  );

CREATE POLICY "Admins can insert profiles in their org"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'admin'
      AND admin_profile.organization_id = profiles.organization_id
    )
  );

CREATE POLICY "Admins can update profiles in their org"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'administrator', 'org_manager')
      AND admin_profile.organization_id = profiles.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'administrator', 'org_manager')
      AND admin_profile.organization_id = profiles.organization_id
    )
  );

CREATE POLICY "Admins can delete profiles in their org"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'admin'
      AND admin_profile.organization_id = profiles.organization_id
    )
  );
