/*
  # Fix Announcements Permissions and Add Expiration

  1. Changes
    - Add policies to allow supervisors and administrators to insert/update/delete announcements
    - Add expires_at column to announcements table with default to end of day
    - Update existing announcements to have expires_at set to end of creation day
    
  2. Security
    - Supervisors and administrators can now manage announcements
    - Maintain organization-level isolation
    - Expiration date defaults to end of day (23:59:59)
    
  3. Notes
    - Announcements now have a daily default duration
    - Can be extended by setting a custom expiration date
*/

-- Add expires_at column to announcements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE announcements ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Set default expires_at to end of day for new announcements
ALTER TABLE announcements 
  ALTER COLUMN expires_at SET DEFAULT (date_trunc('day', now()) + interval '1 day' - interval '1 second');

-- Update existing announcements to expire at end of their creation day
UPDATE announcements 
SET expires_at = date_trunc('day', created_at) + interval '1 day' - interval '1 second'
WHERE expires_at IS NULL;

-- Add policies for supervisors to manage announcements
CREATE POLICY "Supervisors can insert announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'supervisor'
    )
  );

CREATE POLICY "Supervisors can update announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'supervisor'
    )
  );

CREATE POLICY "Supervisors can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'supervisor'
    )
  );

-- Add policies for administrators to manage announcements  
CREATE POLICY "Administrators can insert announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'administrator'
    )
  );

CREATE POLICY "Administrators can update announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'administrator'
    )
  );

CREATE POLICY "Administrators can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'administrator'
    )
  );