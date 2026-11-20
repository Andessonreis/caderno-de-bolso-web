import { describe, expect, it } from "vitest";
import { comBase, normalizarBasePath } from "./caminho";

describe("base path", () => {
  it("normaliza o prefixo", () => {
    expect(normalizarBasePath(undefined)).toBe("");
    expect(normalizarBasePath("")).toBe("");
    expect(normalizarBasePath("/")).toBe("");
    expect(normalizarBasePath("  ")).toBe("");
    expect(normalizarBasePath("/caderno-de-bolso-web")).toBe("/caderno-de-bolso-web");
    expect(normalizarBasePath("caderno-de-bolso-web/")).toBe("/caderno-de-bolso-web");
    expect(normalizarBasePath("/a/b/")).toBe("/a/b");
  });

  it("recusa prefixos perigosos ou malformados", () => {
    expect(() => normalizarBasePath("/a/../b")).toThrow();
    expect(() => normalizarBasePath("/a//b")).toThrow();
    expect(() => normalizarBasePath("https://x.org")).toThrow();
    expect(() => normalizarBasePath("/com espaço")).toThrow();
  });

  it("junta o prefixo aos caminhos", () => {
    expect(comBase("/sw.js", "")).toBe("/sw.js");
    expect(comBase("/sw.js", "/caderno-de-bolso-web")).toBe("/caderno-de-bolso-web/sw.js");
    expect(comBase("/", "/caderno-de-bolso-web")).toBe("/caderno-de-bolso-web/");
    expect(() => comBase("sw.js", "")).toThrow();
  });
});
