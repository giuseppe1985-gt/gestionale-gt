/*
  # Setup Completo Database - Sistema Gestione Cantieri
  
  Questa migrazione crea tutte le tabelle mancanti per il sistema:
  
  1. Tabelle Veicoli
    - vehicles: Gestione parco veicoli
    - vehicle_services: Storico tagliandi
    
  2. Tabelle Permessi
    - leave_balances: Monte ore ferie/ROL/malattia
    - leave_requests: Richieste permessi
    
  3. Tabelle Dettagli Lavoratori
    - worker_courses: Corsi di formazione
    - worker_medical_checkups: Visite mediche
    
  4. Tabelle Carte e Pagamenti
    - payment_cards: Carte carburante e telepass
    - card_transactions: Transazioni carte
    
  5. Tabelle Clienti
    - clients: Gestione clienti
    
  6. Tabelle Regolamenti
    - company_regulations: Regolamenti aziendali
    - company_regulation_attachments: Allegati
    
  7. Tabelle Contabilita
    - issued_invoices: Fatture emesse
    - payment_schedule: Scadenziario
    - supplier_riba: RiBa fornitori
    - invoice_advances: Anticipi fatture
    
  8. Tabelle Notifiche
    - notification_logs: Log notifiche inviate
    
  9. Funzioni Helper
    - get_user_organization_id(): Ottiene organization_id utente corrente
*/

-- Aggiungi ruolo administrator al check constraint di profiles
DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role = ANY (ARRAY['admin'::text, 'worker'::text, 'org_manager'::text, 'sales_manager'::text, 'administrator'::text]));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Crea funzione get_user_organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id 
  FROM profiles 
  WHERE id = auth.uid();
$$;

-- ==========================================
-- VEICOLI
-- ==========================================

-- Tabella vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plate text NOT NULL,
  model text DEFAULT '',
  details text DEFAULT '',
  kilometers integer DEFAULT 0,
  inspection_date date,
  issues text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, plate)
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Aggiungi vehicle_id a assignments se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'vehicle_id'
  ) THEN
    ALTER TABLE assignments ADD COLUMN vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Policies veicoli
DROP POLICY IF EXISTS "Admins can view vehicles" ON vehicles;
CREATE POLICY "Admins can view vehicles"
  ON vehicles FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Admins can insert vehicles" ON vehicles;
CREATE POLICY "Admins can insert vehicles"
  ON vehicles FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Admins can update vehicles" ON vehicles;
CREATE POLICY "Admins can update vehicles"
  ON vehicles FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Admins can delete vehicles" ON vehicles;
CREATE POLICY "Admins can delete vehicles"
  ON vehicles FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id());

-- Tabella vehicle_services
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

ALTER TABLE vehicle_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view vehicle services" ON vehicle_services;
CREATE POLICY "Admins can view vehicle services"
  ON vehicle_services FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vehicles v 
    WHERE v.id = vehicle_services.vehicle_id 
    AND v.organization_id = get_user_organization_id()
  ));

DROP POLICY IF EXISTS "Admins can insert vehicle services" ON vehicle_services;
CREATE POLICY "Admins can insert vehicle services"
  ON vehicle_services FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM vehicles v 
    WHERE v.id = vehicle_services.vehicle_id 
    AND v.organization_id = get_user_organization_id()
  ));

DROP POLICY IF EXISTS "Admins can update vehicle services" ON vehicle_services;
CREATE POLICY "Admins can update vehicle services"
  ON vehicle_services FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vehicles v 
    WHERE v.id = vehicle_services.vehicle_id 
    AND v.organization_id = get_user_organization_id()
  ));

DROP POLICY IF EXISTS "Admins can delete vehicle services" ON vehicle_services;
CREATE POLICY "Admins can delete vehicle services"
  ON vehicle_services FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vehicles v 
    WHERE v.id = vehicle_services.vehicle_id 
    AND v.organization_id = get_user_organization_id()
  ));

-- Index per veicoli
CREATE INDEX IF NOT EXISTS idx_vehicles_organization ON vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_assignments_vehicle ON assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_services_vehicle_id ON vehicle_services(vehicle_id);

-- ==========================================
-- PERMESSI (LEAVE MANAGEMENT)
-- ==========================================

-- Tabella leave_balances
CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vacation_hours integer DEFAULT 0 CHECK (vacation_hours >= 0),
  rol_hours integer DEFAULT 0 CHECK (rol_hours >= 0),
  sick_leave_hours integer DEFAULT 0 CHECK (sick_leave_hours >= 0),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(worker_id, organization_id)
);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

