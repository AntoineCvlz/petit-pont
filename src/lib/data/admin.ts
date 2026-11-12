import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { normalizeOdds, type Odds } from "@/lib/boosters";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];

/** Garde des pages /admin : 404 pour tout joueur non administrateur (la base revérifie via RLS / RPC). */
export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile?.isAdmin) notFound();
  return profile;
}

export type EconomyStats = {
  players: number;
  demo_players: number;
  active_7d: number;
  coins_in_circulation: number;
  coins_by_type: Record<string, number>;
  market_fees_burned: number;
  market_sales: number;
  market_volume: number;
  active_listings: number;
  openings_by_booster: Record<string, number>;
  cards_minted: number;
  cards_by_rarity: Record<string, number>;
  trades_accepted: number;
  trades_pending: number;
  open_reports: number;
  inconsistent_balances: number;
};

export async function getEconomyStats(): Promise<EconomyStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_economy_stats");
  if (error) throw error;
  return data as unknown as EconomyStats;
}

export type ReportView = {
  id: number;
  reason: string;
  status: Database["public"]["Enums"]["report_status"];
  createdAt: string;
  reporter: string;
  reported: string;
};

export async function listReports(status: "open" | "closed"): Promise<ReportView[]> {
  const supabase = await createClient();
  let q = supabase
    .from("reports")
    .select(`id, reason, status, created_at,
      reporter:profiles!reports_reporter_id_fkey ( username ),
      reported:profiles!reports_reported_id_fkey ( username )`)
    .order("created_at", { ascending: false })
    .limit(100);
  q = status === "open" ? q.eq("status", "open") : q.neq("status", "open");
  const { data, error } = await q;
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
    reporter: r.reporter?.username ?? "?",
    reported: r.reported?.username ?? "?",
  }));
}

export async function getReferenceOptions() {
  const supabase = await createClient();
  const [n, c, p] = await Promise.all([
    supabase.from("nations").select("id, code, name").order("name"),
    supabase.from("clubs").select("id, code, name").order("name"),
    supabase.from("players").select("id, display_name").order("display_name"),
  ]);
  if (n.error) throw n.error;
  if (c.error) throw c.error;
  if (p.error) throw p.error;
  return { nations: n.data, clubs: c.data, players: p.data };
}

export type AdminPlayer = Tables["players"]["Row"] & { nationName: string; versions: number };

export async function listAdminPlayers(search: string): Promise<AdminPlayer[]> {
  const supabase = await createClient();
  let q = supabase.from("players").select("*, nations!inner ( name ), card_templates ( id )").order("display_name").limit(300);
  const term = search.trim().toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim();
  if (term) q = q.ilike("search_text", `%${term}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(({ nations, card_templates, ...p }) => ({ ...p, nationName: nations.name, versions: card_templates.length }));
}

export type AdminTemplate = Tables["card_templates"]["Row"] & { playerName: string; clubName: string | null };

export async function listAdminTemplates(search: string): Promise<AdminTemplate[]> {
  const supabase = await createClient();
  let q = supabase
    .from("card_templates")
    .select("*, players!inner ( display_name, search_text ), clubs ( name )")
    .order("collection_number")
    .limit(400);
  const term = search.trim().toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim();
  if (term) q = q.ilike("players.search_text", `%${term}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(({ players, clubs, ...t }) => ({ ...t, playerName: players.display_name, clubName: clubs?.name ?? null }));
}

export type AdminAlbum = Tables["albums"]["Row"] & { collectionNumbers: number[] };

export async function listAdminAlbums(): Promise<AdminAlbum[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("albums")
    .select("*, album_slots ( slot_number, card_templates!inner ( collection_number ) )")
    .order("sort_order");
  if (error) throw error;
  return data.map(({ album_slots, ...a }) => ({
    ...a,
    collectionNumbers: [...album_slots].sort((x, y) => x.slot_number - y.slot_number).map((s) => s.card_templates.collection_number!),
  }));
}

export type AdminBooster = Tables["boosters"]["Row"] & { odds: Odds; openings: number };

export async function listAdminBoosters(): Promise<AdminBooster[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("boosters").select("*, booster_odds ( rarity, probability )").order("sort_order");
  if (error) throw error;
  return data.map(({ booster_odds, ...b }) => ({ ...b, odds: normalizeOdds(booster_odds), openings: 0 }));
}

/** Le joueur connecté a-t-il bloqué ce joueur ? (RLS : on ne lit que ses propres blocages) */
export async function hasBlocked(otherId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("blocks").select("blocked_id", { count: "exact", head: true }).eq("blocked_id", otherId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
