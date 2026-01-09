/*
  # Create Company Regulations System

  1. New Tables
    - `company_regulations`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `title` (text) - Title of the regulation document
      - `content` (text) - Main text content
      - `version` (integer) - Version number for tracking changes
      - `is_active` (boolean) - Whether this is the active version
      - `created_by` (uuid, foreign key to profiles) - Admin who created it
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `company_regulation_attachments`
      - `id` (uuid, primary key)
      - `regulation_id` (uuid, foreign key to company_regulations)
      - `file_name` (text) - Original file name
      - `file_path` (text) - Path in storage bucket
      - `file_size` (bigint) - File size in bytes
      - `mime_type` (text) - File MIME type
      - `uploaded_by` (uuid, foreign key to profiles)
      - `created_at` (timestamptz)

  2. Storage
    - Create bucket `regulation-files` for attachments
    - Public read access for authenticated users
    - Upload restricted to admins

  3. Security
    - Enable RLS on all tables
    - Admins can insert, update, and delete regulations
    - All authenticated users can view regulations
    - Admins can upload attachments
    - All authenticated users can download attachments

  4. Notes
    - Only one regulation can be active at a time per organization
    - Version tracking allows keeping history of changes
    - Attachments support multiple file types (PDF, DOC, images, etc.)
*/

-- Create company_regulations table
CREATE TABLE IF NOT EXISTS company_regulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create company_regulation_attachments table
CREATE TABLE IF NOT EXISTS company_regulation_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_id uuid NOT NULL REFERENCES company_regulations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_company_regulations_organization 
  ON company_regulations(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_regulations_active 
  ON company_regulations(organization_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_company_regulation_attachments_regulation 
  ON company_regulation_attachments(regulation_id);

-- Create storage bucket for regulation files
INSERT INTO storage.buckets (id, name, public)
VALUES ('regulation-files', 'regulation-files', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE company_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_regulation_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_regulations

-- SELECT: All authenticated users can view regulations in their organization
CREATE POLICY "All users can view company regulations in organization"
  ON company_regulations FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

-- INSERT: Only admins can create regulations
CREATE POLICY "Admins can create company regulations"
  ON company_regulations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- UPDATE: Only admins can update regulations
CREATE POLICY "Admins can update company regulations"
  ON company_regulations FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- DELETE: Only admins can delete regulations
CREATE POLICY "Admins can delete company regulations"
  ON company_regulations FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for company_regulation_attachments

-- SELECT: All authenticated users can view attachments for regulations in their organization
CREATE POLICY "All users can view regulation attachments in organization"
  ON company_regulation_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_regulations
      WHERE company_regulations.id = regulation_id
        AND company_regulations.organization_id = get_user_organization_id()
    )
  );

-- INSERT: Only admins can upload attachments
CREATE POLICY "Admins can upload regulation attachments"
  ON company_regulation_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM company_regulations
      WHERE company_regulations.id = regulation_id
        AND company_regulations.organization_id = get_user_organization_id()
    )
  );

-- DELETE: Only admins can delete attachments
CREATE POLICY "Admins can delete regulation attachments"
  ON company_regulation_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM company_regulations
      WHERE company_regulations.id = regulation_id
        AND company_regulations.organization_id = get_user_organization_id()
    )
  );

-- Storage policies for regulation-files bucket

-- SELECT: All authenticated users can download regulation files
CREATE POLICY "All users can download regulation files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'regulation-files' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = get_user_organization_id()
    )
  );

-- INSERT: Only admins can upload regulation files
CREATE POLICY "Admins can upload regulation files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'regulation-files' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- DELETE: Only admins can delete regulation files
CREATE POLICY "Admins can delete regulation files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'regulation-files' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Function to automatically deactivate other regulations when a new one is activated
CREATE OR REPLACE FUNCTION handle_regulation_activation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE company_regulations
    SET is_active = false
    WHERE organization_id = NEW.organization_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one active regulation per organization
DROP TRIGGER IF EXISTS ensure_single_active_regulation ON company_regulations;
CREATE TRIGGER ensure_single_active_regulation
  BEFORE INSERT OR UPDATE ON company_regulations
  FOR EACH ROW
  EXECUTE FUNCTION handle_regulation_activation();