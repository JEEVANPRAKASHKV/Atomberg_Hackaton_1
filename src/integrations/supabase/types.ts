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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      entities_contact: {
        Row: {
          contact_id: string
          contact_name: string
          created_at: string | null
          email: string | null
          gp_id: string | null
          last_updated: string | null
          linkedin: string | null
          role: string | null
          role_category: string | null
          verification_status: string | null
        }
        Insert: {
          contact_id?: string
          contact_name: string
          created_at?: string | null
          email?: string | null
          gp_id?: string | null
          last_updated?: string | null
          linkedin?: string | null
          role?: string | null
          role_category?: string | null
          verification_status?: string | null
        }
        Update: {
          contact_id?: string
          contact_name?: string
          created_at?: string | null
          email?: string | null
          gp_id?: string | null
          last_updated?: string | null
          linkedin?: string | null
          role?: string | null
          role_category?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      entities_deal: {
        Row: {
          created_at: string | null
          deal_amount: number | null
          deal_date: string | null
          deal_id: string
          deal_stage: string | null
          fund_id: string | null
          lead_investor: string | null
          location: string | null
          pc_id: string | null
        }
        Insert: {
          created_at?: string | null
          deal_amount?: number | null
          deal_date?: string | null
          deal_id?: string
          deal_stage?: string | null
          fund_id?: string | null
          lead_investor?: string | null
          location?: string | null
          pc_id?: string | null
        }
        Update: {
          created_at?: string | null
          deal_amount?: number | null
          deal_date?: string | null
          deal_id?: string
          deal_stage?: string | null
          fund_id?: string | null
          lead_investor?: string | null
          location?: string | null
          pc_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_deal_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "entities_fund"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_deal_pc"
            columns: ["pc_id"]
            isOneToOne: false
            referencedRelation: "entities_portfolio_company"
            referencedColumns: ["pc_id"]
          },
        ]
      }
      entities_fund: {
        Row: {
          aum: number | null
          created_at: string | null
          fund_id: string
          fund_name: string
          fund_type: string | null
          gp_id: string | null
          sector_focus: string | null
          vintage_year: number | null
        }
        Insert: {
          aum?: number | null
          created_at?: string | null
          fund_id?: string
          fund_name: string
          fund_type?: string | null
          gp_id?: string | null
          sector_focus?: string | null
          vintage_year?: number | null
        }
        Update: {
          aum?: number | null
          created_at?: string | null
          fund_id?: string
          fund_name?: string
          fund_type?: string | null
          gp_id?: string | null
          sector_focus?: string | null
          vintage_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_fund_gp"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "entities_gp"
            referencedColumns: ["gp_id"]
          },
        ]
      }
      entities_gp: {
        Row: {
          aum: number | null
          created_at: string | null
          gp_id: string
          gp_name: string
          hq_country: string | null
          strategy: string | null
          website: string | null
        }
        Insert: {
          aum?: number | null
          created_at?: string | null
          gp_id?: string
          gp_name: string
          hq_country?: string | null
          strategy?: string | null
          website?: string | null
        }
        Update: {
          aum?: number | null
          created_at?: string | null
          gp_id?: string
          gp_name?: string
          hq_country?: string | null
          strategy?: string | null
          website?: string | null
        }
        Relationships: []
      }
      entities_lp: {
        Row: {
          aum: number | null
          country: string | null
          created_at: string | null
          lp_id: string
          lp_name: string
          lp_type: string | null
          website: string | null
        }
        Insert: {
          aum?: number | null
          country?: string | null
          created_at?: string | null
          lp_id?: string
          lp_name: string
          lp_type?: string | null
          website?: string | null
        }
        Update: {
          aum?: number | null
          country?: string | null
          created_at?: string | null
          lp_id?: string
          lp_name?: string
          lp_type?: string | null
          website?: string | null
        }
        Relationships: []
      }
      entities_lp_fund_map: {
        Row: {
          commitment_amount: number | null
          commitment_date: string | null
          created_at: string | null
          fund_id: string | null
          id: string
          lp_id: string | null
        }
        Insert: {
          commitment_amount?: number | null
          commitment_date?: string | null
          created_at?: string | null
          fund_id?: string | null
          id?: string
          lp_id?: string | null
        }
        Update: {
          commitment_amount?: number | null
          commitment_date?: string | null
          created_at?: string | null
          fund_id?: string | null
          id?: string
          lp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_lpfund_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "entities_fund"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_lpfund_lp"
            columns: ["lp_id"]
            isOneToOne: false
            referencedRelation: "entities_lp"
            referencedColumns: ["lp_id"]
          },
        ]
      }
      entities_portfolio_company: {
        Row: {
          country: string | null
          created_at: string | null
          pc_id: string
          pc_name: string
          sector: string | null
          stage: string | null
          website: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          pc_id?: string
          pc_name: string
          sector?: string | null
          stage?: string | null
          website?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          pc_id?: string
          pc_name?: string
          sector?: string | null
          stage?: string | null
          website?: string | null
        }
        Relationships: []
      }
      entities_service_provider: {
        Row: {
          country: string | null
          created_at: string | null
          sp_category: string | null
          sp_id: string
          sp_name: string
          website: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          sp_category?: string | null
          sp_id?: string
          sp_name: string
          website?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          sp_category?: string | null
          sp_id?: string
          sp_name?: string
          website?: string | null
        }
        Relationships: []
      }
      hr_announcement_reactions: {
        Row: {
          announcement_id: string
          created_at: string
          emoji: string
          employee_id: string
          id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          emoji: string
          employee_id: string
          id?: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          emoji?: string
          employee_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_announcement_reactions_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "hr_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_announcement_reactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_announcement_reads: {
        Row: {
          announcement_id: string
          employee_id: string
          id: string
          read_at: string | null
        }
        Insert: {
          announcement_id: string
          employee_id: string
          id?: string
          read_at?: string | null
        }
        Update: {
          announcement_id?: string
          employee_id?: string
          id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "hr_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_announcement_reads_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          id: string
          is_important: boolean | null
          target_type: string
          target_value: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          is_important?: boolean | null
          target_type: string
          target_value?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_important?: boolean | null
          target_type?: string
          target_value?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_appreciations: {
        Row: {
          created_at: string | null
          from_employee_id: string
          id: string
          is_public: boolean | null
          message: string
          tag: string
          to_employee_id: string
          visible_to_team: string | null
        }
        Insert: {
          created_at?: string | null
          from_employee_id: string
          id?: string
          is_public?: boolean | null
          message: string
          tag: string
          to_employee_id: string
          visible_to_team?: string | null
        }
        Update: {
          created_at?: string | null
          from_employee_id?: string
          id?: string
          is_public?: boolean | null
          message?: string
          tag?: string
          to_employee_id?: string
          visible_to_team?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_appreciations_from_employee_id_fkey"
            columns: ["from_employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_appreciations_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_attendance: {
        Row: {
          attendance_date: string
          created_at: string | null
          employee_id: string
          id: string
          is_consolidated: boolean | null
          notes: string | null
          punch_in_time: string
          punch_out_time: string | null
          status: string | null
          total_hours: number | null
          updated_at: string | null
        }
        Insert: {
          attendance_date: string
          created_at?: string | null
          employee_id: string
          id?: string
          is_consolidated?: boolean | null
          notes?: string | null
          punch_in_time: string
          punch_out_time?: string | null
          status?: string | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          attendance_date?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          is_consolidated?: boolean | null
          notes?: string | null
          punch_in_time?: string
          punch_out_time?: string | null
          status?: string | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_attendance_regularization_requests: {
        Row: {
          admin_notes: string | null
          attendance_date: string
          current_status: string | null
          employee_id: string
          id: string
          reason: string
          requested_at: string | null
          requested_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          attendance_date: string
          current_status?: string | null
          employee_id: string
          id?: string
          reason: string
          requested_at?: string | null
          requested_status: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          attendance_date?: string
          current_status?: string | null
          employee_id?: string
          id?: string
          reason?: string
          requested_at?: string | null
          requested_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_attendance_regularization_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_attendance_regularization_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_documents: {
        Row: {
          created_at: string | null
          document_category: string
          document_name: string
          document_type: string
          employee_id: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          notes: string | null
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          document_category: string
          document_name: string
          document_type: string
          employee_id: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          notes?: string | null
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          document_category?: string
          document_name?: string
          document_type?: string
          employee_id?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          notes?: string | null
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employee_details: {
        Row: {
          address: string | null
          birthday_celebrated_on: string | null
          created_at: string | null
          date_of_birth: string | null
          department: string | null
          designation: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employee_id: string
          employment_type: string | null
          gender: string | null
          id: string
          location: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          birthday_celebrated_on?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department?: string | null
          designation?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_id: string
          employment_type?: string | null
          gender?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          birthday_celebrated_on?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department?: string | null
          designation?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_id?: string
          employment_type?: string | null
          gender?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employee_details_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employees: {
        Row: {
          created_at: string | null
          email: string
          email_notifications_enabled: boolean | null
          employee_code: string | null
          full_name: string
          id: string
          joining_date: string | null
          leave_balance: number | null
          manager_id: string | null
          org_id: string
          role: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          email_notifications_enabled?: boolean | null
          employee_code?: string | null
          full_name: string
          id?: string
          joining_date?: string | null
          leave_balance?: number | null
          manager_id?: string | null
          org_id: string
          role: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          email_notifications_enabled?: boolean | null
          employee_code?: string | null
          full_name?: string
          id?: string
          joining_date?: string | null
          leave_balance?: number | null
          manager_id?: string | null
          org_id?: string
          role?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_holidays: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          holiday_date: string
          holiday_name: string
          holiday_type: string
          id: string
          is_optional: boolean | null
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          holiday_date: string
          holiday_name: string
          holiday_type: string
          id?: string
          is_optional?: boolean | null
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          holiday_date?: string
          holiday_name?: string
          holiday_type?: string
          id?: string
          is_optional?: boolean | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "hr_holidays_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leave_entitlements: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          leave_type: string
          org_id: string
          remaining_leaves: number | null
          total_leaves: number
          updated_at: string | null
          used_leaves: number
          year: number
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          leave_type: string
          org_id: string
          remaining_leaves?: number | null
          total_leaves?: number
          updated_at?: string | null
          used_leaves?: number
          year: number
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          leave_type?: string
          org_id?: string
          remaining_leaves?: number | null
          total_leaves?: number
          updated_at?: string | null
          used_leaves?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "hr_leave_entitlements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_leave_entitlements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          rejection_reason: string | null
          start_date: string
          status: string
          total_days: number
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id: string
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: string
          total_days: number
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: string
          total_days?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_notifications: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_notifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_offboarding: {
        Row: {
          completed_at: string | null
          created_at: string | null
          employee_id: string
          exit_interview_completed: boolean | null
          exit_interview_notes: string | null
          exit_reason: string | null
          exit_type: string | null
          id: string
          initiated_at: string | null
          initiated_by: string
          last_working_day: string | null
          resignation_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          employee_id: string
          exit_interview_completed?: boolean | null
          exit_interview_notes?: string | null
          exit_reason?: string | null
          exit_type?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by: string
          last_working_day?: string | null
          resignation_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          employee_id?: string
          exit_interview_completed?: boolean | null
          exit_interview_notes?: string | null
          exit_reason?: string | null
          exit_type?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string
          last_working_day?: string | null
          resignation_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_offboarding_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_offboarding_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_offboarding_tasks: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          description: string | null
          id: string
          notes: string | null
          offboarding_id: string
          status: string
          task_category: string
          task_name: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          offboarding_id: string
          status?: string
          task_category: string
          task_name: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          offboarding_id?: string
          status?: string
          task_category?: string
          task_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_offboarding_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_offboarding_tasks_offboarding_id_fkey"
            columns: ["offboarding_id"]
            isOneToOne: false
            referencedRelation: "hr_offboarding"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_onboarding_tasks: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string | null
          document_url: string | null
          employee_id: string
          id: string
          is_mandatory: boolean | null
          status: string | null
          task_description: string | null
          task_order: number
          task_title: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          created_at?: string | null
          document_url?: string | null
          employee_id: string
          id?: string
          is_mandatory?: boolean | null
          status?: string | null
          task_description?: string | null
          task_order: number
          task_title: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string | null
          document_url?: string | null
          employee_id?: string
          id?: string
          is_mandatory?: boolean | null
          status?: string | null
          task_description?: string | null
          task_order?: number
          task_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_onboarding_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_salary_history: {
        Row: {
          created_at: string | null
          created_by: string | null
          deductions: number | null
          employee_id: string
          gross_salary: number
          id: string
          month: number
          net_salary: number
          payment_date: string | null
          payment_status: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deductions?: number | null
          employee_id: string
          gross_salary: number
          id?: string
          month: number
          net_salary: number
          payment_date?: string | null
          payment_status?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deductions?: number | null
          employee_id?: string
          gross_salary?: number
          id?: string
          month?: number
          net_salary?: number
          payment_date?: string | null
          payment_status?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "hr_salary_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_salary_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_salary_slips: {
        Row: {
          created_at: string | null
          employee_id: string
          file_name: string | null
          file_url: string | null
          gross_salary: number | null
          id: string
          month: number
          net_salary: number | null
          status: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          file_name?: string | null
          file_url?: string | null
          gross_salary?: number | null
          id?: string
          month: number
          net_salary?: number | null
          status?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          file_name?: string | null
          file_url?: string | null
          gross_salary?: number | null
          id?: string
          month?: number
          net_salary?: number | null
          status?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "hr_salary_slips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_salary_slips_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_work_log_comments: {
        Row: {
          action: string | null
          comment: string
          created_at: string | null
          id: string
          manager_id: string
          work_log_id: string
        }
        Insert: {
          action?: string | null
          comment: string
          created_at?: string | null
          id?: string
          manager_id: string
          work_log_id: string
        }
        Update: {
          action?: string | null
          comment?: string
          created_at?: string | null
          id?: string
          manager_id?: string
          work_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_work_log_comments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_work_log_comments_work_log_id_fkey"
            columns: ["work_log_id"]
            isOneToOne: false
            referencedRelation: "hr_work_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_work_log_tasks: {
        Row: {
          assigned_by_id: string | null
          assigned_by_type: string
          category: string
          created_at: string
          day_status: string
          description: string | null
          duration_minutes: number
          employee_id: string
          id: string
          log_date: string
          rework_comment: string | null
          task_title: string
          updated_at: string
          week_log_id: string
        }
        Insert: {
          assigned_by_id?: string | null
          assigned_by_type?: string
          category: string
          created_at?: string
          day_status?: string
          description?: string | null
          duration_minutes: number
          employee_id: string
          id?: string
          log_date: string
          rework_comment?: string | null
          task_title: string
          updated_at?: string
          week_log_id: string
        }
        Update: {
          assigned_by_id?: string | null
          assigned_by_type?: string
          category?: string
          created_at?: string
          day_status?: string
          description?: string | null
          duration_minutes?: number
          employee_id?: string
          id?: string
          log_date?: string
          rework_comment?: string | null
          task_title?: string
          updated_at?: string
          week_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_work_log_tasks_assigned_by_id_fkey"
            columns: ["assigned_by_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_work_log_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_work_log_tasks_week_log_id_fkey"
            columns: ["week_log_id"]
            isOneToOne: false
            referencedRelation: "hr_work_log_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_work_log_weeks: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_id: string
          id: string
          rework_comment: string | null
          status: string
          submitted_at: string | null
          total_minutes: number | null
          updated_at: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id: string
          id?: string
          rework_comment?: string | null
          status?: string
          submitted_at?: string | null
          total_minutes?: number | null
          updated_at?: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          rework_comment?: string | null
          status?: string
          submitted_at?: string | null
          total_minutes?: number | null
          updated_at?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_work_log_weeks_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_work_log_weeks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_work_logs: {
        Row: {
          blockers: string | null
          created_at: string | null
          description: string
          employee_id: string
          id: string
          log_date: string
          minutes_spent: number
          status: string
          submitted_at: string | null
          updated_at: string | null
          work_type: string
        }
        Insert: {
          blockers?: string | null
          created_at?: string | null
          description: string
          employee_id: string
          id?: string
          log_date: string
          minutes_spent: number
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          work_type: string
        }
        Update: {
          blockers?: string | null
          created_at?: string | null
          description?: string
          employee_id?: string
          id?: string
          log_date?: string
          minutes_spent?: number
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_work_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          org_code: string
          org_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_code: string
          org_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_code?: string
          org_name?: string
        }
        Relationships: []
      }
      orgs: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      rel_deal_portfolio_company: {
        Row: {
          confidence: number | null
          created_at: string | null
          created_by: string | null
          id: string
          source_entity_id: string | null
          source_entity_type: string | null
          target_entity_id: string | null
          target_entity_type: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
        }
        Relationships: []
      }
      rel_firm_contact: {
        Row: {
          confidence: number | null
          created_at: string | null
          created_by: string | null
          firm_entity_type: string | null
          id: string
          source_entity_id: string | null
          target_entity_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          firm_entity_type?: string | null
          id?: string
          source_entity_id?: string | null
          target_entity_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          firm_entity_type?: string | null
          id?: string
          source_entity_id?: string | null
          target_entity_id?: string | null
        }
        Relationships: []
      }
      rel_firm_service_provider: {
        Row: {
          confidence: number | null
          created_at: string | null
          created_by: string | null
          firm_entity_type: string | null
          id: string
          source_entity_id: string | null
          target_entity_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          firm_entity_type?: string | null
          id?: string
          source_entity_id?: string | null
          target_entity_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          firm_entity_type?: string | null
          id?: string
          source_entity_id?: string | null
          target_entity_id?: string | null
        }
        Relationships: []
      }
      rel_fund_deal: {
        Row: {
          confidence: number | null
          created_at: string | null
          created_by: string | null
          id: string
          source_entity_id: string | null
          source_entity_type: string | null
          target_entity_id: string | null
          target_entity_type: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
        }
        Relationships: []
      }
      rel_gp_fund: {
        Row: {
          confidence: number | null
          created_at: string | null
          created_by: string | null
          id: string
          source_entity_id: string | null
          source_entity_type: string | null
          target_entity_id: string | null
          target_entity_type: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
        }
        Relationships: []
      }
      shell_profiles: {
        Row: {
          created_at: string | null
          created_by: string | null
          entity_name: string
          entity_type: string
          extraction_confidence: number | null
          id: string
          source_type: string | null
          source_url: string | null
          status: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          entity_name: string
          entity_type: string
          extraction_confidence?: number | null
          id?: string
          source_type?: string | null
          source_url?: string | null
          status?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          entity_name?: string
          entity_type?: string
          extraction_confidence?: number | null
          id?: string
          source_type?: string | null
          source_url?: string | null
          status?: string | null
          website?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          priority: string | null
          status: string | null
          task_type: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          task_type?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          task_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      carry_forward_earned_leaves: { Args: never; Returns: undefined }
      generate_employee_code: { Args: { org_uuid: string }; Returns: string }
      user_employee_id: { Args: never; Returns: string }
      user_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
