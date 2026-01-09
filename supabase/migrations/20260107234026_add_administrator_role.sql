/*
  # Add Administrator Role

  1. Changes
    - Add 'administrator' as a new role option in the profiles table
    - Update the role check constraint to include all existing roles plus 'administrator'
    - Existing roles: admin, worker, org_manager, sales_manager
    
  2. Security
    - For now, administrators have the same permissions as workers
    - Detailed permissions will be configured later
    
  3. Notes
    - The administrator role is different from the admin role
    - Administrator has intermediate permissions between admin and worker
    - Current RLS policies already support multiple roles through OR conditions
*/

-- Update the role constraint to include administrator and all existing roles
DO $$
BEGIN
  -- Drop the existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;
  
  -- Add the new constraint with all roles including administrator
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'administrator', 'org_manager', 'sales_manager', 'worker'));
END $$;