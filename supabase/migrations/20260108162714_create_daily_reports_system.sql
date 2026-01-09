/*
  # Create Daily Reports System (Rapportini)

  1. New Tables
    - `daily_reports`
      - `id` (uuid, primary key)
      - `worker_id` (uuid, references profiles) - Worker who submitted the report
      - `worksite_id` (uuid, references worksites) - Worksite selected
      - `organization_id` (uuid, references organizations)
      - `report_date` (date) - Date of the report
      - `report_time` (time) - Time when report was submitted
      - `description` (text) - Work description
      - `notes` (text, optional) - Additional notes
      - `hours_worked` (decimal, optional) - Hours worked
      - `materials_used` (text, optional) - Materials used
      - `equipment_used` (text, optional) - Equipment used
      - `weather_conditions` (text, optional) - Weather conditions
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `daily_reports` table
    - Policy for workers to create their own reports
    - Policy for workers to view their own reports
    - Policy for administrators, org_managers, sales_managers to view all reports in organization
    - Policy for admins to view all reports
    - Policy for workers to update their own reports (same day only)
    - Policy for admins to delete reports

  3. Indexes
    - Index on worker_id for faster queries
    - Index on worksite_id for faster queries
    - Index on report_date for faster queries
    - Index on organization_id for filtering
*/

CREATE TABLE IF NOT EXISTS daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  worksite_id uuid NOT NULL REFERENCES worksites(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  report_time time NOT NULL DEFAULT CURRENT_TIME,
  description text NOT NULL,
  notes text,
  hours_worked decimal(5,2),
  materials_used text,
  equipment_used text,
  weather_conditions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_worker_id ON daily_reports(worker_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_worksite_id ON daily_reports(worksite_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_report_date ON daily_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_organization_id ON daily_reports(organization_id);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can insert own reports"
  ON daily_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = worker_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('worker', 'administrator', 'org_manager', 'sales_manager')
    )
  );

CREATE POLICY "Workers can view own reports"
  ON daily_reports FOR SELECT
  TO authenticated
  USING (
    auth.uid() = worker_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'administrator', 'org_manager', 'sales_manager')
      AND profiles.organization_id = daily_reports.organization_id
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Workers can update own reports same day"
  ON daily_reports FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = worker_id AND
    report_date = CURRENT_DATE
  )
  WITH CHECK (
    auth.uid() = worker_id AND
    report_date = CURRENT_DATE
  );

CREATE POLICY "Admins can delete reports"
  ON daily_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );