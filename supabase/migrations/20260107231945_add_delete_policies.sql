/*
  # Add DELETE policies for profiles table

  1. Changes
    - Add DELETE policy for admins to delete profiles in their organization
    - This allows admins to remove workers from their organization

  2. Security
    - Only admins can delete profiles
    - Can only delete profiles in their own organization
    - Cannot delete their own profile (prevents accidental self-deletion)
*/

-- Delete policy for admins to delete profiles in their organization
CREATE POLICY "Admins can delete profiles in their organization"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    AND id != auth.uid()
  );