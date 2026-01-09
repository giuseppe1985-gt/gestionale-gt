/*
  # Fix Worksite Financial Tables
  
  1. Tables to Create
    - `worksite_revenues` - Track revenue entries for worksites
    - `worksite_invoices` - Track invoices for worksites
    - `worksite_liquid_assets` - Track liquid assets for worksites
  
  2. Security
    - Enable RLS on all tables
    - Allow org_manager, administrator, and admin roles to access
    - Scope access to organization
*/

-- Create worksite_revenues table
CREATE TABLE IF NOT EXISTS worksite_revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksite_id uuid NOT NULL REFERENCES worksites(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  description text NOT NULL DEFAULT '',
  date date NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_worksite_revenues_worksite 
  ON worksite_revenues(worksite_id);
CREATE INDEX IF NOT EXISTS idx_worksite_revenues_date 
  ON worksite_revenues(worksite_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_worksite_revenues_org
  ON worksite_revenues(organization_id);

CREATE INDEX IF NOT EXISTS idx_worksite_invoices_worksite 
  ON worksite_invoices(worksite_id);
CREATE INDEX IF NOT EXISTS idx_worksite_invoices_date 
  ON worksite_invoices(worksite_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_worksite_invoices_org
  ON worksite_invoices(organization_id);

CREATE INDEX IF NOT EXISTS idx_worksite_liquid_assets_worksite 
  ON worksite_liquid_assets(worksite_id);
CREATE INDEX IF NOT EXISTS idx_worksite_liquid_assets_date 
  ON worksite_liquid_assets(worksite_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_worksite_liquid_assets_org
  ON worksite_liquid_assets(organization_id);

-- Create storage bucket for invoice files
INSERT INTO storage.buckets (id, name, public)
VALUES ('worksite-invoices', 'worksite-invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE worksite_revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksite_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksite_liquid_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for worksite_revenues

DROP POLICY IF EXISTS "Managers can view worksite revenues" ON worksite_revenues;
CREATE POLICY "Managers can view worksite revenues"
  ON worksite_revenues FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
        AND profiles.organization_id = worksite_revenues.organization_id
    )
  );

DROP POLICY IF EXISTS "Managers can create worksite revenues" ON worksite_revenues;
CREATE POLICY "Managers can create worksite revenues"
  ON worksite_revenues FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
        AND profiles.organization_id = worksite_revenues.organization_id
    )
  );

DROP POLICY IF EXISTS "Managers can update worksite revenues" ON worksite_revenues;
CREATE POLICY "Managers can update worksite revenues"
  ON worksite_revenues FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
        AND profiles.organization_id = worksite_revenues.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
        AND profiles.organization_id = worksite_revenues.organization_id
    )
  );

DROP POLICY IF EXISTS "Managers can delete worksite revenues" ON worksite_revenues;
CREATE POLICY "Managers can delete worksite revenues"
  ON worksite_revenues FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
        AND profiles.organization_id = worksite_revenues.organization_id
    )
  );

-- RLS Policies for worksite_invoices

DROP POLICY IF EXISTS "Managers can view worksite invoices" ON worksite_invoices;
CREATE POLICY "Managers can view worksite invoices"
  ON worksite_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
        AND profiles.organization_id = worksite_invoices.organization_id
    )
  );

DROP POLICY IF EXISTS "Managers can create worksite invoices" ON worksite_invoices;
CREATE POLICY "Managers can create worksite invoices"
  ON worksite_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
        AND profiles.organization_id = worksite_invoices.organization_id
    )
  );

DROP POLICY IF EXISTS "Managers can update worksite invoices" ON worksite_invoices;
CREATE POLICY "Managers can update worksite invoices"
  ON worksite_invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
        AND profiles.organization_id = worksite_invoices.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
        AND profiles.organization_id = worksite_invoices.organization_id
    )
  );

DROP POLICY IF EXISTS "Managers can delete worksite invoices" ON worksite_invoices;
CREATE POLICY "Managers can delete worksite invoices"
  ON worksite_invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
        AND profiles.organization_id = worksite_invoices.organization_id
    )
  );

-- RLS Policies for worksite_liquid_assets

DROP POLICY IF EXISTS "Managers can view worksite liquid assets" ON worksite_liquid_assets;
CREATE POLICY "Managers can view worksite liquid assets"
  ON worksite_liquid_assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
        AND profiles.organization_id = worksite_liquid_assets.organization_id
    )
  );

DROP POLICY IF EXISTS "Managers can create worksite liquid assets" ON worksite_liquid_assets;
CREATE POLICY "Managers can create worksite liquid assets"
  ON worksite_liquid_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
        AND profiles.organization_id = worksite_liquid_assets.organization_id
    )
  );

DROP POLICY IF EXISTS "Managers can update worksite liquid assets" ON worksite_liquid_assets;
CREATE POLICY "Managers can update worksite liquid assets"
  ON worksite_liquid_assets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
        AND profiles.organization_id = worksite_liquid_assets.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
        AND profiles.organization_id = worksite_liquid_assets.organization_id
    )
  );

DROP POLICY IF EXISTS "Managers can delete worksite liquid assets" ON worksite_liquid_assets;
CREATE POLICY "Managers can delete worksite liquid assets"
  ON worksite_liquid_assets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
        AND profiles.organization_id = worksite_liquid_assets.organization_id
    )
  );

-- Storage policies for worksite-invoices bucket

DROP POLICY IF EXISTS "Managers can download worksite invoice files" ON storage.objects;
CREATE POLICY "Managers can download worksite invoice files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'worksite-invoices' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Managers can upload worksite invoice files" ON storage.objects;
CREATE POLICY "Managers can upload worksite invoice files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'worksite-invoices' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Managers can delete worksite invoice files" ON storage.objects;
CREATE POLICY "Managers can delete worksite invoice files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'worksite-invoices' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );
