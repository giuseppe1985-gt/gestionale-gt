/*
  # Create Default Admin User

  This migration creates a default admin account for initial access.
  
  Default Credentials:
  - Email: admin@gt.com
  - Password: admin123
  
  IMPORTANT: Change these credentials after first login!
  
  Note: This uses a trigger function to create the profile automatically
  when the user signs up via the Supabase Auth interface.
*/

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Admin User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Instructions for creating the first admin user:
-- 1. Go to your Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" and create a user with:
--    - Email: admin@gt.com
--    - Password: admin123 (or your preferred password)
-- 3. After creating the user, run this SQL to make them an admin:
--    UPDATE profiles SET role = 'admin', full_name = 'Amministratore GT' 
--    WHERE email = 'admin@gt.com';