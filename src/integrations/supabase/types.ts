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
      accounting_customer_links: {
        Row: {
          business_customer_id: string | null
          business_id: string
          created_at: string
          external_customer_number: string | null
          external_data: Json | null
          external_id: string
          id: string
          last_direction: string
          last_synced_at: string
          private_customer_id: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          business_customer_id?: string | null
          business_id: string
          created_at?: string
          external_customer_number?: string | null
          external_data?: Json | null
          external_id: string
          id?: string
          last_direction?: string
          last_synced_at?: string
          private_customer_id?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          business_customer_id?: string | null
          business_id?: string
          created_at?: string
          external_customer_number?: string | null
          external_data?: Json | null
          external_id?: string
          id?: string
          last_direction?: string
          last_synced_at?: string
          private_customer_id?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      accounting_field_state: {
        Row: {
          business_id: string
          created_at: string
          entity_id: string
          entity_type: string
          field_name: string
          field_value: Json | null
          id: string
          last_pulled_at: string | null
          last_pushed_at: string | null
          provider: string
          remote_value: Json | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          field_name: string
          field_value?: Json | null
          id?: string
          last_pulled_at?: string | null
          last_pushed_at?: string | null
          provider: string
          remote_value?: Json | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          field_name?: string
          field_value?: Json | null
          id?: string
          last_pulled_at?: string | null
          last_pushed_at?: string | null
          provider?: string
          remote_value?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      accounting_integrations: {
        Row: {
          agreement_number: string | null
          api_secret: string | null
          api_token: string | null
          business_id: string
          consecutive_failures: number
          created_at: string
          id: string
          is_active: boolean
          last_error: string | null
          last_error_at: string | null
          last_kick_at: string | null
          last_pull_at: string | null
          last_push_at: string | null
          organization_id: string | null
          paused_until: string | null
          provider: string
          settings: Json
          updated_at: string
        }
        Insert: {
          agreement_number?: string | null
          api_secret?: string | null
          api_token?: string | null
          business_id: string
          consecutive_failures?: number
          created_at?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_error_at?: string | null
          last_kick_at?: string | null
          last_pull_at?: string | null
          last_push_at?: string | null
          organization_id?: string | null
          paused_until?: string | null
          provider: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          agreement_number?: string | null
          api_secret?: string | null
          api_token?: string | null
          business_id?: string
          consecutive_failures?: number
          created_at?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_error_at?: string | null
          last_kick_at?: string | null
          last_pull_at?: string | null
          last_push_at?: string | null
          organization_id?: string | null
          paused_until?: string | null
          provider?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      accounting_order_links: {
        Row: {
          agreement_occurrence_id: string | null
          business_id: string
          created_at: string
          external_data: Json | null
          external_id: string
          external_number: string | null
          external_type: string
          id: string
          last_pushed_at: string
          last_status_synced: string | null
          order_id: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          agreement_occurrence_id?: string | null
          business_id: string
          created_at?: string
          external_data?: Json | null
          external_id: string
          external_number?: string | null
          external_type?: string
          id?: string
          last_pushed_at?: string
          last_status_synced?: string | null
          order_id?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          agreement_occurrence_id?: string | null
          business_id?: string
          created_at?: string
          external_data?: Json | null
          external_id?: string
          external_number?: string | null
          external_type?: string
          id?: string
          last_pushed_at?: string
          last_status_synced?: string | null
          order_id?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      accounting_product_links: {
        Row: {
          business_id: string
          created_at: string
          external_data: Json | null
          external_id: string
          external_product_number: string | null
          id: string
          is_manual_override: boolean
          last_synced_at: string
          provider: string
          service_id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          external_data?: Json | null
          external_id: string
          external_product_number?: string | null
          id?: string
          is_manual_override?: boolean
          last_synced_at?: string
          provider: string
          service_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          external_data?: Json | null
          external_id?: string
          external_product_number?: string | null
          id?: string
          is_manual_override?: boolean
          last_synced_at?: string
          provider?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      accounting_sync_dlq: {
        Row: {
          attempts: number
          business_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          last_error: string | null
          moved_to_dlq_at: string
          operation: string
          original_created_at: string | null
          original_queue_id: string | null
          payload: Json | null
          provider: string
          resolution_note: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          attempts?: number
          business_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          last_error?: string | null
          moved_to_dlq_at?: string
          operation: string
          original_created_at?: string | null
          original_queue_id?: string | null
          payload?: Json | null
          provider: string
          resolution_note?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          attempts?: number
          business_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          last_error?: string | null
          moved_to_dlq_at?: string
          operation?: string
          original_created_at?: string | null
          original_queue_id?: string | null
          payload?: Json | null
          provider?: string
          resolution_note?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      accounting_sync_log: {
        Row: {
          business_id: string
          created_at: string
          direction: string
          entity_id: string | null
          entity_type: string
          external_id: string | null
          id: string
          message: string | null
          payload: Json | null
          provider: string
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          direction: string
          entity_id?: string | null
          entity_type: string
          external_id?: string | null
          id?: string
          message?: string | null
          payload?: Json | null
          provider: string
          status: string
        }
        Update: {
          business_id?: string
          created_at?: string
          direction?: string
          entity_id?: string | null
          entity_type?: string
          external_id?: string | null
          id?: string
          message?: string | null
          payload?: Json | null
          provider?: string
          status?: string
        }
        Relationships: []
      }
      accounting_sync_queue: {
        Row: {
          attempts: number
          business_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          last_error: string | null
          operation: string
          payload: Json
          processed_at: string | null
          scheduled_for: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          business_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          last_error?: string | null
          operation: string
          payload?: Json
          processed_at?: string | null
          scheduled_for?: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          business_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          last_error?: string | null
          operation?: string
          payload?: Json
          processed_at?: string | null
          scheduled_for?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_impersonation_codes: {
        Row: {
          admin_user_id: string
          business_id: string
          code: string
          created_at: string
          expires_at: string
          id: string
          used_at: string | null
        }
        Insert: {
          admin_user_id: string
          business_id: string
          code: string
          created_at?: string
          expires_at: string
          id?: string
          used_at?: string | null
        }
        Update: {
          admin_user_id?: string
          business_id?: string
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
        }
        Relationships: []
      }
      agreement_items: {
        Row: {
          agreement_id: string
          created_at: string
          details: Json
          id: string
          quantity: number
          service_id: string | null
          service_name: string
          total_price: number
          unit_price: number
        }
        Insert: {
          agreement_id: string
          created_at?: string
          details?: Json
          id?: string
          quantity?: number
          service_id?: string | null
          service_name: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          agreement_id?: string
          created_at?: string
          details?: Json
          id?: string
          quantity?: number
          service_id?: string | null
          service_name?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "agreement_items_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      agreement_occurrences: {
        Row: {
          agreement_id: string
          business_id: string
          completed_at: string | null
          created_at: string
          due_date: string | null
          employee_ids: string[]
          external_order_number: string | null
          id: string
          invoice_external_id: string | null
          invoice_external_number: string | null
          invoice_status: string | null
          invoiced_at: string | null
          legacy_order_id: string | null
          notes: string | null
          occurrence_date: string
          paid_amount: number | null
          paid_at: string | null
          payment_status:
            | Database["public"]["Enums"]["order_payment_status"]
            | null
          planned_arrival: string | null
          route_id: string | null
          sequence_index: number
          status: Database["public"]["Enums"]["occurrence_status"]
          updated_at: string
        }
        Insert: {
          agreement_id: string
          business_id: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          employee_ids?: string[]
          external_order_number?: string | null
          id?: string
          invoice_external_id?: string | null
          invoice_external_number?: string | null
          invoice_status?: string | null
          invoiced_at?: string | null
          legacy_order_id?: string | null
          notes?: string | null
          occurrence_date: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_status?:
            | Database["public"]["Enums"]["order_payment_status"]
            | null
          planned_arrival?: string | null
          route_id?: string | null
          sequence_index?: number
          status?: Database["public"]["Enums"]["occurrence_status"]
          updated_at?: string
        }
        Update: {
          agreement_id?: string
          business_id?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          employee_ids?: string[]
          external_order_number?: string | null
          id?: string
          invoice_external_id?: string | null
          invoice_external_number?: string | null
          invoice_status?: string | null
          invoiced_at?: string | null
          legacy_order_id?: string | null
          notes?: string | null
          occurrence_date?: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_status?:
            | Database["public"]["Enums"]["order_payment_status"]
            | null
          planned_arrival?: string | null
          route_id?: string | null
          sequence_index?: number
          status?: Database["public"]["Enums"]["occurrence_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreement_occurrences_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_occurrences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_occurrences_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      agreements: {
        Row: {
          address: string | null
          adjusted_amount: number | null
          adjusted_details: Json | null
          approval_expires_at: string | null
          approval_token: string | null
          billing_model: Database["public"]["Enums"]["agreement_billing_model"]
          business_customer_id: string | null
          business_id: string
          business_message: string | null
          business_response: string | null
          city: string | null
          company_name: string | null
          created_at: string
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          customer_response: string | null
          cvr: string | null
          default_route_template_id: string | null
          employee_ids: string[]
          end_date: string | null
          estimated_duration_minutes: number | null
          id: string
          interval: Database["public"]["Enums"]["agreement_interval"]
          interval_days: number | null
          latitude: number | null
          legacy_subscription_id: string | null
          longitude: number | null
          notes: string | null
          payment_terms_days: number | null
          preferred_route_id: string | null
          preferred_time_end: string | null
          preferred_time_start: string | null
          requires_customer_approval: boolean
          start_date: string
          status: Database["public"]["Enums"]["agreement_status"]
          total_amount: number
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          adjusted_amount?: number | null
          adjusted_details?: Json | null
          approval_expires_at?: string | null
          approval_token?: string | null
          billing_model?: Database["public"]["Enums"]["agreement_billing_model"]
          business_customer_id?: string | null
          business_id: string
          business_message?: string | null
          business_response?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_response?: string | null
          cvr?: string | null
          default_route_template_id?: string | null
          employee_ids?: string[]
          end_date?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          interval?: Database["public"]["Enums"]["agreement_interval"]
          interval_days?: number | null
          latitude?: number | null
          legacy_subscription_id?: string | null
          longitude?: number | null
          notes?: string | null
          payment_terms_days?: number | null
          preferred_route_id?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          requires_customer_approval?: boolean
          start_date: string
          status?: Database["public"]["Enums"]["agreement_status"]
          total_amount?: number
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          adjusted_amount?: number | null
          adjusted_details?: Json | null
          approval_expires_at?: string | null
          approval_token?: string | null
          billing_model?: Database["public"]["Enums"]["agreement_billing_model"]
          business_customer_id?: string | null
          business_id?: string
          business_message?: string | null
          business_response?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_response?: string | null
          cvr?: string | null
          default_route_template_id?: string | null
          employee_ids?: string[]
          end_date?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          interval?: Database["public"]["Enums"]["agreement_interval"]
          interval_days?: number | null
          latitude?: number | null
          legacy_subscription_id?: string | null
          longitude?: number | null
          notes?: string | null
          payment_terms_days?: number | null
          preferred_route_id?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          requires_customer_approval?: boolean
          start_date?: string
          status?: Database["public"]["Enums"]["agreement_status"]
          total_amount?: number
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agreements_business_customer_id_fkey"
            columns: ["business_customer_id"]
            isOneToOne: false
            referencedRelation: "business_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_default_route_template_id_fkey"
            columns: ["default_route_template_id"]
            isOneToOne: false
            referencedRelation: "route_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      business_customers: {
        Row: {
          address: string | null
          avatar_url: string | null
          business_id: string
          city: string | null
          company_name: string
          contact_name: string | null
          created_at: string
          currency: string | null
          customer_group: string | null
          customer_number: string | null
          cvr: string | null
          ean_number: string | null
          email: string
          id: string
          is_blocked: boolean
          latitude: number | null
          longitude: number | null
          notes: string | null
          payment_terms_days: number | null
          phone: string | null
          updated_at: string
          vat_zone: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          business_id: string
          city?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string
          currency?: string | null
          customer_group?: string | null
          customer_number?: string | null
          cvr?: string | null
          ean_number?: string | null
          email: string
          id?: string
          is_blocked?: boolean
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          updated_at?: string
          vat_zone?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          business_id?: string
          city?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string
          currency?: string | null
          customer_group?: string | null
          customer_number?: string | null
          cvr?: string | null
          ean_number?: string | null
          email?: string
          id?: string
          is_blocked?: boolean
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          updated_at?: string
          vat_zone?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_onboarding_progress: {
        Row: {
          business_id: string
          completed_steps: Json
          created_at: string
          current_step: string | null
          fully_completed_at: string | null
          id: string
          skipped_steps: Json
          updated_at: string
          wizard_dismissed: boolean
        }
        Insert: {
          business_id: string
          completed_steps?: Json
          created_at?: string
          current_step?: string | null
          fully_completed_at?: string | null
          id?: string
          skipped_steps?: Json
          updated_at?: string
          wizard_dismissed?: boolean
        }
        Update: {
          business_id?: string
          completed_steps?: Json
          created_at?: string
          current_step?: string | null
          fully_completed_at?: string | null
          id?: string
          skipped_steps?: Json
          updated_at?: string
          wizard_dismissed?: boolean
        }
        Relationships: []
      }
      business_plans: {
        Row: {
          accounting_integration_enabled: boolean
          billing_period: string
          business_id: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          data_import_requested: boolean
          extra_employee_logins: number
          id: string
          last_payment_at: string | null
          last_payment_failed_at: string | null
          monthly_price_dkk: number
          route_planning_enabled: boolean
          status: string
          stripe_customer_id: string | null
          stripe_environment: string
          stripe_payment_method_brand: string | null
          stripe_payment_method_last4: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          accounting_integration_enabled?: boolean
          billing_period?: string
          business_id: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          data_import_requested?: boolean
          extra_employee_logins?: number
          id?: string
          last_payment_at?: string | null
          last_payment_failed_at?: string | null
          monthly_price_dkk?: number
          route_planning_enabled?: boolean
          status?: string
          stripe_customer_id?: string | null
          stripe_environment?: string
          stripe_payment_method_brand?: string | null
          stripe_payment_method_last4?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          accounting_integration_enabled?: boolean
          billing_period?: string
          business_id?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          data_import_requested?: boolean
          extra_employee_logins?: number
          id?: string
          last_payment_at?: string | null
          last_payment_failed_at?: string | null
          monthly_price_dkk?: number
          route_planning_enabled?: boolean
          status?: string
          stripe_customer_id?: string | null
          stripe_environment?: string
          stripe_payment_method_brand?: string | null
          stripe_payment_method_last4?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_slug_history: {
        Row: {
          business_id: string
          created_at: string
          slug: string
        }
        Insert: {
          business_id: string
          created_at?: string
          slug: string
        }
        Update: {
          business_id?: string
          created_at?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_slug_history_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          categories: string[] | null
          category: string | null
          city: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          name: string
          notification_settings: Json
          opening_hours: Json | null
          owner_id: string
          phone: string | null
          settings: Json
          slug: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          categories?: string[] | null
          category?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name: string
          notification_settings?: Json
          opening_hours?: Json | null
          owner_id: string
          phone?: string | null
          settings?: Json
          slug: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          categories?: string[] | null
          category?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string
          notification_settings?: Json
          opening_hours?: Json | null
          owner_id?: string
          phone?: string | null
          settings?: Json
          slug?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "admin_users_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      calculator_steps: {
        Row: {
          created_at: string
          default_value: number | null
          id: string
          label: string
          max_value: number | null
          min_value: number | null
          price_per_unit: number
          service_id: string
          sort_order: number | null
          unit: string
        }
        Insert: {
          created_at?: string
          default_value?: number | null
          id?: string
          label: string
          max_value?: number | null
          min_value?: number | null
          price_per_unit?: number
          service_id: string
          sort_order?: number | null
          unit?: string
        }
        Update: {
          created_at?: string
          default_value?: number | null
          id?: string
          label?: string
          max_value?: number | null
          min_value?: number | null
          price_per_unit?: number
          service_id?: string
          sort_order?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculator_steps_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          assigned_employee_id: string | null
          business_id: string | null
          closed_at: string | null
          created_at: string
          first_admin_reply_at: string | null
          id: string
          last_message_at: string
          needs_human: boolean
          session_token: string
          status: string
          subject: string | null
          unread_admin_count: number
          unread_visitor_count: number
          updated_at: string
          user_id: string | null
          visitor_email: string
          visitor_name: string
        }
        Insert: {
          assigned_employee_id?: string | null
          business_id?: string | null
          closed_at?: string | null
          created_at?: string
          first_admin_reply_at?: string | null
          id?: string
          last_message_at?: string
          needs_human?: boolean
          session_token: string
          status?: string
          subject?: string | null
          unread_admin_count?: number
          unread_visitor_count?: number
          updated_at?: string
          user_id?: string | null
          visitor_email: string
          visitor_name: string
        }
        Update: {
          assigned_employee_id?: string | null
          business_id?: string | null
          closed_at?: string | null
          created_at?: string
          first_admin_reply_at?: string | null
          id?: string
          last_message_at?: string
          needs_human?: boolean
          session_token?: string
          status?: string
          subject?: string | null
          unread_admin_count?: number
          unread_visitor_count?: number
          updated_at?: string
          user_id?: string | null
          visitor_email?: string
          visitor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          is_system: boolean
          metadata: Json | null
          read_at: string | null
          sender_name: string
          sender_type: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_system?: boolean
          metadata?: Json | null
          read_at?: string | null
          sender_name: string
          sender_type: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_system?: boolean
          metadata?: Json | null
          read_at?: string | null
          sender_name?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_templates: {
        Row: {
          business_id: string
          content: string
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          content: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_contacts: {
        Row: {
          business_customer_id: string
          created_at: string
          email: string | null
          id: string
          is_billing: boolean
          is_primary: boolean
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          business_customer_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_billing?: boolean
          is_primary?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          business_customer_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_billing?: boolean
          is_primary?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_business_customer_id_fkey"
            columns: ["business_customer_id"]
            isOneToOne: false
            referencedRelation: "business_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          business_customer_id: string | null
          business_id: string
          created_at: string
          customer_email: string | null
          document_type: string
          file_size: number | null
          id: string
          is_visible_to_customer: boolean
          mime_type: string | null
          storage_path: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          business_customer_id?: string | null
          business_id: string
          created_at?: string
          customer_email?: string | null
          document_type?: string
          file_size?: number | null
          id?: string
          is_visible_to_customer?: boolean
          mime_type?: string | null
          storage_path: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          business_customer_id?: string | null
          business_id?: string
          created_at?: string
          customer_email?: string | null
          document_type?: string
          file_size?: number | null
          id?: string
          is_visible_to_customer?: boolean
          mime_type?: string | null
          storage_path?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_business_customer_id_fkey"
            columns: ["business_customer_id"]
            isOneToOne: false
            referencedRelation: "business_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notification_queue: {
        Row: {
          agreement_occurrence_id: string | null
          attempts: number
          business_id: string
          channel: string
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          order_id: string | null
          recipient_email: string | null
          recipient_phone: string | null
          route_stop_id: string | null
          send_at: string
          sent_at: string | null
          status: string
        }
        Insert: {
          agreement_occurrence_id?: string | null
          attempts?: number
          business_id: string
          channel?: string
          created_at?: string
          event_type: string
          id?: string
          last_error?: string | null
          order_id?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          route_stop_id?: string | null
          send_at?: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          agreement_occurrence_id?: string | null
          attempts?: number
          business_id?: string
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          order_id?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          route_stop_id?: string | null
          send_at?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notification_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notification_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notification_queue_route_stop_id_fkey"
            columns: ["route_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notification_templates: {
        Row: {
          body: string
          business_id: string
          channel: string
          created_at: string
          days_before: number | null
          enabled: boolean
          event_type: string
          id: string
          lead_time_minutes: number | null
          send_at_time: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          body: string
          business_id: string
          channel?: string
          created_at?: string
          days_before?: number | null
          enabled?: boolean
          event_type: string
          id?: string
          lead_time_minutes?: number | null
          send_at_time?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          business_id?: string
          channel?: string
          created_at?: string
          days_before?: number | null
          enabled?: boolean
          event_type?: string
          id?: string
          lead_time_minutes?: number | null
          send_at_time?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notification_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employee_completed_stops: {
        Row: {
          address: string | null
          business_id: string
          commission_pct: number
          completed_at: string
          created_at: string
          customer_name: string | null
          duration_minutes: number | null
          earnings: number
          employee_id: string
          id: string
          order_amount: number
          order_id: string | null
          route_date: string | null
          route_id: string | null
          route_name: string | null
          service_summary: string | null
          sharers: number
          stop_id: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          commission_pct?: number
          completed_at: string
          created_at?: string
          customer_name?: string | null
          duration_minutes?: number | null
          earnings?: number
          employee_id: string
          id?: string
          order_amount?: number
          order_id?: string | null
          route_date?: string | null
          route_id?: string | null
          route_name?: string | null
          service_summary?: string | null
          sharers?: number
          stop_id?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          commission_pct?: number
          completed_at?: string
          created_at?: string
          customer_name?: string | null
          duration_minutes?: number | null
          earnings?: number
          employee_id?: string
          id?: string
          order_amount?: number
          order_id?: string | null
          route_date?: string | null
          route_id?: string | null
          route_name?: string | null
          service_summary?: string | null
          sharers?: number
          stop_id?: string | null
        }
        Relationships: []
      }
      employee_invitations: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string
          email: string
          employee_id: string
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string
          email: string
          employee_id: string
          expires_at?: string
          id?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string
          email?: string
          employee_id?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_invitations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_workdays: {
        Row: {
          created_at: string
          duration_minutes: number | null
          employee_id: string
          ended_at: string | null
          id: string
          notes: string | null
          started_at: string
          updated_at: string
          workday_date: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          employee_id: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          updated_at?: string
          workday_date: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          employee_id?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          updated_at?: string
          workday_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_workdays_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          avatar_url: string | null
          business_id: string
          color: string
          commission_pct: number
          created_at: string
          email: string
          employee_group: string | null
          employee_number: string | null
          home_address: string | null
          home_latitude: number | null
          home_longitude: number | null
          id: string
          is_active: boolean
          livechat_enabled: boolean
          name: string
          phone: string | null
          title: string | null
          updated_at: string
          user_id: string | null
          work_end_time: string | null
          work_start_time: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_id: string
          color?: string
          commission_pct?: number
          created_at?: string
          email: string
          employee_group?: string | null
          employee_number?: string | null
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id?: string
          is_active?: boolean
          livechat_enabled?: boolean
          name: string
          phone?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_id?: string
          color?: string
          commission_pct?: number
          created_at?: string
          email?: string
          employee_group?: string | null
          employee_number?: string | null
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id?: string
          is_active?: boolean
          livechat_enabled?: boolean
          name?: string
          phone?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          business_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          order_id: string
          quantity: number
          service_id: string | null
          service_name: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          order_id: string
          quantity?: number
          service_id?: string | null
          service_name: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          order_id?: string
          quantity?: number
          service_id?: string | null
          service_name?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      order_proposal_history: {
        Row: {
          adjusted_amount: number | null
          adjusted_items: Json | null
          business_id: string
          business_message: string | null
          created_at: string
          customer_decision: string | null
          customer_id: string | null
          decided_at: string | null
          id: string
          order_id: string
          original_amount: number | null
          original_items: Json | null
          proposed_at: string
        }
        Insert: {
          adjusted_amount?: number | null
          adjusted_items?: Json | null
          business_id: string
          business_message?: string | null
          created_at?: string
          customer_decision?: string | null
          customer_id?: string | null
          decided_at?: string | null
          id?: string
          order_id: string
          original_amount?: number | null
          original_items?: Json | null
          proposed_at?: string
        }
        Update: {
          adjusted_amount?: number | null
          adjusted_items?: Json | null
          business_id?: string
          business_message?: string | null
          created_at?: string
          customer_decision?: string | null
          customer_id?: string | null
          decided_at?: string | null
          id?: string
          order_id?: string
          original_amount?: number | null
          original_items?: Json | null
          proposed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_proposal_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accounting_notes: string | null
          accounting_synced_at: string | null
          address: string | null
          adjusted_amount: number | null
          adjusted_details: Json | null
          approval_expires_at: string | null
          approval_token: string | null
          business_id: string | null
          business_message: string | null
          business_response: string | null
          city: string | null
          company_name: string | null
          completed_cycles: number
          created_at: string
          credit_note_external_id: string | null
          credit_note_external_number: string | null
          credited_at: string | null
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          customer_response: string | null
          cvr: string | null
          due_date: string | null
          estimated_duration_minutes: number | null
          external_order_number: string | null
          id: string
          invoice_external_id: string | null
          invoice_external_number: string | null
          invoice_status: string | null
          invoiced_at: string | null
          last_reminder_at: string | null
          last_reminder_type: string | null
          latitude: number | null
          longitude: number | null
          next_service_date: string | null
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          parent_order_id: string | null
          payment_status:
            | Database["public"]["Enums"]["order_payment_status"]
            | null
          payment_status_synced_at: string | null
          payment_terms_days: number | null
          preferred_date: string | null
          preferred_time_end: string | null
          preferred_time_start: string | null
          recurrence_cycle: number | null
          reminder_count: number
          reminder_history: Json
          requires_customer_approval: boolean
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          voided_at: string | null
          zip_code: string | null
        }
        Insert: {
          accounting_notes?: string | null
          accounting_synced_at?: string | null
          address?: string | null
          adjusted_amount?: number | null
          adjusted_details?: Json | null
          approval_expires_at?: string | null
          approval_token?: string | null
          business_id?: string | null
          business_message?: string | null
          business_response?: string | null
          city?: string | null
          company_name?: string | null
          completed_cycles?: number
          created_at?: string
          credit_note_external_id?: string | null
          credit_note_external_number?: string | null
          credited_at?: string | null
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_response?: string | null
          cvr?: string | null
          due_date?: string | null
          estimated_duration_minutes?: number | null
          external_order_number?: string | null
          id?: string
          invoice_external_id?: string | null
          invoice_external_number?: string | null
          invoice_status?: string | null
          invoiced_at?: string | null
          last_reminder_at?: string | null
          last_reminder_type?: string | null
          latitude?: number | null
          longitude?: number | null
          next_service_date?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          parent_order_id?: string | null
          payment_status?:
            | Database["public"]["Enums"]["order_payment_status"]
            | null
          payment_status_synced_at?: string | null
          payment_terms_days?: number | null
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          recurrence_cycle?: number | null
          reminder_count?: number
          reminder_history?: Json
          requires_customer_approval?: boolean
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          voided_at?: string | null
          zip_code?: string | null
        }
        Update: {
          accounting_notes?: string | null
          accounting_synced_at?: string | null
          address?: string | null
          adjusted_amount?: number | null
          adjusted_details?: Json | null
          approval_expires_at?: string | null
          approval_token?: string | null
          business_id?: string | null
          business_message?: string | null
          business_response?: string | null
          city?: string | null
          company_name?: string | null
          completed_cycles?: number
          created_at?: string
          credit_note_external_id?: string | null
          credit_note_external_number?: string | null
          credited_at?: string | null
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_response?: string | null
          cvr?: string | null
          due_date?: string | null
          estimated_duration_minutes?: number | null
          external_order_number?: string | null
          id?: string
          invoice_external_id?: string | null
          invoice_external_number?: string | null
          invoice_status?: string | null
          invoiced_at?: string | null
          last_reminder_at?: string | null
          last_reminder_type?: string | null
          latitude?: number | null
          longitude?: number | null
          next_service_date?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          parent_order_id?: string | null
          payment_status?:
            | Database["public"]["Enums"]["order_payment_status"]
            | null
          payment_status_synced_at?: string | null
          payment_terms_days?: number | null
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          recurrence_cycle?: number | null
          reminder_count?: number
          reminder_history?: Json
          requires_customer_approval?: boolean
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          voided_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "admin_users_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_parent_order_id_fkey"
            columns: ["parent_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          base_price_dkk: number
          discount_quarterly_pct: number
          discount_yearly_pct: number
          featured_business_ids: string[]
          id: number
          price_accounting_integration_dkk: number
          price_data_import_dkk: number
          price_per_employee_login_dkk: number
          price_route_planning_dkk: number
          stripe_publishable_key: string | null
          stripe_secret_key: string | null
          stripe_webhook_secret: string | null
          trial_days: number
          updated_at: string
        }
        Insert: {
          base_price_dkk?: number
          discount_quarterly_pct?: number
          discount_yearly_pct?: number
          featured_business_ids?: string[]
          id?: number
          price_accounting_integration_dkk?: number
          price_data_import_dkk?: number
          price_per_employee_login_dkk?: number
          price_route_planning_dkk?: number
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          stripe_webhook_secret?: string | null
          trial_days?: number
          updated_at?: string
        }
        Update: {
          base_price_dkk?: number
          discount_quarterly_pct?: number
          discount_yearly_pct?: number
          featured_business_ids?: string[]
          id?: number
          price_accounting_integration_dkk?: number
          price_data_import_dkk?: number
          price_per_employee_login_dkk?: number
          price_route_planning_dkk?: number
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          stripe_webhook_secret?: string | null
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      private_customers: {
        Row: {
          address: string | null
          avatar_url: string | null
          business_id: string
          city: string | null
          created_at: string
          currency: string | null
          customer_group: string | null
          customer_number: string | null
          ean_number: string | null
          email: string
          id: string
          is_blocked: boolean
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          payment_terms_days: number | null
          phone: string | null
          updated_at: string
          vat_zone: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          business_id: string
          city?: string | null
          created_at?: string
          currency?: string | null
          customer_group?: string | null
          customer_number?: string | null
          ean_number?: string | null
          email: string
          id?: string
          is_blocked?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          updated_at?: string
          vat_zone?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          business_id?: string
          city?: string | null
          created_at?: string
          currency?: string | null
          customer_group?: string | null
          customer_number?: string | null
          ean_number?: string | null
          email?: string
          id?: string
          is_blocked?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          updated_at?: string
          vat_zone?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "private_customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          notification_settings: Json
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          notification_settings?: Json
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          notification_settings?: Json
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_request_matches: {
        Row: {
          ai_draft: string | null
          ai_draft_generated_at: string | null
          business_id: string
          business_note: string | null
          created_at: string
          distance_km: number | null
          estimated_price: string | null
          follow_up_at: string | null
          id: string
          match_score: number
          notified_at: string | null
          quote_request_id: string
          reason: string | null
          responded_at: string | null
          service_prefills: Json
          status: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          ai_draft?: string | null
          ai_draft_generated_at?: string | null
          business_id: string
          business_note?: string | null
          created_at?: string
          distance_km?: number | null
          estimated_price?: string | null
          follow_up_at?: string | null
          id?: string
          match_score?: number
          notified_at?: string | null
          quote_request_id: string
          reason?: string | null
          responded_at?: string | null
          service_prefills?: Json
          status?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          ai_draft?: string | null
          ai_draft_generated_at?: string | null
          business_id?: string
          business_note?: string | null
          created_at?: string
          distance_km?: number | null
          estimated_price?: string | null
          follow_up_at?: string | null
          id?: string
          match_score?: number
          notified_at?: string | null
          quote_request_id?: string
          reason?: string | null
          responded_at?: string | null
          service_prefills?: Json
          status?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_matches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_request_matches_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          category: string
          city: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          description: string
          id: string
          radius_km: number | null
          share_contact: boolean
          status: string
          terms_accepted_at: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          category: string
          city?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          description: string
          id?: string
          radius_km?: number | null
          share_contact?: boolean
          status?: string
          terms_accepted_at?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          category?: string
          city?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          description?: string
          id?: string
          radius_km?: number | null
          share_contact?: boolean
          status?: string
          terms_accepted_at?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          business_id: string
          created_at: string
          id: string
          message: string | null
          price: number
          quote_request_id: string
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          message?: string | null
          price: number
          quote_request_id: string
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          message?: string | null
          price?: number
          quote_request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          business_id: string
          comment: string | null
          created_at: string
          customer_id: string | null
          id: string
          is_verified: boolean | null
          rating: number
          reviewer_name: string
          subscription_id: string | null
        }
        Insert: {
          business_id: string
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_verified?: boolean | null
          rating: number
          reviewer_name: string
          subscription_id?: string | null
        }
        Update: {
          business_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_verified?: boolean | null
          rating?: number
          reviewer_name?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      route_employees: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          role: string | null
          route_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          role?: string | null
          route_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          role?: string | null
          route_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_employees_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_occurrence_exceptions: {
        Row: {
          base_route_id: string
          business_id: string
          created_at: string
          exception_type: string
          id: string
          occurrence_date: string
          replacement_route_id: string | null
          updated_at: string
        }
        Insert: {
          base_route_id: string
          business_id: string
          created_at?: string
          exception_type?: string
          id?: string
          occurrence_date: string
          replacement_route_id?: string | null
          updated_at?: string
        }
        Update: {
          base_route_id?: string
          business_id?: string
          created_at?: string
          exception_type?: string
          id?: string
          occurrence_date?: string
          replacement_route_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_occurrence_exceptions_base_route_id_fkey"
            columns: ["base_route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_occurrence_exceptions_replacement_route_id_fkey"
            columns: ["replacement_route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_planner_events: {
        Row: {
          base_route_id: string | null
          business_id: string
          client_event_id: string | null
          created_at: string
          details: Json
          event_type: string
          id: string
          projected_date: string | null
          route_id: string | null
          severity: string
        }
        Insert: {
          base_route_id?: string | null
          business_id: string
          client_event_id?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          projected_date?: string | null
          route_id?: string | null
          severity?: string
        }
        Update: {
          base_route_id?: string | null
          business_id?: string
          client_event_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          projected_date?: string | null
          route_id?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_planner_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      route_planner_idempotency: {
        Row: {
          business_id: string
          created_at: string
          key: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          key: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          key?: string
          user_id?: string | null
        }
        Relationships: []
      }
      route_stop_assignees: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          is_lead: boolean
          stop_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          is_lead?: boolean
          stop_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          is_lead?: boolean
          stop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stop_assignees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stop_assignees_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          address: string | null
          agreement_occurrence_id: string | null
          assigned_employee_id: string | null
          completed_at: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          distance_to_next_km: number | null
          duration_minutes: number
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          order_id: string | null
          photo_urls: string[] | null
          planned_arrival: string | null
          planned_departure: string | null
          required_staff: number
          route_id: string
          sequence: number
          service_summary: string | null
          status: string
          subscription_id: string | null
          time_window_end: string | null
          time_window_start: string | null
          travel_time_to_next_min: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          agreement_occurrence_id?: string | null
          assigned_employee_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          distance_to_next_km?: number | null
          duration_minutes?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          order_id?: string | null
          photo_urls?: string[] | null
          planned_arrival?: string | null
          planned_departure?: string | null
          required_staff?: number
          route_id: string
          sequence?: number
          service_summary?: string | null
          status?: string
          subscription_id?: string | null
          time_window_end?: string | null
          time_window_start?: string | null
          travel_time_to_next_min?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          agreement_occurrence_id?: string | null
          assigned_employee_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          distance_to_next_km?: number | null
          duration_minutes?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          order_id?: string | null
          photo_urls?: string[] | null
          planned_arrival?: string | null
          planned_departure?: string | null
          required_staff?: number
          route_id?: string
          sequence?: number
          service_summary?: string | null
          status?: string
          subscription_id?: string | null
          time_window_end?: string | null
          time_window_start?: string | null
          travel_time_to_next_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_agreement_occurrence_id_fkey"
            columns: ["agreement_occurrence_id"]
            isOneToOne: false
            referencedRelation: "agreement_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      route_templates: {
        Row: {
          business_id: string
          color: string
          created_at: string
          default_employee_id: string | null
          id: string
          is_active: boolean
          name: string
          planned_start_time: string
          start_address: string | null
          start_from_home: boolean
          start_latitude: number | null
          start_longitude: number | null
          updated_at: string
          weekday: number | null
        }
        Insert: {
          business_id: string
          color?: string
          created_at?: string
          default_employee_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          planned_start_time?: string
          start_address?: string | null
          start_from_home?: boolean
          start_latitude?: number | null
          start_longitude?: number | null
          updated_at?: string
          weekday?: number | null
        }
        Update: {
          business_id?: string
          color?: string
          created_at?: string
          default_employee_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          planned_start_time?: string
          start_address?: string | null
          start_from_home?: boolean
          start_latitude?: number | null
          start_longitude?: number | null
          updated_at?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "route_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_templates_default_employee_id_fkey"
            columns: ["default_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          base_route_id: string | null
          business_id: string
          color: string
          created_at: string
          employee_id: string | null
          id: string
          name: string | null
          notes: string | null
          optimization_suggestions: Json | null
          optimization_summary: string | null
          optimized_at: string | null
          planned_start_time: string | null
          route_date: string
          route_template_id: string | null
          start_address: string | null
          start_from_home: boolean
          start_latitude: number | null
          start_longitude: number | null
          status: string
          total_distance_km: number | null
          total_duration_minutes: number | null
          updated_at: string
        }
        Insert: {
          base_route_id?: string | null
          business_id: string
          color?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          optimization_suggestions?: Json | null
          optimization_summary?: string | null
          optimized_at?: string | null
          planned_start_time?: string | null
          route_date: string
          route_template_id?: string | null
          start_address?: string | null
          start_from_home?: boolean
          start_latitude?: number | null
          start_longitude?: number | null
          status?: string
          total_distance_km?: number | null
          total_duration_minutes?: number | null
          updated_at?: string
        }
        Update: {
          base_route_id?: string | null
          business_id?: string
          color?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          optimization_suggestions?: Json | null
          optimization_summary?: string | null
          optimized_at?: string | null
          planned_start_time?: string | null
          route_date?: string
          route_template_id?: string | null
          start_address?: string | null
          start_from_home?: boolean
          start_latitude?: number | null
          start_longitude?: number | null
          status?: string
          total_distance_km?: number | null
          total_duration_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_base_route_id_fkey"
            columns: ["base_route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_route_template_id_fkey"
            columns: ["route_template_id"]
            isOneToOne: false
            referencedRelation: "route_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      service_employee_durations: {
        Row: {
          avg_minutes: number
          business_id: string
          created_at: string
          customer_email: string
          employee_id: string
          id: string
          last_completed_at: string | null
          last_minutes: number | null
          sample_count: number
          service_id: string
          updated_at: string
        }
        Insert: {
          avg_minutes: number
          business_id: string
          created_at?: string
          customer_email: string
          employee_id: string
          id?: string
          last_completed_at?: string | null
          last_minutes?: number | null
          sample_count?: number
          service_id: string
          updated_at?: string
        }
        Update: {
          avg_minutes?: number
          business_id?: string
          created_at?: string
          customer_email?: string
          employee_id?: string
          id?: string
          last_completed_at?: string | null
          last_minutes?: number | null
          sample_count?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          accounting_account_number: string | null
          accounting_income_account: string | null
          accounting_product_group: string | null
          base_price: number | null
          business_id: string
          created_at: string
          default_employee_id: string | null
          default_employee_ids: string[]
          default_vat_rate: number | null
          description: string | null
          id: string
          image_url: string | null
          interval_options: string[] | null
          is_active: boolean | null
          name: string
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          product_number: string | null
          service_category: string | null
          sort_order: number | null
          subcategory: string | null
          unit: string | null
          updated_at: string
          vat_zone: string | null
        }
        Insert: {
          accounting_account_number?: string | null
          accounting_income_account?: string | null
          accounting_product_group?: string | null
          base_price?: number | null
          business_id: string
          created_at?: string
          default_employee_id?: string | null
          default_employee_ids?: string[]
          default_vat_rate?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          interval_options?: string[] | null
          is_active?: boolean | null
          name: string
          pricing_type?: Database["public"]["Enums"]["pricing_type"]
          product_number?: string | null
          service_category?: string | null
          sort_order?: number | null
          subcategory?: string | null
          unit?: string | null
          updated_at?: string
          vat_zone?: string | null
        }
        Update: {
          accounting_account_number?: string | null
          accounting_income_account?: string | null
          accounting_product_group?: string | null
          base_price?: number | null
          business_id?: string
          created_at?: string
          default_employee_id?: string | null
          default_employee_ids?: string[]
          default_vat_rate?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          interval_options?: string[] | null
          is_active?: boolean | null
          name?: string
          pricing_type?: Database["public"]["Enums"]["pricing_type"]
          product_number?: string | null
          service_category?: string | null
          sort_order?: number | null
          subcategory?: string | null
          unit?: string | null
          updated_at?: string
          vat_zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_default_employee_id_fkey"
            columns: ["default_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      stop_time_entries: {
        Row: {
          created_at: string
          duration_minutes: number | null
          employee_id: string
          ended_at: string | null
          id: string
          is_team_fallback: boolean
          notes: string | null
          started_at: string
          stop_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          employee_id: string
          ended_at?: string | null
          id?: string
          is_team_fallback?: boolean
          notes?: string | null
          started_at?: string
          stop_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          employee_id?: string
          ended_at?: string | null
          id?: string
          is_team_fallback?: boolean
          notes?: string | null
          started_at?: string
          stop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stop_time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stop_time_entries_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          business_id: string
          cancelled_at: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          details: Json | null
          id: string
          interval: string
          next_service_date: string | null
          order_id: string | null
          paused_at: string | null
          preferred_route_id: string | null
          service_id: string
          service_name: string
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          business_id: string
          cancelled_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          details?: Json | null
          id?: string
          interval?: string
          next_service_date?: string | null
          order_id?: string | null
          paused_at?: string | null
          preferred_route_id?: string | null
          service_id: string
          service_name: string
          status?: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          cancelled_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          details?: Json | null
          id?: string
          interval?: string
          next_service_date?: string | null
          order_id?: string | null
          paused_at?: string | null
          preferred_route_id?: string | null
          service_id?: string
          service_name?: string
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_preferred_route_id_fkey"
            columns: ["preferred_route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      traffic_buffer_overrides: {
        Row: {
          business_id: string
          created_at: string
          hour_end: number | null
          hour_start: number | null
          id: string
          is_active: boolean
          label: string | null
          multiplier: number
          updated_at: string
          weekdays_only: boolean
          zip_prefix: string
        }
        Insert: {
          business_id: string
          created_at?: string
          hour_end?: number | null
          hour_start?: number | null
          id?: string
          is_active?: boolean
          label?: string | null
          multiplier?: number
          updated_at?: string
          weekdays_only?: boolean
          zip_prefix: string
        }
        Update: {
          business_id?: string
          created_at?: string
          hour_end?: number | null
          hour_start?: number | null
          id?: string
          is_active?: boolean
          label?: string | null
          multiplier?: number
          updated_at?: string
          weekdays_only?: boolean
          zip_prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_buffer_overrides_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      admin_users_overview: {
        Row: {
          auth_created_at: string | null
          avatar_url: string | null
          businesses_count: number | null
          display_name: string | null
          email: string | null
          last_sign_in_at: string | null
          orders_count: number | null
          phone: string | null
          roles: string[] | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _generate_occurrences_for_agreement: {
        Args: { _agreement_id: string; _until_date: string }
        Returns: number
      }
      _materialize_single_occurrence: {
        Args: { _occurrence_id: string }
        Returns: undefined
      }
      admin_business_stats: {
        Args: never
        Returns: {
          business_id: string
          completed_revenue: number
          orders_count: number
          owner_email: string
          pending_count: number
          total_revenue: number
        }[]
      }
      admin_create_impersonation_code: {
        Args: { p_business_id: string }
        Returns: string
      }
      admin_list_users: {
        Args: never
        Returns: {
          auth_created_at: string
          avatar_url: string
          businesses_count: number
          display_name: string
          email: string
          last_sign_in_at: string
          orders_count: number
          phone: string
          roles: string[]
          user_id: string
        }[]
      }
      admin_redeem_impersonation_code: {
        Args: { p_code: string }
        Returns: string
      }
      admin_set_user_role: {
        Args: {
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      agreement_interval_days: {
        Args: {
          _custom_days: number
          _interval: Database["public"]["Enums"]["agreement_interval"]
        }
        Returns: number
      }
      auto_recur_due_orders: {
        Args: never
        Returns: {
          created_order_id: string
          source_order_id: string
        }[]
      }
      business_has_active_plan: {
        Args: { _business_id: string }
        Returns: boolean
      }
      business_id_for_stripe_customer: {
        Args: { _customer_id: string }
        Returns: string
      }
      claim_route_planner_idempotency: {
        Args: { _business_id: string; _key: string }
        Returns: boolean
      }
      cleanup_accounting_sync_log: { Args: never; Returns: undefined }
      cleanup_route_planner_idempotency: { Args: never; Returns: number }
      create_route_fast: {
        Args: {
          _business_id: string
          _color?: string
          _name?: string
          _route_date: string
        }
        Returns: {
          base_route_id: string | null
          business_id: string
          color: string
          created_at: string
          employee_id: string | null
          id: string
          name: string | null
          notes: string | null
          optimization_suggestions: Json | null
          optimization_summary: string | null
          optimized_at: string | null
          planned_start_time: string | null
          route_date: string
          route_template_id: string | null
          start_address: string | null
          start_from_home: boolean
          start_latitude: number | null
          start_longitude: number | null
          status: string
          total_distance_km: number | null
          total_duration_minutes: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "routes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_cancelled_order: {
        Args: { _order_id: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      dismiss_dlq_job: {
        Args: { _dlq_id: string; _note?: string }
        Returns: undefined
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      enqueue_monthly_consolidated_invoices: {
        Args: { _business_id: string; _month: number; _year: number }
        Returns: number
      }
      ensure_agreement_occurrences: {
        Args: { _business_id: string; _until_date: string }
        Returns: number
      }
      find_or_create_route_for_employee: {
        Args: {
          _business_id: string
          _employee_id: string
          _route_date: string
          _source_route_id: string
        }
        Returns: string
      }
      find_or_create_split_route_for_employee: {
        Args: {
          _business_id: string
          _employee_id: string
          _route_date: string
          _source_route_id: string
        }
        Returns: string
      }
      get_customer_notification_pref: {
        Args: { p_email: string; p_key: string }
        Returns: boolean
      }
      get_platform_pricing: {
        Args: never
        Returns: {
          base_price_dkk: number
          discount_quarterly_pct: number
          discount_yearly_pct: number
          price_accounting_integration_dkk: number
          price_data_import_dkk: number
          price_per_employee_login_dkk: number
          price_route_planning_dkk: number
          stripe_publishable_key: string
          trial_days: number
        }[]
      }
      get_route_calendar: {
        Args: { p_business_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      interval_to_duration: { Args: { _interval: string }; Returns: string }
      is_business_owner: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_route_assigned_employee: {
        Args: { _route_id: string; _user_id: string }
        Returns: boolean
      }
      is_route_owner: {
        Args: { _route_id: string; _user_id: string }
        Returns: boolean
      }
      kick_accounting_sync: {
        Args: { _business_id: string }
        Returns: undefined
      }
      log_route_planner_event: {
        Args: {
          _base_route_id?: string
          _business_id: string
          _client_event_id?: string
          _details?: Json
          _event_type: string
          _projected_date?: string
          _route_id?: string
          _severity?: string
        }
        Returns: undefined
      }
      materialize_occurrence_to_route: {
        Args: { _occurrence_id: string; _target_route_id: string }
        Returns: string
      }
      materialize_occurrences_to_routes: {
        Args: { _business_id: string; _from: string; _to: string }
        Returns: undefined
      }
      materialize_virtual_route: {
        Args: { _base_route_id: string; _date: string }
        Returns: {
          base_route_id: string | null
          business_id: string
          color: string
          created_at: string
          employee_id: string | null
          id: string
          name: string | null
          notes: string | null
          optimization_suggestions: Json | null
          optimization_summary: string | null
          optimized_at: string | null
          planned_start_time: string | null
          route_date: string
          route_template_id: string | null
          start_address: string | null
          start_from_home: boolean
          start_latitude: number | null
          start_longitude: number | null
          status: string
          total_distance_km: number | null
          total_duration_minutes: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "routes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      move_route_to_date: {
        Args: { _new_date: string; _route_id: string; _scope?: string }
        Returns: Json
      }
      move_stops_to_date: {
        Args: { _stop_ids: string[]; _target_date: string }
        Returns: {
          missing_employee_count: number
          moved_count: number
        }[]
      }
      move_stops_to_route: {
        Args: { _stop_ids: string[]; _target_route_id: string }
        Returns: {
          moved_count: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      open_projected_route_base: {
        Args: {
          _base_route_id: string
          _business_id: string
          _client_event_id?: string
          _projected_date: string
        }
        Returns: {
          base_route_id: string | null
          business_id: string
          color: string
          created_at: string
          employee_id: string | null
          id: string
          name: string | null
          notes: string | null
          optimization_suggestions: Json | null
          optimization_summary: string | null
          optimized_at: string | null
          planned_start_time: string | null
          route_date: string
          route_template_id: string | null
          start_address: string | null
          start_from_home: boolean
          start_latitude: number | null
          start_longitude: number | null
          status: string
          total_distance_km: number | null
          total_duration_minutes: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "routes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      order_group_has_active_approval_token: {
        Args: { _parent_order_id: string }
        Returns: boolean
      }
      pick_route_color: {
        Args: { _business_id: string; _route_date: string }
        Returns: string
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalc_route_totals: { Args: { _route_id: string }; Returns: undefined }
      reorder_route_stops: { Args: { _updates: Json }; Returns: undefined }
      retry_dlq_job: { Args: { _dlq_id: string }; Returns: string }
    }
    Enums: {
      agreement_billing_model: "per_visit" | "monthly_consolidated"
      agreement_interval:
        | "engangskøb"
        | "ugentlig"
        | "hver_14_dag"
        | "hver_4_uge"
        | "månedlig"
        | "kvartalsvis"
        | "halvårlig"
        | "årlig"
        | "custom"
      agreement_status:
        | "draft"
        | "pending_approval"
        | "active"
        | "paused"
        | "ended"
        | "cancelled"
      app_role: "admin" | "business_owner" | "user" | "employee"
      occurrence_status: "planned" | "completed" | "cancelled" | "skipped"
      order_payment_status:
        | "unpaid"
        | "partially_paid"
        | "paid"
        | "credited"
        | "overdue"
      order_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      pricing_type: "fast_pris" | "timepris" | "prisberegner"
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
      agreement_billing_model: ["per_visit", "monthly_consolidated"],
      agreement_interval: [
        "engangskøb",
        "ugentlig",
        "hver_14_dag",
        "hver_4_uge",
        "månedlig",
        "kvartalsvis",
        "halvårlig",
        "årlig",
        "custom",
      ],
      agreement_status: [
        "draft",
        "pending_approval",
        "active",
        "paused",
        "ended",
        "cancelled",
      ],
      app_role: ["admin", "business_owner", "user", "employee"],
      occurrence_status: ["planned", "completed", "cancelled", "skipped"],
      order_payment_status: [
        "unpaid",
        "partially_paid",
        "paid",
        "credited",
        "overdue",
      ],
      order_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      pricing_type: ["fast_pris", "timepris", "prisberegner"],
    },
  },
} as const
