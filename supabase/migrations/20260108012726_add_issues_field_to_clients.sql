/*
  # Add Issues Field to Clients Table
  
  1. Changes
    - Add `issues` (text) column to `clients` table
    - This field stores problems and unexpected events for clients in progress
    - Field is optional and can be updated only when client status is 'in_progress'
  
  2. Notes
    - No RLS changes needed, existing policies cover this field
*/

-- Add issues field to clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'issues'
  ) THEN
    ALTER TABLE clients ADD COLUMN issues text;
  END IF;
END $$;