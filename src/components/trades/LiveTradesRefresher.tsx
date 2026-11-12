"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { subscribeToChanges } from "@/lib/realtime";

/**
 * Rafraîchit la page dès qu'un échange me concernant change (Realtime ;
 * la RLS de trades ne diffuse que les échanges dont je suis partie prenante).
 */
export function LiveTradesRefresher() {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeToChanges({ table: "trades", event: "*" }, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300); // regroupe les rafales
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [router]);
  return null;
}
