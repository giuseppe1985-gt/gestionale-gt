/*
  # Create Complete Notification System

  1. New Tables
    - `notification_logs`
      - `id` (uuid, primary key)
      - `notification_type` (text) - Type of notification
      - `entity_type` (text) - Type of entity (medical_checkup, course, invoice, etc.)
      - `entity_id` (uuid) - ID of the entity
      - `user_id` (uuid) - User to notify
      - `title` (text) - Notification title
      - `body` (text) - Notification body
      - `days_before` (integer) - Days before deadline (14, 7, 1, or 0 for immediate)
      - `sent_at` (timestamptz) - When notification was sent
      - `organization_id` (uuid)
      - `created_at` (timestamptz)

  2. Functions
    - `get_pending_medical_notifications()` - Returns medical checkup notifications
    - `get_pending_course_notifications()` - Returns course renewal notifications
    - `get_pending_invoice_notifications()` - Returns invoice due notifications
    - `get_pending_riba_notifications()` - Returns RiBa due notifications
    - `get_pending_payment_notifications()` - Returns payment schedule notifications
    - `get_pending_vehicle_notifications()` - Returns vehicle inspection notifications
    - `create_notification_log()` - Creates a notification log entry

  3. Security
    - Enable RLS on notification_logs
    - Users can view their own notifications
    - Admins can view all notifications in organization

  4. Notes
    - Notifications are sent at 14, 7, and 1 days before deadlines
    - Each notification is logged to prevent duplicates
    - System tracks which notifications have been sent
    - UNIQUE constraint prevents duplicate notifications
*/

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL CHECK (notification_type IN (
    'deadline_reminder',
    'announcement',
    'assignment',
    'leave_request',
    'leave_response',
    'course_expiry',
    'medical_expiry',
    'vehicle_inspection',
    'invoice_due',
    'riba_due',
    'payment_due',
    'advance_due'
  )),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  days_before integer NOT NULL DEFAULT 0,
  sent_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, user_id, days_before)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_user
  ON notification_logs(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_entity
  ON notification_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_org
  ON notification_logs(organization_id);

-- Enable RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notification_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all notifications in organization
CREATE POLICY "Admins can view all notifications in organization"
  ON notification_logs FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'administrator')
    )
  );

-- Only authenticated users can insert
CREATE POLICY "Authenticated can insert notifications"
  ON notification_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to get pending medical checkup notifications
