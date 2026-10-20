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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          contact_name: string
          contact_phone: string
          created_at: string
          distance_at: string | null
          distance_sig: string | null
          for_someone_else: boolean
          house_name: string
          id: string
          is_default: boolean
          label: string
          landmark: string | null
          lat: number
          lng: number
          road: string
          road_km: number | null
          user_id: string
        }
        Insert: {
          contact_name: string
          contact_phone: string
          created_at?: string
          distance_at?: string | null
          distance_sig?: string | null
          for_someone_else?: boolean
          house_name: string
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          lat: number
          lng: number
          road: string
          road_km?: number | null
          user_id?: string
        }
        Update: {
          contact_name?: string
          contact_phone?: string
          created_at?: string
          distance_at?: string | null
          distance_sig?: string | null
          for_someone_else?: boolean
          house_name?: string
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          lat?: number
          lng?: number
          road?: string
          road_km?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_locations: {
        Row: {
          agent_id: string
          heading: number | null
          lat: number
          lng: number
          order_id: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          heading?: number | null
          lat: number
          lng: number
          order_id: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          heading?: number | null
          lat?: number
          lng?: number
          order_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_locations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          active: boolean
          bg_color: string | null
          created_at: string
          end_at: string | null
          id: string
          image_url: string
          link_type: string
          link_value: string | null
          placement: string
          position: number
          size: string
          start_at: string | null
          subtitle: string | null
          title: string | null
        }
        Insert: {
          active?: boolean
          bg_color?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          image_url: string
          link_type: string
          link_value?: string | null
          placement?: string
          position?: number
          size?: string
          start_at?: string | null
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          active?: boolean
          bg_color?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          image_url?: string
          link_type?: string
          link_value?: string | null
          placement?: string
          position?: number
          size?: string
          start_at?: string | null
          subtitle?: string | null
          title?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          added_at: string
          product_id: string
          qty: number
          user_id: string
        }
        Insert: {
          added_at?: string
          product_id: string
          qty: number
          user_id?: string
        }
        Update: {
          added_at?: string
          product_id?: string
          qty?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          slug: string
          sort: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          slug: string
          sort?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_ledger: {
        Row: {
          reminded: boolean
          alloc: Json | null
          amount: number
          created_at: string
          entry: Database["public"]["Enums"]["coin_entry"]
          expires_at: string | null
          id: string
          note: string | null
          order_id: string | null
          remaining: number
          user_id: string
        }
        Insert: {
          reminded?: boolean
          alloc?: Json | null
          amount: number
          created_at?: string
          entry: Database["public"]["Enums"]["coin_entry"]
          expires_at?: string | null
          id?: string
          note?: string | null
          order_id?: string | null
          remaining?: number
          user_id: string
        }
        Update: {
          reminded?: boolean
          alloc?: Json | null
          amount?: number
          created_at?: string
          entry?: Database["public"]["Enums"]["coin_entry"]
          expires_at?: string | null
          id?: string
          note?: string | null
          order_id?: string | null
          remaining?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_uses: {
        Row: {
          code: string
          created_at: string
          discount_paise: number
          id: string
          order_id: string
          reverted: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          discount_paise: number
          id?: string
          order_id: string
          reverted?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          discount_paise?: number
          id?: string
          order_id?: string
          reverted?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "coupon_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          audience: string
          audience_user_ids: string[]
          category_ids: string[]
          code: string
          created_at: string
          description: string | null
          first_order_only: boolean
          max_discount_paise: number | null
          min_order_paise: number
          per_user_limit: number
          title: string
          total_limit: number | null
          type: Database["public"]["Enums"]["coupon_type"]
          used_count: number
          valid_from: string
          valid_to: string | null
          value: number
        }
        Insert: {
          active?: boolean
          audience?: string
          audience_user_ids?: string[]
          category_ids?: string[]
          code: string
          created_at?: string
          description?: string | null
          first_order_only?: boolean
          max_discount_paise?: number | null
          min_order_paise?: number
          per_user_limit?: number
          title: string
          total_limit?: number | null
          type: Database["public"]["Enums"]["coupon_type"]
          used_count?: number
          valid_from?: string
          valid_to?: string | null
          value?: number
        }
        Update: {
          active?: boolean
          audience?: string
          audience_user_ids?: string[]
          category_ids?: string[]
          code?: string
          created_at?: string
          description?: string | null
          first_order_only?: boolean
          max_discount_paise?: number | null
          min_order_paise?: number
          per_user_limit?: number
          title?: string
          total_limit?: number | null
          type?: Database["public"]["Enums"]["coupon_type"]
          used_count?: number
          valid_from?: string
          valid_to?: string | null
          value?: number
        }
        Relationships: []
      }
      home_sections: {
        Row: {
          config: Json
          key: string
          position: number
          title: string
          visible: boolean
        }
        Insert: {
          config?: Json
          key: string
          position: number
          title: string
          visible?: boolean
        }
        Update: {
          config?: Json
          key?: string
          position?: number
          title?: string
          visible?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: number
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: never
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: never
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          gst_rate: number
          hsn: string | null
          id: string
          image_url: string | null
          mrp_paise: number
          name: string
          order_id: string
          price_paise: number
          product_id: string
          qty: number
          returnable: boolean
          returned_qty: number
          reviewed: boolean
          variant_label: string | null
        }
        Insert: {
          gst_rate: number
          hsn?: string | null
          id?: string
          image_url?: string | null
          mrp_paise: number
          name: string
          order_id: string
          price_paise: number
          product_id: string
          qty: number
          returnable?: boolean
          returned_qty?: number
          reviewed?: boolean
          variant_label?: string | null
        }
        Update: {
          gst_rate?: number
          hsn?: string | null
          id?: string
          image_url?: string | null
          mrp_paise?: number
          name?: string
          order_id?: string
          price_paise?: number
          product_id?: string
          qty?: number
          returnable?: boolean
          returned_qty?: number
          reviewed?: boolean
          variant_label?: string | null
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
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          refund_utr: string | null
          refund_proof_path: string | null
          refunded_at: string | null
          address: Json | null
          agent_id: string | null
          cancel_reason: string | null
          cancel_was_free: boolean | null
          cancelled_at: string | null
          cancelled_by: string | null
          coins_credited: boolean
          coins_to_earn: number
          coins_used: number
          confirmed_at: string | null
          coupon_code: string | null
          coupon_discount_paise: number
          created_at: string
          delivered_at: string | null
          delivery_fee_paise: number
          fine_paise: number
          id: string
          idempotency_key: string | null
          items_total_paise: number
          note: string | null
          order_no: string
          otp_attempts: number
          otp_hash: string | null
          paid_at: string | null
          payable_paise: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          ready_at: string | null
          refund_due_paise: number
          refund_upi_id: string | null
          return_window_ends_at: string | null
          road_km: number | null
          slot_date: string | null
          slot_end: string | null
          slot_start: string | null
          status: Database["public"]["Enums"]["order_status"]
          type: Database["public"]["Enums"]["order_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          refund_utr?: string | null
          refund_proof_path?: string | null
          refunded_at?: string | null
          address?: Json | null
          agent_id?: string | null
          cancel_reason?: string | null
          cancel_was_free?: boolean | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          coins_credited?: boolean
          coins_to_earn?: number
          coins_used?: number
          confirmed_at?: string | null
          coupon_code?: string | null
          coupon_discount_paise?: number
          created_at?: string
          delivered_at?: string | null
          delivery_fee_paise?: number
          fine_paise?: number
          id?: string
          idempotency_key?: string | null
          items_total_paise: number
          note?: string | null
          order_no?: string
          otp_attempts?: number
          otp_hash?: string | null
          paid_at?: string | null
          payable_paise: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          ready_at?: string | null
          refund_due_paise?: number
          refund_upi_id?: string | null
          return_window_ends_at?: string | null
          road_km?: number | null
          slot_date?: string | null
          slot_end?: string | null
          slot_start?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          type: Database["public"]["Enums"]["order_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          refund_utr?: string | null
          refund_proof_path?: string | null
          refunded_at?: string | null
          address?: Json | null
          agent_id?: string | null
          cancel_reason?: string | null
          cancel_was_free?: boolean | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          coins_credited?: boolean
          coins_to_earn?: number
          coins_used?: number
          confirmed_at?: string | null
          coupon_code?: string | null
          coupon_discount_paise?: number
          created_at?: string
          delivered_at?: string | null
          delivery_fee_paise?: number
          fine_paise?: number
          id?: string
          idempotency_key?: string | null
          items_total_paise?: number
          note?: string | null
          order_no?: string
          otp_attempts?: number
          otp_hash?: string | null
          paid_at?: string | null
          payable_paise?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          ready_at?: string | null
          refund_due_paise?: number
          refund_upi_id?: string | null
          return_window_ends_at?: string | null
          road_km?: number | null
          slot_date?: string | null
          slot_end?: string | null
          slot_start?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          type?: Database["public"]["Enums"]["order_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_paise: number
          created_at: string
          gateway_ref: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          raw: Json | null
          reconciled_by: string | null
          status: string
          updated_at: string
          utr: string | null
        }
        Insert: {
          amount_paise: number
          created_at?: string
          gateway_ref?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          raw?: Json | null
          reconciled_by?: string | null
          status?: string
          updated_at?: string
          utr?: string | null
        }
        Update: {
          amount_paise?: number
          created_at?: string
          gateway_ref?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          raw?: Json | null
          reconciled_by?: string | null
          status?: string
          updated_at?: string
          utr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_groups: {
        Row: {
          brand: string | null
          category_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          rating_avg: number
          rating_count: number
          returnable: boolean
          search_text: string
          seasonal_tag: string | null
          slug: string
          sold_count: number
          tags: string[]
          updated_at: string
          view_count: number
        }
        Insert: {
          brand?: string | null
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          rating_avg?: number
          rating_count?: number
          returnable?: boolean
          search_text?: string
          seasonal_tag?: string | null
          slug: string
          sold_count?: number
          tags?: string[]
          updated_at?: string
          view_count?: number
        }
        Update: {
          brand?: string | null
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          rating_avg?: number
          rating_count?: number
          returnable?: boolean
          search_text?: string
          seasonal_tag?: string | null
          slug?: string
          sold_count?: number
          tags?: string[]
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          colour: string | null
          colour_hex: string | null
          created_at: string
          featured: boolean
          group_id: string
          gst_rate: number
          hsn: string | null
          id: string
          images: string[]
          low_stock_at: number
          max_per_order: number
          mrp_paise: number
          price_paise: number
          sku: string
          sort: number
          stock: number
          unit: string
          updated_at: string
          variant_label: string | null
        }
        Insert: {
          active?: boolean
          colour?: string | null
          colour_hex?: string | null
          created_at?: string
          featured?: boolean
          group_id: string
          gst_rate?: number
          hsn?: string | null
          id?: string
          images?: string[]
          low_stock_at?: number
          max_per_order?: number
          mrp_paise: number
          price_paise: number
          sku: string
          sort?: number
          stock?: number
          unit?: string
          updated_at?: string
          variant_label?: string | null
        }
        Update: {
          active?: boolean
          colour?: string | null
          colour_hex?: string | null
          created_at?: string
          featured?: boolean
          group_id?: string
          gst_rate?: number
          hsn?: string | null
          id?: string
          images?: string[]
          low_stock_at?: number
          max_per_order?: number
          mrp_paise?: number
          price_paise?: number
          sku?: string
          sort?: number
          stock?: number
          unit?: string
          updated_at?: string
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agent_online: boolean
          avatar_url: string | null
          blocked_reason: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          phone: string | null
          referral_code: string
          referral_prompt_done: boolean
          referred_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          terms_accepted_at: string | null
          updated_at: string
          welcome_seen: boolean
        }
        Insert: {
          agent_online?: boolean
          avatar_url?: string | null
          blocked_reason?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          phone?: string | null
          referral_code: string
          referral_prompt_done?: boolean
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          terms_accepted_at?: string | null
          updated_at?: string
          welcome_seen?: boolean
        }
        Update: {
          agent_online?: boolean
          avatar_url?: string | null
          blocked_reason?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
          referral_code?: string
          referral_prompt_done?: boolean
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          terms_accepted_at?: string | null
          updated_at?: string
          welcome_seen?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket: string
          hits: number
          user_id: string
          window_start: string
        }
        Insert: {
          bucket: string
          hits?: number
          user_id: string
          window_start: string
        }
        Update: {
          bucket?: string
          hits?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      recently_viewed: {
        Row: {
          group_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          group_id: string
          user_id?: string
          viewed_at?: string
        }
        Update: {
          group_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recently_viewed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          first_order_id: string | null
          id: string
          referee_id: string
          referrer_id: string
          rewarded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          first_order_id?: string | null
          id?: string
          referee_id: string
          referrer_id: string
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          first_order_id?: string | null
          id?: string
          referee_id?: string
          referrer_id?: string
          rewarded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          pickup_address: Json | null
          restocked: boolean
          refunded_at: string | null
          admin_note: string | null
          agent_id: string | null
          created_at: string
          id: string
          items: Json
          order_id: string
          photos: string[]
          reason: string
          refund_amount_paise: number
          refund_proof_path: string | null
          refund_upi_id: string
          refund_utr: string | null
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          pickup_address?: Json | null
          restocked?: boolean
          refunded_at?: string | null
          admin_note?: string | null
          agent_id?: string | null
          created_at?: string
          id?: string
          items: Json
          order_id: string
          photos?: string[]
          reason: string
          refund_amount_paise?: number
          refund_proof_path?: string | null
          refund_upi_id: string
          refund_utr?: string | null
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          pickup_address?: Json | null
          restocked?: boolean
          refunded_at?: string | null
          admin_note?: string | null
          agent_id?: string | null
          created_at?: string
          id?: string
          items?: Json
          order_id?: string
          photos?: string[]
          reason?: string
          refund_amount_paise?: number
          refund_proof_path?: string | null
          refund_upi_id?: string
          refund_utr?: string | null
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          reviewer_name: string | null
          comment: string | null
          created_at: string
          group_id: string
          hidden: boolean
          id: string
          order_item_id: string
          photos: string[]
          product_id: string
          stars: number
          user_id: string
        }
        Insert: {
          reviewer_name?: string | null
          comment?: string | null
          created_at?: string
          group_id: string
          hidden?: boolean
          id?: string
          order_item_id: string
          photos?: string[]
          product_id: string
          stars: number
          user_id: string
        }
        Update: {
          reviewer_name?: string | null
          comment?: string | null
          created_at?: string
          group_id?: string
          hidden?: boolean
          id?: string
          order_item_id?: string
          photos?: string[]
          product_id?: string
          stars?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_logs: {
        Row: {
          created_at: string
          id: number
          results_count: number
          term: string
        }
        Insert: {
          created_at?: string
          id?: never
          results_count: number
          term: string
        }
        Update: {
          created_at?: string
          id?: never
          results_count?: number
          term?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          cancel_fine_paise: number
          cod_limit_paise: number
          coin_expiry_days: number
          coin_rate_bp: number
          delivery_end: string
          delivery_fee_paise: number
          delivery_radius_km: number
          delivery_start: string
          free_cancels_per_week: number
          free_delivery_min_paise: number
          gstin: string
          holidays: string[]
          id: number
          legal_name: string
          min_order_paise: number
          orders_paused: boolean
          pickup_hold_hours: number
          quick_eta_max: number
          quick_eta_min: number
          quick_last_order: string
          referral_reward_coins: number
          return_window_days: number
          slot_capacity: number
          slot_days_ahead: number
          slot_windows: Json
          store_address: string
          store_close: string
          store_lat: number
          store_lng: number
          store_name: string
          store_open: string
          store_phone: string
          store_upi_id: string
          support_email: string
          updated_at: string
          upi_daily_cap: number
        }
        Insert: {
          cancel_fine_paise?: number
          cod_limit_paise?: number
          coin_expiry_days?: number
          coin_rate_bp?: number
          delivery_end?: string
          delivery_fee_paise?: number
          delivery_radius_km?: number
          delivery_start?: string
          free_cancels_per_week?: number
          free_delivery_min_paise?: number
          gstin?: string
          holidays?: string[]
          id?: number
          legal_name?: string
          min_order_paise?: number
          orders_paused?: boolean
          pickup_hold_hours?: number
          quick_eta_max?: number
          quick_eta_min?: number
          quick_last_order?: string
          referral_reward_coins?: number
          return_window_days?: number
          slot_capacity?: number
          slot_days_ahead?: number
          slot_windows?: Json
          store_address?: string
          store_close?: string
          store_lat?: number
          store_lng?: number
          store_name?: string
          store_open?: string
          store_phone?: string
          store_upi_id?: string
          support_email?: string
          updated_at?: string
          upi_daily_cap?: number
        }
        Update: {
          cancel_fine_paise?: number
          cod_limit_paise?: number
          coin_expiry_days?: number
          coin_rate_bp?: number
          delivery_end?: string
          delivery_fee_paise?: number
          delivery_radius_km?: number
          delivery_start?: string
          free_cancels_per_week?: number
          free_delivery_min_paise?: number
          gstin?: string
          holidays?: string[]
          id?: number
          legal_name?: string
          min_order_paise?: number
          orders_paused?: boolean
          pickup_hold_hours?: number
          quick_eta_max?: number
          quick_eta_min?: number
          quick_last_order?: string
          referral_reward_coins?: number
          return_window_days?: number
          slot_capacity?: number
          slot_days_ahead?: number
          slot_windows?: Json
          store_address?: string
          store_close?: string
          store_lat?: number
          store_lng?: number
          store_name?: string
          store_open?: string
          store_phone?: string
          store_upi_id?: string
          support_email?: string
          updated_at?: string
          upi_daily_cap?: number
        }
        Relationships: []
      }
      slot_bookings: {
        Row: {
          booked: number
          slot_date: string
          window_end: string
          window_start: string
        }
        Insert: {
          booked?: number
          slot_date: string
          window_end: string
          window_start: string
        }
        Update: {
          booked?: number
          slot_date?: string
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          coin_balance: number
          pending_fine_paise: number
          updated_at: string
          user_id: string
          week_cancels: number
          week_start: string
        }
        Insert: {
          coin_balance?: number
          pending_fine_paise?: number
          updated_at?: string
          user_id: string
          week_cancels?: number
          week_start?: string
        }
        Update: {
          coin_balance?: number
          pending_fine_paise?: number
          updated_at?: string
          user_id?: string
          week_cancels?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      product_cards: {
        Row: {
          brand: string | null
          category_id: string | null
          category_name: string | null
          category_slug: string | null
          colour: string | null
          colour_hex: string | null
          created_at: string | null
          discount_pct: number | null
          featured: boolean | null
          group_id: string | null
          id: string | null
          images: string[] | null
          max_per_order: number | null
          mrp_paise: number | null
          name: string | null
          price_paise: number | null
          rating_avg: number | null
          rating_count: number | null
          returnable: boolean | null
          seasonal_tag: string | null
          sku: string | null
          slug: string | null
          sold_count: number | null
          stock: number | null
          tags: string[] | null
          unit: string | null
          variant_label: string | null
          variant_sort: number | null
          view_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      return_options: { Args: { p_order: string }; Returns: Json }
      request_return: { Args: { p_items: Json; p_order: string; p_photos: string[]; p_reason: string; p_refund_upi: string }; Returns: string }
      admin_review_return: { Args: { p_approve: boolean; p_note?: string; p_return: string }; Returns: undefined }
      admin_assign_return_agent: { Args: { p_agent: string; p_return: string }; Returns: undefined }
      agent_return_picked_up: { Args: { p_return: string }; Returns: undefined }
      admin_receive_return: { Args: { p_restock?: boolean; p_return: string }; Returns: undefined }
      admin_refund_return: { Args: { p_proof_path: string; p_return: string; p_utr?: string }; Returns: undefined }
      admin_mark_refund_paid: { Args: { p_order: string; p_proof_path: string; p_utr?: string }; Returns: undefined }
      submit_review: { Args: { p_comment?: string; p_item: string; p_photos?: string[]; p_stars: number }; Returns: undefined }
      admin_hide_review: { Args: { p_hidden: boolean; p_review: string }; Returns: undefined }
      agent_accept: { Args: { p_order: string }; Returns: undefined }
      agent_complete: { Args: { p_cash_collected?: boolean; p_code: string; p_order: string }; Returns: Json }
      agent_decline: { Args: { p_order: string; p_reason?: string }; Returns: undefined }
      agent_report_issue: { Args: { p_note: string; p_order: string }; Returns: undefined }
      agent_resend_code: { Args: { p_order: string }; Returns: boolean }
      agent_set_online: { Args: { p_online: boolean }; Returns: undefined }
      agent_start_delivery: { Args: { p_order: string }; Returns: undefined }
      my_delivery_code: { Args: { p_order: string }; Returns: string }
      _cancel_order: {
        Args: {
          p_by: string
          p_customer: boolean
          p_order: string
          p_reason: string
          p_refund_upi?: string
        }
        Returns: Json
      }
      _distance_sig_ok: {
        Args: { a: Database["public"]["Tables"]["addresses"]["Row"] }
        Returns: boolean
      }
      _expire_pickups: { Args: never; Returns: number }
      _expire_unpaid_upi: { Args: never; Returns: number }
      _inr: { Args: { p: number }; Returns: string }
      _ist_now: { Args: never; Returns: string }
      _price_order: { Args: { p: Json; p_user: string }; Returns: Json }
      _status_message: {
        Args: {
          o: Database["public"]["Tables"]["orders"]["Row"]
          st: Database["public"]["Enums"]["order_status"]
        }
        Returns: string[]
      }
      admin_assign_agent: {
        Args: { p_agent: string; p_order: string }
        Returns: undefined
      }
      admin_mark_paid: {
        Args: { p_order: string; p_utr?: string }
        Returns: undefined
      }
      admin_set_order_status: {
        Args: {
          p_note?: string
          p_order: string
          p_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: undefined
      }
      admin_set_role: {
        Args: {
          p_reason?: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_user: string
        }
        Returns: undefined
      }
      apply_referral: { Args: { p_code: string }; Returns: Json }
      audit: {
        Args: {
          p_action: string
          p_after: Json
          p_before: Json
          p_target: string
        }
        Returns: undefined
      }
      can_see_order: { Args: { o: string }; Returns: boolean }
      cancel_order: {
        Args: { p_order: string; p_reason: string; p_refund_upi?: string }
        Returns: Json
      }
      cancel_preview: { Args: never; Returns: Json }
      checkout_slots: {
        Args: never
        Returns: {
          available: number
          booked: number
          capacity: number
          open: boolean
          reason: string
          slot_date: string
          window_end: string
          window_start: string
        }[]
      }
      finish_onboarding: {
        Args: { p_skip_referral?: boolean; p_welcome_seen?: boolean }
        Returns: undefined
      }
      gen_referral_code: { Args: never; Returns: string }
      hit_rate_limit: {
        Args: { p_bucket: string; p_max: number; p_window_seconds: number }
        Returns: undefined
      }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_agent: { Args: never; Returns: boolean }
      log_search: {
        Args: { p_results: number; p_term: string }
        Returns: undefined
      }
      my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      notify: {
        Args: {
          p_body: string
          p_link: string
          p_title: string
          p_type: string
          p_user: string
        }
        Returns: undefined
      }
      notify_admins: {
        Args: {
          p_body: string
          p_link: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      place_order: { Args: { p: Json }; Returns: Json }
      quote_order: { Args: { p: Json }; Returns: Json }
      require_active: { Args: never; Returns: undefined }
      search_products: {
        Args: { p_limit?: number; p_q: string }
        Returns: {
          brand: string
          category_id: string
          category_name: string
          category_slug: string
          colour: string
          discount_pct: number
          group_id: string
          id: string
          images: string[]
          mrp_paise: number
          name: string
          price_paise: number
          rating_avg: number
          rating_count: number
          score: number
          slug: string
          sold_count: number
          stock: number
          unit: string
          variant_label: string
        }[]
      }
      search_suggestions: {
        Args: { p_q: string }
        Returns: {
          category_slug: string
          group_id: string
          image: string
          kind: string
          label: string
          slug: string
        }[]
      }
      submit_upi_utr: {
        Args: { p_order: string; p_utr: string }
        Returns: undefined
      }
      track_view: { Args: { p_group: string }; Returns: undefined }
    }
    Enums: {
      coin_entry:
        | "earn"
        | "spend"
        | "expire"
        | "referral"
        | "restore"
        | "adjust"
      coupon_type: "percent" | "flat" | "free_delivery"
      order_status:
        | "placed"
        | "confirmed"
        | "getting_ready"
        | "packed"
        | "agent_assigned"
        | "agent_accepted"
        | "out_for_delivery"
        | "delivered"
        | "ready_for_pickup"
        | "collected"
        | "completed"
        | "cancelled"
      order_type: "quick" | "scheduled" | "pickup"
      payment_method: "upi" | "cod" | "counter"
      payment_status:
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "partially_refunded"
      return_status:
        | "requested"
        | "approved"
        | "rejected"
        | "pickup_assigned"
        | "picked_up"
        | "received"
        | "refunded"
      user_role: "customer" | "admin" | "delivery_agent" | "blocked"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      coin_entry: ["earn", "spend", "expire", "referral", "restore", "adjust"],
      coupon_type: ["percent", "flat", "free_delivery"],
      order_status: [
        "placed",
        "confirmed",
        "getting_ready",
        "packed",
        "agent_assigned",
        "agent_accepted",
        "out_for_delivery",
        "delivered",
        "ready_for_pickup",
        "collected",
        "completed",
        "cancelled",
      ],
      order_type: ["quick", "scheduled", "pickup"],
      payment_method: ["upi", "cod", "counter"],
      payment_status: [
        "pending",
        "paid",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      return_status: [
        "requested",
        "approved",
        "rejected",
        "pickup_assigned",
        "picked_up",
        "received",
        "refunded",
      ],
      user_role: ["customer", "admin", "delivery_agent", "blocked"],
    },
  },
} as const
