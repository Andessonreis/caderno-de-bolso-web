/**
 * Guarda as visitas no próprio aparelho (localStorage) e cuida do arquivo
 * para levar a visita de um aparelho para outro. Tudo aqui é função pura sobre
 * uma interface mínima de armazenamento, para poder testar sem navegador.
 */

import { dataValida, limparTexto } from "./ficha";
import {
  CULTURAS_SENSIVEIS,
  ITENS,
  type CulturaSensivel,
  type NaoConformidade,
  type Parecer,
  type Resposta,
  type RespostaItem,
  type TipoVisita,
  type UsoArmazenamento,
  type Visita,
  novoId,
} from "./visita";

export const CHAVE_VISITAS = "caderno-de-bolso:visitas:v1";
/** Onde fica uma cópia do que estava estragado, antes de regravar a lista. */
export const CHAVE_RESERVA = "caderno-de-bolso:visitas:reserva";
export const FORMATO_ARQUIVO = "caderno-de-bolso/visita";
export const VERSAO_ARQUIVO = 1;

/**
 * Limites de cada campo. Os formulários usam os mesmos números no maxLength,
 * para nada ser cortado sem a pessoa ver.
 */
export const LIMITES_VISITA = {
  nome: 80,
  municipio: 60,
  visitantes: 120,
  textoLongo: 4000,
} as const;

const LIMITE_TEXTO_CURTO = LIMITES_VISITA.visitantes;
const LIMITE_TEXTO_LONGO = LIMITES_VISITA.textoLongo;
const LIMITE_NAO_CONFORMIDADES = 50;
const LIMITE_VISITAS = 200;

export type Armazem = Pick<Storage, "getItem" | "setItem">;

function texto(valor: unknown, limite: number): string {
  return limparTexto(valor, limite) ?? "";
}

/** Texto longo: mantém quebras de linha, tira só caracteres de controle. */
function textoLongo(valor: unknown): string {
  if (typeof valor !== "string") return "";
  const limpo = valor
    .replace(/\r\n?/g, "\n")
    .split("")
    .filter((c) => c === "\n" || c.charCodeAt(0) >= 32)
    .join("")
    .trim();
  return Array.from(limpo).slice(0, LIMITE_TEXTO_LONGO).join("");
}

function umDe<T extends string>(valor: unknown, opcoes: readonly T[]): T | "" {
  return typeof valor === "string" && (opcoes as readonly string[]).includes(valor)
    ? (valor as T)
    : "";
}

function dataIso(valor: unknown): string {
  return typeof valor === "string" && !Number.isNaN(Date.parse(valor)) && valor.length <= 40
    ? valor
    : new Date(0).toISOString();
}

const RESPOSTAS: readonly Resposta[] = ["sim", "parte", "nao", "na"];
const IDS_ITENS = new Set(ITENS.map((i) => i.id));

/**
 * Lê uma visita de qualquer objeto (arquivo aberto, localStorage antigo).
 * Devolve null se não der para reconhecer uma visita.
 */
export function normalizarVisita(entrada: unknown): Visita | null {
  if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) return null;
  const o = entrada as Record<string, unknown>;
  const id = texto(o.id, 60);
  if (!id) return null;

  const produtorCru =
    typeof o.produtor === "object" && o.produtor !== null
      ? (o.produtor as Record<string, unknown>)
      : {};
  const culturas = Array.isArray(produtorCru.culturas)
    ? produtorCru.culturas
        .map((c) => texto(c, 40))
        .filter(Boolean)
        .slice(0, 12)
    : [];

  const respostas: Record<string, RespostaItem> = {};
  if (typeof o.respostas === "object" && o.respostas !== null) {
    for (const [chave, valor] of Object.entries(o.respostas as Record<string, unknown>)) {
      if (!IDS_ITENS.has(chave) || typeof valor !== "object" || valor === null) continue;
      const v = valor as Record<string, unknown>;
      const r = umDe(v.r, RESPOSTAS);
      const obs = textoLongo(v.obs);
      if (r || obs) respostas[chave] = r ? { r, obs } : { obs };
    }
  }

  const naoConformidades: NaoConformidade[] = Array.isArray(o.naoConformidades)
    ? o.naoConformidades
        .slice(0, LIMITE_NAO_CONFORMIDADES)
        .filter((n): n is Record<string, unknown> => typeof n === "object" && n !== null)
        .map((n) => ({
          id: texto(n.id, 60) || novoId(),
          descricao: textoLongo(n.descricao),
          prazo: dataValida(n.prazo) ? n.prazo : "",
        }))
    : [];

  const culturasSensiveis = Array.isArray(o.culturasSensiveis)
    ? CULTURAS_SENSIVEIS.filter((c) => (o.culturasSensiveis as unknown[]).includes(c))
    : [];

  return {
    id,
    criadaEm: dataIso(o.criadaEm),
    atualizadaEm: dataIso(o.atualizadaEm),
    produtor: {
      nome: texto(produtorCru.nome, LIMITES_VISITA.nome),
      municipio: texto(produtorCru.municipio, LIMITES_VISITA.municipio),
      culturas,
    },
    data: dataValida(o.data) ? o.data : "",
    visitantes: texto(o.visitantes, LIMITE_TEXTO_CURTO),
    tipo: umDe<TipoVisita>(o.tipo, ["pares", "externo"]),
    culturasSensiveis: culturasSensiveis as CulturaSensivel[],
    usoArmazenamento: umDe<UsoArmazenamento>(o.usoArmazenamento, ["exclusivo", "compartilhado"]),
    separacao: textoLongo(o.separacao),
    respostas,
    naoConformidades,
    pontosFortes: textoLongo(o.pontosFortes),
    observacoes: textoLongo(o.observacoes),
    parecer: umDe<Parecer>(o.parecer, ["conforme", "pendencias", "nao_conforme"]),
  };
}

export type LeituraVisitas = {
  visitas: Visita[];
  /** true se havia algo guardado que não deu para ler (todo ou em parte). */
  estragado: boolean;
};

/** Lê o conteúdo cru guardado no aparelho. Nunca lança erro. */
export function lerVisitas(cru: string | null): LeituraVisitas {
  if (cru === null) return { visitas: [], estragado: false };
  let dados: unknown;
  try {
    dados = JSON.parse(cru);
  } catch {
    return { visitas: [], estragado: true };
  }
  if (!Array.isArray(dados)) return { visitas: [], estragado: true };
  const visitas = dados.map(normalizarVisita).filter((v): v is Visita => v !== null);
  return {
    visitas: visitas.sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm)),
    estragado: visitas.length !== dados.length,
  };
}

/** Lista as visitas guardadas, da mais recente para a mais antiga. */
export function listarVisitas(armazem: Armazem): Visita[] {
  return lerVisitas(armazem.getItem(CHAVE_VISITAS)).visitas;
}

export type Reserva = { em: string; conteudo: string };

/** Cópias guardadas de conteúdo estragado, da mais antiga para a mais nova. */
export function lerReserva(cru: string | null): Reserva[] {
  if (cru === null) return [];
  try {
    const dados: unknown = JSON.parse(cru);
    if (Array.isArray(dados)) {
      return dados.filter(
        (r): r is Reserva =>
          typeof r === "object" &&
          r !== null &&
          typeof (r as Reserva).em === "string" &&
          typeof (r as Reserva).conteudo === "string",
      );
    }
  } catch {
    // A própria reserva estragou: ela vira uma entrada, para não se perder.
  }
  return [{ em: "", conteudo: cru }];
}

/**
 * Antes de regravar a lista, se o que está guardado não pôde ser lido por
 * inteiro, copia o conteúdo cru para a chave de reserva. Se não houver espaço
 * para a cópia, lança erro e a lista não é regravada.
 */
export function protegerConteudoEstragado(armazem: Armazem, agora = new Date()): void {
  const cru = armazem.getItem(CHAVE_VISITAS);
  if (cru === null || !lerVisitas(cru).estragado) return;
  const reserva = lerReserva(armazem.getItem(CHAVE_RESERVA));
  if (reserva.some((r) => r.conteudo === cru)) return;
  reserva.push({ em: agora.toISOString(), conteudo: cru });
  armazem.setItem(CHAVE_RESERVA, JSON.stringify(reserva));
}

function gravar(armazem: Armazem, visitas: Visita[], agora: Date): void {
  protegerConteudoEstragado(armazem, agora);
  armazem.setItem(CHAVE_VISITAS, JSON.stringify(visitas.slice(0, LIMITE_VISITAS)));
}

/** Salva (cria ou substitui) uma visita. Lança erro se o aparelho estiver sem espaço. */
export function salvarVisita(armazem: Armazem, visita: Visita, agora = new Date()): Visita[] {
  const outras = listarVisitas(armazem).filter((v) => v.id !== visita.id);
  const lista = [visita, ...outras];
  gravar(armazem, lista, agora);
  return lista;
}

export function apagarVisita(armazem: Armazem, id: string, agora = new Date()): Visita[] {
  const lista = listarVisitas(armazem).filter((v) => v.id !== id);
  gravar(armazem, lista, agora);
  return lista;
}

export type AvaliacaoImportacao =
  | { tipo: "nova" }
  | { tipo: "arquivoMaisNovo"; local: Visita }
  | { tipo: "localMaisNova"; local: Visita };

/**
 * Compara a visita de um arquivo com o que já existe no aparelho. Só é
 * preciso perguntar quando a cópia do aparelho foi mexida depois da do arquivo.
 */
export function avaliarImportacao(existentes: Visita[], importada: Visita): AvaliacaoImportacao {
  const local = existentes.find((v) => v.id === importada.id);
  if (!local) return { tipo: "nova" };
  const tempoLocal = Date.parse(local.atualizadaEm);
  const tempoArquivo = Date.parse(importada.atualizadaEm);
  return tempoLocal > tempoArquivo
    ? { tipo: "localMaisNova", local }
    : { tipo: "arquivoMaisNovo", local };
}

/** A mesma visita com outro id, para guardar ao lado da que já existe. */
export function comoCopia(
  visita: Visita,
  agora = new Date(),
  id = novoId(agora.getTime()),
): Visita {
  const marca = " (cópia)";
  const nome = visita.produtor.nome || "Produtor sem nome";
  const cabe = Array.from(nome)
    .slice(0, LIMITES_VISITA.nome - marca.length)
    .join("")
    .trim();
  return {
    ...visita,
    id,
    criadaEm: agora.toISOString(),
    atualizadaEm: agora.toISOString(),
    produtor: { ...visita.produtor, nome: cabe + marca },
  };
}

/** Conteúdo do arquivo para levar a visita a outro aparelho. */
export function visitaParaArquivo(visita: Visita): string {
  return JSON.stringify({ formato: FORMATO_ARQUIVO, versao: VERSAO_ARQUIVO, visita }, null, 2);
}

export type ResultadoArquivo = { ok: true; visita: Visita } | { ok: false; mensagem: string };

export function visitaDeArquivo(conteudo: string): ResultadoArquivo {
  const erro = {
    ok: false as const,
    mensagem: "Este arquivo não é uma visita do Caderno de Bolso.",
  };
  let dados: unknown;
  try {
    dados = JSON.parse(conteudo);
  } catch {
    return erro;
  }
  if (typeof dados !== "object" || dados === null) return erro;
  const d = dados as Record<string, unknown>;
  if (d.formato !== FORMATO_ARQUIVO) return erro;
  if (d.versao !== VERSAO_ARQUIVO) {
    return { ok: false, mensagem: "Este arquivo foi feito por uma versão diferente do roteiro." };
  }
  const visita = normalizarVisita(d.visita);
  return visita ? { ok: true, visita } : erro;
}

/** Nome do arquivo baixado: visita-ze-carlos-2026-11-20.json */
export function nomeDoArquivo(visita: Visita): string {
  const nome =
    visita.produtor.nome
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "sem-nome";
  return `visita-${nome}-${visita.data || "sem-data"}.json`;
}
