"use client";

import { useSyncExternalStore } from "react";
import { CHAVE_VISITAS } from "./armazenamento";

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

const EVENTO_VISITAS = "caderno-de-bolso:visitas";

/** Avisa a tela de que as visitas guardadas mudaram. */
export function avisarMudancaNasVisitas() {
  window.dispatchEvent(new Event(EVENTO_VISITAS));
}

function assinarVisitas(avisar: () => void) {
  const aoMudarArmazenamento = (e: StorageEvent) => {
    if (e.key === null || e.key === CHAVE_VISITAS) avisar();
  };
  window.addEventListener(EVENTO_VISITAS, avisar);
  window.addEventListener("storage", aoMudarArmazenamento);
  return () => {
    window.removeEventListener(EVENTO_VISITAS, avisar);
    window.removeEventListener("storage", aoMudarArmazenamento);
  };
}

function lerVisitasCru(): string {
  try {
    return localStorage.getItem(CHAVE_VISITAS) ?? "[]";
  } catch {
    return "[]";
  }
}

/**
 * Conteúdo cru das visitas guardadas, atualizado quando esta aba ou outra
 * aba muda a lista. null no build (não há localStorage lá).
 */
export function useVisitasGuardadasCru(): string | null {
  return useSyncExternalStore(assinarVisitas, lerVisitasCru, () => null);
}
