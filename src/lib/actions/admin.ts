"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { FormError, FormReader, oddsError, parseCollectionNumbers, SLUG_PATTERN, slugify, type OddsInput } from "@/lib/admin";
import { RARITIES, type Rarity } from "@/lib/rarity";

export type AdminResult = { ok: boolean; message: string | null };

const POSITIONS = ["GB", "DEF", "MIL", "ATT"] as const;
const BOOSTER_KINDS = ["free", "standard", "premium", "event", "limited"] as const;
const ALBUM_KINDS = ["competition", "club", "nation", "season", "legends"] as const;

/**
 * Enveloppe commune : vérifie le rôle admin (confort ; la base revérifie via RLS / RPC),
 * transforme les erreurs de validation et de base en messages lisibles.
 */
async function adminAction(run: (supabase: Awaited<ReturnType<typeof createClient>>) => Promise<string>): Promise<AdminResult> {
  const profile = await getCurrentProfile();
  if (!profile?.isAdmin) return { ok: false, message: "Réservé aux administrateurs." };
  try {
    const supabase = await createClient();
    const message = await run(supabase);
    revalidatePath("/", "layout");
    return { ok: true, message };
  } catch (e) {
    if (e instanceof FormError) return { ok: false, message: e.message };
    const err = e as { code?: string; message?: string };
    if (err.code === "23505") return { ok: false, message: "Cette valeur existe déjà (slug ou numéro en double)." };
    if (err.code === "23503")
      return { ok: false, message: "Élément utilisé ailleurs : désactive-le plutôt que de le supprimer." };
    if (err.code === "23514")
      return { ok: false, message: "Valeur refusée par une règle du jeu (vérifie les bornes et les stocks)." };
    if (err.code === "P0001") return { ok: false, message: err.message ?? "Refusé." };
    return { ok: false, message: "Enregistrement impossible." };
  }
}

/** Recherche de cartes pour le formulaire « offrir » (le catalogue est trop grand pour une liste déroulante). */
export async function searchGiftTemplates(query: string): Promise<{ id: number; label: string }[]> {
  const profile = await getCurrentProfile();
  if (!profile?.isAdmin) return [];
  const term = query
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .trim()
    .slice(0, 60);
  if (term.length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("card_templates")
    .select(
      "id, season, edition, rarity, rating, collection_number, max_supply, minted_count, players!inner ( display_name, search_text )",
    )
    .ilike("players.search_text", `%${term}%`)
    .order("rating", { ascending: false })
    .limit(30);
  if (error) return [];
  const labels: Record<string, string> = {
    commune: "Commune",
    rare: "Rare",
    epique: "Épique",
    legendaire: "Légendaire",
    iconique: "Iconique",
    speciale: "Spéciale",
  };
  return data.map((t) => ({
    id: t.id,
    label: `#${t.collection_number} ${t.players.display_name} · ${t.edition === "Base" ? t.season : t.edition} · ${labels[t.rarity]} ${t.rating}${
      t.max_supply ? ` (${t.minted_count}/${t.max_supply})` : ""
    }`,
  }));
}

function check<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data;
}

export async function savePlayer(_prev: AdminResult, fd: FormData): Promise<AdminResult> {
  return adminAction(async (supabase) => {
    const f = new FormReader(fd);
    const id = f.int("id");
    const displayName = f.text("display_name", { required: true, max: 60 })!;
    const slug = f.text("slug", { max: 60 }) ?? slugify(displayName);
    if (!SLUG_PATTERN.test(slug)) throw new FormError("Slug invalide (minuscules, chiffres et tirets).");
    const row = {
      slug,
      display_name: displayName,
      first_name: f.text("first_name", { max: 60 }),
      last_name: f.text("last_name", { required: true, max: 60 })!,
      nation_id: f.int("nation_id", { required: true, min: 1 })!,
      position: f.oneOf("position", POSITIONS, { required: true })!,
      birth_year: f.int("birth_year", { min: 1900, max: 2020 }),
      is_legend: f.bool("is_legend"),
      bio: f.text("bio", { max: 600 }),
      image_url: f.text("image_url", { max: 500 }),
    };
    if (id) check(await supabase.from("players").update(row).eq("id", id));
    else check(await supabase.from("players").insert(row));
    return id ? "Joueur mis à jour." : "Joueur créé.";
  });
}

