/*
  # Add info field to payment_cards table
  
  1. Changes
    - Add `info` column to `payment_cards` table
      - Stores card number or telepass license plate
      - Optional field (nullable)
    
  2. Notes
    - Non-breaking change, existing cards will have NULL info
    - Can be updated later by admins
*/

-- Add info column to payment_cards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_cards' AND column_name = 'info'
  ) THEN
    ALTER TABLE payment_cards ADD COLUMN info text;
  END IF;
END $$;