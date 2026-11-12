import "server-only";
import { createClient } from "@/lib/supabase/server";

export type NotificationView = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export const NOTIFICATIONS_PAGE_SIZE = 30;

/** RLS : un joueur ne lit que ses propres notifications. */
export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function listNotifications(page: number): Promise<{ rows: NotificationView[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * NOTIFICATIONS_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, is_read, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + NOTIFICATIONS_PAGE_SIZE - 1);
  if (error) throw error;
  return {
    total: count ?? 0,
    rows: data.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, isRead: n.is_read, createdAt: n.created_at })),
  };
}
