/*
  # Add Missing Assignment Time Fields

  1. New Columns
    - `end_time` (time) - End time for first worksite
    - `has_double_site` (boolean) - Flag to indicate double worksite assignment
    - `second_start_time` (time) - Start time for second worksite
    - `second_end_time` (time) - End time for second worksite

  2. Purpose
    - Support complete time tracking for worksite assignments
    - Enable proper double worksite (morning/afternoon) functionality
    - Track both start and end times for each worksite

  3. Notes
    - All new fields are nullable for backward compatibility
    - has_double_site defaults to false
    - Times are stored without timezone as they represent working hours
*/

-- Add missing time fields to assignments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE assignments ADD COLUMN end_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'has_double_site'
  ) THEN
    ALTER TABLE assignments ADD COLUMN has_double_site boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'second_start_time'
  ) THEN
    ALTER TABLE assignments ADD COLUMN second_start_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'second_end_time'
  ) THEN
    ALTER TABLE assignments ADD COLUMN second_end_time time;
  END IF;
END $$;
