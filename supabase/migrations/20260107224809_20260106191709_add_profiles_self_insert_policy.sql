/*
  # Add Self-Insert Policy for Profiles

  This migration adds a policy to allow users to create their own profile
  during the onboarding process.

  1. Security
    - Users can insert their own profile (id = auth.uid())
*/

-- Add policy to allow users to create their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());