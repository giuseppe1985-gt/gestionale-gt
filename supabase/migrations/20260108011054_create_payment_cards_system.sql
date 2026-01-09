/*
  # Create Payment Cards and Transactions System
  
  1. New Tables
    - `payment_cards`
      - `id` (uuid, primary key)
      - `name` (text) - Nome della carta (es. "Carta Q8")
      - `type` (text) - Tipo: 'card' o 'telepass'
      - `organization_id` (uuid, references organizations)
      - `is_active` (boolean) - Se la carta è attiva
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `card_transactions`
      - `id` (uuid, primary key)
      - `card_id` (uuid, references payment_cards)
      - `amount` (numeric) - Importo in euro
      - `transaction_date` (date) - Data della transazione
      - `description` (text, optional) - Descrizione della transazione
      - `organization_id` (uuid, references organizations)
      - `created_by` (uuid, references profiles) - Admin che ha inserito
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
  2. Security
    - Enable RLS on all tables
    - Only admins and administrators can manage cards and transactions
    - All data isolated by organization
    
  3. Indexes
    - Index on card_id for fast transaction lookups
    - Index on transaction_date for monthly calculations
    - Index on organization_id for isolation
    
  4. Notes
    - Monthly totals calculated client-side for flexibility
    - Transaction dates allow historical tracking and monthly filtering
*/

-- Create payment_cards table
CREATE TABLE IF NOT EXISTS payment_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('card', 'telepass')),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_cards ENABLE ROW LEVEL SECURITY;

-- Create card_transactions table
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

-- RLS Policies for payment_cards

-- Admins and administrators can view all cards in organization
CREATE POLICY "Admins can view payment cards in organization"
  ON payment_cards FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- Admins and administrators can insert cards
CREATE POLICY "Admins can insert payment cards"
  ON payment_cards FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- Admins and administrators can update cards
CREATE POLICY "Admins can update payment cards"
  ON payment_cards FOR UPDATE
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

-- Admins and administrators can delete cards
CREATE POLICY "Admins can delete payment cards"
  ON payment_cards FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- RLS Policies for card_transactions

-- Admins and administrators can view all transactions in organization
CREATE POLICY "Admins can view card transactions in organization"
  ON card_transactions FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- Admins and administrators can insert transactions
CREATE POLICY "Admins can insert card transactions"
  ON card_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- Admins and administrators can update transactions
CREATE POLICY "Admins can update card transactions"
  ON card_transactions FOR UPDATE
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

-- Admins and administrators can delete transactions
CREATE POLICY "Admins can delete card transactions"
  ON card_transactions FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_cards_organization_id ON payment_cards(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_cards_type ON payment_cards(type);
CREATE INDEX IF NOT EXISTS idx_card_transactions_card_id ON card_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_organization_id ON card_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_transaction_date ON card_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_card_transactions_created_by ON card_transactions(created_by);

-- Create updated_at trigger for payment_cards
CREATE OR REPLACE FUNCTION update_payment_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_cards_updated_at
  BEFORE UPDATE ON payment_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_cards_updated_at();

-- Create updated_at trigger for card_transactions
CREATE OR REPLACE FUNCTION update_card_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER card_transactions_updated_at
  BEFORE UPDATE ON card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_card_transactions_updated_at();