/*
  # Add Administrator Role Policies

  1. Changes
    - Add RLS policies for the 'administrator' role
    - For now, administrators have the same permissions as workers
    - Policies apply to: profiles, assignments, time_entries, announcements, vehicles
    
  2. Security
    - Administrators can view their own profile
    - Administrators can view their own assignments
    - Administrators can manage their own time entries
    - Administrators can view announcements
    - Administrators can view vehicles assigned to them
    
  3. Notes
    - These are temporary permissions at worker level
    - Detailed permissions will be configured later based on requirements
*/

-- Profiles policies for administrator
CREATE POLICY "Administrators can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() AND role = 'administrator');

CREATE POLICY "Administrators can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND role = 'administrator')
  WITH CHECK (id = auth.uid() AND role = 'administrator');

-- Assignments policies for administrator
CREATE POLICY "Administrators can view own assignments"
  ON assignments FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'administrator'
  ));

-- Time entries policies for administrator
CREATE POLICY "Administrators can view own time entries"
  ON time_entries FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'administrator'
  ));

CREATE POLICY "Administrators can insert own time entries"
  ON time_entries FOR INSERT
  TO authenticated
  WITH CHECK (worker_id = auth.uid() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'administrator'
  ));

CREATE POLICY "Administrators can update own time entries"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (worker_id = auth.uid() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'administrator'
  ))
  WITH CHECK (worker_id = auth.uid() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'administrator'
  ));

-- Announcements policies for administrator
CREATE POLICY "Administrators can view announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'administrator'
  ));

-- Vehicles policies for administrator
CREATE POLICY "Administrators can view vehicles assigned to them"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT vehicle_id FROM assignments 
      WHERE worker_id = auth.uid() AND vehicle_id IS NOT NULL
    ) AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'administrator'
    )
  );

-- Worksites policies for administrator (view assigned worksites)
CREATE POLICY "Administrators can view assigned worksites"
  ON worksites FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT worksite_id FROM assignments WHERE worker_id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'administrator'
    )
  );