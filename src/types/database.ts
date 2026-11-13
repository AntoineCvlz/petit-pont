
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
                },"clan_contributions": {
                  Row: {
                    "amount": number,"clan_id": string,"user_id": string,"week_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number,"clan_id": string,"user_id": string,"week_start": string
                  }
                  Update: {
                    "amount"?: number,"clan_id"?: string,"user_id"?: string,"week_start"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clan_contributions_clan_id_fkey"
      columns: ["clan_id"]
isOneToOne: false
      referencedRelation: "clans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clan_contributions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "clan_contributions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "clan_contributions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"clan_goals": {
                  Row: {
                    "clan_id": string,"completed_at": string | null,"event": string,"progress": number,"target": number,"title": string,"week_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "clan_id": string,"completed_at"?: string | null,"event": string,"progress"?: number,"target": number,"title": string,"week_start": string
                  }
                  Update: {
                    "clan_id"?: string,"completed_at"?: string | null,"event"?: string,"progress"?: number,"target"?: number,"title"?: string,"week_start"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clan_goals_clan_id_fkey"
      columns: ["clan_id"]
isOneToOne: false
      referencedRelation: "clans"
      referencedColumns: ["id"]
    }
                  ]
                },"clan_members": {
                  Row: {
                    "clan_id": string,"joined_at": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "clan_id": string,"joined_at"?: string,"role"?: string,"user_id": string
                  }
                  Update: {
                    "clan_id"?: string,"joined_at"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clan_members_clan_id_fkey"
      columns: ["clan_id"]
isOneToOne: false
      referencedRelation: "clans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clan_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "clan_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "clan_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"clan_messages": {
                  Row: {
                    "body": string,"clan_id": string,"created_at": string,"id": number,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"clan_id": string,"created_at"?: string,"id"?: never,"user_id"?: string | null
                  }
                  Update: {
                    "body"?: string,"clan_id"?: string,"created_at"?: string,"id"?: never,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clan_messages_clan_id_fkey"
      columns: ["clan_id"]
isOneToOne: false
      referencedRelation: "clans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clan_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "clan_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "clan_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"clans": {
                  Row: {
                    "created_at": string,"description": string | null,"goals_completed": number,"id": string,"invite_code": string,"is_open": boolean,"name": string,"owner_id": string,"tag": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"goals_completed"?: number,"id"?: string,"invite_code"?: string,"is_open"?: boolean,"name": string,"owner_id": string,"tag": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"goals_completed"?: number,"id"?: string,"invite_code"?: string,"is_open"?: boolean,"name"?: string,"owner_id"?: string,"tag"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clans_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "clans_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "clans_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
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
                },"duels": {
                  Row: {
                    "away_elo_delta": number | null,"away_goals": (number)[] | null,"away_id": string,"away_strength": number | null,"away_tactics": (string)[] | null,"created_at": string,"deadline": string,"home_elo_delta": number | null,"home_goals": (number)[] | null,"home_id": string,"home_strength": number | null,"home_tactics": (string)[] | null,"id": string,"kind": string,"league_id": string | null,"played_at": string | null,"round": number | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "away_elo_delta"?: number | null,"away_goals"?: (number)[] | null,"away_id": string,"away_strength"?: number | null,"away_tactics"?: (string)[] | null,"created_at"?: string,"deadline": string,"home_elo_delta"?: number | null,"home_goals"?: (number)[] | null,"home_id": string,"home_strength"?: number | null,"home_tactics"?: (string)[] | null,"id"?: string,"kind": string,"league_id"?: string | null,"played_at"?: string | null,"round"?: number | null,"status"?: string
                  }
                  Update: {
                    "away_elo_delta"?: number | null,"away_goals"?: (number)[] | null,"away_id"?: string,"away_strength"?: number | null,"away_tactics"?: (string)[] | null,"created_at"?: string,"deadline"?: string,"home_elo_delta"?: number | null,"home_goals"?: (number)[] | null,"home_id"?: string,"home_strength"?: number | null,"home_tactics"?: (string)[] | null,"id"?: string,"kind"?: string,"league_id"?: string | null,"played_at"?: string | null,"round"?: number | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "duels_away_id_fkey"
      columns: ["away_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "duels_away_id_fkey"
      columns: ["away_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "duels_away_id_fkey"
      columns: ["away_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "duels_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "duels_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "duels_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "duels_league_id_fkey"
      columns: ["league_id"]
isOneToOne: false
      referencedRelation: "private_leagues"
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
                },"mission_progress": {
                  Row: {
                    "claimed_at": string | null,"mission_id": number,"period_start": string,"progress": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "claimed_at"?: string | null,"mission_id": number,"period_start": string,"progress"?: number,"user_id": string
                  }
                  Update: {
                    "claimed_at"?: string | null,"mission_id"?: number,"period_start"?: string,"progress"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mission_progress_mission_id_fkey"
      columns: ["mission_id"]
isOneToOne: false
      referencedRelation: "missions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mission_progress_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "mission_progress_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "mission_progress_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"missions": {
                  Row: {
                    "event": string,"id": number,"is_active": boolean,"link": string | null,"period": string,"slug": string,"sort_order": number,"target": number,"title": string,"tokens": number
                  }
                  ComputedFields: never
                  Insert: {
                    "event": string,"id"?: never,"is_active"?: boolean,"link"?: string | null,"period": string,"slug": string,"sort_order"?: number,"target": number,"title": string,"tokens": number
                  }
                  Update: {
                    "event"?: string,"id"?: never,"is_active"?: boolean,"link"?: string | null,"period"?: string,"slug"?: string,"sort_order"?: number,"target"?: number,"title"?: string,"tokens"?: number
                  }
                  Relationships: [
                    
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
                },"penalty_kicks": {
                  Row: {
                    "direction": string,"dive": string,"match_id": string,"n": number,"result": string,"shooter": number,"side": string
                  }
                  ComputedFields: never
                  Insert: {
                    "direction": string,"dive": string,"match_id": string,"n": number,"result": string,"shooter": number,"side": string
                  }
                  Update: {
                    "direction"?: string,"dive"?: string,"match_id"?: string,"n"?: number,"result"?: string,"shooter"?: number,"side"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "penalty_kicks_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "penalty_matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "penalty_kicks_shooter_fkey"
      columns: ["shooter"]
isOneToOne: false
      referencedRelation: "card_templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "penalty_kicks_shooter_fkey"
      columns: ["shooter"]
isOneToOne: false
      referencedRelation: "most_wanted_cards"
      referencedColumns: ["template_id"]
    }
                  ]
                },"penalty_matches": {
                  Row: {
                    "id": string,"opp_keeper": number,"opp_keeper_rating": number,"opp_score": number,"opp_shooter_ratings": (number)[],"opp_shooters": (number)[],"opponent_club_id": number | null,"player_score": number,"round": number,"status": string,"tournament_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"opp_keeper": number,"opp_keeper_rating": number,"opp_score"?: number,"opp_shooter_ratings": (number)[],"opp_shooters": (number)[],"opponent_club_id"?: number | null,"player_score"?: number,"round": number,"status"?: string,"tournament_id": string
                  }
                  Update: {
                    "id"?: string,"opp_keeper"?: number,"opp_keeper_rating"?: number,"opp_score"?: number,"opp_shooter_ratings"?: (number)[],"opp_shooters"?: (number)[],"opponent_club_id"?: number | null,"player_score"?: number,"round"?: number,"status"?: string,"tournament_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "penalty_matches_opp_keeper_fkey"
      columns: ["opp_keeper"]
isOneToOne: false
      referencedRelation: "card_templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "penalty_matches_opp_keeper_fkey"
      columns: ["opp_keeper"]
isOneToOne: false
      referencedRelation: "most_wanted_cards"
      referencedColumns: ["template_id"]
    },{
      foreignKeyName: "penalty_matches_opponent_club_id_fkey"
      columns: ["opponent_club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "penalty_matches_tournament_id_fkey"
      columns: ["tournament_id"]
isOneToOne: false
      referencedRelation: "penalty_tournaments"
      referencedColumns: ["id"]
    }
                  ]
                },"penalty_tournaments": {
                  Row: {
                    "created_at": string,"finished_at": string | null,"id": string,"keeper": number,"keeper_rating": number,"reward": number,"round": number,"shooter_ratings": (number)[],"shooters": (number)[],"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"finished_at"?: string | null,"id"?: string,"keeper": number,"keeper_rating": number,"reward"?: number,"round"?: number,"shooter_ratings": (number)[],"shooters": (number)[],"status"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"finished_at"?: string | null,"id"?: string,"keeper"?: number,"keeper_rating"?: number,"reward"?: number,"round"?: number,"shooter_ratings"?: (number)[],"shooters"?: (number)[],"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "penalty_tournaments_keeper_fkey"
      columns: ["keeper"]
isOneToOne: false
      referencedRelation: "card_templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "penalty_tournaments_keeper_fkey"
      columns: ["keeper"]
isOneToOne: false
      referencedRelation: "most_wanted_cards"
      referencedColumns: ["template_id"]
    },{
      foreignKeyName: "penalty_tournaments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "penalty_tournaments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "penalty_tournaments_user_id_fkey"
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
                    "alt_positions": (string)[],"bio": string | null,"birth_year": number | null,"birthdate": string | null,"display_name": string,"ext_id": number | null,"first_name": string | null,"id": number,"image_url": string | null,"is_legend": boolean,"last_name": string,"nation_id": number,"position": Database["public"]['Enums']["player_position"],"position_detail": string | null,"preferred_foot": string | null,"search_text": string,"skill_moves": number | null,"slug": string,"stats": Json | null,"weak_foot": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_positions"?: (string)[],"bio"?: string | null,"birth_year"?: number | null,"birthdate"?: string | null,"display_name": string,"ext_id"?: number | null,"first_name"?: string | null,"id"?: never,"image_url"?: string | null,"is_legend"?: boolean,"last_name": string,"nation_id": number,"position": Database["public"]['Enums']["player_position"],"position_detail"?: string | null,"preferred_foot"?: string | null,"search_text"?: string,"skill_moves"?: number | null,"slug": string,"stats"?: Json | null,"weak_foot"?: number | null
                  }
                  Update: {
                    "alt_positions"?: (string)[],"bio"?: string | null,"birth_year"?: number | null,"birthdate"?: string | null,"display_name"?: string,"ext_id"?: number | null,"first_name"?: string | null,"id"?: never,"image_url"?: string | null,"is_legend"?: boolean,"last_name"?: string,"nation_id"?: number,"position"?: Database["public"]['Enums']["player_position"],"position_detail"?: string | null,"preferred_foot"?: string | null,"search_text"?: string,"skill_moves"?: number | null,"slug"?: string,"stats"?: Json | null,"weak_foot"?: number | null
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
                },"private_league_members": {
                  Row: {
                    "draws": number,"goals_against": number,"goals_for": number,"joined_at": string,"league_id": string,"losses": number,"played": number,"points": number,"user_id": string,"wins": number
                  }
                  ComputedFields: never
                  Insert: {
                    "draws"?: number,"goals_against"?: number,"goals_for"?: number,"joined_at"?: string,"league_id": string,"losses"?: number,"played"?: number,"points"?: number,"user_id": string,"wins"?: number
                  }
                  Update: {
                    "draws"?: number,"goals_against"?: number,"goals_for"?: number,"joined_at"?: string,"league_id"?: string,"losses"?: number,"played"?: number,"points"?: number,"user_id"?: string,"wins"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "private_league_members_league_id_fkey"
      columns: ["league_id"]
isOneToOne: false
      referencedRelation: "private_leagues"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "private_league_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "private_league_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "private_league_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"private_leagues": {
                  Row: {
                    "created_at": string,"finished_at": string | null,"id": string,"invite_code": string,"max_members": number,"name": string,"owner_id": string,"started_at": string | null,"status": string,"winner_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"finished_at"?: string | null,"id"?: string,"invite_code"?: string,"max_members"?: number,"name": string,"owner_id": string,"started_at"?: string | null,"status"?: string,"winner_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"finished_at"?: string | null,"id"?: string,"invite_code"?: string,"max_members"?: number,"name"?: string,"owner_id"?: string,"started_at"?: string | null,"status"?: string,"winner_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "private_leagues_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "private_leagues_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "private_leagues_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "private_leagues_winner_id_fkey"
      columns: ["winner_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "private_leagues_winner_id_fkey"
      columns: ["winner_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "private_leagues_winner_id_fkey"
      columns: ["winner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"private_settings": {
                  Row: {
                    "key": string,"updated_at": string,"value": string
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"value": string
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"value"?: string
                  }
                  Relationships: [
                    
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
                    "avatar_url": string | null,"ban_reason": string | null,"banned_at": string | null,"coins": number,"created_at": string,"elo": number,"hide_activity": boolean,"id": string,"is_admin": boolean,"is_demo": boolean,"last_daily_bonus_at": string | null,"last_free_booster_at": string | null,"reduced_motion": boolean,"sound_enabled": boolean,"tokens": number,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"ban_reason"?: string | null,"banned_at"?: string | null,"coins"?: number,"created_at"?: string,"elo"?: number,"hide_activity"?: boolean,"id": string,"is_admin"?: boolean,"is_demo"?: boolean,"last_daily_bonus_at"?: string | null,"last_free_booster_at"?: string | null,"reduced_motion"?: boolean,"sound_enabled"?: boolean,"tokens"?: number,"username": string
                  }
                  Update: {
                    "avatar_url"?: string | null,"ban_reason"?: string | null,"banned_at"?: string | null,"coins"?: number,"created_at"?: string,"elo"?: number,"hide_activity"?: boolean,"id"?: string,"is_admin"?: boolean,"is_demo"?: boolean,"last_daily_bonus_at"?: string | null,"last_free_booster_at"?: string | null,"reduced_motion"?: boolean,"sound_enabled"?: boolean,"tokens"?: number,"username"?: string
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
                },"sbc_challenges": {
                  Row: {
                    "description": string,"id": number,"is_active": boolean,"name": string,"repeat": string,"requirements": NonNullable<Json>,"reward_booster": string,"reward_count": number,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"id"?: never,"is_active"?: boolean,"name": string,"repeat"?: string,"requirements": NonNullable<Json>,"reward_booster": string,"reward_count"?: number,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "description"?: string,"id"?: never,"is_active"?: boolean,"name"?: string,"repeat"?: string,"requirements"?: NonNullable<Json>,"reward_booster"?: string,"reward_count"?: number,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"sbc_completions": {
                  Row: {
                    "cards_used": (number)[],"challenge_id": number,"completed_at": string,"id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cards_used": (number)[],"challenge_id": number,"completed_at"?: string,"id"?: never,"user_id": string
                  }
                  Update: {
                    "cards_used"?: (number)[],"challenge_id"?: number,"completed_at"?: string,"id"?: never,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sbc_completions_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: false
      referencedRelation: "sbc_challenges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sbc_completions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "sbc_completions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "sbc_completions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"season_fixtures": {
                  Row: {
                    "goals1": number | null,"goals2": number | null,"matchday": number,"opp_goals1": number | null,"opp_goals2": number | null,"opp_strength": number,"opp_tactic1": string | null,"opp_tactic2": string | null,"opponent_club_id": number | null,"played_at": string | null,"run_id": string,"started_at": string | null,"status": string,"tactic1": string | null,"tactic2": string | null,"team_strength": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "goals1"?: number | null,"goals2"?: number | null,"matchday": number,"opp_goals1"?: number | null,"opp_goals2"?: number | null,"opp_strength": number,"opp_tactic1"?: string | null,"opp_tactic2"?: string | null,"opponent_club_id"?: number | null,"played_at"?: string | null,"run_id": string,"started_at"?: string | null,"status"?: string,"tactic1"?: string | null,"tactic2"?: string | null,"team_strength"?: number | null
                  }
                  Update: {
                    "goals1"?: number | null,"goals2"?: number | null,"matchday"?: number,"opp_goals1"?: number | null,"opp_goals2"?: number | null,"opp_strength"?: number,"opp_tactic1"?: string | null,"opp_tactic2"?: string | null,"opponent_club_id"?: number | null,"played_at"?: string | null,"run_id"?: string,"started_at"?: string | null,"status"?: string,"tactic1"?: string | null,"tactic2"?: string | null,"team_strength"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "season_fixtures_opponent_club_id_fkey"
      columns: ["opponent_club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "season_fixtures_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "season_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"season_runs": {
                  Row: {
                    "created_at": string,"draws": number,"finished_at": string | null,"goals_against": number,"goals_for": number,"id": string,"losses": number,"matchday": number,"number": number,"points": number,"rewards_given": (number)[],"status": string,"tier": number,"user_id": string,"wins": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"draws"?: number,"finished_at"?: string | null,"goals_against"?: number,"goals_for"?: number,"id"?: string,"losses"?: number,"matchday"?: number,"number": number,"points"?: number,"rewards_given"?: (number)[],"status"?: string,"tier": number,"user_id": string,"wins"?: number
                  }
                  Update: {
                    "created_at"?: string,"draws"?: number,"finished_at"?: string | null,"goals_against"?: number,"goals_for"?: number,"id"?: string,"losses"?: number,"matchday"?: number,"number"?: number,"points"?: number,"rewards_given"?: (number)[],"status"?: string,"tier"?: number,"user_id"?: string,"wins"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "season_runs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "season_runs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "season_runs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"season_squads": {
                  Row: {
                    "formation": string,"slots": NonNullable<Json>,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "formation": string,"slots": NonNullable<Json>,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "formation"?: string,"slots"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "season_squads_formation_fkey"
      columns: ["formation"]
isOneToOne: false
      referencedRelation: "draft_formations"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "season_squads_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "season_squads_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "season_squads_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"token_purchases": {
                  Row: {
                    "booster": string,"cost": number,"created_at": string,"id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booster": string,"cost": number,"created_at"?: string,"id"?: never,"user_id": string
                  }
                  Update: {
                    "booster"?: string,"cost"?: number,"created_at"?: string,"id"?: never,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "token_purchases_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "coin_balance_audit"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "token_purchases_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "token_purchases_user_id_fkey"
      columns: ["user_id"]
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
"_clan_event":
{ Args: { "p_amount": number,"p_event": string,"p_user": string }; Returns: undefined
                           },
"_clan_goal":
{ Args: { "p_clan": string }; Returns: {
              "clan_id": string,
"completed_at": string | null,
"event": string,
"progress": number,
"target": number,
"title": string,
"week_start": string
            }
                          SetofOptions: {
        from: "*"
        to: "clan_goals"
        isOneToOne: true
        isSetofReturn: false
      } },
"_clean_reason":
{ Args: { "p_reason": string }; Returns: string
                           },
"_club_league_code":
{ Args: { "p_club_code": string }; Returns: string
                           },
"_discord_announce":
{ Args: { "p_color": number,"p_description": string,"p_thumbnail"?: string,"p_title": string }; Returns: undefined
                           },
"_discord_avatar":
{ Args: { "p_url": string }; Returns: string
                           },
"_discord_rarity_label":
{ Args: { "p_rarity": string }; Returns: string
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
"_duel_play":
{ Args: { "p_duel": string }; Returns: undefined
                           },
"_duel_strength":
{ Args: { "p_user": string }; Returns: number
                           },
"_formation_chemistry":
{ Args: { "p_formation": string,"p_picks": Json }; Returns: number
                           },
"_game_timezone":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"_grant_boosters":
{ Args: { "p_booster_slug": string,"p_count": number,"p_reason": string,"p_user": string }; Returns: undefined
                           },
"_is_league_member":
{ Args: { "p_league": string }; Returns: boolean
                           },
"_leaderboard_metrics":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           },
"_league_maybe_finish":
{ Args: { "p_league": string }; Returns: undefined
                           },
"_mint_card":
{ Args: { "p_owner": string,"p_template": number,"p_via"?: string }; Returns: string
                           },
"_mission_event":
{ Args: { "p_amount"?: number,"p_event": string,"p_user": string }; Returns: undefined
                           },
"_my_clan":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"_penalty_ai_direction":
{ Args: { "p_follow": boolean,"p_habit": string }; Returns: string
                           },
"_penalty_finish":
{ Args: { "p_round_reached": number,"p_status": string,"p_tournament": string }; Returns: undefined
                           },
"_penalty_new_match":
{ Args: { "p_round": number,"p_tournament": string }; Returns: string
                           },
"_penalty_opponent":
{ Args: { "p_round": number }; Returns: Json
                           },
"_penalty_outcome":
{ Args: { "p_direction": string,"p_dive": string,"p_keeper_rating": number,"p_shooter_rating": number }; Returns: string
                           },
"_penalty_state":
{ Args: { "p_tournament": string }; Returns: Json
                           },
"_penalty_winner":
{ Args: { "o_score": number,"o_taken": number,"p_score": number,"p_taken": number }; Returns: string
                           },
"_period_start":
{ Args: { "p_period": string }; Returns: string
                           },
"_pick_template":
{ Args: { "p_booster": number,"p_floor_rank"?: number,"p_rarity": Database["public"]['Enums']["rarity"] }; Returns: number
                           },
"_poisson":
{ Args: { "p_lambda": number }; Returns: number
                           },
"_random_tactics":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           },
"_release_instances":
{ Args: { "p_instance_ids": (string)[] }; Returns: undefined
                           },
"_roll_rarity":
{ Args: { "p_booster": number,"p_min_rank"?: number }; Returns: Database["public"]['Enums']["rarity"]
                           },
"_sbc_available":
{ Args: { "p_challenge": Omit<Database["public"]['Tables']["sbc_challenges"]['Row'], Database["public"]['Tables']["sbc_challenges"]['ComputedFields']>,"p_user": string }; Returns: boolean
                           },
"_sbc_check":
{ Args: { "p_requirements": Json,"p_templates": (number)[] }; Returns: string
                           },
"_season_ai_tactic":
{ Args: { "p_run": string }; Returns: string
                           },
"_season_half":
{ Args: { "p_opp": number,"p_opp_tactic": string,"p_tactic": string,"p_team": number }; Returns: (number)[]
                           },
"_season_next_tier":
{ Args: { "p_user": string }; Returns: number
                           },
"_season_state":
{ Args: { "p_user": string }; Returns: Json
                           },
"_season_team":
{ Args: { "p_user": string }; Returns: Json
                           },
"_username_from":
{ Args: { "p_candidates": (string)[] }; Returns: string
                           },
"_valid_tactics":
{ Args: { "p_tactics": (string)[] }; Returns: boolean
                           },
"abandon_draft":
{ Args: { "p_draft_id": string }; Returns: undefined
                           },
"abandon_penalty_tournament":
{ Args: { "p_tournament_id": string }; Returns: undefined
                           },
"abandon_season":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"accept_trade":
{ Args: { "p_trade_id": string }; Returns: undefined
                           },
"admin_adjust_coins":
{ Args: { "p_amount": number,"p_reason"?: string,"p_user": string }; Returns: number
                           },
"admin_discord_status":
{ Args: Record<PropertyKey, never>; Returns: Json
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
"admin_set_discord_webhook":
{ Args: { "p_site_url"?: string,"p_url": string }; Returns: undefined
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
"buy_with_tokens":
{ Args: { "p_booster": string }; Returns: number
                           },
"cancel_listing":
{ Args: { "p_listing_id": string }; Returns: undefined
                           },
"cancel_trade":
{ Args: { "p_trade_id": string }; Returns: undefined
                           },
"challenge_player":
{ Args: { "p_opponent": string,"p_tactics": (string)[] }; Returns: string
                           },
"claim_album_reward":
{ Args: { "p_album_id": number }; Returns: Json
                           },
"claim_daily_bonus":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"claim_mission":
{ Args: { "p_mission_id": number }; Returns: number
                           },
"clan_detail":
{ Args: { "p_clan": string }; Returns: Json
                           },
"clan_list":
{ Args: { "p_limit"?: number }; Returns: Json
                           },
"create_clan":
{ Args: { "p_description": string,"p_name": string,"p_open": boolean,"p_tag": string }; Returns: string
                           },
"create_league":
{ Args: { "p_name": string }; Returns: string
                           },
"create_listing":
{ Args: { "p_instance_id": string,"p_price": number }; Returns: string
                           },
"daily_bonus_status":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"decline_duel":
{ Args: { "p_duel": string }; Returns: undefined
                           },
"decline_trade":
{ Args: { "p_trade_id": string }; Returns: undefined
                           },
"delete_clan_message":
{ Args: { "p_message": number }; Returns: undefined
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
"duel_detail":
{ Args: { "p_duel": string }; Returns: Json
                           },
"elo_leaderboard":
{ Args: { "p_limit"?: number }; Returns: {
              "avatar_url": string,"elo": number,"is_me": boolean,"played": number,"rank": number,"user_id": string,"username": string
            }[]
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
"join_clan":
{ Args: { "p_clan": string,"p_code"?: string }; Returns: string
                           },
"join_league":
{ Args: { "p_code": string }; Returns: string
                           },
"kick_clan_member":
{ Args: { "p_user": string }; Returns: undefined
                           },
"league_detail":
{ Args: { "p_league": string }; Returns: Json
                           },
"leave_clan":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"leave_league":
{ Args: { "p_league": string }; Returns: undefined
                           },
"mark_all_notifications_read":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"missions_status":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"my_coin_totals":
{ Args: Record<PropertyKey, never>; Returns: {
              "earned": number,"spent": number
            }[]
                           },
"my_duels":
{ Args: { "p_limit"?: number }; Returns: Json
                           },
"my_leagues":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"open_booster":
{ Args: { "p_booster_id": number }; Returns: Json
                           },
"open_granted_booster":
{ Args: { "p_grant_id": string }; Returns: Json
                           },
"penalty_kick":
{ Args: { "p_direction": string,"p_tournament_id": string }; Returns: Json
                           },
"penalty_leaderboard":
{ Args: { "p_limit"?: number }; Returns: {
              "avatar_url": string,"finals": number,"is_me": boolean,"played": number,"rank": number,"user_id": string,"username": string,"wins": number
            }[]
                           },
"penalty_status":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"play_duel":
{ Args: { "p_duel": string,"p_tactics": (string)[] }; Returns: Json
                           },
"post_clan_message":
{ Args: { "p_body": string }; Returns: undefined
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
"resolve_due_duels":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"sbc_list":
{ Args: Record<PropertyKey, never>; Returns: {
              "available": boolean,"completions": number,"description": string,"id": number,"name": string,"repeat": string,"requirements": Json,"reward_booster": string,"reward_booster_name": string,"reward_count": number,"slug": string
            }[]
                           },
"season_play_half":
{ Args: { "p_tactic": string }; Returns: Json
                           },
"season_status":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"sell_all_duplicates":
{ Args: { "p_max_rarity"?: Database["public"]['Enums']["rarity"] }; Returns: Json
                           },
"sell_duplicates":
{ Args: { "p_instance_ids": (string)[] }; Returns: Json
                           },
"set_season_squad":
{ Args: { "p_formation": string,"p_slots": Json }; Returns: Json
                           },
"set_showcase":
{ Args: { "p_instance_ids": (string)[] }; Returns: undefined
                           },
"start_draft":
{ Args: { "p_formation": string }; Returns: Json
                           },
"start_league":
{ Args: { "p_league": string }; Returns: undefined
                           },
"start_penalty_tournament":
{ Args: { "p_keeper": string,"p_shooters": (string)[] }; Returns: Json
                           },
"start_season":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"submit_sbc":
{ Args: { "p_challenge_id": number,"p_instance_ids": (string)[] }; Returns: Json
                           },
"unblock_player":
{ Args: { "p_blocked": string }; Returns: undefined
                           },
"update_clan":
{ Args: { "p_description": string,"p_open": boolean }; Returns: undefined
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
            "activity_type": "rare_pull"|"album_completed"|"big_sale"|"leaderboard_top10","album_kind": "competition"|"club"|"nation"|"season"|"legends","booster_kind": "free"|"standard"|"premium"|"event"|"limited","coin_tx_type": "starting_balance"|"daily_bonus"|"booster_purchase"|"duplicate_sale"|"market_sale"|"market_purchase"|"album_reward"|"trade_sent"|"trade_received"|"admin_adjustment"|"minigame_reward","listing_status": "active"|"sold"|"cancelled","player_position": "GB"|"DEF"|"MIL"|"ATT","rarity": "commune"|"rare"|"epique"|"legendaire"|"iconique"|"speciale","report_status": "open"|"resolved"|"dismissed","trade_status": "pending"|"accepted"|"declined"|"cancelled"|"expired"|"countered"
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
            "activity_type": ["rare_pull", "album_completed", "big_sale", "leaderboard_top10"],"album_kind": ["competition", "club", "nation", "season", "legends"],"booster_kind": ["free", "standard", "premium", "event", "limited"],"coin_tx_type": ["starting_balance", "daily_bonus", "booster_purchase", "duplicate_sale", "market_sale", "market_purchase", "album_reward", "trade_sent", "trade_received", "admin_adjustment", "minigame_reward"],"listing_status": ["active", "sold", "cancelled"],"player_position": ["GB", "DEF", "MIL", "ATT"],"rarity": ["commune", "rare", "epique", "legendaire", "iconique", "speciale"],"report_status": ["open", "resolved", "dismissed"],"trade_status": ["pending", "accepted", "declined", "cancelled", "expired", "countered"]
          }
        }
} as const
