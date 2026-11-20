"use client";

import { useSyncExternalStore } from "react";

function assinar(avisar: () => void) {
  window.addEventListener("hashchange", avisar);
  window.addEventListener("popstate", avisar);
  return () => {
    window.removeEventListener("hashchange", avisar);
    window.removeEventListener("popstate", avisar);
  };
}

/**
 * O hash da página ("#d=..."). No HTML gerado no build ele ainda não existe,
 * então devolve null até o navegador assumir; assim a hidratação bate.
 */
export function useHash(): string | null {
  return useSyncExternalStore(
    assinar,
    () => window.location.hash,
    () => null,
  );
}
