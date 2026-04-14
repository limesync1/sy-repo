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
          slug?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
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
          adjusted_amount: number | null
          adjusted_details: Json | null
          business_id: string | null
          business_message: string | null
          business_response: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          adjusted_amount?: number | null
          adjusted_details?: Json | null
          business_id?: string | null
          business_message?: string | null
          business_response?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          adjusted_amount?: number | null
          adjusted_details?: Json | null
          business_id?: string | null
          business_message?: string | null
          business_response?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey"
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
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
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
            foreignKeyName: "subscriptions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "business_owner" | "user"
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
      app_role: ["admin", "business_owner", "user"],
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
