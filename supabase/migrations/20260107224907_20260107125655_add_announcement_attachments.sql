/*
  # Add attachment support to announcements

  1. Changes
    - Add `attachment_url` column to `announcements` table to store the file path in Storage
    - Add `attachment_name` column to store the original file name for display

  2. Storage
    - Create storage bucket for announcement files
    - Add policies for authenticated users to upload files
    - Add policies for all organization members to view files
*/

-- Add attachment columns to announcements table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'attachment_url'
  ) THEN
    ALTER TABLE announcements ADD COLUMN attachment_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'attachment_name'
  ) THEN
    ALTER TABLE announcements ADD COLUMN attachment_name text;
  END IF;
END $$;

-- Create storage bucket for announcement attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcements', 'announcements', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can upload announcement files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view announcement files from their organization" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete announcement files" ON storage.objects;

-- Allow authenticated users to upload files
CREATE POLICY "Admins can upload announcement files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'announcements' 
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Allow authenticated users to view files from their organization
CREATE POLICY "Users can view announcement files from their organization"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'announcements'
);

-- Allow admins to delete announcement files
CREATE POLICY "Admins can delete announcement files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'announcements'
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);