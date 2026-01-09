/*
  # Add Admin and Supervisor Announcements View Policies

  1. Changes
    - Add SELECT policy for admins to view announcements in their organization
    - Add SELECT policy for supervisors to view announcements in their organization
    
  2. Security
    - Admins can view all announcements in their organization
    - Supervisors can view all announcements in their organization
    - Maintains organization-level isolation
    
  3. Notes
    - Fixes the issue where admins couldn't see published announcements
*/

-- Add policy for admins to view announcements
CREATE POLICY "Admins can view all announcements in organization"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Add policy for supervisors to view announcements
CREATE POLICY "Supervisors can view all announcements in organization"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'supervisor'
    )
  );