export async function saveTemplate(_prev: AdminResult, fd: FormData): Promise<AdminResult> {
  return adminAction(async (supabase) => {
    const f = new FormReader(fd);
    const id = f.int("id");
    const row = {
      player_id: f.int("player_id", { required: true, min: 1 })!,
      club_id: f.int("club_id", { min: 1 }),
      season: f.text("season", { required: true, max: 40 })!,
      edition: f.text("edition", { required: true, max: 40 })!,
      rarity: f.oneOf("rarity", RARITIES, { required: true })!,
      rating: f.int("rating", { required: true, min: 40, max: 99 })!,
      max_supply: f.int("max_supply", { min: 1, max: 1_000_000 }),
      image_url: f.text("image_url", { max: 500 }),
      is_active: f.bool("is_active"),
    };
    if (id) check(await supabase.from("card_templates").update(row).eq("id", id));
    else check(await supabase.from("card_templates").insert(row));
    return id ? "Carte mise à jour." : "Carte créée (numéro de collection attribué automatiquement).";
  });
}

export async function saveAlbum(_prev: AdminResult, fd: FormData): Promise<AdminResult> {
  return adminAction(async (supabase) => {
    const f = new FormReader(fd);
    const id = f.int("id");
    const name = f.text("name", { required: true, max: 60 })!;
    const slug = f.text("slug", { max: 60 }) ?? slugify(name);
    if (!SLUG_PATTERN.test(slug)) throw new FormError("Slug invalide (minuscules, chiffres et tirets).");
    const row = {
      slug,
      name,
      description: f.text("description", { max: 300 }),
      kind: f.oneOf("kind", ALBUM_KINDS, { required: true })!,
      reward_coins: f.int("reward_coins", { required: true, min: 0, max: 1_000_000 })!,
      sort_order: f.int("sort_order", { min: 0, max: 1000 }) ?? 0,
      is_active: f.bool("is_active"),
    };
    let albumId = id;
    if (id) check(await supabase.from("albums").update(row).eq("id", id));
    else albumId = check(await supabase.from("albums").insert(row).select("id").single())!.id;

    const numbers = parseCollectionNumbers(f.text("slots", { max: 5000 }) ?? "");
    check(await supabase.rpc("admin_set_album_slots", { p_album_id: albumId!, p_collection_numbers: numbers }));
    return `Album enregistré (${numbers.length} emplacements).`;
  });
}

export async function saveBooster(_prev: AdminResult, fd: FormData): Promise<AdminResult> {
  return adminAction(async (supabase) => {
    const f = new FormReader(fd);
    const id = f.int("id");
    const kind = f.oneOf("kind", BOOSTER_KINDS, { required: true })!;
    const name = f.text("name", { required: true, max: 60 })!;
    const stockTotal = f.int("stock_total", { min: 1, max: 10_000_000 });
    const row = {
      name,
      description: f.text("description", { max: 300 }),
      price: kind === "free" ? 0 : f.int("price", { required: true, min: 0, max: 1_000_000 })!,
      cards_count: f.int("cards_count", { required: true, min: 1, max: 20 })!,
      guarantee_rarity: f.oneOf("guarantee_rarity", RARITIES),
      guarantee_count: f.int("guarantee_count", { min: 0, max: 20 }) ?? 0,
      starts_at: f.dateTime("starts_at"),
      ends_at: f.dateTime("ends_at"),
      stock_total: kind === "limited" ? stockTotal : null,
      stock_remaining: kind === "limited" ? (f.int("stock_remaining", { min: 0, max: 10_000_000 }) ?? stockTotal) : null,
      image_url: f.text("image_url", { max: 500 }),
      is_active: f.bool("is_active"),
      sort_order: f.int("sort_order", { min: 0, max: 1000 }) ?? 0,
    };

    const odds: OddsInput = {};
    for (const r of RARITIES) {
      const raw = fd.get(`odds_${r}`);
      odds[r] = raw === null || raw === "" ? 0 : Number(String(raw).replace(",", "."));
    }
    const oddsProblem = oddsError(odds);
    if (oddsProblem) throw new FormError(oddsProblem);

    let boosterId = id;
    if (id) {
      check(await supabase.from("boosters").update(row).eq("id", id));
    } else {
      const slug = f.text("slug", { max: 60 }) ?? slugify(name);
      if (!SLUG_PATTERN.test(slug)) throw new FormError("Slug invalide.");
      boosterId = check(
        await supabase
          .from("boosters")
          .insert({ ...row, slug, kind })
          .select("id")
          .single(),
      )!.id;
    }
    check(
      await supabase.rpc("admin_set_booster_odds", {
        p_booster_id: boosterId!,
        p_odds: Object.fromEntries(RARITIES.map((r) => [r, (odds[r] ?? 0).toFixed(2)])) as Record<Rarity, string>,
      }),
    );
    return id ? "Booster mis à jour." : "Booster créé.";
  });
}

export async function resolveReport(reportId: number, status: "resolved" | "dismissed"): Promise<AdminResult> {
  return adminAction(async (supabase) => {
    check(await supabase.rpc("admin_resolve_report", { p_report_id: reportId, p_status: status }));
    return status === "resolved" ? "Signalement traité." : "Signalement classé sans suite.";
  });
}

export async function purgeDemoAccounts(): Promise<AdminResult> {
  return adminAction(async (supabase) => {
    const n = check(await supabase.rpc("admin_purge_demo_accounts")) ?? 0;
    return `${n} compte${n > 1 ? "s" : ""} de démo supprimé${n > 1 ? "s" : ""}.`;
  });
}

// -----------------------------------------------------------------------------
// Comptes joueurs (packs, cartes, pièces, retrait, réinitialisation, bannissement)
// -----------------------------------------------------------------------------
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function targetId(fd: FormData): string {
  const id = String(fd.get("user_id") ?? "");
  if (!UUID.test(id)) throw new FormError("Compte invalide.");
  return id;
}

export async function giveBoosters(_prev: AdminResult, fd: FormData): Promise<AdminResult> {
  return adminAction(async (supabase) => {
    const f = new FormReader(fd);
    const count = f.int("count", { required: true, min: 1, max: 50 })!;
    check(
      await supabase.rpc("admin_give_boosters", {
        p_user: targetId(fd),
        p_booster_id: f.int("booster_id", { required: true, min: 1 })!,
        p_count: count,
        p_reason: f.text("reason", { max: 300 }) ?? undefined,
      }),
    );
    return count === 1 ? "Pack offert." : `${count} packs offerts.`;
  });
}

export async function giveCards(_prev: AdminResult, fd: FormData): Promise<AdminResult> {
  return adminAction(async (supabase) => {
    const f = new FormReader(fd);
    const count = f.int("count", { required: true, min: 1, max: 20 })!;
    check(
      await supabase.rpc("admin_give_cards", {
        p_user: targetId(fd),
        p_template_id: f.int("template_id", { required: true, min: 1 })!,
        p_count: count,
        p_reason: f.text("reason", { max: 300 }) ?? undefined,
      }),
    );
    return count === 1 ? "Carte offerte." : `${count} exemplaires offerts.`;
  });
}

export async function adjustCoins(_prev: AdminResult, fd: FormData): Promise<AdminResult> {
  return adminAction(async (supabase) => {
    const f = new FormReader(fd);
    const amount = f.int("amount", { required: true, min: -1_000_000, max: 1_000_000 })!;
    if (amount === 0) throw new FormError("Le montant ne peut pas être nul.");
    const balance = check(
      await supabase.rpc("admin_adjust_coins", {
        p_user: targetId(fd),
        p_amount: amount,
        p_reason: f.text("reason", { max: 300 }) ?? undefined,
      }),
    );
    return `${amount > 0 ? "Pièces ajoutées" : "Pièces retirées"}. Nouveau solde : ${balance}.`;
  });
}

export async function removeCards(instanceIds: string[], reason: string): Promise<AdminResult> {
  return adminAction(async (supabase) => {
    if (instanceIds.length === 0 || instanceIds.length > 200 || !instanceIds.every((id) => UUID.test(id))) {
      throw new FormError("Sélectionne entre 1 et 200 exemplaires.");
    }
    const n = check(
      await supabase.rpc("admin_remove_cards", { p_instance_ids: instanceIds, p_reason: reason.trim() || undefined }),
    );
    return n === 1 ? "Carte retirée." : `${n} cartes retirées.`;
  });
}

export async function resetAccount(userId: string, reason: string): Promise<AdminResult> {
  return adminAction(async (supabase) => {
    if (!UUID.test(userId)) throw new FormError("Compte invalide.");
    const r = check(await supabase.rpc("admin_reset_account", { p_user: userId, p_reason: reason.trim() || undefined })) as {
      cards_removed: number;
    };
    return `Compte réinitialisé (${r.cards_removed} carte${r.cards_removed > 1 ? "s" : ""} retirée${r.cards_removed > 1 ? "s" : ""}).`;
  });
}

export async function setBan(userId: string, banned: boolean, reason: string): Promise<AdminResult> {
  return adminAction(async (supabase) => {
    if (!UUID.test(userId)) throw new FormError("Compte invalide.");
    check(await supabase.rpc("admin_set_ban", { p_user: userId, p_banned: banned, p_reason: reason.trim() || undefined }));
    return banned ? "Joueur banni : connexion bloquée, sessions coupées." : "Bannissement levé.";
  });
}
