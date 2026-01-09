/*
  # Update Role Permissions

  1. Changes
    - Add permissions for sales_manager role (Clienti + Annunci)
    - Add permissions for org_manager role (all except limited access to some sections)
    - Update administrator role to have full admin permissions
  
  2. Role Definitions
    - admin: Full access to everything
    - administrator: Like admin (full access)
    - org_manager: Access to everything
    - sales_manager: Like worker + Clients + Announcements management
    - worker: Basic worker access

  3. Notes
    - Updates all existing policies to include new roles
    - Maintains organization-level security
*/

-- Update clients policies for sales_manager and org_manager
DROP POLICY IF EXISTS "Admins can view clients in organization" ON clients;
CREATE POLICY "Admins and managers can view clients in organization"
  ON clients FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager', 'sales_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can create clients" ON clients;
CREATE POLICY "Admins and managers can create clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager', 'sales_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can update clients" ON clients;
CREATE POLICY "Admins and managers can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager', 'sales_manager')
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager', 'sales_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can delete clients" ON clients;
CREATE POLICY "Admins and managers can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager', 'sales_manager')
    )
  );

-- Update announcements policies for sales_manager and org_manager
DROP POLICY IF EXISTS "Admin and supervisors can view all announcements in organization" ON announcements;
CREATE POLICY "Admins and managers can view all announcements in organization"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager', 'sales_manager')
      )
      OR target_audience = 'all'
      OR (target_audience = 'specific' AND target_worksite_id IN (
        SELECT worksite_id FROM assignments WHERE worker_id = auth.uid()
      ))
    )
  );

DROP POLICY IF EXISTS "Admin can create announcements" ON announcements;
CREATE POLICY "Admins and managers can create announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager', 'sales_manager')
    )
  );

DROP POLICY IF EXISTS "Admin can update announcements" ON announcements;
CREATE POLICY "Admins and managers can update announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager', 'sales_manager')
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager', 'sales_manager')
    )
  );

DROP POLICY IF EXISTS "Admin can delete announcements" ON announcements;
CREATE POLICY "Admins and managers can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager', 'sales_manager')
    )
  );

-- Update all admin-only policies to include administrator and org_manager
-- Workers management
DROP POLICY IF EXISTS "Admins can view all profiles in organization" ON profiles;
CREATE POLICY "Admins and managers can view all profiles in organization"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'administrator', 'org_manager')
      )
      OR id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can update worker profiles" ON profiles;
CREATE POLICY "Admins and managers can update worker profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'administrator', 'org_manager')
      )
      OR id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'administrator', 'org_manager')
      )
      OR id = auth.uid()
    )
  );

-- Worksites management
DROP POLICY IF EXISTS "Admin worksites view policy" ON worksites;
CREATE POLICY "Admins and managers can view worksites in organization"
  ON worksites FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'administrator', 'org_manager')
      )
      OR id IN (
        SELECT worksite_id FROM assignments WHERE worker_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admins can create worksites" ON worksites;
CREATE POLICY "Admins and managers can create worksites"
  ON worksites FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can update worksites" ON worksites;
CREATE POLICY "Admins and managers can update worksites"
  ON worksites FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can delete worksites" ON worksites;
CREATE POLICY "Admins and managers can delete worksites"
  ON worksites FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

-- Vehicles management
DROP POLICY IF EXISTS "Admins can view vehicles in organization" ON vehicles;
CREATE POLICY "Admins and managers can view vehicles in organization"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can create vehicles" ON vehicles;
CREATE POLICY "Admins and managers can create vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can update vehicles" ON vehicles;
CREATE POLICY "Admins and managers can update vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can delete vehicles" ON vehicles;
CREATE POLICY "Admins and managers can delete vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

-- Update accounting policies to include administrator and org_manager
DROP POLICY IF EXISTS "Admins can view issued invoices in organization" ON issued_invoices;
CREATE POLICY "Admins and managers can view issued invoices in organization"
  ON issued_invoices FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can create issued invoices" ON issued_invoices;
CREATE POLICY "Admins and managers can create issued invoices"
  ON issued_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can update issued invoices" ON issued_invoices;
CREATE POLICY "Admins and managers can update issued invoices"
  ON issued_invoices FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can delete issued invoices" ON issued_invoices;
CREATE POLICY "Admins and managers can delete issued invoices"
  ON issued_invoices FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

-- Payment schedule
DROP POLICY IF EXISTS "Admins can view payment schedule in organization" ON payment_schedule;
CREATE POLICY "Admins and managers can view payment schedule in organization"
  ON payment_schedule FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can create payment schedule" ON payment_schedule;
CREATE POLICY "Admins and managers can create payment schedule"
  ON payment_schedule FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can update payment schedule" ON payment_schedule;
CREATE POLICY "Admins and managers can update payment schedule"
  ON payment_schedule FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can delete payment schedule" ON payment_schedule;
CREATE POLICY "Admins and managers can delete payment schedule"
  ON payment_schedule FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

-- Supplier RiBa
DROP POLICY IF EXISTS "Admins can view supplier riba in organization" ON supplier_riba;
CREATE POLICY "Admins and managers can view supplier riba in organization"
  ON supplier_riba FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can create supplier riba" ON supplier_riba;
CREATE POLICY "Admins and managers can create supplier riba"
  ON supplier_riba FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can update supplier riba" ON supplier_riba;
CREATE POLICY "Admins and managers can update supplier riba"
  ON supplier_riba FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can delete supplier riba" ON supplier_riba;
CREATE POLICY "Admins and managers can delete supplier riba"
  ON supplier_riba FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

-- Invoice advances
DROP POLICY IF EXISTS "Admins can view invoice advances in organization" ON invoice_advances;
CREATE POLICY "Admins and managers can view invoice advances in organization"
  ON invoice_advances FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can create invoice advances" ON invoice_advances;
CREATE POLICY "Admins and managers can create invoice advances"
  ON invoice_advances FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can update invoice advances" ON invoice_advances;
CREATE POLICY "Admins and managers can update invoice advances"
  ON invoice_advances FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can delete invoice advances" ON invoice_advances;
CREATE POLICY "Admins and managers can delete invoice advances"
  ON invoice_advances FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'administrator', 'org_manager')
    )
  );