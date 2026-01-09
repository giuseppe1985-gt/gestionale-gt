/*
  # Create Accounting Management System

  1. New Tables
    - `issued_invoices` (Fatture Emesse)
      - `id` (uuid, primary key)
      - `invoice_number` (text) - Numero fattura
      - `client_name` (text) - Nome cliente
      - `amount` (numeric) - Importo fattura
      - `issue_date` (date) - Data emissione
      - `due_date` (date) - Data scadenza
      - `payment_status` (text) - Stato pagamento (pending, paid, overdue)
      - `notes` (text) - Note
      - `organization_id` (uuid, foreign key)
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `payment_schedule` (Scadenziario)
      - `id` (uuid, primary key)
      - `title` (text) - Titolo
      - `type` (text) - Tipo (bill, invoice, payment, other)
      - `amount` (numeric) - Importo
      - `due_date` (date) - Data scadenza
      - `payment_status` (text) - Stato (pending, paid, overdue)
      - `notes` (text) - Note
      - `organization_id` (uuid, foreign key)
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `supplier_riba` (RiBa Fornitore)
      - `id` (uuid, primary key)
      - `supplier_name` (text) - Nome fornitore
      - `riba_number` (text) - Numero RiBa
      - `amount` (numeric) - Importo
      - `due_date` (date) - Data scadenza
      - `payment_status` (text) - Stato (pending, paid, overdue)
      - `notification_sent` (boolean) - Notifica inviata
      - `notes` (text) - Note
      - `organization_id` (uuid, foreign key)
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `invoice_advances` (Anticipi Fatture)
      - `id` (uuid, primary key)
      - `invoice_reference` (text) - Riferimento fattura
      - `amount` (numeric) - Importo anticipo
      - `advance_date` (date) - Data anticipo
      - `bank_name` (text) - Nome banca
      - `payment_status` (text) - Stato (pending, received, rejected)
      - `notes` (text) - Note
      - `organization_id` (uuid, foreign key)
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Views
    - `monthly_cards_summary` - Totali mensili carte di pagamento e telepass

  3. Functions
    - `check_riba_notifications()` - Controlla RiBa in scadenza e crea notifiche
    - Trigger per eseguire il controllo automaticamente

  4. Security
    - Enable RLS on all tables
    - Only admins can access accounting data
    - All operations are scoped to organization

  5. Notes
    - Sistema completo di gestione contabile
    - Notifiche automatiche per RiBa in scadenza (1 settimana prima)
    - Viste aggregate per carte e telepass
    - Tutti gli importi in EUR con precisione di 2 decimali
*/

