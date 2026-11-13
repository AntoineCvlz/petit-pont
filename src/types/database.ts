
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
      foreignKeyName: "activity_feed_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "most_wanted_cards"
      referencedColumns: ["template_id"]
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
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "activity_feed_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"admin_actions": {
                  Row: {
                    "action": string,"admin_id": string | null,"created_at": string,"details": NonNullable<Json>,"id": number,"target_id": string | null,"target_username": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"admin_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: never,"target_id"?: string | null,"target_username"?: string | null
                  }
                  Update: {
                    "action"?: string,"admin_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: never,"target_id"?: string | null,"target_username"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_actions_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "admin_actions_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "admin_actions_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "admin_actions_target_id_fkey"
      columns: ["target_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "admin_actions_target_id_fkey"
      columns: ["target_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "admin_actions_target_id_fkey"
      columns: ["target_id"]
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
      referencedRelation: "leaderboard_stats"
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
    },{
      foreignKeyName: "album_slots_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "most_wanted_cards"
      referencedColumns: ["template_id"]
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
      referencedRelation: "leaderboard_stats"
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
      referencedRelation: "leaderboard_stats"
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
    },{
      foreignKeyName: "booster_cards_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "most_wanted_cards"
      referencedColumns: ["template_id"]
    }
                  ]
                },"booster_grants": {
                  Row: {
                    "booster_id": number,"created_at": string,"granted_by": string | null,"id": string,"opened_at": string | null,"opening_id": string | null,"reason": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booster_id": number,"created_at"?: string,"granted_by"?: string | null,"id"?: string,"opened_at"?: string | null,"opening_id"?: string | null,"reason"?: string | null,"user_id": string
                  }
                  Update: {
                    "booster_id"?: number,"created_at"?: string,"granted_by"?: string | null,"id"?: string,"opened_at"?: string | null,"opening_id"?: string | null,"reason"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "booster_grants_booster_id_fkey"
      columns: ["booster_id"]
isOneToOne: false
      referencedRelation: "boosters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booster_grants_granted_by_fkey"
      columns: ["granted_by"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "booster_grants_granted_by_fkey"
      columns: ["granted_by"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "booster_grants_granted_by_fkey"
      columns: ["granted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booster_grants_opening_id_fkey"
      columns: ["opening_id"]
isOneToOne: false
      referencedRelation: "booster_openings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booster_grants_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "booster_grants_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "booster_grants_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
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
                    "booster_id": number,"created_at": string,"grant_id": string | null,"id": string,"instance_ids": (string)[],"price_paid": number,"template_ids": (number)[],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booster_id": number,"created_at"?: string,"grant_id"?: string | null,"id"?: string,"instance_ids"?: (string)[],"price_paid"?: number,"template_ids"?: (number)[],"user_id": string
                  }
                  Update: {
                    "booster_id"?: number,"created_at"?: string,"grant_id"?: string | null,"id"?: string,"instance_ids"?: (string)[],"price_paid"?: number,"template_ids"?: (number)[],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "booster_openings_booster_id_fkey"
      columns: ["booster_id"]
isOneToOne: false
      referencedRelation: "boosters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booster_openings_grant_fk"
      columns: ["grant_id"]
isOneToOne: false
      referencedRelation: "booster_grants"
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
      referencedRelation: "leaderboard_stats"
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
      referencedRelation: "leaderboard_stats"
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
      referencedRelation: "leaderboard_stats"
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
      referencedRelation: "leaderboard_stats"
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
    },{
      foreignKeyName: "card_instances_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "most_wanted_cards"
      referencedColumns: ["template_id"]
    }
                  ]
                },"card_templates": {
                  Row: {
                    "club_id": number | null,"collection_number": number | null,"created_at": string,"edition": string,"id": number,"image_url": string | null,"is_active": boolean,"max_supply": number | null,"minted_count": number,"player_id": number,"rarity": Database["public"]['Enums']["rarity"],"rating": number,"season": string
                  }
                  ComputedFields: never
                  Insert: {
                    "club_id"?: number | null,"collection_number"?: number | null,"created_at"?: string,"edition": string,"id"?: never,"image_url"?: string | null,"is_active"?: boolean,"max_supply"?: number | null,"minted_count"?: number,"player_id": number,"rarity": Database["public"]['Enums']["rarity"],"rating": number,"season": string
                  }
                  Update: {
                    "club_id"?: number | null,"collection_number"?: number | null,"created_at"?: string,"edition"?: string,"id"?: never,"image_url"?: string | null,"is_active"?: boolean,"max_supply"?: number | null,"minted_count"?: number,"player_id"?: number,"rarity"?: Database["public"]['Enums']["rarity"],"rating"?: number,"season"?: string
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
                    "city": string | null,"code": string,"color_primary": string,"color_secondary": string,"crest_url": string | null,"id": number,"league_id": number | null,"name": string,"nation_id": number | null,"short_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string | null,"code": string,"color_primary"?: string,"color_secondary"?: string,"crest_url"?: string | null,"id"?: never,"league_id"?: number | null,"name": string,"nation_id"?: number | null,"short_name": string
                  }
                  Update: {
                    "city"?: string | null,"code"?: string,"color_primary"?: string,"color_secondary"?: string,"crest_url"?: string | null,"id"?: never,"league_id"?: number | null,"name"?: string,"nation_id"?: number | null,"short_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clubs_league_id_fkey"
      columns: ["league_id"]
isOneToOne: false
      referencedRelation: "leagues"
      referencedColumns: ["id"]
    },{
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
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "coin_transactions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"draft_formations": {
                  Row: {
                    "code": string,"links": NonNullable<Json>,"name": string,"slots": NonNullable<Json>,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"links": NonNullable<Json>,"name": string,"slots": NonNullable<Json>,"sort_order"?: number
                  }
                  Update: {
                    "code"?: string,"links"?: NonNullable<Json>,"name"?: string,"slots"?: NonNullable<Json>,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"draft_picks": {
                  Row: {
                    "draft_id": string,"slot_index": number,"slot_key": string,"template_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "draft_id": string,"slot_index": number,"slot_key": string,"template_id": number
                  }
                  Update: {
                    "draft_id"?: string,"slot_index"?: number,"slot_key"?: string,"template_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "draft_picks_draft_id_fkey"
      columns: ["draft_id"]
isOneToOne: false
      referencedRelation: "drafts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "draft_picks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "card_templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "draft_picks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "most_wanted_cards"
      referencedColumns: ["template_id"]
    }
                  ]
                },"drafts": {
                  Row: {
                    "chemistry": number | null,"completed_at": string | null,"created_at": string,"current_slot": number,"formation": string,"id": string,"offer": (number)[],"rating": number | null,"score": number | null,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chemistry"?: number | null,"completed_at"?: string | null,"created_at"?: string,"current_slot"?: number,"formation": string,"id"?: string,"offer"?: (number)[],"rating"?: number | null,"score"?: number | null,"status"?: string,"user_id": string
                  }
                  Update: {
                    "chemistry"?: number | null,"completed_at"?: string | null,"created_at"?: string,"current_slot"?: number,"formation"?: string,"id"?: string,"offer"?: (number)[],"rating"?: number | null,"score"?: number | null,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "drafts_formation_fkey"
      columns: ["formation"]
isOneToOne: false
      referencedRelation: "draft_formations"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "drafts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "drafts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "drafts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"leaderboard_top10": {
                  Row: {
                    "metric": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "metric": string,"user_id": string
                  }
                  Update: {
                    "metric"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "leaderboard_top10_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "leaderboard_top10_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "leaderboard_top10_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"leagues": {
                  Row: {
                    "code": string,"id": number,"name": string,"nation_id": number | null,"short_name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"id"?: never,"name": string,"nation_id"?: number | null,"short_name": string,"sort_order"?: number
                  }
                  Update: {
                    "code"?: string,"id"?: never,"name"?: string,"nation_id"?: number | null,"short_name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "leagues_nation_id_fkey"
      columns: ["nation_id"]
isOneToOne: false
      referencedRelation: "nations"
      referencedColumns: ["id"]
    }
                  ]
                },"market_listings": {
                  Row: {
                    "buyer_id": string | null,"closed_at": string | null,"created_at": string,"id": string,"instance_id": string | null,"price": number,"seller_id": string,"status": Database["public"]['Enums']["listing_status"],"template_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "buyer_id"?: string | null,"closed_at"?: string | null,"created_at"?: string,"id"?: string,"instance_id"?: string | null,"price": number,"seller_id": string,"status"?: Database["public"]['Enums']["listing_status"],"template_id": number
                  }
                  Update: {
                    "buyer_id"?: string | null,"closed_at"?: string | null,"created_at"?: string,"id"?: string,"instance_id"?: string | null,"price"?: number,"seller_id"?: string,"status"?: Database["public"]['Enums']["listing_status"],"template_id"?: number
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
      referencedRelation: "leaderboard_stats"
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
      referencedRelation: "leaderboard_stats"
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
    },{
      foreignKeyName: "market_listings_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "most_wanted_cards"
      referencedColumns: ["template_id"]
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
      referencedRelation: "leaderboard_stats"
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
      referencedRelation: "leaderboard_stats"
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
    },{
      foreignKeyName: "market_sales_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "most_wanted_cards"
      referencedColumns: ["template_id"]
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
      foreignKeyName: "market_searches_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "most_wanted_cards"
      referencedColumns: ["template_id"]
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
      referencedRelation: "leaderboard_stats"
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
      referencedRelation: "leaderboard_stats"
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
                    "bio": string | null,"birth_year": number | null,"display_name": string,"first_name": string | null,"id": number,"image_url": string | null,"is_legend": boolean,"last_name": string,"nation_id": number,"position": Database["public"]['Enums']["player_position"],"search_text": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bio"?: string | null,"birth_year"?: number | null,"display_name": string,"first_name"?: string | null,"id"?: never,"image_url"?: string | null,"is_legend"?: boolean,"last_name": string,"nation_id": number,"position": Database["public"]['Enums']["player_position"],"search_text"?: string,"slug": string
                  }
                  Update: {
                    "bio"?: string | null,"birth_year"?: number | null,"display_name"?: string,"first_name"?: string | null,"id"?: never,"image_url"?: string | null,"is_legend"?: boolean,"last_name"?: string,"nation_id"?: number,"position"?: Database["public"]['Enums']["player_position"],"search_text"?: string,"slug"?: string
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
      referencedRelation: "leaderboard_stats"
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
                    "avatar_url": string | null,"ban_reason": string | null,"banned_at": string | null,"coins": number,"created_at": string,"hide_activity": boolean,"id": string,"is_admin": boolean,"is_demo": boolean,"last_daily_bonus_at": string | null,"last_free_booster_at": string | null,"reduced_motion": boolean,"sound_enabled": boolean,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"ban_reason"?: string | null,"banned_at"?: string | null,"coins"?: number,"created_at"?: string,"hide_activity"?: boolean,"id": string,"is_admin"?: boolean,"is_demo"?: boolean,"last_daily_bonus_at"?: string | null,"last_free_booster_at"?: string | null,"reduced_motion"?: boolean,"sound_enabled"?: boolean,"username": string
                  }
                  Update: {
                    "avatar_url"?: string | null,"ban_reason"?: string | null,"banned_at"?: string | null,"coins"?: number,"created_at"?: string,"hide_activity"?: boolean,"id"?: string,"is_admin"?: boolean,"is_demo"?: boolean,"last_daily_bonus_at"?: string | null,"last_free_booster_at"?: string | null,"reduced_motion"?: boolean,"sound_enabled"?: boolean,"username"?: string
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
      referencedRelation: "leaderboard_stats"
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
      referencedRelation: "leaderboard_stats"
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
      referencedRelation: "leaderboard_stats"
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
      referencedRelation: "leaderboard_stats"
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
      referencedRelation: "leaderboard_stats"
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
      foreignKeyName: "wishlists_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "most_wanted_cards"
      referencedColumns: ["template_id"]
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
      referencedRelation: "leaderboard_stats"
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
                },"leaderboard_stats": {
                  Row: {
                    "albums": number | null,"boosters": number | null,"cards": number | null,"distinct_cards": number | null,"period": string | null,"progression": number | null,"rarity_score": number | null,"refreshed_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"market_price_stats": {
                  Row: {
                    "avg_price": number | null,"last_price": number | null,"max_price": number | null,"min_price": number | null,"sales": number | null,"template_id": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "market_sales_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "card_templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "market_sales_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "most_wanted_cards"
      referencedColumns: ["template_id"]
    }
                  ]
                },"most_wanted_cards": {
                  Row: {
                    "score": number | null,"searches": number | null,"template_id": number,"wishes": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "_admin_log":
{ Args: { "p_action": string,"p_details": Json,"p_target": string,"p_username": string }; Returns: undefined
                           },
"_admin_target":
{ Args: { "p_allow_admin_target"?: boolean,"p_user": string }; Returns: string
                           },
"_apply_coins":
{ Args: { "p_amount": number,"p_description"?: string,"p_ref_id"?: string,"p_ref_type"?: string,"p_type": Database["public"]['Enums']["coin_tx_type"],"p_user": string }; Returns: number
                           },
"_clean_reason":
{ Args: { "p_reason": string }; Returns: string
                           },
"_club_league_code":
{ Args: { "p_club_code": string }; Returns: string
                           },
"_discord_avatar":
{ Args: { "p_url": string }; Returns: string
                           },
"_draft_chemistry":
{ Args: { "p_draft_id": string }; Returns: number
                           },
"_draft_link":
{ Args: { "p_a": number,"p_b": number }; Returns: number
                           },
"_draft_offer":
{ Args: { "p_draft_id": string,"p_position": Database["public"]['Enums']["player_position"] }; Returns: (number)[]
                           },
"_draft_state":
{ Args: { "p_draft_id": string }; Returns: Json
                           },
"_draw_booster":
{ Args: { "p_booster_id": number,"p_grant_id"?: string,"p_price": number,"p_uid": string }; Returns: Json
                           },
"_game_timezone":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"_leaderboard_metrics":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           },
"_mint_card":
{ Args: { "p_owner": string,"p_template": number,"p_via"?: string }; Returns: string
                           },
"_pick_template":
{ Args: { "p_booster": number,"p_floor_rank"?: number,"p_rarity": Database["public"]['Enums']["rarity"] }; Returns: number
                           },
"_release_instances":
{ Args: { "p_instance_ids": (string)[] }; Returns: undefined
                           },
"_roll_rarity":
{ Args: { "p_booster": number,"p_min_rank"?: number }; Returns: Database["public"]['Enums']["rarity"]
                           },
"_username_from":
{ Args: { "p_candidates": (string)[] }; Returns: string
                           },
"abandon_draft":
{ Args: { "p_draft_id": string }; Returns: undefined
                           },
"accept_trade":
{ Args: { "p_trade_id": string }; Returns: undefined
                           },
"admin_adjust_coins":
{ Args: { "p_amount": number,"p_reason"?: string,"p_user": string }; Returns: number
                           },
"admin_economy_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_give_boosters":
{ Args: { "p_booster_id": number,"p_count": number,"p_reason"?: string,"p_user": string }; Returns: number
                           },
"admin_give_cards":
{ Args: { "p_count": number,"p_reason"?: string,"p_template_id": number,"p_user": string }; Returns: number
                           },
"admin_purge_demo_accounts":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"admin_remove_cards":
{ Args: { "p_instance_ids": (string)[],"p_reason"?: string }; Returns: number
                           },
"admin_reset_account":
{ Args: { "p_reason"?: string,"p_user": string }; Returns: Json
                           },
"admin_resolve_report":
{ Args: { "p_report_id": number,"p_status": Database["public"]['Enums']["report_status"] }; Returns: undefined
                           },
"admin_set_album_slots":
{ Args: { "p_album_id": number,"p_collection_numbers": (number)[] }; Returns: number
                           },
"admin_set_ban":
{ Args: { "p_banned": boolean,"p_reason"?: string,"p_user": string }; Returns: undefined
                           },
"admin_set_booster_odds":
{ Args: { "p_booster_id": number,"p_odds": Json }; Returns: undefined
                           },
"album_progress":
{ Args: { "p_album": number,"p_user": string }; Returns: {
              "owned": number,"total": number
            }[]
                           },
"block_player":
{ Args: { "p_blocked": string }; Returns: undefined
                           },
"booster_availability":
{ Args: { "p_booster": number }; Returns: Json
                           },
"buy_listing":
{ Args: { "p_listing_id": string }; Returns: Json
                           },
"cancel_listing":
{ Args: { "p_listing_id": string }; Returns: undefined
                           },
"cancel_trade":
{ Args: { "p_trade_id": string }; Returns: undefined
                           },
"claim_album_reward":
{ Args: { "p_album_id": number }; Returns: Json
                           },
"claim_daily_bonus":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"create_listing":
{ Args: { "p_instance_id": string,"p_price": number }; Returns: string
                           },
"daily_bonus_status":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"decline_trade":
{ Args: { "p_trade_id": string }; Returns: undefined
                           },
"draft_leaderboard":
{ Args: { "p_limit"?: number }; Returns: {
              "avatar_url": string,"chemistry": number,"completed_at": string,"draft_id": string,"formation": string,"is_me": boolean,"rank": number,"rating": number,"score": number,"user_id": string,"username": string
            }[]
                           },
"draft_pick":
{ Args: { "p_choice": number,"p_draft_id": string }; Returns: Json
                           },
"draft_status":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"expire_trades":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"get_leaderboard":
{ Args: { "p_limit"?: number,"p_metric": string,"p_period"?: string }; Returns: {
              "is_me": boolean,"rank": number,"user_id": string,"username": string,"value": number
            }[]
                           },
"get_setting":
{ Args: { "p_key": string }; Returns: Json
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"mark_all_notifications_read":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"my_coin_totals":
{ Args: Record<PropertyKey, never>; Returns: {
              "earned": number,"spent": number
            }[]
                           },
"open_booster":
{ Args: { "p_booster_id": number }; Returns: Json
                           },
"open_granted_booster":
{ Args: { "p_grant_id": string }; Returns: Json
                           },
"propose_trade":
{ Args: { "p_message"?: string,"p_offered"?: (string)[],"p_parent"?: string,"p_proposer_coins"?: number,"p_recipient": string,"p_recipient_coins"?: number,"p_requested"?: (string)[] }; Returns: string
                           },
"rarity_rank":
{ Args: { "r": Database["public"]['Enums']["rarity"] }; Returns: number
                           },
"record_market_search":
{ Args: { "p_query"?: string,"p_template_id"?: number }; Returns: undefined
                           },
"refresh_leaderboards":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"report_player":
{ Args: { "p_reason": string,"p_reported": string }; Returns: undefined
                           },
"sell_all_duplicates":
{ Args: { "p_max_rarity"?: Database["public"]['Enums']["rarity"] }; Returns: Json
                           },
"sell_duplicates":
{ Args: { "p_instance_ids": (string)[] }; Returns: Json
                           },
"set_showcase":
{ Args: { "p_instance_ids": (string)[] }; Returns: undefined
                           },
"start_draft":
{ Args: { "p_formation": string }; Returns: Json
                           },
"unblock_player":
{ Args: { "p_blocked": string }; Returns: undefined
                           },
"update_username":
{ Args: { "p_username": string }; Returns: undefined
                           },
"username_problem":
{ Args: { "p_username": string }; Returns: string
                           },
"wishlist_matches":
{ Args: { "p_limit"?: number }; Returns: {
              "matches": number,"template_ids": (number)[],"user_id": string,"username": string
            }[]
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
