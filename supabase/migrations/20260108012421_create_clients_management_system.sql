/*
  # Create Clients Management System
  
  1. New Tables
    - `clients`
      - `id` (uuid, primary key)
      - `name` (text) - Client name
      - `status` (text) - 'new', 'in_progress', 'completed'
      - `notes` (text) - Work notes/description
      - `survey_date` (date) - Survey date for new clients
      - `start_date` (date) - Work start date for in progress clients
      - `end_date` (date) - Work end date
      - `worksite_id` (uuid, foreign key) - Associated worksite for in progress/completed
      - `organization_id` (uuid, foreign key)
      - `created_by` (uuid, foreign key)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `clients` table
    - Add policies for authenticated users in same organization
    - Admin and supervisor can manage all clients
    - Workers can only view clients
  
  3. Indexes
    - Index on organization_id for faster queries
    - Index on status for filtering
    - Index on worksite_id for relations
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed')),
  notes text,
  survey_date date,
  start_date date,
  end_date date,
  worksite_id uuid REFERENCES worksites(id) ON DELETE SET NULL,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_organization ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_worksite ON clients(worksite_id);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Policies for SELECT
CREATE POLICY "Users can view clients in their organization"
  ON clients FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policies for INSERT
CREATE POLICY "Admin and supervisor can create clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('administrator', 'admin', 'supervisor')
    )
  );

-- Policies for UPDATE
CREATE POLICY "Admin and supervisor can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('administrator', 'admin', 'supervisor')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('administrator', 'admin', 'supervisor')
    )
  );

-- Policies for DELETE
CREATE POLICY "Admin and supervisor can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('administrator', 'admin', 'supervisor')
    )
  );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();