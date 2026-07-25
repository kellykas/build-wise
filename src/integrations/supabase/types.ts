export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenda_events: {
        Row: {
          attendees: Json | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          event_date: string
          id: string
          location: string | null
          project_id: string | null
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attendees?: Json | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          location?: string | null
          project_id?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attendees?: Json | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          location?: string | null
          project_id?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          clock_in: string
          clock_out: string | null
          company_id: string
          employee_id: string | null
          hours_worked: number
          id: string
          notes: string | null
          work_date: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          company_id: string
          employee_id?: string | null
          hours_worked?: number
          id?: string
          notes?: string | null
          work_date?: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          company_id?: string
          employee_id?: string | null
          hours_worked?: number
          id?: string
          notes?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          company: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tax_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          company?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          company?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          slug: string | null
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          slug?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          company_id: string
          created_at: string
          folder: string | null
          id: string
          mime_type: string | null
          name: string
          project_id: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          folder?: string | null
          id?: string
          mime_type?: string | null
          name: string
          project_id?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          folder?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          project_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          bank_account: string | null
          company_id: string
          created_at: string
          department: string | null
          email: string | null
          employee_number: string | null
          employment_date: string | null
          full_name: string
          hourly_rate: number
          id: string
          phone: string | null
          position: string | null
          salary: number | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bank_account?: string | null
          company_id: string
          created_at?: string
          department?: string | null
          email?: string | null
          employee_number?: string | null
          employment_date?: string | null
          full_name: string
          hourly_rate?: number
          id?: string
          phone?: string | null
          position?: string | null
          salary?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bank_account?: string | null
          company_id?: string
          created_at?: string
          department?: string | null
          email?: string | null
          employee_number?: string | null
          employment_date?: string | null
          full_name?: string
          hourly_rate?: number
          id?: string
          phone?: string | null
          position?: string | null
          salary?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          assigned_project_id: string | null
          category: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          next_maintenance: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["equipment_status"]
          updated_at: string
        }
        Insert: {
          assigned_project_id?: string | null
          category?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          next_maintenance?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Update: {
          assigned_project_id?: string | null
          category?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          next_maintenance?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assigned_project_id_fkey"
            columns: ["assigned_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          budget_range: string | null
          company: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          location: string | null
          message: string
          phone: string | null
          project_type: string | null
          status: Database["public"]["Enums"]["inquiry_status"]
          type: Database["public"]["Enums"]["inquiry_type"]
        }
        Insert: {
          budget_range?: string | null
          company?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          location?: string | null
          message: string
          phone?: string | null
          project_type?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          type?: Database["public"]["Enums"]["inquiry_type"]
        }
        Update: {
          budget_range?: string | null
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          location?: string | null
          message?: string
          phone?: string | null
          project_type?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          type?: Database["public"]["Enums"]["inquiry_type"]
        }
        Relationships: []
      }
      internal_notifications: {
        Row: {
          company_id: string
          created_at: string
          id: string
          link: string | null
          message: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string | null
          title: string
          type: Database["public"]["Enums"]["internal_notification_type"]
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["internal_notification_type"]
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["internal_notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "internal_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          id: string
          location: string | null
          min_quantity: number
          name: string
          quantity: number
          sku: string | null
          status: string
          unit: string | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          id?: string
          location?: string | null
          min_quantity?: number
          name: string
          quantity?: number
          sku?: string | null
          status?: string
          unit?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          id?: string
          location?: string | null
          min_quantity?: number
          name?: string
          quantity?: number
          sku?: string | null
          status?: string
          unit?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_id: string | null
          company_id: string
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string | null
          issue_date: string | null
          notes: string | null
          paid_amount: number
          project_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          tax: number
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          company_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          notes?: string | null
          paid_amount?: number
          project_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tax?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          company_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          notes?: string | null
          paid_amount?: number
          project_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tax?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          company_id: string
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          company_id: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          company_id?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_rules: {
        Row: {
          absence_deduction_per_day: number
          company_id: string
          created_at: string
          currency: string
          id: string
          late_penalty_per_hour: number
          overtime_multiplier: number
          standard_hours_per_day: number
          tax_rate: number
          updated_at: string
          working_days_per_month: number
        }
        Insert: {
          absence_deduction_per_day?: number
          company_id: string
          created_at?: string
          currency?: string
          id?: string
          late_penalty_per_hour?: number
          overtime_multiplier?: number
          standard_hours_per_day?: number
          tax_rate?: number
          updated_at?: string
          working_days_per_month?: number
        }
        Update: {
          absence_deduction_per_day?: number
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          late_penalty_per_hour?: number
          overtime_multiplier?: number
          standard_hours_per_day?: number
          tax_rate?: number
          updated_at?: string
          working_days_per_month?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          base_salary: number
          bonus: number
          company_id: string
          created_at: string
          deductions: number
          employee_id: string
          hours_worked: number
          id: string
          net_pay: number
          notes: string | null
          overtime_hours: number
          overtime_pay: number
          paid_at: string | null
          period_month: number
          period_year: number
          status: string
          tax: number
          updated_at: string
        }
        Insert: {
          base_salary?: number
          bonus?: number
          company_id: string
          created_at?: string
          deductions?: number
          employee_id: string
          hours_worked?: number
          id?: string
          net_pay?: number
          notes?: string | null
          overtime_hours?: number
          overtime_pay?: number
          paid_at?: string | null
          period_month: number
          period_year: number
          status?: string
          tax?: number
          updated_at?: string
        }
        Update: {
          base_salary?: number
          bonus?: number
          company_id?: string
          created_at?: string
          deductions?: number
          employee_id?: string
          hours_worked?: number
          id?: string
          net_pay?: number
          notes?: string | null
          overtime_hours?: number
          overtime_pay?: number
          paid_at?: string | null
          period_month?: number
          period_year?: number
          status?: string
          tax?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslips_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string | null
          company_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          location: string | null
          manager_id: string | null
          name: string
          priority: Database["public"]["Enums"]["priority_level"]
          progress: number
          project_number: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          manager_id?: string | null
          name: string
          priority?: Database["public"]["Enums"]["priority_level"]
          progress?: number
          project_number?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          manager_id?: string | null
          name?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          progress?: number
          project_number?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          id: string
          items: Json
          po_number: string | null
          project_id: string | null
          rejection_reason: string | null
          request_date: string | null
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          id?: string
          items?: Json
          po_number?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          request_date?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          id?: string
          items?: Json
          po_number?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          request_date?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      requisition_disbursements: {
        Row: {
          amount: number
          beneficiary: string | null
          besoin: string | null
          company_id: string
          created_at: string
          id: string
          line_id: string | null
          notes: string | null
          operation: string | null
          paid_at: string
          paid_by: string | null
          quantity: number | null
          requisition_id: string
        }
        Insert: {
          amount?: number
          beneficiary?: string | null
          besoin?: string | null
          company_id: string
          created_at?: string
          id?: string
          line_id?: string | null
          notes?: string | null
          operation?: string | null
          paid_at?: string
          paid_by?: string | null
          quantity?: number | null
          requisition_id: string
        }
        Update: {
          amount?: number
          beneficiary?: string | null
          besoin?: string | null
          company_id?: string
          created_at?: string
          id?: string
          line_id?: string | null
          notes?: string | null
          operation?: string | null
          paid_at?: string
          paid_by?: string | null
          quantity?: number | null
          requisition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisition_disbursements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_disbursements_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "requisition_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_disbursements_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_disbursements_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      requisition_lines: {
        Row: {
          besoin: string
          company_id: string
          created_at: string
          id: string
          position: number
          quantity: number
          requisition_id: string
          status: Database["public"]["Enums"]["requisition_line_status"]
          unit: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          besoin: string
          company_id: string
          created_at?: string
          id?: string
          position?: number
          quantity?: number
          requisition_id: string
          status?: Database["public"]["Enums"]["requisition_line_status"]
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          besoin?: string
          company_id?: string
          created_at?: string
          id?: string
          position?: number
          quantity?: number
          requisition_id?: string
          status?: Database["public"]["Enums"]["requisition_line_status"]
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisition_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_lines_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      requisitions: {
        Row: {
          caissier_id: string | null
          classeur: string | null
          company_id: string
          created_at: string
          created_by: string | null
          demandeur_id: string | null
          id: string
          notes: string | null
          project_id: string | null
          reference: string
          stage: string | null
          status: Database["public"]["Enums"]["requisition_status"]
          tarificateur_id: string | null
          title: string
          total_amount: number
          updated_at: string
          validateur_id: string | null
        }
        Insert: {
          caissier_id?: string | null
          classeur?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          demandeur_id?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          reference: string
          stage?: string | null
          status?: Database["public"]["Enums"]["requisition_status"]
          tarificateur_id?: string | null
          title: string
          total_amount?: number
          updated_at?: string
          validateur_id?: string | null
        }
        Update: {
          caissier_id?: string | null
          classeur?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          demandeur_id?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          reference?: string
          stage?: string | null
          status?: Database["public"]["Enums"]["requisition_status"]
          tarificateur_id?: string | null
          title?: string
          total_amount?: number
          updated_at?: string
          validateur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requisitions_caissier_id_fkey"
            columns: ["caissier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_demandeur_id_fkey"
            columns: ["demandeur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_tarificateur_id_fkey"
            columns: ["tarificateur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_validateur_id_fkey"
            columns: ["validateur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          rating: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["task_role"]
          task_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["task_role"]
          task_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["task_role"]
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          company_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          priority: Database["public"]["Enums"]["priority_level"]
          progress: number
          project_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          priority?: Database["public"]["Enums"]["priority_level"]
          progress?: number
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          progress?: number
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          invoice_id: string | null
          payslip_id: string | null
          project_id: string | null
          purchase_order_id: string | null
          reference: string | null
          transaction_date: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          payslip_id?: string | null
          project_id?: string | null
          purchase_order_id?: string | null
          reference?: string | null
          transaction_date?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          payslip_id?: string | null
          project_id?: string | null
          purchase_order_id?: string | null
          reference?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payslips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "company_owner"
        | "director"
        | "project_manager"
        | "site_engineer"
        | "accountant"
        | "hr_manager"
        | "procurement_officer"
        | "store_manager"
        | "employee"
        | "client"
      equipment_status:
        | "available"
        | "assigned"
        | "maintenance"
        | "out_of_service"
      inquiry_status: "new" | "in_review" | "responded" | "closed"
      inquiry_type: "quote" | "contact"
      internal_notification_type:
        | "info"
        | "task"
        | "requisition"
        | "approval"
        | "urgent"
      invoice_status: "draft" | "pending" | "paid" | "overdue"
      po_status: "draft" | "pending" | "approved" | "received" | "cancelled"
      priority_level: "low" | "medium" | "high" | "urgent"
      project_status:
        | "planning"
        | "pending"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "cancelled"
      requisition_line_status:
        | "pending"
        | "priced"
        | "validated"
        | "disbursed"
        | "rejected"
      requisition_status:
        | "draft"
        | "pending_pricing"
        | "in_progress"
        | "closed"
        | "rejected"
      task_role: "executor" | "supervisor" | "approver"
      task_status: "pending" | "in_progress" | "completed" | "overdue"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "company_owner",
        "director",
        "project_manager",
        "site_engineer",
        "accountant",
        "hr_manager",
        "procurement_officer",
        "store_manager",
        "employee",
        "client",
      ],
      equipment_status: [
        "available",
        "assigned",
        "maintenance",
        "out_of_service",
      ],
      inquiry_status: ["new", "in_review", "responded", "closed"],
      inquiry_type: ["quote", "contact"],
      internal_notification_type: [
        "info",
        "task",
        "requisition",
        "approval",
        "urgent",
      ],
      invoice_status: ["draft", "pending", "paid", "overdue"],
      po_status: ["draft", "pending", "approved", "received", "cancelled"],
      priority_level: ["low", "medium", "high", "urgent"],
      project_status: [
        "planning",
        "pending",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ],
      requisition_line_status: [
        "pending",
        "priced",
        "validated",
        "disbursed",
        "rejected",
      ],
      requisition_status: [
        "draft",
        "pending_pricing",
        "in_progress",
        "closed",
        "rejected",
      ],
      task_role: ["executor", "supervisor", "approver"],
      task_status: ["pending", "in_progress", "completed", "overdue"],
    },
  },
} as const
