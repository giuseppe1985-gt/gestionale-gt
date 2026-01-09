/*
  # Database Cleanup - Keep Only Users and Roles

  This migration cleans up all operational data from the database while preserving:
  1. User accounts (auth.users - managed by Supabase)
  2. User profiles and roles (profiles table)
  3. Organization data (organizations table)

  ## Tables Cleaned (all data deleted)
    - company_regulation_attachments
    - announcement_reads
    - notification_logs
    - audit_logs
    - card_transactions
    - worksite_liquid_assets
    - worksite_invoices
    - invoice_advances
    - supplier_riba
    - payment_schedule
    - issued_invoices
    - invoice_calculations
    - daily_reports
    - worksite_revenues
    - company_regulations
    - clients
    - payment_cards
    - worker_medical_checkups
    - worker_courses
    - leave_requests
    - leave_balances
    - vehicle_services
    - vehicles
    - time_entries
    - assignments
    - announcements
    - worksites
    - push_notification_tokens

  ## Tables Preserved
    - profiles (users and their roles)
    - organizations
    - auth.users (automatically preserved by Supabase)

  ## Important Notes
    - This operation is irreversible for the deleted data
    - All user accounts remain intact
    - All role assignments remain intact
    - All organizational structure remains intact
*/

-- Clean up all operational data in reverse dependency order
DELETE FROM company_regulation_attachments;
DELETE FROM announcement_reads;
DELETE FROM notification_logs;
DELETE FROM audit_logs;
DELETE FROM card_transactions;
DELETE FROM worksite_liquid_assets;
DELETE FROM worksite_invoices;
DELETE FROM invoice_advances;
DELETE FROM supplier_riba;
DELETE FROM payment_schedule;
DELETE FROM issued_invoices;
DELETE FROM invoice_calculations;
DELETE FROM daily_reports;
DELETE FROM worksite_revenues;
DELETE FROM company_regulations;
DELETE FROM clients;
DELETE FROM payment_cards;
DELETE FROM worker_medical_checkups;
DELETE FROM worker_courses;
DELETE FROM leave_requests;
DELETE FROM leave_balances;
DELETE FROM vehicle_services;
DELETE FROM vehicles;
DELETE FROM time_entries;
DELETE FROM assignments;
DELETE FROM announcements;
DELETE FROM worksites;
DELETE FROM push_notification_tokens;
