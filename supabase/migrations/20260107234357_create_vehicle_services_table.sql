/*
  # Create Vehicle Services History Table

  1. New Tables
    - `vehicle_services`
      - `id` (uuid, primary key) - Unique identifier for each service record
      - `vehicle_id` (uuid, foreign key) - Reference to the vehicle
      - `service_date` (date) - Date when the service was performed
      - `kilometers` (integer) - Odometer reading at the time of service
      - `notes` (text) - Optional notes about the service performed
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record last update timestamp
      - `created_by` (uuid, foreign key) - User who created the record

  2. Changes to Existing Tables
    - Remove `maintenance_date` column from `vehicles` table (deprecated)
    - The `inspection_date` field remains for legal inspection dates

  3. Security
    - Enable RLS on `vehicle_services` table
    - Admins can view, insert, update, and delete all service records in their organization
    - Workers and administrators can view service records for vehicles assigned to them

  4. Important Notes
    - This table maintains a complete history of all services performed on vehicles
    - Each service record includes the date and odometer reading
    - Service records are never deleted to maintain historical data
    - Multiple services can be recorded for the same vehicle
*/

-- Create vehicle_services table
CREATE TABLE IF NOT EXISTS vehicle_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  service_date date NOT NULL,
  kilometers integer NOT NULL,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups by vehicle
CREATE INDEX IF NOT EXISTS idx_vehicle_services_vehicle_id ON vehicle_services(vehicle_id);

-- Create index for faster lookups by date
CREATE INDEX IF NOT EXISTS idx_vehicle_services_service_date ON vehicle_services(service_date DESC);

-- Remove deprecated maintenance_date column from vehicles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'maintenance_date'
  ) THEN
    ALTER TABLE vehicles DROP COLUMN maintenance_date;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE vehicle_services ENABLE ROW LEVEL SECURITY;

-- Admins can view all service records in their organization
CREATE POLICY "Admins can view all vehicle services"
  ON vehicle_services FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN vehicles v ON v.id = vehicle_services.vehicle_id
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
      AND v.organization_id = p.organization_id
    )
  );

-- Admins can insert service records
CREATE POLICY "Admins can insert vehicle services"
  ON vehicle_services FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN vehicles v ON v.id = vehicle_services.vehicle_id
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
      AND v.organization_id = p.organization_id
    )
  );

-- Admins can update service records
CREATE POLICY "Admins can update vehicle services"
  ON vehicle_services FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN vehicles v ON v.id = vehicle_services.vehicle_id
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
      AND v.organization_id = p.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN vehicles v ON v.id = vehicle_services.vehicle_id
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
      AND v.organization_id = p.organization_id
    )
  );

-- Admins can delete service records
CREATE POLICY "Admins can delete vehicle services"
  ON vehicle_services FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN vehicles v ON v.id = vehicle_services.vehicle_id
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
      AND v.organization_id = p.organization_id
    )
  );

-- Workers and administrators can view services for their assigned vehicles
CREATE POLICY "Workers can view services for assigned vehicles"
  ON vehicle_services FOR SELECT
  TO authenticated
  USING (
    vehicle_id IN (
      SELECT vehicle_id FROM assignments 
      WHERE worker_id = auth.uid() AND vehicle_id IS NOT NULL
    ) AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('worker', 'administrator')
    )
  );