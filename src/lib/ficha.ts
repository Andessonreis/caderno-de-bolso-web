/**
 * Ficha do produtor: o formato compartilhado com o app de celular.
 *
 * URL: /ficha#d=<payload>, onde payload = base64url (sem "=") dos bytes UTF-8
 * de JSON.stringify(ficha). O payload vem de fora (QR na banca, link colado),
 * então toda leitura é defensiva: tipos conferidos, textos limpos e cortados,
 * listas truncadas e campos desconhecidos descartados.
 */

export const VERSAO_FICHA = 1;

export type Ficha = {
  v: 1;
  /** Nome do produtor (obrigatório). */
  n: string;
  /** Município. */
  m?: string;
  /** Cooperativa ou núcleo. */
  c?: string;
  /** Organismo de certificação participativa (OPAC). */
  o?: string;
  /** Identificação do certificado. */
  ct?: string;
  /** Certificado desde (ano). */
  d?: number;
  /** Registro no cadastro nacional de produtores orgânicos. */
  r?: string;
  /** Código do sistema de rastreio que o produtor já usa. */
  s?: string;
  /** Culturas (no máximo 12). */
  cu?: string[];
  /** Data da última anotação no caderno (AAAA-MM-DD). */
  u?: string;
};

export type ResultadoLeitura =
  { ok: true; ficha: Ficha } | { ok: false; motivo: "vazio" | "invalido" | "versao" };

/** Limites de tamanho de cada campo de texto. */
export const LIMITES = {
  n: 80,
  m: 60,
  c: 80,
  o: 80,
  ct: 60,
  r: 60,
  s: 60,
  cultura: 40,
  culturas: 12,
} as const;

/** Payloads maiores que isto nem são lidos. */
export const TAMANHO_MAXIMO_PAYLOAD = 4000;

export const ANO_MINIMO = 1950;
export const ANO_MAXIMO = 2100;

const CAMPOS_TEXTO = ["m", "c", "o", "ct", "r", "s"] as const;

/** Caracteres de controle e de direção de texto, que podem disfarçar conteúdo. */
const CARACTERES_INVISIVEIS = new RegExp(
  "[\\u0000-\\u001F\\u007F-\\u009F\\u200B-\\u200F\\u2028-\\u202E\\u2066-\\u2069]",
  "g",
);

// ---------------------------------------------------------------------------
// base64url <-> UTF-8

function bytesParaBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlParaBytes(texto: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(texto)) return null;
  // Comprimento 4k+1 nunca é base64 válido.
  if (texto.length % 4 === 1) return null;
  const base64 = texto.replace(/-/g, "+").replace(/_/g, "/");
  const comPadding = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  try {
    const binario = atob(comPadding);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Limpeza de campos

/** Remove caracteres de controle, junta espaços repetidos e corta no limite. */
export function limparTexto(valor: unknown, limite: number): string | undefined {
  if (typeof valor !== "string") return undefined;
  const limpo = valor.replace(CARACTERES_INVISIVEIS, " ").replace(/\s+/g, " ").trim();
  if (!limpo) return undefined;
  // Array.from respeita caracteres fora do BMP ao cortar.
  const letras = Array.from(limpo);
  return letras.length > limite ? letras.slice(0, limite).join("").trim() : limpo;
}

/** Confere uma data AAAA-MM-DD que exista de verdade no calendário. */
export function dataValida(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split("-").map(Number);
  if (ano < ANO_MINIMO || ano > ANO_MAXIMO) return false;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  );
}

/**
 * Monta uma ficha limpa a partir de qualquer objeto. Devolve null se não houver
 * nome. Campos opcionais com valor ruim são simplesmente descartados.
 */
export function normalizarFicha(entrada: unknown): Ficha | null {
  if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) return null;
  const obj = entrada as Record<string, unknown>;

  const nome = limparTexto(obj.n, LIMITES.n);
  if (!nome) return null;

  const ficha: Ficha = { v: 1, n: nome };

  for (const campo of CAMPOS_TEXTO) {
    const valor = limparTexto(obj[campo], LIMITES[campo]);
    if (valor) ficha[campo] = valor;
  }

  if (
    typeof obj.d === "number" &&
    Number.isInteger(obj.d) &&
    obj.d >= ANO_MINIMO &&
    obj.d <= ANO_MAXIMO
  ) {
    ficha.d = obj.d;
  }

  if (Array.isArray(obj.cu)) {
    const vistas = new Set<string>();
    const culturas: string[] = [];
    for (const item of obj.cu) {
      if (culturas.length >= LIMITES.culturas) break;
      const cultura = limparTexto(item, LIMITES.cultura);
      if (!cultura) continue;
      const chave = cultura.toLocaleLowerCase("pt-BR");
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      culturas.push(cultura);
    }
    if (culturas.length) ficha.cu = culturas;
  }

  if (dataValida(obj.u)) ficha.u = obj.u;

  return ficha;
}

// ---------------------------------------------------------------------------
// Ida e volta

/** Transforma a ficha no payload base64url. Campos vazios são omitidos. */
export function encodeFicha(ficha: Omit<Ficha, "v"> & { v?: number }): string {
  const limpa = normalizarFicha({ ...ficha, v: VERSAO_FICHA });
  if (!limpa) throw new Error("A ficha precisa ter o nome do produtor.");
  // Ordem fixa das chaves, igual à do contrato.
  const ordenada: Record<string, unknown> = {};
  for (const chave of ["v", "n", "m", "c", "o", "ct", "d", "r", "s", "cu", "u"] as const) {
    if (limpa[chave] !== undefined) ordenada[chave] = limpa[chave];
  }
  return bytesParaBase64Url(new TextEncoder().encode(JSON.stringify(ordenada)));
}

/** Lê um payload base64url. Nunca lança erro. */
export function decodeFicha(payload: string | null | undefined): ResultadoLeitura {
  if (typeof payload !== "string") return { ok: false, motivo: "vazio" };
  const texto = payload.trim();
  if (!texto) return { ok: false, motivo: "vazio" };
  if (texto.length > TAMANHO_MAXIMO_PAYLOAD) return { ok: false, motivo: "invalido" };

  const bytes = base64UrlParaBytes(texto);
  if (!bytes) return { ok: false, motivo: "invalido" };

  let dados: unknown;
  try {
    const json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    dados = JSON.parse(json);
  } catch {
    return { ok: false, motivo: "invalido" };
  }

  if (typeof dados !== "object" || dados === null || Array.isArray(dados)) {
    return { ok: false, motivo: "invalido" };
  }
  const versao = (dados as Record<string, unknown>).v;
  if (versao !== VERSAO_FICHA) {
    return { ok: false, motivo: typeof versao === "number" ? "versao" : "invalido" };
  }

  const ficha = normalizarFicha(dados);
  return ficha ? { ok: true, ficha } : { ok: false, motivo: "invalido" };
}

/** Pega o payload do hash da página ("#d=..."). */
export function payloadDoHash(hash: string): string | null {
  const semCerquilha = hash.startsWith("#") ? hash.slice(1) : hash;
  for (const parte of semCerquilha.split("&")) {
    if (parte.startsWith("d=")) return parte.slice(2);
  }
  return null;
}

/**
 * Aceita o que a pessoa colar: o link completo da ficha ("…/ficha#d=…") ou só
 * o código. Devolve o payload ou null.
 */
export function extrairPayload(entrada: string): string | null {
  const texto = entrada.trim();
  if (!texto) return null;
  const cerquilha = texto.indexOf("#");
  if (cerquilha >= 0) return payloadDoHash(texto.slice(cerquilha));
  if (texto.startsWith("d=")) return texto.slice(2);
  return /^[A-Za-z0-9_-]+$/.test(texto) ? texto : null;
}

/** Monta o link público da ficha. `base` é a origem do site, sem barra no fim. */
export function linkDaFicha(base: string, ficha: Omit<Ficha, "v">): string {
  return `${base.replace(/\/+$/, "")}/ficha#d=${encodeFicha(ficha)}`;
}

// ---------------------------------------------------------------------------
// Datas por extenso

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "2026-11-20" -> "20 de novembro de 2026". Devolve "" se a data for ruim. */
export function dataPorExtenso(iso: string): string {
  if (!dataValida(iso)) return "";
  const [ano, mes, dia] = iso.split("-").map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}

/** Ficha de demonstração: persona fictícia, usada no botão "Ver ficha de exemplo". */
export const FICHA_EXEMPLO: Ficha = {
  v: 1,
  n: "Zé Carlos da Silva",
  m: "Canarana-BA",
  c: "Cooperativa Sementes do Sertão (exemplo)",
  o: "Grupo de certificação participativa do território (exemplo)",
  ct: "EXEMPLO-0042",
  d: 2020,
  r: "EXEMPLO-BA-1234",
  cu: ["milho crioulo", "feijão de corda", "abóbora", "coentro"],
  u: "2026-11-12",
};
