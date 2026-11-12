
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_feed": {
                  Row: {
                    "album_id": number | null,"created_at": string,"id": number,"payload": NonNullable<Json>,"template_id": number | null,"type": Database["public"]['Enums']["activity_type"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "album_id"?: number | null,"created_at"?: string,"id"?: never,"payload"?: NonNullable<Json>,"template_id"?: number | null,"type": Database["public"]['Enums']["activity_type"],"user_id": string
                  }
                  Update: {
                    "album_id"?: number | null,"created_at"?: string,"id"?: never,"payload"?: NonNullable<Json>,"template_id"?: number | null,"type"?: Database["public"]['Enums']["activity_type"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_feed_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "albums"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_feed_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "card_templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_feed_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "activity_feed_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"album_completions": {
                  Row: {
                    "album_id": number,"completed_at": string,"reward_coins": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "album_id": number,"completed_at"?: string,"reward_coins"?: number,"user_id": string
                  }
                  Update: {
                    "album_id"?: number,"completed_at"?: string,"reward_coins"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "album_completions_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "albums"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "album_completions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "album_completions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"album_slots": {
                  Row: {
                    "album_id": number,"id": number,"slot_number": number,"template_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "album_id": number,"id"?: never,"slot_number": number,"template_id": number
                  }
                  Update: {
                    "album_id"?: number,"id"?: never,"slot_number"?: number,"template_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "album_slots_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "albums"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "album_slots_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "card_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"albums": {
                  Row: {
                    "description": string | null,"id": number,"image_url": string | null,"is_active": boolean,"kind": Database["public"]['Enums']["album_kind"],"name": string,"reward_coins": number,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"id"?: never,"image_url"?: string | null,"is_active"?: boolean,"kind": Database["public"]['Enums']["album_kind"],"name": string,"reward_coins"?: number,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "description"?: string | null,"id"?: never,"image_url"?: string | null,"is_active"?: boolean,"kind"?: Database["public"]['Enums']["album_kind"],"name"?: string,"reward_coins"?: number,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"app_settings": {
                  Row: {
                    "description": string | null,"key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string | null,"key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"banned_words": {
                  Row: {
                    "word": string
                  }
                  ComputedFields: never
                  Insert: {
                    "word": string
                  }
                  Update: {
                    "word"?: string
                  }
                  Relationships: [
                    
                  ]
                },"blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"booster_cards": {
                  Row: {
                    "booster_id": number,"template_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "booster_id": number,"template_id": number
                  }
                  Update: {
                    "booster_id"?: number,"template_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "booster_cards_booster_id_fkey"
      columns: ["booster_id"]
isOneToOne: false
      referencedRelation: "boosters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booster_cards_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "card_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"booster_odds": {
                  Row: {
                    "booster_id": number,"probability": number,"rarity": Database["public"]['Enums']["rarity"]
                  }
                  ComputedFields: never
                  Insert: {
                    "booster_id": number,"probability": number,"rarity": Database["public"]['Enums']["rarity"]
                  }
                  Update: {
                    "booster_id"?: number,"probability"?: number,"rarity"?: Database["public"]['Enums']["rarity"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "booster_odds_booster_id_fkey"
      columns: ["booster_id"]
isOneToOne: false
      referencedRelation: "boosters"
      referencedColumns: ["id"]
    }
                  ]
                },"booster_openings": {
                  Row: {
                    "booster_id": number,"created_at": string,"id": string,"instance_ids": (string)[],"price_paid": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booster_id": number,"created_at"?: string,"id"?: string,"instance_ids"?: (string)[],"price_paid"?: number,"user_id": string
                  }
                  Update: {
                    "booster_id"?: number,"created_at"?: string,"id"?: string,"instance_ids"?: (string)[],"price_paid"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "booster_openings_booster_id_fkey"
      columns: ["booster_id"]
isOneToOne: false
      referencedRelation: "boosters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booster_openings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "booster_openings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"boosters": {
                  Row: {
                    "cards_count": number,"created_at": string,"description": string | null,"ends_at": string | null,"guarantee_count": number,"guarantee_rarity": Database["public"]['Enums']["rarity"] | null,"id": number,"image_url": string | null,"is_active": boolean,"kind": Database["public"]['Enums']["booster_kind"],"name": string,"price": number,"slug": string,"sort_order": number,"starts_at": string | null,"stock_remaining": number | null,"stock_total": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cards_count": number,"created_at"?: string,"description"?: string | null,"ends_at"?: string | null,"guarantee_count"?: number,"guarantee_rarity"?: Database["public"]['Enums']["rarity"] | null,"id"?: never,"image_url"?: string | null,"is_active"?: boolean,"kind": Database["public"]['Enums']["booster_kind"],"name": string,"price"?: number,"slug": string,"sort_order"?: number,"starts_at"?: string | null,"stock_remaining"?: number | null,"stock_total"?: number | null
                  }
                  Update: {
                    "cards_count"?: number,"created_at"?: string,"description"?: string | null,"ends_at"?: string | null,"guarantee_count"?: number,"guarantee_rarity"?: Database["public"]['Enums']["rarity"] | null,"id"?: never,"image_url"?: string | null,"is_active"?: boolean,"kind"?: Database["public"]['Enums']["booster_kind"],"name"?: string,"price"?: number,"slug"?: string,"sort_order"?: number,"starts_at"?: string | null,"stock_remaining"?: number | null,"stock_total"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"card_instance_history": {
                  Row: {
                    "created_at": string,"event": string,"from_user_id": string | null,"id": number,"instance_id": string,"price": number | null,"to_user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"event": string,"from_user_id"?: string | null,"id"?: never,"instance_id": string,"price"?: number | null,"to_user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"event"?: string,"from_user_id"?: string | null,"id"?: never,"instance_id"?: string,"price"?: number | null,"to_user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_instance_history_from_user_id_fkey"
      columns: ["from_user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "card_instance_history_from_user_id_fkey"
      columns: ["from_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_instance_history_instance_id_fkey"
      columns: ["instance_id"]
isOneToOne: false
      referencedRelation: "card_instances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_instance_history_to_user_id_fkey"
      columns: ["to_user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "card_instance_history_to_user_id_fkey"
      columns: ["to_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"card_instances": {
                  Row: {
                    "id": string,"is_locked": boolean,"obtained_at": string,"obtained_via": string,"owner_id": string,"serial_number": number,"template_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"is_locked"?: boolean,"obtained_at"?: string,"obtained_via"?: string,"owner_id": string,"serial_number": number,"template_id": number
                  }
                  Update: {
                    "id"?: string,"is_locked"?: boolean,"obtained_at"?: string,"obtained_via"?: string,"owner_id"?: string,"serial_number"?: number,"template_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_instances_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "card_instances_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_instances_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "card_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"card_templates": {
                  Row: {
                    "club_id": number | null,"collection_number": number,"created_at": string,"edition": string,"id": number,"image_url": string | null,"is_active": boolean,"max_supply": number | null,"minted_count": number,"player_id": number,"rarity": Database["public"]['Enums']["rarity"],"rating": number,"season": string
                  }
                  ComputedFields: never
                  Insert: {
                    "club_id"?: number | null,"collection_number": number,"created_at"?: string,"edition": string,"id"?: never,"image_url"?: string | null,"is_active"?: boolean,"max_supply"?: number | null,"minted_count"?: number,"player_id": number,"rarity": Database["public"]['Enums']["rarity"],"rating": number,"season": string
                  }
                  Update: {
                    "club_id"?: number | null,"collection_number"?: number,"created_at"?: string,"edition"?: string,"id"?: never,"image_url"?: string | null,"is_active"?: boolean,"max_supply"?: number | null,"minted_count"?: number,"player_id"?: number,"rarity"?: Database["public"]['Enums']["rarity"],"rating"?: number,"season"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_templates_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_templates_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"clubs": {
                  Row: {
                    "city": string | null,"code": string,"color_primary": string,"color_secondary": string,"crest_url": string | null,"id": number,"name": string,"nation_id": number | null,"short_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string | null,"code": string,"color_primary"?: string,"color_secondary"?: string,"crest_url"?: string | null,"id"?: never,"name": string,"nation_id"?: number | null,"short_name": string
                  }
                  Update: {
                    "city"?: string | null,"code"?: string,"color_primary"?: string,"color_secondary"?: string,"crest_url"?: string | null,"id"?: never,"name"?: string,"nation_id"?: number | null,"short_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clubs_nation_id_fkey"
      columns: ["nation_id"]
isOneToOne: false
      referencedRelation: "nations"
      referencedColumns: ["id"]
    }
                  ]
                },"coin_transactions": {
                  Row: {
                    "amount": number,"balance_after": number,"created_at": string,"description": string | null,"id": number,"ref_id": string | null,"ref_type": string | null,"type": Database["public"]['Enums']["coin_tx_type"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"balance_after": number,"created_at"?: string,"description"?: string | null,"id"?: never,"ref_id"?: string | null,"ref_type"?: string | null,"type": Database["public"]['Enums']["coin_tx_type"],"user_id": string
                  }
                  Update: {
                    "amount"?: number,"balance_after"?: number,"created_at"?: string,"description"?: string | null,"id"?: never,"ref_id"?: string | null,"ref_type"?: string | null,"type"?: Database["public"]['Enums']["coin_tx_type"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "coin_transactions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "coin_transactions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"market_listings": {
                  Row: {
                    "buyer_id": string | null,"closed_at": string | null,"created_at": string,"id": string,"instance_id": string,"price": number,"seller_id": string,"status": Database["public"]['Enums']["listing_status"],"template_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "buyer_id"?: string | null,"closed_at"?: string | null,"created_at"?: string,"id"?: string,"instance_id": string,"price": number,"seller_id": string,"status"?: Database["public"]['Enums']["listing_status"],"template_id": number
                  }
                  Update: {
                    "buyer_id"?: string | null,"closed_at"?: string | null,"created_at"?: string,"id"?: string,"instance_id"?: string,"price"?: number,"seller_id"?: string,"status"?: Database["public"]['Enums']["listing_status"],"template_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "market_listings_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "market_listings_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "market_listings_instance_id_fkey"
      columns: ["instance_id"]
isOneToOne: false
      referencedRelation: "card_instances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "market_listings_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "market_listings_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "market_listings_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "card_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"market_sales": {
                  Row: {
                    "buyer_id": string | null,"created_at": string,"fee": number,"id": number,"listing_id": string,"price": number,"seller_id": string | null,"template_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "buyer_id"?: string | null,"created_at"?: string,"fee"?: number,"id"?: never,"listing_id": string,"price": number,"seller_id"?: string | null,"template_id": number
                  }
                  Update: {
                    "buyer_id"?: string | null,"created_at"?: string,"fee"?: number,"id"?: never,"listing_id"?: string,"price"?: number,"seller_id"?: string | null,"template_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "market_sales_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "market_sales_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "market_sales_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "market_listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "market_sales_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "market_sales_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "market_sales_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "card_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"market_searches": {
                  Row: {
                    "created_at": string,"id": number,"query": string | null,"template_id": number | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"query"?: string | null,"template_id"?: number | null,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"query"?: string | null,"template_id"?: number | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "market_searches_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "card_templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "market_searches_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "market_searches_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"nations": {
                  Row: {
                    "code": string,"flag_colors": (string)[],"flag_layout": string,"id": number,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"flag_colors": (string)[],"flag_layout"?: string,"id"?: never,"name": string
                  }
                  Update: {
                    "code"?: string,"flag_colors"?: (string)[],"flag_layout"?: string,"id"?: never,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"id": number,"is_read": boolean,"link": string | null,"title": string,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: never,"is_read"?: boolean,"link"?: string | null,"title": string,"type": string,"user_id": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: never,"is_read"?: boolean,"link"?: string | null,"title"?: string,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"player_clubs": {
                  Row: {
                    "club_id": number,"end_year": number | null,"player_id": number,"start_year": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "club_id": number,"end_year"?: number | null,"player_id": number,"start_year"?: number | null
                  }
                  Update: {
                    "club_id"?: number,"end_year"?: number | null,"player_id"?: number,"start_year"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "player_clubs_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "player_clubs_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"players": {
                  Row: {
                    "bio": string | null,"birth_year": number | null,"display_name": string,"first_name": string | null,"id": number,"image_url": string | null,"is_legend": boolean,"last_name": string,"nation_id": number,"position": Database["public"]['Enums']["player_position"],"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bio"?: string | null,"birth_year"?: number | null,"display_name": string,"first_name"?: string | null,"id"?: never,"image_url"?: string | null,"is_legend"?: boolean,"last_name": string,"nation_id": number,"position": Database["public"]['Enums']["player_position"],"slug": string
                  }
                  Update: {
                    "bio"?: string | null,"birth_year"?: number | null,"display_name"?: string,"first_name"?: string | null,"id"?: never,"image_url"?: string | null,"is_legend"?: boolean,"last_name"?: string,"nation_id"?: number,"position"?: Database["public"]['Enums']["player_position"],"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "players_nation_id_fkey"
      columns: ["nation_id"]
isOneToOne: false
      referencedRelation: "nations"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_showcase": {
                  Row: {
                    "instance_id": string,"slot": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "instance_id": string,"slot": number,"user_id": string
                  }
                  Update: {
                    "instance_id"?: string,"slot"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_showcase_instance_id_fkey"
      columns: ["instance_id"]
isOneToOne: false
      referencedRelation: "card_instances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_showcase_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "profile_showcase_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"coins": number,"created_at": string,"hide_activity": boolean,"id": string,"is_admin": boolean,"is_demo": boolean,"last_daily_bonus_at": string | null,"last_free_booster_at": string | null,"reduced_motion": boolean,"sound_enabled": boolean,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"coins"?: number,"created_at"?: string,"hide_activity"?: boolean,"id": string,"is_admin"?: boolean,"is_demo"?: boolean,"last_daily_bonus_at"?: string | null,"last_free_booster_at"?: string | null,"reduced_motion"?: boolean,"sound_enabled"?: boolean,"username": string
                  }
                  Update: {
                    "avatar_url"?: string | null,"coins"?: number,"created_at"?: string,"hide_activity"?: boolean,"id"?: string,"is_admin"?: boolean,"is_demo"?: boolean,"last_daily_bonus_at"?: string | null,"last_free_booster_at"?: string | null,"reduced_motion"?: boolean,"sound_enabled"?: boolean,"username"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"id": number,"reason": string,"reported_id": string,"reporter_id": string,"resolved_at": string | null,"status": Database["public"]['Enums']["report_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"reason": string,"reported_id": string,"reporter_id": string,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"reason"?: string,"reported_id"?: string,"reporter_id"?: string,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reported_id_fkey"
      columns: ["reported_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "reports_reported_id_fkey"
      columns: ["reported_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"trade_items": {
                  Row: {
                    "from_user_id": string,"instance_id": string,"trade_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "from_user_id": string,"instance_id": string,"trade_id": string
                  }
                  Update: {
                    "from_user_id"?: string,"instance_id"?: string,"trade_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trade_items_from_user_id_fkey"
      columns: ["from_user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "trade_items_from_user_id_fkey"
      columns: ["from_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trade_items_instance_id_fkey"
      columns: ["instance_id"]
isOneToOne: false
      referencedRelation: "card_instances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trade_items_trade_id_fkey"
      columns: ["trade_id"]
isOneToOne: false
      referencedRelation: "trades"
      referencedColumns: ["id"]
    }
                  ]
                },"trades": {
                  Row: {
                    "created_at": string,"expires_at": string,"id": string,"message": string | null,"parent_trade_id": string | null,"proposer_coins": number,"proposer_id": string,"recipient_coins": number,"recipient_id": string,"resolved_at": string | null,"status": Database["public"]['Enums']["trade_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"message"?: string | null,"parent_trade_id"?: string | null,"proposer_coins"?: number,"proposer_id": string,"recipient_coins"?: number,"recipient_id": string,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["trade_status"]
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"message"?: string | null,"parent_trade_id"?: string | null,"proposer_coins"?: number,"proposer_id"?: string,"recipient_coins"?: number,"recipient_id"?: string,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["trade_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "trades_parent_trade_id_fkey"
      columns: ["parent_trade_id"]
isOneToOne: false
      referencedRelation: "trades"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trades_proposer_id_fkey"
      columns: ["proposer_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "trades_proposer_id_fkey"
      columns: ["proposer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trades_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "trades_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"wishlists": {
                  Row: {
                    "created_at": string,"template_id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"template_id": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"template_id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wishlists_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "card_templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wishlists_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "wishlists_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "coin_balance_audit": {
                  Row: {
                    "coins": number,"is_consistent": boolean | null,"journal_total": number | null,"user_id": string,"username": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "_apply_coins":
{ Args: { "p_amount": number,"p_description"?: string,"p_ref_id"?: string,"p_ref_type"?: string,"p_type": Database["public"]['Enums']["coin_tx_type"],"p_user": string }; Returns: number
                           },
"_mint_card":
{ Args: { "p_owner": string,"p_template": number,"p_via"?: string }; Returns: string
                           },
"_pick_template":
{ Args: { "p_booster": number,"p_floor_rank"?: number,"p_rarity": Database["public"]['Enums']["rarity"] }; Returns: number
                           },
"_roll_rarity":
{ Args: { "p_booster": number,"p_min_rank"?: number }; Returns: Database["public"]['Enums']["rarity"]
                           },
"booster_availability":
{ Args: { "p_booster": number }; Returns: Json
                           },
"get_setting":
{ Args: { "p_key": string }; Returns: Json
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"open_booster":
{ Args: { "p_booster_id": number }; Returns: Json
                           },
"rarity_rank":
{ Args: { "r": Database["public"]['Enums']["rarity"] }; Returns: number
                           },
"sell_duplicates":
{ Args: { "p_instance_ids": (string)[] }; Returns: Json
                           },
"update_username":
{ Args: { "p_username": string }; Returns: undefined
                           },
"username_problem":
{ Args: { "p_username": string }; Returns: string
                           }
          }
          Enums: {
            "activity_type": "rare_pull"|"album_completed"|"big_sale"|"leaderboard_top10","album_kind": "competition"|"club"|"nation"|"season"|"legends","booster_kind": "free"|"standard"|"premium"|"event"|"limited","coin_tx_type": "starting_balance"|"daily_bonus"|"booster_purchase"|"duplicate_sale"|"market_sale"|"market_purchase"|"album_reward"|"trade_sent"|"trade_received"|"admin_adjustment","listing_status": "active"|"sold"|"cancelled","player_position": "GB"|"DEF"|"MIL"|"ATT","rarity": "commune"|"rare"|"epique"|"legendaire"|"iconique"|"speciale","report_status": "open"|"resolved"|"dismissed","trade_status": "pending"|"accepted"|"declined"|"cancelled"|"expired"|"countered"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "activity_type": ["rare_pull", "album_completed", "big_sale", "leaderboard_top10"],"album_kind": ["competition", "club", "nation", "season", "legends"],"booster_kind": ["free", "standard", "premium", "event", "limited"],"coin_tx_type": ["starting_balance", "daily_bonus", "booster_purchase", "duplicate_sale", "market_sale", "market_purchase", "album_reward", "trade_sent", "trade_received", "admin_adjustment"],"listing_status": ["active", "sold", "cancelled"],"player_position": ["GB", "DEF", "MIL", "ATT"],"rarity": ["commune", "rare", "epique", "legendaire", "iconique", "speciale"],"report_status": ["open", "resolved", "dismissed"],"trade_status": ["pending", "accepted", "declined", "cancelled", "expired", "countered"]
          }
        }
} as const
