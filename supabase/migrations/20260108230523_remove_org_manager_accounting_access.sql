/*
  # Remove Accounting Access for Org Managers

  1. Changes
    - Remove org_manager from all accounting-related policies
    - Only admin and administrator roles can access accounting data
    - Affects: issued_invoices, payment_schedule, supplier_riba, invoice_advances

  2. Security
    - org_manager can no longer view or manage accounting data
    - Only admin and administrator maintain full access to accounting
    - All policies maintain organization-level isolation

  3. Notes
    - This restricts accounting access to admin and administrator roles only
*/

-- Issued invoices - remove org_manager
DROP POLICY IF EXISTS "Admins and managers can view issued invoices in organization" ON issued_invoices;
CREATE POLICY "Admins and administrators can view issued invoices in organization"
  ON issued_invoices FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can create issued invoices" ON issued_invoices;
CREATE POLICY "Admins and administrators can create issued invoices"
  ON issued_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can update issued invoices" ON issued_invoices;
CREATE POLICY "Admins and administrators can update issued invoices"
  ON issued_invoices FOR UPDATE
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

DROP POLICY IF EXISTS "Admins and managers can delete issued invoices" ON issued_invoices;
CREATE POLICY "Admins and administrators can delete issued invoices"
  ON issued_invoices FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- Payment schedule - remove org_manager
DROP POLICY IF EXISTS "Admins and managers can view payment schedule in organization" ON payment_schedule;
CREATE POLICY "Admins and administrators can view payment schedule in organization"
  ON payment_schedule FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can create payment schedule" ON payment_schedule;
CREATE POLICY "Admins and administrators can create payment schedule"
  ON payment_schedule FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can update payment schedule" ON payment_schedule;
CREATE POLICY "Admins and administrators can update payment schedule"
  ON payment_schedule FOR UPDATE
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

DROP POLICY IF EXISTS "Admins and managers can delete payment schedule" ON payment_schedule;
CREATE POLICY "Admins and administrators can delete payment schedule"
  ON payment_schedule FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- Supplier RiBa - remove org_manager
DROP POLICY IF EXISTS "Admins and managers can view supplier riba in organization" ON supplier_riba;
CREATE POLICY "Admins and administrators can view supplier riba in organization"
  ON supplier_riba FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can create supplier riba" ON supplier_riba;
CREATE POLICY "Admins and administrators can create supplier riba"
  ON supplier_riba FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can update supplier riba" ON supplier_riba;
CREATE POLICY "Admins and administrators can update supplier riba"
  ON supplier_riba FOR UPDATE
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

DROP POLICY IF EXISTS "Admins and managers can delete supplier riba" ON supplier_riba;
CREATE POLICY "Admins and administrators can delete supplier riba"
  ON supplier_riba FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

-- Invoice advances - remove org_manager
DROP POLICY IF EXISTS "Admins and managers can view invoice advances in organization" ON invoice_advances;
CREATE POLICY "Admins and administrators can view invoice advances in organization"
  ON invoice_advances FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can create invoice advances" ON invoice_advances;
CREATE POLICY "Admins and administrators can create invoice advances"
  ON invoice_advances FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can update invoice advances" ON invoice_advances;
CREATE POLICY "Admins and administrators can update invoice advances"
  ON invoice_advances FOR UPDATE
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

DROP POLICY IF EXISTS "Admins and managers can delete invoice advances" ON invoice_advances;
CREATE POLICY "Admins and administrators can delete invoice advances"
  ON invoice_advances FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator')
    )
  );