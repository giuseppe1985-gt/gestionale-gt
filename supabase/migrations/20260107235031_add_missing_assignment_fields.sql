/*
  # Add Missing Assignment Fields

  1. Changes to Existing Tables
    - Add `end_time` column to `assignments` table for end time tracking
    - Add `has_double_site` column to track if assignment has two worksites
    - Add `second_worksite_id` column for second worksite assignment
    - Add `second_start_time` column for second worksite start time
    - Add `second_end_time` column for second worksite end time

  2. Important Notes
    - These fields support the double worksite feature where workers work morning and afternoon at different sites
    - The second worksite fields are optional and only used when has_double_site is true
    - End time is optional as it may not always be specified
*/

-- Add end_time column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE assignments ADD COLUMN end_time time;
  END IF;
END $$;

-- Add has_double_site column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'has_double_site'
  ) THEN
    ALTER TABLE assignments ADD COLUMN has_double_site boolean DEFAULT false;
  END IF;
END $$;

-- Add second_worksite_id column with foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'second_worksite_id'
  ) THEN
    ALTER TABLE assignments ADD COLUMN second_worksite_id uuid REFERENCES worksites(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add second_start_time column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'second_start_time'
  ) THEN
    ALTER TABLE assignments ADD COLUMN second_start_time time;
  END IF;
END $$;

-- Add second_end_time column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'second_end_time'
  ) THEN
    ALTER TABLE assignments ADD COLUMN second_end_time time;
  END IF;
END $$;