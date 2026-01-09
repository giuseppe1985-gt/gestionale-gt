/*
  # Fix Missing View and Columns
  
  1. Aggiunge colonna second_worksite_id a assignments
  2. Crea la view monthly_cards_summary per i totali mensili carte
*/

-- Aggiungi second_worksite_id a assignments se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'second_worksite_id'
  ) THEN
    ALTER TABLE assignments ADD COLUMN second_worksite_id uuid REFERENCES worksites(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Crea index per second_worksite_id
CREATE INDEX IF NOT EXISTS idx_assignments_second_worksite ON assignments(second_worksite_id);

-- Crea la view monthly_cards_summary
DROP VIEW IF EXISTS monthly_cards_summary;
CREATE VIEW monthly_cards_summary AS
SELECT 
  DATE_TRUNC('month', ct.transaction_date)::date as month,
  ct.card_id,
  pc.name as card_name,
  pc.type as card_type,
  pc.info,
  COALESCE(SUM(ct.amount), 0) as total_amount,
  COUNT(*) as transaction_count,
  pc.organization_id
FROM card_transactions ct
JOIN payment_cards pc ON ct.card_id = pc.id
GROUP BY DATE_TRUNC('month', ct.transaction_date), ct.card_id, pc.name, pc.type, pc.info, pc.organization_id
ORDER BY month DESC, card_type, card_name;

-- Grant select su view
GRANT SELECT ON monthly_cards_summary TO authenticated;
