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
      employees: {
        Row: {
          business_id: string
          created_at: string
          email: string
          home_address: string | null
          home_latitude: number | null
          home_longitude: number | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          title: string | null
          updated_at: string
          user_id: string | null
          work_end_time: string | null
          work_start_time: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          email: string
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id?: string
          is_active?: boolean
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
      orders: {
        Row: {
          address: string | null
          adjusted_amount: number | null
          adjusted_details: Json | null
          business_id: string | null
          business_message: string | null
          business_response: string | null
          city: string | null
          completed_cycles: number
          created_at: string
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          customer_response: string | null
          id: string
          latitude: number | null
          longitude: number | null
          next_service_date: string | null
          notes: string | null
          preferred_date: string | null
          preferred_time_end: string | null
          preferred_time_start: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          adjusted_amount?: number | null
          adjusted_details?: Json | null
          business_id?: string | null
          business_message?: string | null
          business_response?: string | null
          city?: string | null
          completed_cycles?: number
          created_at?: string
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_response?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          next_service_date?: string | null
          notes?: string | null
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          adjusted_amount?: number | null
          adjusted_details?: Json | null
          business_id?: string | null
          business_message?: string | null
          business_response?: string | null
          city?: string | null
          completed_cycles?: number
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_response?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          next_service_date?: string | null
          notes?: string | null
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
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
      quote_requests: {
        Row: {
          category: string
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          description: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          description: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          description?: string
          id?: string
          status?: string
          updated_at?: string
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
          route_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          route_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
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
      routes: {
        Row: {
          business_id: string
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
          business_id: string
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
          business_id?: string
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
        ]
      }
      services: {
        Row: {
          base_price: number | null
          business_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          interval_options: string[] | null
          is_active: boolean | null
          name: string
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          service_category: string | null
          sort_order: number | null
          subcategory: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          interval_options?: string[] | null
          is_active?: boolean | null
          name: string
          pricing_type?: Database["public"]["Enums"]["pricing_type"]
          service_category?: string | null
          sort_order?: number | null
          subcategory?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          interval_options?: string[] | null
          is_active?: boolean | null
          name?: string
          pricing_type?: Database["public"]["Enums"]["pricing_type"]
          service_category?: string | null
          sort_order?: number | null
          subcategory?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          business_id: string
          cancelled_at: string | null
          created_at: string
          customer_id: string
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
          customer_id: string
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
          customer_id?: string
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
      admin_set_user_role: {
        Args: {
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
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
    }
    Enums: {
      app_role: "admin" | "business_owner" | "user" | "employee"
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
      app_role: ["admin", "business_owner", "user", "employee"],
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