-- Create issued_invoices table
CREATE TABLE IF NOT EXISTS issued_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  client_name text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  notes text DEFAULT '',
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create payment_schedule table
CREATE TABLE IF NOT EXISTS payment_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('bill', 'invoice', 'payment', 'other')),
  amount numeric(12, 2) NOT NULL,
  due_date date NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  notes text DEFAULT '',
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create supplier_riba table
CREATE TABLE IF NOT EXISTS supplier_riba (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL,
  riba_number text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  due_date date NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  notification_sent boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create invoice_advances table
CREATE TABLE IF NOT EXISTS invoice_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_reference text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  advance_date date NOT NULL,
  bank_name text NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'received', 'rejected')),
  notes text DEFAULT '',
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_issued_invoices_org 
  ON issued_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_issued_invoices_due_date 
  ON issued_invoices(organization_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_issued_invoices_status 
  ON issued_invoices(organization_id, payment_status);

CREATE INDEX IF NOT EXISTS idx_payment_schedule_org 
  ON payment_schedule(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedule_due_date 
  ON payment_schedule(organization_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_payment_schedule_status 
  ON payment_schedule(organization_id, payment_status);

CREATE INDEX IF NOT EXISTS idx_supplier_riba_org 
  ON supplier_riba(organization_id);
CREATE INDEX IF NOT EXISTS idx_supplier_riba_due_date 
  ON supplier_riba(organization_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_riba_notification 
  ON supplier_riba(organization_id, notification_sent, due_date);

CREATE INDEX IF NOT EXISTS idx_invoice_advances_org 
  ON invoice_advances(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoice_advances_date 
  ON invoice_advances(organization_id, advance_date DESC);

-- Create view for monthly cards and telepass summary
CREATE OR REPLACE VIEW monthly_cards_summary AS
SELECT 
  DATE_TRUNC('month', ct.transaction_date) as month,
  ct.card_id,
  pc.name as card_name,
  pc.type as card_type,
  pc.info,
  SUM(ct.amount) as total_amount,
  COUNT(*) as transaction_count,
  pc.organization_id
FROM card_transactions ct
JOIN payment_cards pc ON ct.card_id = pc.id
GROUP BY DATE_TRUNC('month', ct.transaction_date), ct.card_id, pc.name, pc.type, pc.info, pc.organization_id
ORDER BY month DESC, card_type, card_name;

-- Enable RLS
ALTER TABLE issued_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_riba ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_advances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for issued_invoices

CREATE POLICY "Admins can view issued invoices in organization"
  ON issued_invoices FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create issued invoices"
  ON issued_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update issued invoices"
  ON issued_invoices FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete issued invoices"
  ON issued_invoices FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for payment_schedule

CREATE POLICY "Admins can view payment schedule in organization"
  ON payment_schedule FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create payment schedule"
  ON payment_schedule FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update payment schedule"
  ON payment_schedule FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete payment schedule"
  ON payment_schedule FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for supplier_riba

CREATE POLICY "Admins can view supplier riba in organization"
  ON supplier_riba FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create supplier riba"
  ON supplier_riba FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update supplier riba"
  ON supplier_riba FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete supplier riba"
  ON supplier_riba FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for invoice_advances

CREATE POLICY "Admins can view invoice advances in organization"
  ON invoice_advances FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create invoice advances"
  ON invoice_advances FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update invoice advances"
  ON invoice_advances FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete invoice advances"
  ON invoice_advances FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Function to check for RiBa notifications (7 days before due date)
CREATE OR REPLACE FUNCTION check_riba_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  riba_record RECORD;
BEGIN
  FOR riba_record IN
    SELECT 
      sr.id,
      sr.supplier_name,
      sr.riba_number,
      sr.amount,
      sr.due_date,
      sr.organization_id,
      p.id as admin_id,
      p.full_name as admin_name
    FROM supplier_riba sr
    CROSS JOIN profiles p
    WHERE 
      sr.payment_status = 'pending'
      AND sr.notification_sent = false
      AND sr.due_date <= CURRENT_DATE + INTERVAL '7 days'
      AND sr.due_date > CURRENT_DATE
      AND p.role = 'admin'
      AND p.organization_id = sr.organization_id
  LOOP
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      organization_id
    ) VALUES (
      riba_record.admin_id,
      'RiBa Fornitore in Scadenza',
      'Il RiBa ' || riba_record.riba_number || ' del fornitore ' || riba_record.supplier_name || 
      ' scade il ' || TO_CHAR(riba_record.due_date, 'DD/MM/YYYY') || 
      ' (Importo: €' || riba_record.amount || ')',
      'riba_reminder',
      riba_record.organization_id
    );

    UPDATE supplier_riba
    SET notification_sent = true
    WHERE id = riba_record.id;
  END LOOP;
END;
$$;

-- Create a trigger function for RiBa notifications
CREATE OR REPLACE FUNCTION trigger_riba_notifications()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM check_riba_notifications();
  RETURN NEW;
END;
$$;

-- Trigger on supplier_riba insert/update to check notifications
DROP TRIGGER IF EXISTS check_riba_on_change ON supplier_riba;
CREATE TRIGGER check_riba_on_change
  AFTER INSERT OR UPDATE ON supplier_riba
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_riba_notifications();