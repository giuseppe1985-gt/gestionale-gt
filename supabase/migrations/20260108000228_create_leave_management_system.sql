/*
  # Create Leave Management System

  1. New Tables
    - `leave_balances`
      - `id` (uuid, primary key)
      - `worker_id` (uuid, foreign key to profiles)
      - `vacation_hours` (integer) - Monte ore ferie disponibili
      - `rol_hours` (integer) - Monte ore ROL disponibili
      - `sick_leave_hours` (integer) - Monte ore malattia disponibili
      - `organization_id` (uuid, foreign key to organizations)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `leave_requests`
      - `id` (uuid, primary key)
      - `worker_id` (uuid, foreign key to profiles)
      - `request_type` (enum: 'vacation', 'rol', 'sick_leave')
      - `start_date` (date) - Data inizio (per ferie e malattia)
      - `end_date` (date) - Data fine (per ferie e malattia)
      - `hours_requested` (integer) - Ore richieste
      - `reason` (text) - Motivazione (per ROL e malattia)
      - `status` (enum: 'pending', 'approved', 'rejected')
      - `reviewed_by` (uuid, foreign key to profiles)
      - `reviewed_at` (timestamp)
      - `organization_id` (uuid, foreign key to organizations)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Workers can view their own balances and requests
    - Workers can create leave requests
    - Admins can view and manage all balances and requests in their organization
    - Auto-update balances when requests are approved

  3. Important Notes
    - Each day of vacation = 8 hours
    - ROL is counted in hours
    - When a request is approved, hours are automatically deducted from balance
    - Sick leave hours are tracked separately
*/

-- Create leave_balances table
CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vacation_hours integer DEFAULT 0 CHECK (vacation_hours >= 0 AND vacation_hours <= 999),
  rol_hours integer DEFAULT 0 CHECK (rol_hours >= 0 AND rol_hours <= 999),
  sick_leave_hours integer DEFAULT 0 CHECK (sick_leave_hours >= 0 AND sick_leave_hours <= 999),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(worker_id, organization_id)
);

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('vacation', 'rol', 'sick_leave')),
  start_date date,
  end_date date,
  hours_requested integer NOT NULL CHECK (hours_requested > 0),
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (
    (request_type = 'vacation' AND start_date IS NOT NULL AND end_date IS NOT NULL) OR
    (request_type = 'rol') OR
    (request_type = 'sick_leave' AND start_date IS NOT NULL AND end_date IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Leave Balances Policies

-- Workers can view their own balance
CREATE POLICY "Workers can view own leave balance"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    auth.uid() = worker_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'org_manager')
      AND profiles.organization_id = leave_balances.organization_id
    )
  );

-- Admins can view all balances in their organization
CREATE POLICY "Admins can view all leave balances"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'org_manager')
      AND profiles.organization_id = leave_balances.organization_id
    )
  );

-- Admins can insert balances
CREATE POLICY "Admins can insert leave balances"
  ON leave_balances FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'org_manager')
      AND profiles.organization_id = leave_balances.organization_id
    )
  );

-- Admins can update balances
CREATE POLICY "Admins can update leave balances"
  ON leave_balances FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'org_manager')
      AND profiles.organization_id = leave_balances.organization_id
    )
  );

-- Leave Requests Policies

-- Workers can view their own requests
CREATE POLICY "Workers can view own leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = worker_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'org_manager')
      AND profiles.organization_id = leave_requests.organization_id
    )
  );

-- Workers can create their own requests
CREATE POLICY "Workers can create leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = worker_id
  );

-- Workers can update their own pending requests
CREATE POLICY "Workers can update own pending requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = worker_id AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = worker_id AND status = 'pending'
  );

-- Admins can update all requests in their organization
CREATE POLICY "Admins can update leave requests"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'org_manager')
      AND profiles.organization_id = leave_requests.organization_id
    )
  );

-- Admins can delete requests
CREATE POLICY "Admins can delete leave requests"
  ON leave_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'org_manager')
      AND profiles.organization_id = leave_requests.organization_id
    )
  );

-- Function to update balances when request is approved
CREATE OR REPLACE FUNCTION update_leave_balance_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only deduct hours when status changes from pending to approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    IF NEW.request_type = 'vacation' THEN
      UPDATE leave_balances
      SET 
        vacation_hours = vacation_hours - NEW.hours_requested,
        updated_at = now()
      WHERE worker_id = NEW.worker_id;
    ELSIF NEW.request_type = 'rol' THEN
      UPDATE leave_balances
      SET 
        rol_hours = rol_hours - NEW.hours_requested,
        updated_at = now()
      WHERE worker_id = NEW.worker_id;
    ELSIF NEW.request_type = 'sick_leave' THEN
      UPDATE leave_balances
      SET 
        sick_leave_hours = sick_leave_hours - NEW.hours_requested,
        updated_at = now()
      WHERE worker_id = NEW.worker_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update balances
DROP TRIGGER IF EXISTS trigger_update_leave_balance ON leave_requests;
CREATE TRIGGER trigger_update_leave_balance
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_balance_on_approval();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leave_balances_worker ON leave_balances(worker_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_org ON leave_balances(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_worker ON leave_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_org ON leave_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);