"use client";

import { useSyncExternalStore } from "react";

const nadaParaAssinar = () => () => {};

/**
 * Lê um valor que só existe no navegador (endereço da página, recursos do
 * aparelho). No HTML gerado no build devolve `noServidor`, e a hidratação bate.
 * `ler` precisa devolver um valor simples (texto, número, booleano).
 */
export function useDoNavegador<T extends string | number | boolean | null>(
  ler: () => T,
  noServidor: T,
): T {
  return useSyncExternalStore(nadaParaAssinar, ler, () => noServidor);
}

const EVENTO_ARMAZENAMENTO = "caderno-de-bolso:armazenamento";
const PREFIXO_CHAVES = "caderno-de-bolso:";

/** Avisa a tela de que algo guardado pelo site mudou (visitas, reserva). */
export function avisarMudancaNasVisitas() {
  window.dispatchEvent(new Event(EVENTO_ARMAZENAMENTO));
}

function assinarArmazenamento(avisar: () => void) {
  const aoMudarEmOutraAba = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith(PREFIXO_CHAVES)) avisar();
  };
  window.addEventListener(EVENTO_ARMAZENAMENTO, avisar);
  window.addEventListener("storage", aoMudarEmOutraAba);
  return () => {
    window.removeEventListener(EVENTO_ARMAZENAMENTO, avisar);
    window.removeEventListener("storage", aoMudarEmOutraAba);
  };
}

/**
 * Valor cru de uma chave do localStorage, atualizado quando esta aba ou outra
 * muda o que está guardado. `undefined` no build (lá não existe localStorage);
 * `null` quando a chave não existe no aparelho.
 */
export function useChaveLocal(chave: string): string | null | undefined {
  return useSyncExternalStore(
    assinarArmazenamento,
    () => {
      try {
        return localStorage.getItem(chave);
      } catch {
        return null;
      }
    },
    () => undefined,
  );
}