-- Tabella leave_requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('vacation', 'rol', 'sick_leave')),
  start_date date,
  end_date date,
  hours_requested integer NOT NULL CHECK (hours_requested > 0),
  reason text,
  certificate_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Policies leave_balances
DROP POLICY IF EXISTS "Users can view own balance" ON leave_balances;
CREATE POLICY "Users can view own balance"
  ON leave_balances FOR SELECT TO authenticated
  USING (worker_id = auth.uid() OR organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Admins can manage balances" ON leave_balances;
CREATE POLICY "Admins can manage balances"
  ON leave_balances FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id());

-- Policies leave_requests
DROP POLICY IF EXISTS "Users can view own requests" ON leave_requests;
CREATE POLICY "Users can view own requests"
  ON leave_requests FOR SELECT TO authenticated
  USING (worker_id = auth.uid() OR organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can create own requests" ON leave_requests;
CREATE POLICY "Users can create own requests"
  ON leave_requests FOR INSERT TO authenticated
  WITH CHECK (worker_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own pending" ON leave_requests;
CREATE POLICY "Users can update own pending"
  ON leave_requests FOR UPDATE TO authenticated
  USING (worker_id = auth.uid() OR organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Admins can delete requests" ON leave_requests;
CREATE POLICY "Admins can delete requests"
  ON leave_requests FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id());

-- Trigger per aggiornare balance
CREATE OR REPLACE FUNCTION update_leave_balance_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    IF NEW.request_type = 'vacation' THEN
      UPDATE leave_balances
      SET vacation_hours = GREATEST(0, vacation_hours - NEW.hours_requested), updated_at = now()
      WHERE worker_id = NEW.worker_id;
    ELSIF NEW.request_type = 'rol' THEN
      UPDATE leave_balances
      SET rol_hours = GREATEST(0, rol_hours - NEW.hours_requested), updated_at = now()
      WHERE worker_id = NEW.worker_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_leave_balance ON leave_requests;
CREATE TRIGGER trigger_update_leave_balance
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_balance_on_approval();

-- Index permessi
CREATE INDEX IF NOT EXISTS idx_leave_balances_worker ON leave_balances(worker_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_org ON leave_balances(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_worker ON leave_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_org ON leave_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- ==========================================
-- DETTAGLI LAVORATORI
-- ==========================================

-- Aggiungi campi carta pagamento a profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS payment_card_number text,
ADD COLUMN IF NOT EXISTS payment_card_assigned_date date;

-- Tabella worker_courses
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

DROP POLICY IF EXISTS "View worker courses" ON worker_courses;
CREATE POLICY "View worker courses"
  ON worker_courses FOR SELECT TO authenticated
  USING (worker_id = auth.uid() OR organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Manage worker courses" ON worker_courses;
CREATE POLICY "Manage worker courses"
  ON worker_courses FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id());

-- Tabella worker_medical_checkups
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

DROP POLICY IF EXISTS "View medical checkups" ON worker_medical_checkups;
CREATE POLICY "View medical checkups"
  ON worker_medical_checkups FOR SELECT TO authenticated
  USING (worker_id = auth.uid() OR organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Manage medical checkups" ON worker_medical_checkups;
CREATE POLICY "Manage medical checkups"
  ON worker_medical_checkups FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id());

-- Index dettagli lavoratori
CREATE INDEX IF NOT EXISTS idx_worker_courses_worker ON worker_courses(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_courses_org ON worker_courses(organization_id);
CREATE INDEX IF NOT EXISTS idx_worker_medical_worker ON worker_medical_checkups(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_medical_org ON worker_medical_checkups(organization_id);
CREATE INDEX IF NOT EXISTS idx_worker_medical_expiry ON worker_medical_checkups(expiry_date);

-- ==========================================
-- CARTE PAGAMENTO
-- ==========================================

-- Tabella payment_cards
CREATE TABLE IF NOT EXISTS payment_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('card', 'telepass')),
  info text DEFAULT '',
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View payment cards" ON payment_cards;
CREATE POLICY "View payment cards"
  ON payment_cards FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Manage payment cards" ON payment_cards;
CREATE POLICY "Manage payment cards"
  ON payment_cards FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id());

-- Tabella card_transactions
CREATE TABLE IF NOT EXISTS card_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES payment_cards(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10, 2) NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View card transactions" ON card_transactions;
CREATE POLICY "View card transactions"
  ON card_transactions FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Manage card transactions" ON card_transactions;
CREATE POLICY "Manage card transactions"
  ON card_transactions FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id());

-- Index carte
CREATE INDEX IF NOT EXISTS idx_payment_cards_org ON payment_cards(organization_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_card ON card_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_org ON card_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_date ON card_transactions(transaction_date);

-- ==========================================
-- CLIENTI
-- ==========================================

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed')),
  notes text,
  issues text,
  survey_date date,
  start_date date,
  end_date date,
  worksite_id uuid REFERENCES worksites(id) ON DELETE SET NULL,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View clients" ON clients;
CREATE POLICY "View clients"
  ON clients FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Manage clients" ON clients;
CREATE POLICY "Manage clients"
  ON clients FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_worksite ON clients(worksite_id);

-- ==========================================
-- REGOLAMENTI AZIENDALI
-- ==========================================

CREATE TABLE IF NOT EXISTS company_regulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE company_regulations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS company_regulation_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_id uuid NOT NULL REFERENCES company_regulations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE company_regulation_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View regulations" ON company_regulations;
CREATE POLICY "View regulations"
  ON company_regulations FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Manage regulations" ON company_regulations;
CREATE POLICY "Manage regulations"
  ON company_regulations FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "View regulation attachments" ON company_regulation_attachments;
CREATE POLICY "View regulation attachments"
  ON company_regulation_attachments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_regulations cr
    WHERE cr.id = regulation_id AND cr.organization_id = get_user_organization_id()
  ));

DROP POLICY IF EXISTS "Manage regulation attachments" ON company_regulation_attachments;
CREATE POLICY "Manage regulation attachments"
  ON company_regulation_attachments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_regulations cr
    WHERE cr.id = regulation_id AND cr.organization_id = get_user_organization_id()
  ));

