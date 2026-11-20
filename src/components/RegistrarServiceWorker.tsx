"use client";

import { useEffect } from "react";
import { comBase } from "@/lib/caminho";

/**
 * Registra o service worker (public/sw.js) que guarda as páginas no aparelho,
 * para o roteiro de visita abrir mesmo sem internet. Só em produção: no
 * desenvolvimento o cache atrapalharia ver as mudanças.
 */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(comBase("/sw.js"), { scope: comBase("/") }).catch(() => {
      // Sem service worker o site continua funcionando, só não abre offline.
    });
  }, []);

  return null;
}
