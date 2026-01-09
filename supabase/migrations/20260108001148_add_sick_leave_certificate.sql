/*
  # Add sick leave certificate field

  1. Changes
    - Add `certificate_url` column to `leave_requests` table for storing sick leave certificate
    - This field will store the URL to the uploaded certificate file in Supabase Storage
    - The field is optional since it's only required for sick_leave requests

  2. Important Notes
    - Certificates are required for sick_leave requests
    - Workers must upload a certificate when requesting sick leave
    - Admins can view the certificate when reviewing sick leave requests
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leave_requests' AND column_name = 'certificate_url'
  ) THEN
    ALTER TABLE leave_requests ADD COLUMN certificate_url text;
  END IF;
END $$;