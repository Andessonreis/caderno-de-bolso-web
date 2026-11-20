/**
 * Prefixo do site quando ele não está na raiz do domínio (por exemplo, no
 * GitHub Pages: https://usuario.github.io/caderno-de-bolso-web/). Vem de
 * NEXT_PUBLIC_BASE_PATH no build; vazio significa raiz.
 *
 * Links do next/link já recebem o prefixo sozinhos. Use `comBase` só no que o
 * Next não conhece: manifesto, service worker e endereços montados à mão.
 */

/** "caderno/" -> "/caderno"; "", "/" ou espaços -> "". */
export function normalizarBasePath(valor: string | undefined | null): string {
  const limpo = (valor ?? "").trim().replace(/\/+$/, "").replace(/^\/*/, "");
  if (!limpo) return "";
  if (!/^[A-Za-z0-9._~\-/]+$/.test(limpo) || limpo.split("/").some((p) => !p || p === "..")) {
    throw new Error(`NEXT_PUBLIC_BASE_PATH inválido: "${valor}"`);
  }
  return `/${limpo}`;
}

export const BASE_PATH = normalizarBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

/** Junta o prefixo a um caminho que começa com "/". */
export function comBase(caminho: string, base: string = BASE_PATH): string {
  if (!caminho.startsWith("/")) throw new Error(`Caminho precisa começar com "/": ${caminho}`);
  return `${base}${caminho}`;
}
