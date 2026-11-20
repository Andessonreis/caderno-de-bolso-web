import { describe, expect, it } from "vitest";
import {
  CHAVE_RESERVA,
  CHAVE_VISITAS,
  LIMITES_VISITA,
  apagarVisita,
  avaliarImportacao,
  comoCopia,
  lerReserva,
  lerVisitas,
  listarVisitas,
  salvarVisita,
  type Armazem,
} from "./armazenamento";
import { novaVisita, type Visita } from "./visita";

const AGORA = new Date("2026-11-20T10:00:00.000Z");

function armazem(inicial: Record<string, string> = {}, cheio = false) {
  const dados: Record<string, string> = { ...inicial };
  const a: Armazem & { dados: Record<string, string> } = {
    dados,
    getItem: (k) => (k in dados ? dados[k] : null),
    setItem: (k, v) => {
      if (cheio) throw new Error("QuotaExceededError");
      dados[k] = v;
    },
  };
  return a;
}

function visita(id: string, atualizadaEm: string, nome = "Zé"): Visita {
  const v = novaVisita(AGORA, id);
  v.produtor.nome = nome;
  v.atualizadaEm = atualizadaEm;
  return v;
}

describe("conteúdo estragado no aparelho", () => {
  it("percebe JSON quebrado, formato errado e itens ilegíveis", () => {
    expect(lerVisitas(null)).toEqual({ visitas: [], estragado: false });
    expect(lerVisitas("[]")).toEqual({ visitas: [], estragado: false });
    expect(lerVisitas("{quebrado").estragado).toBe(true);
    expect(lerVisitas('{"a":1}').estragado).toBe(true);
    const misturado = JSON.stringify([visita("ok", AGORA.toISOString()), { lixo: true }]);
    const leitura = lerVisitas(misturado);
    expect(leitura.estragado).toBe(true);
    expect(leitura.visitas.map((v) => v.id)).toEqual(["ok"]);
  });

  it("guarda o conteúdo cru na reserva antes de regravar", () => {
    const a = armazem({ [CHAVE_VISITAS]: "{quebrado" });
    salvarVisita(a, visita("nova", AGORA.toISOString()), AGORA);
    expect(lerReserva(a.dados[CHAVE_RESERVA])).toEqual([
      { em: AGORA.toISOString(), conteudo: "{quebrado" },
    ]);
    expect(listarVisitas(a).map((v) => v.id)).toEqual(["nova"]);
    expect(lerVisitas(a.dados[CHAVE_VISITAS]).estragado).toBe(false);
  });

  it("também protege ao apagar e não duplica a mesma cópia", () => {
    const cru = JSON.stringify([visita("a", AGORA.toISOString()), 42]);
    const a = armazem({
      [CHAVE_VISITAS]: cru,
      [CHAVE_RESERVA]: JSON.stringify([{ em: "x", conteudo: cru }]),
    });
    apagarVisita(a, "a", AGORA);
    expect(lerReserva(a.dados[CHAVE_RESERVA])).toHaveLength(1);
    expect(listarVisitas(a)).toEqual([]);
  });

  it("não mexe na reserva quando está tudo bem", () => {
    const a = armazem();
    salvarVisita(a, visita("a", AGORA.toISOString()), AGORA);
    salvarVisita(a, visita("b", AGORA.toISOString()), AGORA);
    expect(a.dados[CHAVE_RESERVA]).toBeUndefined();
  });

  it("não regrava a lista se não houver espaço para a cópia", () => {
    const a = armazem({ [CHAVE_VISITAS]: "{quebrado" }, true);
    expect(() => salvarVisita(a, visita("nova", AGORA.toISOString()), AGORA)).toThrow();
    expect(a.dados[CHAVE_VISITAS]).toBe("{quebrado");
  });

  it("lê uma reserva estragada sem perder o conteúdo", () => {
    expect(lerReserva(null)).toEqual([]);
    expect(lerReserva("texto solto")).toEqual([{ em: "", conteudo: "texto solto" }]);
  });
});

describe("abrir arquivo de uma visita que já existe", () => {
  const local = visita("v1", "2026-11-20T12:00:00.000Z");

  it("é nova quando o id não existe", () => {
    expect(avaliarImportacao([local], visita("v2", "2026-11-20T09:00:00.000Z"))).toEqual({
      tipo: "nova",
    });
  });

  it("pede confirmação quando a cópia do aparelho é mais nova", () => {
    expect(avaliarImportacao([local], visita("v1", "2026-11-20T11:00:00.000Z"))).toEqual({
      tipo: "localMaisNova",
      local,
    });
  });

  it("substitui sem perguntar quando o arquivo é mais novo ou igual", () => {
    expect(avaliarImportacao([local], visita("v1", "2026-11-20T13:00:00.000Z")).tipo).toBe(
      "arquivoMaisNovo",
    );
    expect(avaliarImportacao([local], visita("v1", local.atualizadaEm)).tipo).toBe(
      "arquivoMaisNovo",
    );
  });

  it("guarda como cópia com outro id e o nome marcado", () => {
    const copia = comoCopia(local, AGORA, "outro");
    expect(copia.id).toBe("outro");
    expect(copia.produtor.nome).toBe("Zé (cópia)");
    expect(copia.atualizadaEm).toBe(AGORA.toISOString());
    expect(copia.respostas).toEqual(local.respostas);

    const longo = comoCopia(visita("v", AGORA.toISOString(), "x".repeat(80)), AGORA, "y");
    expect(Array.from(longo.produtor.nome)).toHaveLength(LIMITES_VISITA.nome);
    expect(longo.produtor.nome.endsWith(" (cópia)")).toBe(true);

    const a = armazem();
    salvarVisita(a, local, AGORA);
    salvarVisita(a, copia, AGORA);
    expect(listarVisitas(a)).toHaveLength(2);
  });
});
