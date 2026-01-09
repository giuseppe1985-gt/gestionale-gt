/*
  # Fix Assignments Visibility for All Roles

  1. Changes
    - Fix circular dependency in administrator worksites policy
    - Fix circular dependency in administrator vehicles policy
    - Add missing policies for supervisors to view assignments, worksites, and vehicles
    - Add policies for administrators and supervisors to view all data in their organization
    
  2. Security
    - Supervisors can view all assignments, worksites, and vehicles in their organization
    - Administrators can view all assignments, worksites, and vehicles in their organization  
    - Workers maintain their existing restricted view (only their own data)
    - All policies maintain organization-level isolation
    
  3. Notes
    - This fixes the issue where administrators and supervisors couldn't see assignments
    - Removes circular dependencies that prevented data from loading
*/

-- Drop problematic administrator policies with circular dependencies
DROP POLICY IF EXISTS "Administrators can view assigned worksites" ON worksites;
DROP POLICY IF EXISTS "Administrators can view vehicles assigned to them" ON vehicles;

-- Add organization-wide worksites policies for administrators
CREATE POLICY "Administrators can view all worksites in organization"
  ON worksites FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'administrator'
    )
  );

-- Add organization-wide vehicles policies for administrators
CREATE POLICY "Administrators can view all vehicles in organization"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'administrator'
    )
  );

-- Update administrator assignments policy to view all in organization
DROP POLICY IF EXISTS "Administrators can view own assignments" ON assignments;

CREATE POLICY "Administrators can view all assignments in organization"
  ON assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'administrator'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

-- Add supervisor policies for assignments
CREATE POLICY "Supervisors can view all assignments in organization"
  ON assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'supervisor'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Supervisors can insert assignments"
  ON assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'supervisor'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Supervisors can update assignments"
  ON assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'supervisor'
      AND profiles.organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'supervisor'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Supervisors can delete assignments"
  ON assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'supervisor'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

-- Add supervisor policies for worksites
CREATE POLICY "Supervisors can view all worksites in organization"
  ON worksites FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

CREATE POLICY "Supervisors can insert worksites"
  ON worksites FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

CREATE POLICY "Supervisors can update worksites"
  ON worksites FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

CREATE POLICY "Supervisors can delete worksites"
  ON worksites FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

-- Add supervisor policies for vehicles
CREATE POLICY "Supervisors can view all vehicles in organization"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

CREATE POLICY "Supervisors can insert vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

CREATE POLICY "Supervisors can update vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

CREATE POLICY "Supervisors can delete vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'supervisor'
    )
  );