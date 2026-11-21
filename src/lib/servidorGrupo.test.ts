import { describe, expect, it } from "vitest";
import { apagarGrupo, classificarErro, criarGrupo, listarGrupo } from "./servidorGrupo";

const GRUPO = "6797ed3a-a876-4b6f-914d-f36573ba888f";
const CHAVE = "b".repeat(43);

type Chamada = { url: string; init: RequestInit };

/** fetch de mentira: devolve as respostas da lista, na ordem, e anota as chamadas. */
function servidorFalso(respostas: Array<{ status: number; corpo?: unknown } | "caiu">) {
  const chamadas: Chamada[] = [];
  let i = 0;
  const falso = (async (url: string, init: RequestInit) => {
    chamadas.push({ url, init });
    const r = respostas[i++];
    if (r === "caiu") throw new TypeError("Failed to fetch");
    const texto = r.corpo === undefined ? "" : JSON.stringify(r.corpo);
    return new Response(r.status === 204 ? null : texto, { status: r.status });
  }) as unknown as typeof fetch;
  return { falso, chamadas, corpo: (n: number) => JSON.parse(String(chamadas[n].init.body)) };
}

const config = (falso: typeof fetch) => ({
  fetch: falso,
  url: "https://servidor.teste",
  chavePublica: "pub",
});

describe("erros do servidor", () => {
  it("separa chave que não confere de pedido recusado e de falha", () => {
    expect(classificarErro(403, { code: "28000", message: "chave_nao_confere" })).toBe(
      "naoConfere",
    );
    expect(classificarErro(400, { code: "22023", message: "nome_invalido" })).toBe("recusado");
    expect(classificarErro(500, null)).toBe("servidor");
    expect(classificarErro(401, "x")).toBe("naoConfere");
  });
});

describe("criar grupo", () => {
  it("manda nome, código e chave e devolve tudo o que a coordenação precisa", async () => {
    const s = servidorFalso([{ status: 200, corpo: GRUPO }]);
    const r = await criarGrupo("  Núcleo   Boa Vista ", config(s.falso));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.grupo).toBe(GRUPO);
    expect(r.valor.nome).toBe("Núcleo Boa Vista");
    expect(s.chamadas[0].url).toBe("https://servidor.teste/rest/v1/rpc/caderno_grupo_criar");
    expect(s.chamadas[0].init.method).toBe("POST");
    expect((s.chamadas[0].init.headers as Record<string, string>).apikey).toBe("pub");
    expect(s.corpo(0)).toEqual({
      p_nome: "Núcleo Boa Vista",
      p_codigo: r.valor.codigo,
      p_chave: r.valor.chave,
    });
  });

  it("sorteia outro código quando o primeiro já está em uso", async () => {
    const s = servidorFalso([
      { status: 409, corpo: { code: "23505", message: "codigo_em_uso" } },
      { status: 200, corpo: GRUPO },
    ]);
    const r = await criarGrupo("Grupo", config(s.falso));
    expect(r.ok).toBe(true);
    expect(s.chamadas).toHaveLength(2);
    expect(s.corpo(0).p_codigo).not.toBe(s.corpo(1).p_codigo);
    // A chave é a mesma: só o código muda.
    expect(s.corpo(0).p_chave).toBe(s.corpo(1).p_chave);
  });

  it("não chama o servidor com nome vazio e avisa quando cai a internet", async () => {
    const vazio = servidorFalso([]);
    expect(await criarGrupo("   ", config(vazio.falso))).toEqual({
      ok: false,
      problema: "recusado",
    });
    expect(vazio.chamadas).toHaveLength(0);
    const caiu = servidorFalso(["caiu"]);
    expect(await criarGrupo("Grupo", config(caiu.falso))).toEqual({
      ok: false,
      problema: "semInternet",
    });
  });

  it("desconfia de resposta que não é um id", async () => {
    const s = servidorFalso([{ status: 200, corpo: { id: 1 } }]);
    expect(await criarGrupo("Grupo", config(s.falso))).toEqual({ ok: false, problema: "servidor" });
  });
});

describe("listar e apagar", () => {
  it("lista as visitas do grupo", async () => {
    const s = servidorFalso([
      {
        status: 200,
        corpo: {
          nome: "Grupo",
          criado_em: "2026-11-01T00:00:00Z",
          visitas: [{ id: "r1", dados: {} }],
        },
      },
    ]);
    const r = await listarGrupo({ grupo: GRUPO, chave: CHAVE }, config(s.falso));
    expect(r.ok && r.valor.visitas.map((v) => v.id)).toEqual(["r1"]);
    expect(s.corpo(0)).toEqual({ p_grupo: GRUPO, p_chave: CHAVE });
  });

  it("diz quando a chave não confere", async () => {
    const s = servidorFalso([
      { status: 403, corpo: { code: "28000", message: "chave_nao_confere" } },
    ]);
    expect(await listarGrupo({ grupo: GRUPO, chave: CHAVE }, config(s.falso))).toEqual({
      ok: false,
      problema: "naoConfere",
    });
  });

  it("apaga com 204", async () => {
    const s = servidorFalso([{ status: 204 }]);
    expect(await apagarGrupo({ grupo: GRUPO, chave: CHAVE }, config(s.falso))).toEqual({
      ok: true,
      valor: null,
    });
    expect(s.chamadas[0].url).toBe("https://servidor.teste/rest/v1/rpc/caderno_grupo_apagar");
  });
});
