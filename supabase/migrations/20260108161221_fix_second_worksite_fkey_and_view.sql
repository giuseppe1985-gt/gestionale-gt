/*
  # Fix Foreign Key Name and Recreate View
  
  1. Ricrea la colonna second_worksite_id con FK nominata correttamente
  2. Ricrea la view monthly_cards_summary
*/

-- Drop e ricrea la colonna con FK nominata correttamente
DO $$
BEGIN
  -- Drop la colonna se esiste
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'second_worksite_id'
  ) THEN
    ALTER TABLE assignments DROP COLUMN second_worksite_id;
  END IF;
  
  -- Ricrea con constraint nominato
  ALTER TABLE assignments 
    ADD COLUMN second_worksite_id uuid;
  
  ALTER TABLE assignments 
    ADD CONSTRAINT assignments_second_worksite_id_fkey 
    FOREIGN KEY (second_worksite_id) 
    REFERENCES worksites(id) 
    ON DELETE SET NULL;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_assignments_second_worksite ON assignments(second_worksite_id);

-- Drop e ricrea la view
DROP VIEW IF EXISTS monthly_cards_summary CASCADE;

CREATE OR REPLACE VIEW monthly_cards_summary AS
SELECT 
  DATE_TRUNC('month', ct.transaction_date)::date as month,
  ct.card_id,
  pc.name as card_name,
  pc.type as card_type,
  pc.info,
  COALESCE(SUM(ct.amount), 0)::numeric(12,2) as total_amount,
  COUNT(*)::integer as transaction_count,
  pc.organization_id
FROM card_transactions ct
JOIN payment_cards pc ON ct.card_id = pc.id
GROUP BY DATE_TRUNC('month', ct.transaction_date), ct.card_id, pc.name, pc.type, pc.info, pc.organization_id;

-- Assicurati che la view sia accessibile
GRANT SELECT ON monthly_cards_summary TO anon;
GRANT SELECT ON monthly_cards_summary TO authenticated;
