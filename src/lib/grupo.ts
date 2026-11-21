/**
 * Área do grupo: reunir num lugar só as visitas feitas pelos produtores de um
 * núcleo, associação ou cooperativa.
 *
 * O grupo tem dois segredos, sem login:
 * - o código do grupo (curto), que os membros digitam no aplicativo para
 *   ENVIAR visitas;
 * - a chave da coordenação (longa), que fica só no link da coordenação, depois
 *   do "#", e serve para LER as visitas neste site.
 *
 * Aqui ficam só funções puras: gerar e conferir os segredos, montar e ler o
 * link, ler com segurança o que vem do servidor, resumir e montar a planilha.
 */

import { normalizarVisita } from "./armazenamento";
import { dataValida, limparTexto } from "./ficha";
import {
  ITENS,
  OPCOES_PARECER,
  ROTULO_RESPOSTA,
  itensVisiveis,
  progresso,
  type Parecer,
  type Visita,
} from "./visita";

// ---------------------------------------------------------------------------
// Código do grupo e chave da coordenação

/** Sem I, L, O, 0 e 1, que se confundem ao ler e ao digitar. */
export const ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const TAMANHO_CODIGO = 10;
export const LIMITE_NOME_GRUPO = 80;
/** 32 bytes em base64url sem "=". */
export const TAMANHO_CHAVE = 43;
/** O servidor devolve no máximo esta quantidade de visitas. */
export const LIMITE_VISITAS_GRUPO = 2000;

export type Sorteio = (quantidade: number) => Uint8Array;

/** Bytes aleatórios do navegador (ou do Node, nos testes). */
export const sortearBytes: Sorteio = (quantidade) =>
  crypto.getRandomValues(new Uint8Array(quantidade));

/**
 * Código novo, com cada letra igualmente provável: bytes que passariam do
 * último múltiplo do tamanho do alfabeto são descartados, em vez de usar o
 * resto da divisão direto (que favoreceria as primeiras letras).
 */
export function gerarCodigo(sortear: Sorteio = sortearBytes): string {
  const n = ALFABETO_CODIGO.length;
  const teto = 256 - (256 % n);
  let codigo = "";
  while (codigo.length < TAMANHO_CODIGO) {
    for (const b of sortear(TAMANHO_CODIGO * 2)) {
      if (b >= teto) continue;
      codigo += ALFABETO_CODIGO[b % n];
      if (codigo.length === TAMANHO_CODIGO) break;
    }
  }
  return codigo;
}

/** "abcde fghjk" ou "ABCDE-FGHJK" -> "ABCDEFGHJK" (sem conferir se é válido). */
export function limparCodigo(texto: string): string {
  return texto.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function codigoValido(texto: string): boolean {
  const codigo = limparCodigo(texto);
  return (
    codigo.length === TAMANHO_CODIGO && Array.from(codigo).every((c) => ALFABETO_CODIGO.includes(c))
  );
}

/** "ABCDEFGHJK" -> "ABCDE-FGHJK", mais fácil de ler em voz alta e de digitar. */
export function formatarCodigo(codigo: string): string {
  const limpo = limparCodigo(codigo);
  const meio = Math.ceil(limpo.length / 2);
  return limpo.length > 5 ? `${limpo.slice(0, meio)}-${limpo.slice(meio)}` : limpo;
}

function bytesParaBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Chave da coordenação: 32 bytes aleatórios em base64url, 43 letras. */
export function gerarChave(sortear: Sorteio = sortearBytes): string {
  return bytesParaBase64Url(sortear(32));
}

export function chaveValida(valor: unknown): valor is string {
  return typeof valor === "string" && /^[A-Za-z0-9_-]{43,200}$/.test(valor);
}

export function grupoValido(valor: unknown): valor is string {
  return (
    typeof valor === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)
  );
}

/** O que o QR do cartão abre no celular: o aplicativo, já com o código. */
export function linkDoAplicativo(codigo: string): string {
  return `cadernodebolso://grupo?c=${limparCodigo(codigo)}`;
}

// ---------------------------------------------------------------------------
// Link da coordenação

export type Credenciais = { grupo: string; chave: string };

/**
 * Link da coordenação: `<site>/grupo/#g=<id>&k=<chave>`. A chave fica depois
 * do "#", parte do endereço que o navegador nunca manda para servidor nenhum.
 */
export function linkDaCoordenacao(siteComBase: string, credenciais: Credenciais): string {
  const site = siteComBase.replace(/\/+$/, "");
  return `${site}/grupo/#g=${credenciais.grupo}&k=${credenciais.chave}`;
}

export type LeituraLink = { tipo: "vazio" } | { tipo: "invalido" } | ({ tipo: "ok" } & Credenciais);

/** Lê o "#g=...&k=..." do endereço. Nunca lança erro. */
export function lerLinkDaCoordenacao(hash: string): LeituraLink {
  const texto = hash.replace(/^#/, "");
  if (!texto) return { tipo: "vazio" };
  const parametros = new URLSearchParams(texto);
  const grupo = parametros.get("g")?.trim();
  const chave = parametros.get("k")?.trim();
  if (!grupo && !chave) return { tipo: "vazio" };
  if (!grupoValido(grupo) || !chaveValida(chave)) return { tipo: "invalido" };
  return { tipo: "ok", grupo: grupo.toLowerCase(), chave };
}

// ---------------------------------------------------------------------------
// Grupo lembrado neste aparelho

export const CHAVE_GRUPO_LEMBRADO = "caderno-de-bolso:grupo:v1";

export type GrupoLembrado = Credenciais & {
  nome: string;
  /** Só existe quando o grupo foi criado neste aparelho. */
  codigo?: string;
};

export function lerGrupoLembrado(cru: string | null | undefined): GrupoLembrado | null {
  if (!cru) return null;
  try {
    const o: unknown = JSON.parse(cru);
    if (typeof o !== "object" || o === null) return null;
    const d = o as Record<string, unknown>;
    if (!grupoValido(d.grupo) || !chaveValida(d.chave)) return null;
    const nome = limparTexto(d.nome, LIMITE_NOME_GRUPO) ?? "";
    const codigo = typeof d.codigo === "string" && codigoValido(d.codigo) ? d.codigo : undefined;
    return { grupo: d.grupo, chave: d.chave, nome, ...(codigo ? { codigo } : {}) };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// O que vem do servidor

/** Uma visita reunida no grupo, já no formato do site. */
export type VisitaRecebida = {
  /** Id do registro no servidor (único no grupo). */
  id: string;
  /** Quando chegou ao servidor (ISO). */
  recebidaEm: string;
  visita: Visita;
};

export type DadosDoGrupo = {
  nome: string;
  criadoEm: string;
  /** Visitas do grupo no servidor. Pode passar de `visitas.length`, que vem cortada. */
  total: number;
  visitas: VisitaRecebida[];
};

function instante(valor: unknown): string {
  return typeof valor === "string" && valor.length <= 40 && !Number.isNaN(Date.parse(valor))
    ? valor
    : "";
}

/**
 * Transforma o registro que veio do servidor numa visita do site. O
 * aplicativo guarda a visita com `updatedAt` (e não `atualizadaEm`) e pode
 * mandar campos a mais: tudo passa pela mesma leitura defensiva que o site usa
 * para arquivos de visita. Devolve null quando não dá para reconhecer nada.
 */
export function adaptarVisitaRecebida(registro: unknown): VisitaRecebida | null {
  if (typeof registro !== "object" || registro === null || Array.isArray(registro)) return null;
  const r = registro as Record<string, unknown>;
  const id = limparTexto(r.id, 80);
  if (!id) return null;
  const dados =
    typeof r.dados === "object" && r.dados !== null && !Array.isArray(r.dados)
      ? (r.dados as Record<string, unknown>)
      : {};
  const atualizadaEm =
    instante(dados.atualizadaEm) || instante(dados.updatedAt) || instante(r.atualizado_em);
  const visita = normalizarVisita({
    ...dados,
    id: limparTexto(dados.id, 60) ?? id,
    atualizadaEm,
    criadaEm: instante(dados.criadaEm) || atualizadaEm,
  });
  if (!visita) return null;
  return { id, recebidaEm: instante(r.recebido_em) || visita.atualizadaEm, visita };
}

/** Lê a resposta de caderno_grupo_listar. Devolve null se não for reconhecível. */
export function lerDadosDoGrupo(resposta: unknown): DadosDoGrupo | null {
  if (typeof resposta !== "object" || resposta === null || Array.isArray(resposta)) return null;
  const o = resposta as Record<string, unknown>;
  const lista = Array.isArray(o.visitas) ? o.visitas.slice(0, LIMITE_VISITAS_GRUPO) : [];
  const vistos = new Set<string>();
  const visitas: VisitaRecebida[] = [];
  for (const item of lista) {
    const v = adaptarVisitaRecebida(item);
    if (!v || vistos.has(v.id)) continue;
    vistos.add(v.id);
    visitas.push(v);
  }
  visitas.sort((a, b) => b.recebidaEm.localeCompare(a.recebidaEm));
  // Respostas antigas não trazem "total": vale o tamanho da lista.
  const total =
    typeof o.total === "number" && Number.isSafeInteger(o.total) && o.total > visitas.length
      ? o.total
      : visitas.length;
  return {
    nome: limparTexto(o.nome, LIMITE_NOME_GRUPO) ?? "Grupo sem nome",
    criadoEm: instante(o.criado_em),
    total,
    visitas,
  };
}

// ---------------------------------------------------------------------------
// Textos para mostrar

export const ROTULO_TIPO: Record<Visita["tipo"], string> = {
  pares: "Visita de pares",
  externo: "Olhar externo",
  "": "",
};

export type FiltroParecer = Parecer | "sem" | "todos";

export function rotuloParecer(parecer: Visita["parecer"]): string {
  return OPCOES_PARECER.find((o) => o.valor === parecer)?.rotulo ?? "Sem parecer";
}

/** Data e hora no jeito brasileiro: "20/11/2026 14:05". Vazio se não for data. */
export function dataHora(iso: string, fusoHorario?: string): string {
  const data = new Date(iso);
  if (!iso || Number.isNaN(data.getTime())) return "";
  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    ...(fusoHorario ? { timeZone: fusoHorario } : {}),
  });
}

/** "2026-11-20" -> "20/11/2026". */
export function dataCurta(iso: string): string {
  if (!dataValida(iso)) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Sem acento e em minúsculas, para buscar nomes. */
export function simplificar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

// ---------------------------------------------------------------------------
// Filtro e resumo

export function filtrarVisitas(
  visitas: VisitaRecebida[],
  filtro: { parecer: FiltroParecer; busca: string },
): VisitaRecebida[] {
  const busca = simplificar(filtro.busca);
  return visitas.filter(({ visita }) => {
    if (filtro.parecer === "sem" && visita.parecer) return false;
    if (filtro.parecer !== "sem" && filtro.parecer !== "todos" && visita.parecer !== filtro.parecer)
      return false;
    return !busca || simplificar(visita.produtor.nome).includes(busca);
  });
}

export type ContagemPergunta = { id: string; texto: string; nao: number; parte: number };

export type ResumoGrupo = {
  total: number;
  porParecer: Record<Parecer | "sem", number>;
  produtores: number;
  /** Perguntas com pelo menos um "Não" ou "Em parte", das que mais têm para as que menos têm. */
  perguntas: ContagemPergunta[];
  ultimaRecebida: string;
};

export function resumirGrupo(visitas: VisitaRecebida[]): ResumoGrupo {
  const porParecer = { conforme: 0, pendencias: 0, nao_conforme: 0, sem: 0 };
  const produtores = new Set<string>();
  const contagem = new Map<string, ContagemPergunta>(
    ITENS.map((i) => [i.id, { id: i.id, texto: i.texto, nao: 0, parte: 0 }]),
  );
  let ultimaRecebida = "";

  for (const { visita, recebidaEm } of visitas) {
    porParecer[visita.parecer || "sem"] += 1;
    const nome = simplificar(visita.produtor.nome).replace(/\s+/g, " ");
    if (nome) produtores.add(nome);
    for (const item of itensVisiveis(visita)) {
      const c = contagem.get(item.id);
      const r = visita.respostas[item.id]?.r;
      if (c && r === "nao") c.nao += 1;
      if (c && r === "parte") c.parte += 1;
    }
    if (recebidaEm > ultimaRecebida) ultimaRecebida = recebidaEm;
  }

  const perguntas = [...contagem.values()]
    .filter((c) => c.nao + c.parte > 0)
    .sort((a, b) => b.nao + b.parte - (a.nao + a.parte) || b.nao - a.nao);

  return {
    total: visitas.length,
    porParecer,
    produtores: produtores.size,
    perguntas,
    ultimaRecebida,
  };
}

// ---------------------------------------------------------------------------
// Planilha (CSV para o Excel em português)

/**
 * Uma célula do CSV. Texto que começa com = + - @ (ou tabulação e retorno)
 * ganha um apóstrofo na frente, para a planilha não executar como fórmula.
 * Depois, se tiver ; aspas ou quebra de linha, vai entre aspas.
 */
export function celulaCsv(valor: string | number): string {
  let texto = String(valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export const COLUNAS_FIXAS = [
  "Produtor visitado",
  "Município",
  "Data da visita",
  "Quem visitou",
  "Tipo",
  "Parecer",
  "Respondidas",
  "Total de perguntas",
  "Recebida em",
  "Respostas Não",
  "Respostas Em parte",
  "Não conformidades anotadas",
] as const;

/**
 * Uma linha por visita, com as colunas acima e uma coluna por pergunta (a
 * resposta escrita por extenso). Separador ";" e marca de UTF-8 no começo,
 * que é o que o Excel em português espera para abrir com os acentos certos.
 */
export function planilhaDasVisitas(visitas: VisitaRecebida[], fusoHorario?: string): string {
  const cabecalho = [...COLUNAS_FIXAS, ...ITENS.map((i) => i.texto)];
  const linhas = visitas.map(({ visita, recebidaEm }) => {
    const p = progresso(visita);
    const visiveis = new Set(itensVisiveis(visita).map((i) => i.id));
    const respostas = [...visiveis].map((id) => visita.respostas[id]?.r);
    return [
      visita.produtor.nome,
      visita.produtor.municipio,
      dataCurta(visita.data),
      visita.visitantes,
      ROTULO_TIPO[visita.tipo],
      visita.parecer ? rotuloParecer(visita.parecer) : "",
      p.feitos,
      p.total,
      dataHora(recebidaEm, fusoHorario),
      respostas.filter((r) => r === "nao").length,
      respostas.filter((r) => r === "parte").length,
      visita.naoConformidades.length,
      ...ITENS.map((i) => {
        const r = visita.respostas[i.id]?.r;
        return r && visiveis.has(i.id) ? ROTULO_RESPOSTA[r] : "";
      }),
    ];
  });
  const corpo = [cabecalho, ...linhas].map((l) => l.map(celulaCsv).join(";")).join("\r\n");
  return `﻿${corpo}\r\n`;
}

/** Nome do arquivo: visitas-nucleo-boa-vista-2026-11-20.csv */
export function nomeDaPlanilha(nomeDoGrupo: string, hoje: string): string {
  const nome =
    simplificar(nomeDoGrupo)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "grupo";
  return `visitas-${nome}-${hoje}.csv`;
}
