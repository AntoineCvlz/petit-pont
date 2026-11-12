"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

/**
 * Rafraîchit la page dès qu'un échange me concernant change (Realtime ;
 * la RLS de trades ne diffuse que les échanges dont je suis partie prenante).
 */
export function LiveTradesRefresher() {
  const router = useRouter();
  useEffect(() => {
    const supabase = getBrowserClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`trades-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "trades" }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 300); // regroupe les rafales
      })
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [router]);
  return null;
}
