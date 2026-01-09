/*
  # Create Worksite Financial Tracking System

  1. New Tables
    - `worksite_revenues`
      - `id` (uuid, primary key)
      - `worksite_id` (uuid, foreign key to worksites)
      - `amount` (numeric) - Revenue amount
      - `description` (text) - Description of the revenue
      - `date` (date) - Date of revenue
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `worksite_invoices`
      - `id` (uuid, primary key)
      - `worksite_id` (uuid, foreign key to worksites)
      - `amount` (numeric) - Invoice amount
      - `invoice_number` (text) - Invoice number
      - `description` (text) - Description of the invoice
      - `date` (date) - Invoice date
      - `file_path` (text, nullable) - Path to invoice file in storage
      - `file_name` (text, nullable) - Original file name
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `worksite_liquid_assets`
      - `id` (uuid, primary key)
      - `worksite_id` (uuid, foreign key to worksites)
      - `amount` (numeric) - Liquid asset amount
      - `description` (text) - Description
      - `date` (date) - Date of entry
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Storage
    - Create bucket `worksite-invoices` for invoice files
    - Restricted access to admins only

  3. Security
    - Enable RLS on all tables
    - Only admins can insert, update, delete, and view financial data
    - All financial operations are restricted to organization scope

  4. Notes
    - All amounts are stored as numeric for precision
    - File attachments are optional for invoices
    - Each entry is tracked by date for historical analysis
*/

-- Create worksite_revenues table
CREATE TABLE IF NOT EXISTS worksite_revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksite_id uuid NOT NULL REFERENCES worksites(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  description text NOT NULL DEFAULT '',
  date date NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create worksite_invoices table
CREATE TABLE IF NOT EXISTS worksite_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksite_id uuid NOT NULL REFERENCES worksites(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  invoice_number text NOT NULL,
  description text NOT NULL DEFAULT '',
  date date NOT NULL,
  file_path text,
  file_name text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create worksite_liquid_assets table
CREATE TABLE IF NOT EXISTS worksite_liquid_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksite_id uuid NOT NULL REFERENCES worksites(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  description text NOT NULL DEFAULT '',
  date date NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_worksite_revenues_worksite 
  ON worksite_revenues(worksite_id);
CREATE INDEX IF NOT EXISTS idx_worksite_revenues_date 
  ON worksite_revenues(worksite_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_worksite_invoices_worksite 
  ON worksite_invoices(worksite_id);
CREATE INDEX IF NOT EXISTS idx_worksite_invoices_date 
  ON worksite_invoices(worksite_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_worksite_liquid_assets_worksite 
  ON worksite_liquid_assets(worksite_id);
CREATE INDEX IF NOT EXISTS idx_worksite_liquid_assets_date 
  ON worksite_liquid_assets(worksite_id, date DESC);

-- Create storage bucket for invoice files
INSERT INTO storage.buckets (id, name, public)
VALUES ('worksite-invoices', 'worksite-invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE worksite_revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksite_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksite_liquid_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for worksite_revenues

-- SELECT: Only admins can view revenues in their organization
CREATE POLICY "Admins can view worksite revenues in organization"
  ON worksite_revenues FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM worksites
      WHERE worksites.id = worksite_id
        AND worksites.organization_id = get_user_organization_id()
    )
  );

-- INSERT: Only admins can create revenues
CREATE POLICY "Admins can create worksite revenues"
  ON worksite_revenues FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM worksites
      WHERE worksites.id = worksite_id
        AND worksites.organization_id = get_user_organization_id()
    )
  );

-- UPDATE: Only admins can update revenues
CREATE POLICY "Admins can update worksite revenues"
  ON worksite_revenues FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM worksites
      WHERE worksites.id = worksite_id
        AND worksites.organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM worksites
      WHERE worksites.id = worksite_id
        AND worksites.organization_id = get_user_organization_id()
    )
  );

-- DELETE: Only admins can delete revenues
CREATE POLICY "Admins can delete worksite revenues"
  ON worksite_revenues FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM worksites
      WHERE worksites.id = worksite_id
        AND worksites.organization_id = get_user_organization_id()
    )
  );

-- RLS Policies for worksite_invoices

-- SELECT: Only admins can view invoices in their organization
CREATE POLICY "Admins can view worksite invoices in organization"
  ON worksite_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM worksites
      WHERE worksites.id = worksite_id
        AND worksites.organization_id = get_user_organization_id()
    )
  );

-- INSERT: Only admins can create invoices
CREATE POLICY "Admins can create worksite invoices"
  ON worksite_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM worksites
      WHERE worksites.id = worksite_id
        AND worksites.organization_id = get_user_organization_id()
    )
  );

-- UPDATE: Only admins can update invoices
CREATE POLICY "Admins can update worksite invoices"
  ON worksite_invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM worksites
      WHERE worksites.id = worksite_id
        AND worksites.organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM worksites
      WHERE worksites.id = worksite_id
        AND worksites.organization_id = get_user_organization_id()
    )
  );

-- DELETE: Only admins can delete invoices
CREATE POLICY "Admins can delete worksite invoices"
  ON worksite_invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM worksites
      WHERE worksites.id = worksite_id
        AND worksites.organization_id = get_user_organization_id()
    )
  );

-- RLS Policies for worksite_liquid_assets

-- SELECT: Only admins can view liquid assets in their organization
CREATE POLICY "Admins can view worksite liquid assets in organization"
  ON worksite_liquid_assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM worksites
      WHERE worksites.id = worksite_id
        AND worksites.organization_id = get_user_organization_id()
    )
  );

-- INSERT: Only admins can create liquid assets
CREATE POLICY "Admins can create worksite liquid assets"
  ON worksite_liquid_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM worksites
      WHERE worksites.id = worksite_id
        AND worksites.organization_id = get_user_organization_id()
    )
  );

-- UPDATE: Only admins can update liquid assets
CREATE POLICY "Admins can update worksite liquid assets"
  ON worksite_liquid_assets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM worksites
      WHERE worksites.id = worksite_id
        AND worksites.organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM worksites
      WHERE worksites.id = worksite_id
        AND worksites.organization_id = get_user_organization_id()
    )
  );

-- DELETE: Only admins can delete liquid assets
CREATE POLICY "Admins can delete worksite liquid assets"
  ON worksite_liquid_assets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) AND
    EXISTS (
      SELECT 1 FROM worksites
      WHERE worksites.id = worksite_id
        AND worksites.organization_id = get_user_organization_id()
    )
  );

-- Storage policies for worksite-invoices bucket

-- SELECT: Only admins can download invoice files
CREATE POLICY "Admins can download worksite invoice files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'worksite-invoices' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- INSERT: Only admins can upload invoice files
CREATE POLICY "Admins can upload worksite invoice files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'worksite-invoices' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- DELETE: Only admins can delete invoice files
CREATE POLICY "Admins can delete worksite invoice files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'worksite-invoices' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );