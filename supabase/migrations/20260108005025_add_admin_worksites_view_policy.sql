/*
  # Add Admin Worksites View Policy

  1. Changes
    - Add SELECT policy for admins (role 'admin') to view all worksites in their organization
    
  2. Security
    - Admins can view all worksites in their organization
    - Maintains organization-level isolation
    
  3. Notes
    - Fixes the issue where admins couldn't see announcements due to missing worksites access
    - The announcements query joins with worksites, so admins need SELECT permission on worksites
*/

-- Add policy for admins to view all worksites in their organization
CREATE POLICY "Admins can view all worksites in organization"
  ON worksites FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );