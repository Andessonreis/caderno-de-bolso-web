/**
 * Conversa com o servidor do grupo (funções do banco expostas por HTTP).
 *
 * Só três chamadas, todas POST: criar, listar e apagar. A chave de acesso
 * abaixo é a chave pública do projeto, feita para ficar no navegador; o que
 * protege cada grupo são o código e a chave da coordenação, dos quais o
 * servidor guarda só o resumo (sha256).
 *
 * `fetch` pode ser trocado nos testes.
 */

import {
  LIMITE_NOME_GRUPO,
  gerarChave,
  gerarCodigo,
  grupoValido,
  lerDadosDoGrupo,
  type Credenciais,
  type DadosDoGrupo,
  type Sorteio,
  sortearBytes,
} from "./grupo";
import { limparTexto } from "./ficha";

export const URL_SERVIDOR = (
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "https://usnrgytoupqwikgcwwjb.supabase.co"
).replace(/\/+$/, "");
export const CHAVE_PUBLICA =
  process.env.NEXT_PUBLIC_SUPABASE_KEY?.trim() || "sb_publishable_2Qv8OPUk-Aj9zHOIxEXwzA_yBvYG5g4";

const TEMPO_LIMITE_MS = 20_000;
const TENTATIVAS_DE_CODIGO = 5;

export type Problema =
  /** Sem internet, ou o servidor não respondeu a tempo. */
  | "semInternet"
  /** O grupo não existe mais ou a chave do link não é a dele. */
  | "naoConfere"
  /** O servidor recusou o que foi mandado (nome, por exemplo). */
  | "recusado"
  /** Muitos grupos criados na última hora (limite global do servidor). */
  | "muitosGrupos"
  /** Qualquer outra falha do servidor. */
  | "servidor";

export type Resultado<T> = { ok: true; valor: T } | { ok: false; problema: Problema };

type Configuracao = { fetch?: typeof fetch; url?: string; chavePublica?: string };

/** Lê o erro devolvido pelo servidor: {"code": "...", "message": "..."}. */
export function classificarErro(status: number, corpo: unknown): Problema {
  const o = typeof corpo === "object" && corpo !== null ? (corpo as Record<string, unknown>) : {};
  if (o.code === "54000" || o.message === "muitos_grupos_agora") return "muitosGrupos";
  if (o.code === "28000" || o.message === "chave_nao_confere") return "naoConfere";
  if (status === 401 || status === 403) return "naoConfere";
  if (status >= 400 && status < 500) return "recusado";
  return "servidor";
}

type RespostaBruta = { status: number; corpo: unknown };

async function chamar(
  funcao: string,
  corpo: Record<string, unknown>,
  config: Configuracao,
): Promise<{ ok: true; resposta: RespostaBruta } | { ok: false; problema: Problema }> {
  const buscar = config.fetch ?? fetch;
  const controle = new AbortController();
  const tempo = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const r = await buscar(`${config.url ?? URL_SERVIDOR}/rest/v1/rpc/${funcao}`, {
      method: "POST",
      headers: {
        apikey: config.chavePublica ?? CHAVE_PUBLICA,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(corpo),
      cache: "no-store",
      signal: controle.signal,
    });
    const texto = await r.text();
    let json: unknown = null;
    try {
      json = texto ? JSON.parse(texto) : null;
    } catch {
      json = null;
    }
    return { ok: true, resposta: { status: r.status, corpo: json } };
  } catch {
    return { ok: false, problema: "semInternet" };
  } finally {
    clearTimeout(tempo);
  }
}

export type GrupoCriado = Credenciais & { nome: string; codigo: string };

/**
 * Cria o grupo. Se o código sorteado já estiver em uso (raro), sorteia outro
 * e tenta de novo.
 */
export async function criarGrupo(
  nomeDigitado: string,
  config: Configuracao & { sortear?: Sorteio } = {},
): Promise<Resultado<GrupoCriado>> {
  const nome = limparTexto(nomeDigitado, LIMITE_NOME_GRUPO);
  if (!nome) return { ok: false, problema: "recusado" };
  const sortear = config.sortear ?? sortearBytes;
  const chave = gerarChave(sortear);

  for (let tentativa = 0; tentativa < TENTATIVAS_DE_CODIGO; tentativa++) {
    const codigo = gerarCodigo(sortear);
    const r = await chamar(
      "caderno_grupo_criar",
      { p_nome: nome, p_codigo: codigo, p_chave: chave },
      config,
    );
    if (!r.ok) return r;
    const { status, corpo } = r.resposta;
    if (status >= 200 && status < 300) {
      return grupoValido(corpo)
        ? { ok: true, valor: { grupo: corpo.toLowerCase(), chave, nome, codigo } }
        : { ok: false, problema: "servidor" };
    }
    const erro = corpo as { code?: unknown; message?: unknown } | null;
    if (erro?.code === "23505" || erro?.message === "codigo_em_uso") continue;
    return { ok: false, problema: classificarErro(status, corpo) };
  }
  return { ok: false, problema: "servidor" };
}

export async function listarGrupo(
  credenciais: Credenciais,
  config: Configuracao = {},
): Promise<Resultado<DadosDoGrupo>> {
  const r = await chamar(
    "caderno_grupo_listar",
    { p_grupo: credenciais.grupo, p_chave: credenciais.chave },
    config,
  );
  if (!r.ok) return r;
  const { status, corpo } = r.resposta;
  if (status < 200 || status >= 300) return { ok: false, problema: classificarErro(status, corpo) };
  const dados = lerDadosDoGrupo(corpo);
  return dados ? { ok: true, valor: dados } : { ok: false, problema: "servidor" };
}

export async function apagarGrupo(
  credenciais: Credenciais,
  config: Configuracao = {},
): Promise<Resultado<null>> {
  const r = await chamar(
    "caderno_grupo_apagar",
    { p_grupo: credenciais.grupo, p_chave: credenciais.chave },
    config,
  );
  if (!r.ok) return r;
  const { status, corpo } = r.resposta;
  return status >= 200 && status < 300
    ? { ok: true, valor: null }
    : { ok: false, problema: classificarErro(status, corpo) };
}
