/*
  # Fix Assignments and Time Entries Visibility for Managers

  1. Changes
    - Add policies for org_manager to view all assignments and time entries
    - Fix administrator policies to view all assignments and time entries (not just their own)
    - Ensure admin, administrator, org_manager, and supervisor roles can all see assignments and time entries

  2. Security
    - org_manager can view and manage all assignments in their organization
    - org_manager can view all time entries in their organization
    - administrator can view and manage all assignments in their organization
    - administrator can view all time entries in their organization
    - All policies maintain organization-level isolation

  3. Notes
    - This fixes the issue where org_manager couldn't see any assignments or time entries
    - This fixes the issue where administrator could only see their own data
*/

-- Drop old administrator policies that only allowed viewing own data
DROP POLICY IF EXISTS "Administrators can view own assignments" ON assignments;
DROP POLICY IF EXISTS "Administrators can view own time entries" ON time_entries;
DROP POLICY IF EXISTS "Administrators can insert own time entries" ON time_entries;
DROP POLICY IF EXISTS "Administrators can update own time entries" ON time_entries;

-- Assignments policies for administrator (view all in organization)
CREATE POLICY "Administrators can view all assignments in organization v2"
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

CREATE POLICY "Administrators can insert assignments"
  ON assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrator'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Administrators can update assignments"
  ON assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrator'
      AND profiles.organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrator'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Administrators can delete assignments"
  ON assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrator'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

-- Assignments policies for org_manager (view all in organization)
CREATE POLICY "Org managers can view all assignments in organization"
  ON assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'org_manager'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Org managers can insert assignments"
  ON assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'org_manager'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Org managers can update assignments"
  ON assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'org_manager'
      AND profiles.organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'org_manager'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Org managers can delete assignments"
  ON assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'org_manager'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

-- Time entries policies for administrator (view all in organization)
CREATE POLICY "Administrators can view all time entries in organization"
  ON time_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrator'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Administrators can insert time entries"
  ON time_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrator'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Administrators can update time entries"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrator'
      AND profiles.organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrator'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Administrators can delete time entries"
  ON time_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrator'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

-- Time entries policies for org_manager (view all in organization)
CREATE POLICY "Org managers can view all time entries in organization"
  ON time_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'org_manager'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Org managers can insert time entries"
  ON time_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'org_manager'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Org managers can update time entries"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'org_manager'
      AND profiles.organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'org_manager'
      AND profiles.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Org managers can delete time entries"
  ON time_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'org_manager'
      AND profiles.organization_id = get_user_organization_id()
    )
  );