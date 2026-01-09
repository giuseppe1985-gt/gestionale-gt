/*
  # Add Organizations INSERT Policy

  This migration adds the missing INSERT policy for organizations table
  to allow users to create their organization during onboarding.

  1. Security
    - Users can create organizations where they are the owner
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

-- Add policy to allow users to create organizations
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());