export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: 'admin' | 'worker' | 'org_manager' | 'sales_manager' | 'administrator'
          photo_url: string | null
          position: string | null
          status: 'active' | 'on_break' | 'off_site'
          organization_id: string | null
          payment_card_number: string | null
          payment_card_assigned_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          role: 'admin' | 'worker' | 'org_manager' | 'sales_manager' | 'administrator'
          photo_url?: string | null
          position?: string | null
          status?: 'active' | 'on_break' | 'off_site'
          organization_id?: string | null
          payment_card_number?: string | null
          payment_card_assigned_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          role?: 'admin' | 'worker' | 'org_manager' | 'sales_manager' | 'administrator'
          photo_url?: string | null
          position?: string | null
          status?: 'active' | 'on_break' | 'off_site'
          organization_id?: string | null
          payment_card_number?: string | null
          payment_card_assigned_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      worksites: {
        Row: {
          id: string
          name: string
          address: string
          latitude: number | null
          longitude: number | null
          created_by: string | null
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          latitude?: number | null
          longitude?: number | null
          created_by?: string | null
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          latitude?: number | null
          longitude?: number | null
          created_by?: string | null
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      time_entries: {
        Row: {
          id: string
          worker_id: string
          worksite_id: string | null
          entry_type: 'work_start' | 'lunch_start' | 'lunch_end' | 'work_end'
          timestamp: string
          latitude: number | null
          longitude: number | null
          photo_url: string | null
          notes: string | null
          edited_by: string | null
          edited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          worker_id: string
          worksite_id?: string | null
          entry_type: 'work_start' | 'lunch_start' | 'lunch_end' | 'work_end'
          timestamp?: string
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          notes?: string | null
          edited_by?: string | null
          edited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          worker_id?: string
          worksite_id?: string | null
          entry_type?: 'work_start' | 'lunch_start' | 'lunch_end' | 'work_end'
          timestamp?: string
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          notes?: string | null
          edited_by?: string | null
          edited_at?: string | null
          created_at?: string
        }
      }
      assignments: {
        Row: {
          id: string
          worker_id: string
          worksite_id: string
          assigned_date: string
          start_time: string | null
          end_time: string | null
          instructions: string | null
          confirmed: boolean
          confirmed_at: string | null
          created_by: string | null
          vehicle_id: string | null
          has_double_site: boolean | null
          second_worksite_id: string | null
          second_start_time: string | null
          second_end_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          worker_id: string
          worksite_id: string
          assigned_date: string
          start_time?: string | null
          end_time?: string | null
          instructions?: string | null
          confirmed?: boolean
          confirmed_at?: string | null
          created_by?: string | null
          vehicle_id?: string | null
          has_double_site?: boolean | null
          second_worksite_id?: string | null
          second_start_time?: string | null
          second_end_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          worker_id?: string
          worksite_id?: string
          assigned_date?: string
          start_time?: string | null
          end_time?: string | null
          instructions?: string | null
          confirmed?: boolean
          confirmed_at?: string | null
          created_by?: string | null
          vehicle_id?: string | null
          has_double_site?: boolean | null
          second_worksite_id?: string | null
          second_start_time?: string | null
          second_end_time?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      announcements: {
        Row: {
          id: string
          title: string
          message: string
          priority: 'normal' | 'important' | 'urgent'
          target_audience: 'all' | 'specific'
          target_worksite_id: string | null
          attachment_url: string | null
          attachment_name: string | null
          expires_at: string | null
          created_by: string
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          priority?: 'normal' | 'important' | 'urgent'
          target_audience?: 'all' | 'specific'
          target_worksite_id?: string | null
          attachment_url?: string | null
          attachment_name?: string | null
          expires_at?: string | null
          created_by: string
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          priority?: 'normal' | 'important' | 'urgent'
          target_audience?: 'all' | 'specific'
          target_worksite_id?: string | null
          attachment_url?: string | null
          attachment_name?: string | null
          expires_at?: string | null
          created_by?: string
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      announcement_reads: {
        Row: {
          id: string
          announcement_id: string
          worker_id: string
          read_at: string
        }
        Insert: {
          id?: string
          announcement_id: string
          worker_id: string
          read_at?: string
        }
        Update: {
          id?: string
          announcement_id?: string
          worker_id?: string
          read_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string
          record_id: string | null
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name: string
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          table_name?: string
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          organization_id: string
          plate: string
          details: string | null
          kilometers: number | null
          inspection_date: string | null
          issues: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          plate: string
          details?: string | null
          kilometers?: number | null
          inspection_date?: string | null
          issues?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          plate?: string
          details?: string | null
          kilometers?: number | null
          inspection_date?: string | null
          issues?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vehicle_services: {
        Row: {
          id: string
          vehicle_id: string
          service_date: string
          kilometers: number
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          service_date: string
          kilometers: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          service_date?: string
          kilometers?: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leave_balances: {
        Row: {
          id: string
          worker_id: string
          vacation_hours: number
          rol_hours: number
          sick_leave_hours: number
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          worker_id: string
          vacation_hours?: number
          rol_hours?: number
          sick_leave_hours?: number
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          worker_id?: string
          vacation_hours?: number
          rol_hours?: number
          sick_leave_hours?: number
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leave_requests: {
        Row: {
          id: string
          worker_id: string
          request_type: 'vacation' | 'rol' | 'sick_leave'
          start_date: string | null
          end_date: string | null
          hours_requested: number
          reason: string | null
          status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          reviewed_at: string | null
          organization_id: string | null
          certificate_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          worker_id: string
          request_type: 'vacation' | 'rol' | 'sick_leave'
          start_date?: string | null
          end_date?: string | null
          hours_requested: number
          reason?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
          organization_id?: string | null
          certificate_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          worker_id?: string
          request_type?: 'vacation' | 'rol' | 'sick_leave'
          start_date?: string | null
          end_date?: string | null
          hours_requested?: number
          reason?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
          organization_id?: string | null
          certificate_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      worker_courses: {
        Row: {
          id: string
          worker_id: string
          course_name: string
          completion_date: string
          notes: string | null
          organization_id: string
          created_at: string
        }
        Insert: {
          id?: string
          worker_id: string
          course_name: string
          completion_date: string
          notes?: string | null
          organization_id: string
          created_at?: string
        }
        Update: {
          id?: string
          worker_id?: string
          course_name?: string
          completion_date?: string
          notes?: string | null
          organization_id?: string
          created_at?: string
        }
      }
      worker_medical_checkups: {
        Row: {
          id: string
          worker_id: string
          checkup_date: string
          expiry_date: string
          notes: string | null
          organization_id: string
          created_at: string
        }
        Insert: {
          id?: string
          worker_id: string
          checkup_date: string
          expiry_date: string
          notes?: string | null
          organization_id: string
          created_at?: string
        }
        Update: {
          id?: string
          worker_id?: string
          checkup_date?: string
          expiry_date?: string
          notes?: string | null
          organization_id?: string
          created_at?: string
        }
      }
      payment_cards: {
        Row: {
          id: string
          name: string
          type: string
          info: string | null
          organization_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          info?: string | null
          organization_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          info?: string | null
          organization_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          status: string
          notes: string | null
          survey_date: string | null
          start_date: string | null
          end_date: string | null
          worksite_id: string | null
          issues: string | null
          organization_id: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          status?: string
          notes?: string | null
          survey_date?: string | null
          start_date?: string | null
          end_date?: string | null
          worksite_id?: string | null
          issues?: string | null
          organization_id: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: string
          notes?: string | null
          survey_date?: string | null
          start_date?: string | null
          end_date?: string | null
          worksite_id?: string | null
          issues?: string | null
          organization_id?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      card_transactions: {
        Row: {
          id: string
          card_id: string
          amount: number
          transaction_date: string
          description: string | null
          organization_id: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          card_id: string
          amount: number
          transaction_date?: string
          description?: string | null
          organization_id: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          card_id?: string
          amount?: number
          transaction_date?: string
          description?: string | null
          organization_id?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