CREATE INDEX IF NOT EXISTS idx_regulations_org ON company_regulations(organization_id);
CREATE INDEX IF NOT EXISTS idx_regulation_attachments_reg ON company_regulation_attachments(regulation_id);

-- Storage bucket per regolamenti
INSERT INTO storage.buckets (id, name, public)
VALUES ('regulation-files', 'regulation-files', false)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- CONTABILITA
-- ==========================================

-- Fatture emesse
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

ALTER TABLE issued_invoices ENABLE ROW LEVEL SECURITY;

-- Scadenziario
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

ALTER TABLE payment_schedule ENABLE ROW LEVEL SECURITY;

-- RiBa fornitori
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

ALTER TABLE supplier_riba ENABLE ROW LEVEL SECURITY;

-- Anticipi fatture
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

ALTER TABLE invoice_advances ENABLE ROW LEVEL SECURITY;

-- Policies contabilita
DROP POLICY IF EXISTS "View invoices" ON issued_invoices;
CREATE POLICY "View invoices"
  ON issued_invoices FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Manage invoices" ON issued_invoices;
CREATE POLICY "Manage invoices"
  ON issued_invoices FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "View schedule" ON payment_schedule;
CREATE POLICY "View schedule"
  ON payment_schedule FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Manage schedule" ON payment_schedule;
CREATE POLICY "Manage schedule"
  ON payment_schedule FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "View riba" ON supplier_riba;
CREATE POLICY "View riba"
  ON supplier_riba FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Manage riba" ON supplier_riba;
CREATE POLICY "Manage riba"
  ON supplier_riba FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "View advances" ON invoice_advances;
CREATE POLICY "View advances"
  ON invoice_advances FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Manage advances" ON invoice_advances;
CREATE POLICY "Manage advances"
  ON invoice_advances FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id());

-- Index contabilita
CREATE INDEX IF NOT EXISTS idx_invoices_org ON issued_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON issued_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_schedule_org ON payment_schedule(organization_id);
CREATE INDEX IF NOT EXISTS idx_schedule_due ON payment_schedule(due_date);
CREATE INDEX IF NOT EXISTS idx_riba_org ON supplier_riba(organization_id);
CREATE INDEX IF NOT EXISTS idx_riba_due ON supplier_riba(due_date);
CREATE INDEX IF NOT EXISTS idx_advances_org ON invoice_advances(organization_id);

-- ==========================================
-- NOTIFICHE
-- ==========================================

CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
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

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own notifications" ON notification_logs;
CREATE POLICY "View own notifications"
  ON notification_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Insert notifications" ON notification_logs;
CREATE POLICY "Insert notifications"
  ON notification_logs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_entity ON notification_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_org ON notification_logs(organization_id);

-- ==========================================
-- STORAGE BUCKET PER CERTIFICATI
-- ==========================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('leave-certificates', 'leave-certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Policy per storage
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated can upload certificates" ON storage.objects;
  CREATE POLICY "Authenticated can upload certificates"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'leave-certificates');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated can view certificates" ON storage.objects;
  CREATE POLICY "Authenticated can view certificates"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'leave-certificates');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
