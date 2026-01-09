/*
  # Remove sick leave hours deduction from approval trigger

  1. Changes
    - Update the `update_leave_balance_on_approval` function to NOT deduct sick leave hours
    - Sick leave is tracked but not deducted from a balance (it's unlimited/tracked for reporting only)
    - Only vacation and ROL hours are deducted when approved

  2. Reasoning
    - Sick leave is a special type that doesn't consume a pre-allocated balance
    - When a sick leave request is approved, we track it but don't deduct from any balance
*/

CREATE OR REPLACE FUNCTION update_leave_balance_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only deduct hours when status changes from pending to approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    IF NEW.request_type = 'vacation' THEN
      UPDATE leave_balances
      SET 
        vacation_hours = vacation_hours - NEW.hours_requested,
        updated_at = now()
      WHERE worker_id = NEW.worker_id;
    ELSIF NEW.request_type = 'rol' THEN
      UPDATE leave_balances
      SET 
        rol_hours = rol_hours - NEW.hours_requested,
        updated_at = now()
      WHERE worker_id = NEW.worker_id;
    -- Sick leave is NOT deducted from any balance
    -- It is tracked for reporting purposes only
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;