CREATE OR REPLACE FUNCTION get_pending_medical_notifications()
RETURNS TABLE (
  entity_id uuid,
  worker_id uuid,
  worker_name text,
  worker_email text,
  expiry_date date,
  days_until_expiry integer,
  days_before integer,
  notification_title text,
  notification_body text,
  organization_id uuid
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH notification_schedule AS (
    SELECT 14 AS days_before UNION ALL
    SELECT 7 UNION ALL
    SELECT 1
  )
  SELECT
    mc.id as entity_id,
    mc.worker_id,
    p.full_name as worker_name,
    p.email as worker_email,
    mc.expiry_date,
    (mc.expiry_date - CURRENT_DATE)::integer as days_until_expiry,
    ns.days_before,
    CASE
      WHEN ns.days_before = 1 THEN 'Visita Medica - Scade Domani!'
      ELSE 'Visita Medica in Scadenza'
    END as notification_title,
    CASE
      WHEN ns.days_before = 1 THEN 'La tua visita medica scade domani. Contatta l''amministrazione.'
      ELSE 'La tua visita medica scade tra ' || ns.days_before || ' giorni. Prenota il rinnovo.'
    END as notification_body,
    mc.organization_id
  FROM worker_medical_checkups mc
  JOIN profiles p ON mc.worker_id = p.id
  CROSS JOIN notification_schedule ns
  WHERE
    (mc.expiry_date - CURRENT_DATE) = ns.days_before
    AND NOT EXISTS (
      SELECT 1 FROM notification_logs nl
      WHERE nl.entity_type = 'medical_checkup'
        AND nl.entity_id = mc.id
        AND nl.user_id = mc.worker_id
        AND nl.days_before = ns.days_before
    )
  ORDER BY mc.expiry_date, ns.days_before;
END;
$$;

-- Function to get pending course renewal notifications
CREATE OR REPLACE FUNCTION get_pending_course_notifications()
RETURNS TABLE (
  entity_id uuid,
  worker_id uuid,
  worker_name text,
  worker_email text,
  course_name text,
  expiry_date date,
  days_until_expiry integer,
  days_before integer,
  notification_title text,
  notification_body text,
  organization_id uuid
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH notification_schedule AS (
    SELECT 14 AS days_before UNION ALL
    SELECT 7 UNION ALL
    SELECT 1
  ),
  courses_with_expiry AS (
    SELECT
      wc.id,
      wc.worker_id,
      wc.course_name,
      (wc.completion_date + INTERVAL '2 years')::date as expiry_date,
      wc.organization_id
    FROM worker_courses wc
  )
  SELECT
    cwe.id as entity_id,
    cwe.worker_id,
    p.full_name as worker_name,
    p.email as worker_email,
    cwe.course_name,
    cwe.expiry_date,
    (cwe.expiry_date - CURRENT_DATE)::integer as days_until_expiry,
    ns.days_before,
    CASE
      WHEN ns.days_before = 1 THEN 'Corso - Scade Domani!'
      ELSE 'Rinnovo Corso Necessario'
    END as notification_title,
    CASE
      WHEN ns.days_before = 1 THEN 'Il corso "' || cwe.course_name || '" scade domani. Prenota il rinnovo.'
      ELSE 'Il corso "' || cwe.course_name || '" scade tra ' || ns.days_before || ' giorni.'
    END as notification_body,
    cwe.organization_id
  FROM courses_with_expiry cwe
  JOIN profiles p ON cwe.worker_id = p.id
  CROSS JOIN notification_schedule ns
  WHERE
    (cwe.expiry_date - CURRENT_DATE) = ns.days_before
    AND NOT EXISTS (
      SELECT 1 FROM notification_logs nl
      WHERE nl.entity_type = 'course'
        AND nl.entity_id = cwe.id
        AND nl.user_id = cwe.worker_id
        AND nl.days_before = ns.days_before
    )
  ORDER BY cwe.expiry_date, ns.days_before;
END;
$$;

-- Function to get pending invoice notifications
CREATE OR REPLACE FUNCTION get_pending_invoice_notifications()
RETURNS TABLE (
  entity_id uuid,
  invoice_number text,
  client_name text,
  amount numeric,
  due_date date,
  days_until_due integer,
  days_before integer,
  notification_title text,
  notification_body text,
  organization_id uuid,
  admin_users uuid[]
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH notification_schedule AS (
    SELECT 14 AS days_before UNION ALL
    SELECT 7 UNION ALL
    SELECT 1
  )
  SELECT
    inv.id as entity_id,
    inv.invoice_number,
    inv.client_name,
    inv.amount,
    inv.due_date,
    (inv.due_date - CURRENT_DATE)::integer as days_until_due,
    ns.days_before,
    CASE
      WHEN ns.days_before = 1 THEN 'Fattura - Scade Domani!'
      ELSE 'Scadenza Fattura'
    END as notification_title,
    CASE
      WHEN ns.days_before = 1 THEN 'Fattura ' || inv.invoice_number || ' (' || inv.client_name || ') scade domani. Importo: €' || inv.amount
      ELSE 'Fattura ' || inv.invoice_number || ' scade tra ' || ns.days_before || ' giorni. Importo: €' || inv.amount
    END as notification_body,
    inv.organization_id,
    ARRAY(
      SELECT p.id
      FROM profiles p
      WHERE p.organization_id = inv.organization_id
        AND p.role IN ('admin', 'administrator')
    ) as admin_users
  FROM issued_invoices inv
  CROSS JOIN notification_schedule ns
  WHERE
    inv.payment_status = 'pending'
    AND (inv.due_date - CURRENT_DATE) = ns.days_before
  ORDER BY inv.due_date, ns.days_before;
END;
$$;

-- Function to get pending RiBa notifications
CREATE OR REPLACE FUNCTION get_pending_riba_notifications()
RETURNS TABLE (
  entity_id uuid,
  riba_number text,
  supplier_name text,
  amount numeric,
  due_date date,
  days_until_due integer,
  days_before integer,
  notification_title text,
  notification_body text,
  organization_id uuid,
  admin_users uuid[]
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH notification_schedule AS (
    SELECT 14 AS days_before UNION ALL
    SELECT 7 UNION ALL
    SELECT 1
  )
  SELECT
    sr.id as entity_id,
    sr.riba_number,
    sr.supplier_name,
    sr.amount,
    sr.due_date,
    (sr.due_date - CURRENT_DATE)::integer as days_until_due,
    ns.days_before,
    CASE
      WHEN ns.days_before = 1 THEN 'RiBa - Scade Domani!'
      ELSE 'Scadenza RiBa'
    END as notification_title,
    CASE
      WHEN ns.days_before = 1 THEN 'RiBa ' || sr.riba_number || ' (' || sr.supplier_name || ') scade domani. Importo: €' || sr.amount
      ELSE 'RiBa ' || sr.riba_number || ' scade tra ' || ns.days_before || ' giorni. Importo: €' || sr.amount
    END as notification_body,
    sr.organization_id,
    ARRAY(
      SELECT p.id
      FROM profiles p
      WHERE p.organization_id = sr.organization_id
        AND p.role IN ('admin', 'administrator')
    ) as admin_users
  FROM supplier_riba sr
  CROSS JOIN notification_schedule ns
  WHERE
    sr.payment_status = 'pending'
    AND (sr.due_date - CURRENT_DATE) = ns.days_before
  ORDER BY sr.due_date, ns.days_before;
END;
$$;

-- Function to get pending payment schedule notifications
CREATE OR REPLACE FUNCTION get_pending_payment_notifications()
RETURNS TABLE (
  entity_id uuid,
  title text,
  type text,
  amount numeric,
  due_date date,
  days_until_due integer,
  days_before integer,
  notification_title text,
  notification_body text,
  organization_id uuid,
  admin_users uuid[]
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH notification_schedule AS (
    SELECT 14 AS days_before UNION ALL
    SELECT 7 UNION ALL
    SELECT 1
  )
  SELECT
    ps.id as entity_id,
    ps.title,
    ps.type,
    ps.amount,
    ps.due_date,
    (ps.due_date - CURRENT_DATE)::integer as days_until_due,
    ns.days_before,
    CASE
      WHEN ns.days_before = 1 THEN 'Pagamento - Scade Domani!'
      ELSE 'Scadenza Pagamento'
    END as notification_title,
    CASE
      WHEN ns.days_before = 1 THEN ps.title || ' scade domani. Importo: €' || ps.amount
      ELSE ps.title || ' scade tra ' || ns.days_before || ' giorni. Importo: €' || ps.amount
    END as notification_body,
    ps.organization_id,
    ARRAY(
      SELECT p.id
      FROM profiles p
      WHERE p.organization_id = ps.organization_id
        AND p.role IN ('admin', 'administrator')
    ) as admin_users
  FROM payment_schedule ps
  CROSS JOIN notification_schedule ns
  WHERE
    ps.payment_status = 'pending'
    AND (ps.due_date - CURRENT_DATE) = ns.days_before
  ORDER BY ps.due_date, ns.days_before;
END;
$$;

-- Function to get pending vehicle inspection notifications
CREATE OR REPLACE FUNCTION get_pending_vehicle_notifications()
RETURNS TABLE (
  entity_id uuid,
  plate text,
  model text,
  inspection_date date,
  days_until_inspection integer,
  days_before integer,
  notification_title text,
  notification_body text,
  organization_id uuid,
  admin_users uuid[]
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH notification_schedule AS (
    SELECT 14 AS days_before UNION ALL
    SELECT 7 UNION ALL
    SELECT 1
  )
  SELECT
    v.id as entity_id,
    v.plate,
    v.model,
    v.inspection_date,
    (v.inspection_date - CURRENT_DATE)::integer as days_until_inspection,
    ns.days_before,
    CASE
      WHEN ns.days_before = 1 THEN 'Revisione - Domani!'
      ELSE 'Revisione Veicolo'
    END as notification_title,
    CASE
      WHEN ns.days_before = 1 THEN 'Revisione veicolo ' || v.plate || ' domani'
      ELSE 'Revisione veicolo ' || v.plate || ' tra ' || ns.days_before || ' giorni'
    END as notification_body,
    v.organization_id,
    ARRAY(
      SELECT p.id
      FROM profiles p
      WHERE p.organization_id = v.organization_id
        AND p.role IN ('admin', 'administrator')
    ) as admin_users
  FROM vehicles v
  CROSS JOIN notification_schedule ns
  WHERE
    v.inspection_date IS NOT NULL
    AND (v.inspection_date - CURRENT_DATE) = ns.days_before
  ORDER BY v.inspection_date, ns.days_before;
END;
$$;

-- Function to create notification log
CREATE OR REPLACE FUNCTION create_notification_log(
  p_notification_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_user_id uuid,
  p_title text,
  p_body text,
  p_days_before integer,
  p_organization_id uuid
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notification_logs (
    notification_type,
    entity_type,
    entity_id,
    user_id,
    title,
    body,
    days_before,
    organization_id
  ) VALUES (
    p_notification_type,
    p_entity_type,
    p_entity_id,
    p_user_id,
    p_title,
    p_body,
    p_days_before,
    p_organization_id
  )
  ON CONFLICT (entity_type, entity_id, user_id, days_before) DO NOTHING
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;