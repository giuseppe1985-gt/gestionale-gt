/*
  # Add Vehicles Management System

  1. New Tables
    - `vehicles`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `plate` (text, unique per organization) - Targa
      - `details` (text) - Dettagli del veicolo (modello, colore, etc)
      - `kilometers` (integer) - Kilometraggio attuale
      - `maintenance_date` (date) - Data prossimo tagliando
      - `inspection_date` (date) - Data prossima revisione
      - `issues` (text) - Problemi riscontrati
      - `notes` (text) - Note aggiuntive
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to Existing Tables
    - Add `vehicle_id` column to `assignments` table
    - Foreign key reference to vehicles table

  3. Security
    - Enable RLS on `vehicles` table
    - Add policies for admins and org_managers to manage vehicles
    - Add policy for workers to view vehicles assigned to them
*/

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plate text NOT NULL,
  details text DEFAULT '',
  kilometers integer DEFAULT 0,
  maintenance_date date,
  inspection_date date,
  issues text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, plate)
);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Add vehicle_id to assignments table first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'vehicle_id'
  ) THEN
    ALTER TABLE assignments ADD COLUMN vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Policies for vehicles table
CREATE POLICY "Admins can view all vehicles in their organization"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Org managers can view vehicles in their organization"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'org_manager'
    )
  );

CREATE POLICY "Workers can view vehicles assigned to them"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT vehicle_id FROM assignments 
      WHERE worker_id = auth.uid() AND vehicle_id IS NOT NULL
    )
  );

CREATE POLICY "Admins can insert vehicles in their organization"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update vehicles in their organization"
  ON vehicles FOR UPDATE
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

CREATE POLICY "Admins can delete vehicles in their organization"
  ON vehicles FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicles_organization ON vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_assignments_vehicle ON assignments(vehicle_id);