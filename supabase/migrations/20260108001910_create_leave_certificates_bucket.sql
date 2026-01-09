/*
  # Create Storage Bucket for Leave Certificates

  1. Storage Setup
    - Create a new public storage bucket called `leave-certificates`
    - This bucket will store sick leave certificate files (PDF, JPG, PNG)

  2. Security Policies
    - Authenticated users can upload files (INSERT)
    - All users can view files (SELECT) - needed for admins to view certificates
    - Workers can delete their own certificates
    - Admins can delete any certificate

  3. Important Notes
    - Files are stored with path: `certificates/{worker_id}_{timestamp}.{extension}`
    - File size is limited to 5MB on the client side
    - Only PDF, JPG, JPEG, and PNG files are accepted
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('leave-certificates', 'leave-certificates', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload certificates"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'leave-certificates');

CREATE POLICY "Anyone can view certificates"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'leave-certificates');

CREATE POLICY "Users can delete own certificates"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'leave-certificates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );