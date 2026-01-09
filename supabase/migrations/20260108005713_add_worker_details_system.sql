/*
  # Add Worker Details System
  
  1. New Tables
    - `worker_courses`
      - `id` (uuid, primary key)
      - `worker_id` (uuid, references profiles)
      - `course_name` (text)
      - `completion_date` (date)
      - `notes` (text, optional)
      - `organization_id` (uuid, references organizations)
      - `created_at` (timestamptz)
      
    - `worker_medical_checkups`
      - `id` (uuid, primary key)
      - `worker_id` (uuid, references profiles)
      - `checkup_date` (date)
      - `expiry_date` (date)
      - `notes` (text, optional)
      - `organization_id` (uuid, references organizations)
      - `created_at` (timestamptz)
      
    - `worker_payment_card`
      - Added as column to profiles table
      - `payment_card_number` (text, optional)
      - `payment_card_assigned_date` (date, optional)
      
  2. Security
    - Enable RLS on all new tables
    - Admins and administrators can manage all worker details in their organization
    - Workers can view their own details
    
  3. Notes
    - Medical checkup expiry notifications will be handled via a separate notification system
    - Payment card field added directly to profiles table for simplicity
*/

-- Add payment card fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS payment_card_number text,
ADD COLUMN IF NOT EXISTS payment_card_assigned_date date;

-- Create worker_courses table
CREATE TABLE IF NOT EXISTS worker_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  course_name text NOT NULL,
  completion_date date NOT NULL,
  notes text,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE worker_courses ENABLE ROW LEVEL SECURITY;

-- Create worker_medical_checkups table
CREATE TABLE IF NOT EXISTS worker_medical_checkups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  checkup_date date NOT NULL,
  expiry_date date NOT NULL,
  notes text,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE worker_medical_checkups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for worker_courses

-- Admins and administrators can view all courses in organization
CREATE POLICY "Admins can view worker courses in organization"
  ON worker_courses FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- Workers can view their own courses
CREATE POLICY "Workers can view own courses"
  ON worker_courses FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid());

-- Admins and administrators can insert courses
CREATE POLICY "Admins can insert worker courses"
  ON worker_courses FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- Admins and administrators can update courses
CREATE POLICY "Admins can update worker courses"
  ON worker_courses FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- Admins and administrators can delete courses
CREATE POLICY "Admins can delete worker courses"
  ON worker_courses FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- RLS Policies for worker_medical_checkups

-- Admins and administrators can view all medical checkups in organization
CREATE POLICY "Admins can view medical checkups in organization"
  ON worker_medical_checkups FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- Workers can view their own medical checkups
CREATE POLICY "Workers can view own medical checkups"
  ON worker_medical_checkups FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid());

-- Admins and administrators can insert medical checkups
CREATE POLICY "Admins can insert medical checkups"
  ON worker_medical_checkups FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- Admins and administrators can update medical checkups
CREATE POLICY "Admins can update medical checkups"
  ON worker_medical_checkups FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- Admins and administrators can delete medical checkups
CREATE POLICY "Admins can delete medical checkups"
  ON worker_medical_checkups FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_worker_courses_worker_id ON worker_courses(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_courses_organization_id ON worker_courses(organization_id);
CREATE INDEX IF NOT EXISTS idx_worker_medical_checkups_worker_id ON worker_medical_checkups(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_medical_checkups_organization_id ON worker_medical_checkups(organization_id);
CREATE INDEX IF NOT EXISTS idx_worker_medical_checkups_expiry_date ON worker_medical_checkups(expiry_date);