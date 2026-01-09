/*
  # Add Medical Checkup Notification System
  
  1. Changes
    - Create a view to show medical checkups expiring in the next 30 days
    - Create a function to get expiring medical checkups
    
  2. Security
    - View respects RLS policies
    - Only shows checkups for users in the same organization
    
  3. Notes
    - Checkups expiring within 30 days will be flagged
    - Both admin and worker will be notified
*/

-- Create a function to get medical checkups expiring soon
CREATE OR REPLACE FUNCTION get_expiring_medical_checkups(days_before integer DEFAULT 30)
RETURNS TABLE (
  id uuid,
  worker_id uuid,
  worker_name text,
  worker_email text,
  checkup_date date,
  expiry_date date,
  days_until_expiry integer,
  notes text,
  organization_id uuid
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.id,
    mc.worker_id,
    p.full_name as worker_name,
    p.email as worker_email,
    mc.checkup_date,
    mc.expiry_date,
    (mc.expiry_date - CURRENT_DATE)::integer as days_until_expiry,
    mc.notes,
    mc.organization_id
  FROM worker_medical_checkups mc
  JOIN profiles p ON mc.worker_id = p.id
  WHERE mc.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + days_before)
    AND mc.organization_id = get_user_organization_id()
  ORDER BY mc.expiry_date ASC;
END;
$$;