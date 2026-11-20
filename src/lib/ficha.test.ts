import { describe, expect, it } from "vitest";
import {
  FICHA_EXEMPLO,
  LIMITES,
  TAMANHO_MAXIMO_PAYLOAD,
  dataPorExtenso,
  dataValida,
  decodeFicha,
  encodeFicha,
  extrairPayload,
  linkDaFicha,
  payloadDoHash,
} from "./ficha";

/** Codifica qualquer objeto do jeito que o app faz, sem passar pela validação. */
function codificarCru(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("encodeFicha / decodeFicha", () => {
  it("faz ida e volta com acentos e cedilha", () => {
    const ficha = {
      n: "Maria Conceição Araújo",
      m: "São Gabriel",
      c: "Núcleo Pé de Serra",
      cu: ["milho crioulo", "feijão", "açafrão", "maçã"],
      u: "2026-11-20",
      d: 2019,
    };
    const resultado = decodeFicha(encodeFicha(ficha));
    expect(resultado).toEqual({ ok: true, ficha: { v: 1, ...ficha } });
  });

  it("gera base64url sem padding e sem + ou /", () => {
    for (let i = 0; i < 30; i++) {
      const payload = encodeFicha({ n: "Zé" + "ã".repeat(i), m: "?>~".repeat(i % 5) });
      expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("omite chaves vazias", () => {
    const payload = encodeFicha({ n: "Ana", m: "  ", c: "", cu: [] });
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(payload.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
    );
    expect(JSON.parse(json)).toEqual({ v: 1, n: "Ana" });
  });

  it("lê payload gerado por outro sistema seguindo o contrato", () => {
    const payload = codificarCru({ v: 1, n: "Zé", cu: ["milho crioulo"], s: "ABC-1" });
    expect(decodeFicha(payload)).toEqual({
      ok: true,
      ficha: { v: 1, n: "Zé", cu: ["milho crioulo"], s: "ABC-1" },
    });
  });

  it("aceita a ficha de exemplo", () => {
    const resultado = decodeFicha(encodeFicha(FICHA_EXEMPLO));
    expect(resultado).toEqual({ ok: true, ficha: FICHA_EXEMPLO });
  });

  it("recusa ficha sem nome ao codificar", () => {
    expect(() => encodeFicha({ n: "   " })).toThrow();
  });
});

describe("decodeFicha com entrada ruim", () => {
  it("trata vazio", () => {
    expect(decodeFicha("")).toEqual({ ok: false, motivo: "vazio" });
    expect(decodeFicha(null)).toEqual({ ok: false, motivo: "vazio" });
    expect(decodeFicha(undefined)).toEqual({ ok: false, motivo: "vazio" });
  });

  it("trata payload corrompido", () => {
    const bom = encodeFicha({ n: "Zé Carlos", m: "Canarana" });
    expect(decodeFicha(bom.slice(0, -3) + "%%%")).toEqual({ ok: false, motivo: "invalido" });
    expect(decodeFicha(bom.slice(0, Math.floor(bom.length / 2)))).toMatchObject({ ok: false });
    expect(decodeFicha("a")).toEqual({ ok: false, motivo: "invalido" });
    expect(decodeFicha("<script>alert(1)</script>")).toEqual({ ok: false, motivo: "invalido" });
  });

  it("trata JSON que não é objeto", () => {
    expect(decodeFicha(codificarCru([1, 2]))).toEqual({ ok: false, motivo: "invalido" });
    expect(decodeFicha(codificarCru("texto"))).toEqual({ ok: false, motivo: "invalido" });
    expect(decodeFicha(codificarCru(null))).toEqual({ ok: false, motivo: "invalido" });
  });

  it("trata bytes que não são UTF-8", () => {
    const payload = btoa(String.fromCharCode(0xff, 0xfe, 0x7b)).replace(/=+$/, "");
    expect(decodeFicha(payload)).toEqual({ ok: false, motivo: "invalido" });
  });

  it("separa versão desconhecida", () => {
    expect(decodeFicha(codificarCru({ v: 2, n: "Zé" }))).toEqual({ ok: false, motivo: "versao" });
    expect(decodeFicha(codificarCru({ v: "1", n: "Zé" }))).toEqual({
      ok: false,
      motivo: "invalido",
    });
    expect(decodeFicha(codificarCru({ n: "Zé" }))).toEqual({ ok: false, motivo: "invalido" });
  });

  it("exige o nome", () => {
    expect(decodeFicha(codificarCru({ v: 1, m: "Irecê" }))).toEqual({
      ok: false,
      motivo: "invalido",
    });
    expect(decodeFicha(codificarCru({ v: 1, n: 42 }))).toEqual({ ok: false, motivo: "invalido" });
  });

  it("aceita campos faltando e descarta os de tipo errado", () => {
    const payload = codificarCru({
      v: 1,
      n: "Zé",
      m: 123,
      d: "2020",
      cu: "milho",
      u: "20/11/2026",
      extra: "ignorado",
      __proto__: { x: 1 },
    });
    expect(decodeFicha(payload)).toEqual({ ok: true, ficha: { v: 1, n: "Zé" } });
  });

  it("descarta ano fora da faixa e data que não existe", () => {
    const payload = codificarCru({ v: 1, n: "Zé", d: 1800, u: "2026-02-30" });
    expect(decodeFicha(payload)).toEqual({ ok: true, ficha: { v: 1, n: "Zé" } });
    const payload2 = codificarCru({ v: 1, n: "Zé", d: 2020.5 });
    expect(decodeFicha(payload2)).toEqual({ ok: true, ficha: { v: 1, n: "Zé" } });
  });

  it("limita tamanho de textos e da lista de culturas", () => {
    const culturas = Array.from({ length: 30 }, (_, i) => `cultura ${i}`);
    const payload = codificarCru({ v: 1, n: "x".repeat(500), cu: culturas });
    const resultado = decodeFicha(payload);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.ficha.n).toHaveLength(LIMITES.n);
    expect(resultado.ficha.cu).toHaveLength(LIMITES.culturas);
  });

  it("limpa caracteres de controle, itens vazios e repetidos", () => {
    const payload = codificarCru({
      v: 1,
      n: "  Zé\u0000\n Carlos\u202E ",
      cu: ["milho", "", 7, "Milho", " feijão "],
    });
    expect(decodeFicha(payload)).toEqual({
      ok: true,
      ficha: { v: 1, n: "Zé Carlos", cu: ["milho", "feijão"] },
    });
  });

  it("recusa payload grande demais", () => {
    expect(decodeFicha("A".repeat(TAMANHO_MAXIMO_PAYLOAD + 4))).toEqual({
      ok: false,
      motivo: "invalido",
    });
  });
});

describe("links", () => {
  it("monta o link e lê de volta pelo hash", () => {
    const link = linkDaFicha("https://exemplo.org/", { n: "Zé" });
    expect(link.startsWith("https://exemplo.org/ficha#d=")).toBe(true);
    const payload = extrairPayload(link);
    expect(decodeFicha(payload)).toEqual({ ok: true, ficha: { v: 1, n: "Zé" } });
  });

  it("extrai o payload de link, de hash ou do código puro", () => {
    expect(extrairPayload("https://x.org/ficha/#d=abc_-1")).toBe("abc_-1");
    expect(extrairPayload("  abc_-1 ")).toBe("abc_-1");
    expect(extrairPayload("d=abc")).toBe("abc");
    expect(extrairPayload("https://x.org/ficha")).toBeNull();
    expect(extrairPayload("isso não é código")).toBeNull();
    expect(extrairPayload("")).toBeNull();
  });

  it("lê o hash com ou sem outros parâmetros", () => {
    expect(payloadDoHash("#d=abc")).toBe("abc");
    expect(payloadDoHash("#x=1&d=abc")).toBe("abc");
    expect(payloadDoHash("")).toBeNull();
  });
});

describe("datas", () => {
  it("escreve a data por extenso", () => {
    expect(dataPorExtenso("2026-11-20")).toBe("20 de novembro de 2026");
    expect(dataPorExtenso("2026-03-01")).toBe("1 de março de 2026");
    expect(dataPorExtenso("2026-13-01")).toBe("");
  });

  it("confere datas reais", () => {
    expect(dataValida("2024-02-29")).toBe(true);
    expect(dataValida("2025-02-29")).toBe(false);
    expect(dataValida("2025-2-1")).toBe(false);
  });
});
