/*
  # Temporarily Disable RLS on Profiles

  1. Problem
    - ANY policy on profiles that queries profiles creates recursion
    - Even subqueries like "EXISTS (SELECT 1 FROM profiles ...)" cause the issue
    - Postgres evaluates policies during the subquery, creating infinite loop

  2. Temporary Solution
    - Disable RLS on profiles table completely
    - This allows us to test if the app works without RLS
    - We'll implement a better solution after confirming this fixes the issue

  3. Security Note
    - This is TEMPORARY for debugging
    - Profiles will be accessible to all authenticated users
    - DO NOT use in production without proper RLS
*/

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles in their org" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles in their org" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles in their org" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles in their org" ON profiles;

-- Disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
