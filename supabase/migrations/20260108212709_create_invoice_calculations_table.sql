/*
  # Create Invoice Calculations Table

  1. New Tables
    - `invoice_calculations`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `type` (text, check constraint: 'income', 'expense', 'estimate')
      - `invoice_number` (text, invoice or estimate number)
      - `invoice_date` (date, date of invoice/estimate)
      - `client_name` (text, free text client name)
      - `amount` (numeric, amount in euros)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `invoice_calculations` table
    - Add policies for admin and administrator roles to manage invoice calculations
*/

CREATE TABLE IF NOT EXISTS invoice_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'estimate')),
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  client_name text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoice_calculations ENABLE ROW LEVEL SECURITY;

-- Admins can view all invoice calculations in their organization
CREATE POLICY "Admins can view invoice calculations"
  ON invoice_calculations
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Administrators can view all invoice calculations in their organization
CREATE POLICY "Administrators can view invoice calculations"
  ON invoice_calculations
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'administrator'
    )
  );

-- Admins can insert invoice calculations
CREATE POLICY "Admins can insert invoice calculations"
  ON invoice_calculations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Administrators can insert invoice calculations
CREATE POLICY "Administrators can insert invoice calculations"
  ON invoice_calculations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'administrator'
    )
  );

-- Admins can update invoice calculations
CREATE POLICY "Admins can update invoice calculations"
  ON invoice_calculations
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Administrators can update invoice calculations
CREATE POLICY "Administrators can update invoice calculations"
  ON invoice_calculations
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'administrator'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'administrator'
    )
  );

-- Admins can delete invoice calculations
CREATE POLICY "Admins can delete invoice calculations"
  ON invoice_calculations
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Administrators can delete invoice calculations
CREATE POLICY "Administrators can delete invoice calculations"
  ON invoice_calculations
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'administrator'
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_invoice_calculations_org_type 
  ON invoice_calculations(organization_id, type);

CREATE INDEX IF NOT EXISTS idx_invoice_calculations_date 
  ON invoice_calculations(invoice_date DESC);