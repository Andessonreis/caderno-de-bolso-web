import { describe, expect, it } from "vitest";
import {
  ETAPAS,
  ITENS,
  culturasSensiveisDe,
  hojeIso,
  itensDaEtapa,
  novaVisita,
  pendencias,
  progresso,
  type Visita,
} from "./visita";
import {
  CHAVE_VISITAS,
  apagarVisita,
  listarVisitas,
  nomeDoArquivo,
  normalizarVisita,
  salvarVisita,
  visitaDeArquivo,
  visitaParaArquivo,
  type Armazem,
} from "./armazenamento";

const AGORA = new Date("2026-11-20T10:00:00");

function armazemEmMemoria(inicial: Record<string, string> = {}): Armazem & {
  dados: Record<string, string>;
} {
  const dados = { ...inicial };
  return {
    dados,
    getItem: (k) => (k in dados ? dados[k] : null),
    setItem: (k, v) => {
      dados[k] = v;
    },
  };
}

function visitaCompleta(): Visita {
  const v = novaVisita(AGORA, "v1");
  v.produtor.nome = "Zé Carlos";
  v.tipo = "pares";
  v.usoArmazenamento = "exclusivo";
  v.parecer = "conforme";
  for (const item of ITENS) v.respostas[item.id] = { r: "sim", obs: "" };
  return v;
}

describe("modelo do roteiro", () => {
  it("tem itens com id único e etapa conhecida", () => {
    const ids = ITENS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const etapas = new Set(ETAPAS.map((e) => e.id));
    for (const item of ITENS) expect(etapas.has(item.etapa)).toBe(true);
  });

  it("começa com a data de hoje e sem respostas", () => {
    const v = novaVisita(AGORA, "x");
    expect(v.data).toBe("2026-11-20");
    expect(v.respostas).toEqual({});
    expect(hojeIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("só mostra a comprovação de origem quando há cultura sensível", () => {
    const v = novaVisita(AGORA, "x");
    const ids = () => itensDaEtapa(v, "sementes").map((i) => i.id);
    expect(ids()).not.toContain("sem_comprovacao");
    v.culturasSensiveis = ["milho"];
    expect(ids()).toContain("sem_comprovacao");
  });

  it("só pergunta sobre a separação se o armazém for compartilhado", () => {
    const v = visitaCompleta();
    expect(pendencias(v)).toEqual([]);
    v.usoArmazenamento = "compartilhado";
    const rotulos = pendencias(v).map((p) => p.rotulo);
    expect(rotulos).toContain("Como é feita e registrada a separação");
    expect(rotulos.some((r) => r.includes("separação do produto orgânico"))).toBe(false);
    v.separacao = "Sacos marcados com fita verde e anotação no caderno.";
    v.respostas.col_separacao_ok = { obs: "" };
    expect(pendencias(v).map((p) => p.etapa)).toEqual(["colheita"]);
  });

  it("reconhece culturas sensíveis com e sem acento", () => {
    expect(culturasSensiveisDe(["Milho crioulo", "feijao de corda", "abóbora"])).toEqual([
      "feijão",
      "milho",
    ]);
    expect(culturasSensiveisDe(["ALGODÃO colorido", "soja"])).toEqual(["algodão", "soja"]);
    expect(culturasSensiveisDe(["coentro"])).toEqual([]);
  });
});

describe("progresso", () => {
  it("vai de zero a completo", () => {
    const vazia = novaVisita(AGORA, "x");
    const inicio = progresso(vazia);
    // A data já vem preenchida.
    expect(inicio.feitos).toBe(1);
    expect(inicio.total).toBeGreaterThan(10);

    const completa = visitaCompleta();
    expect(progresso(completa)).toEqual({
      feitos: progresso(completa).total,
      total: progresso(completa).total,
      fracao: 1,
    });
  });

  it("conta itens condicionais quando aparecem", () => {
    const v = visitaCompleta();
    const antes = progresso(v).total;
    v.culturasSensiveis = ["feijão"];
    // A resposta já existia (visitaCompleta responde todos os itens).
    expect(progresso(v)).toMatchObject({ total: antes + 1, feitos: antes + 1 });
    delete v.respostas.sem_comprovacao;
    expect(progresso(v)).toMatchObject({ total: antes + 1, feitos: antes });
    expect(pendencias(v)).toEqual([
      { etapa: "sementes", rotulo: ITENS.find((i) => i.id === "sem_comprovacao")!.texto },
    ]);
  });

  it("lista pendências na ordem das etapas", () => {
    const v = novaVisita(AGORA, "x");
    const etapas = pendencias(v).map((p) => ETAPAS.findIndex((e) => e.id === p.etapa));
    expect([...etapas].sort((a, b) => a - b)).toEqual(etapas);
  });
});

describe("armazenamento local", () => {
  it("salva, lista e apaga", () => {
    const armazem = armazemEmMemoria();
    const a = { ...novaVisita(AGORA, "a"), atualizadaEm: "2026-11-01T00:00:00.000Z" };
    const b = { ...novaVisita(AGORA, "b"), atualizadaEm: "2026-11-02T00:00:00.000Z" };
    salvarVisita(armazem, a);
    salvarVisita(armazem, b);
    expect(listarVisitas(armazem).map((v) => v.id)).toEqual(["b", "a"]);

    salvarVisita(armazem, { ...a, atualizadaEm: "2026-11-03T00:00:00.000Z", visitantes: "Ana" });
    const lista = listarVisitas(armazem);
    expect(lista.map((v) => v.id)).toEqual(["a", "b"]);
    expect(lista[0].visitantes).toBe("Ana");

    expect(apagarVisita(armazem, "a").map((v) => v.id)).toEqual(["b"]);
    expect(listarVisitas(armazem).map((v) => v.id)).toEqual(["b"]);
  });

  it("aguenta dados estragados no aparelho", () => {
    expect(listarVisitas(armazemEmMemoria({ [CHAVE_VISITAS]: "{não é json" }))).toEqual([]);
    expect(listarVisitas(armazemEmMemoria({ [CHAVE_VISITAS]: '{"a":1}' }))).toEqual([]);
    const misturado = JSON.stringify([null, 3, { semId: true }, novaVisita(AGORA, "ok")]);
    expect(
      listarVisitas(armazemEmMemoria({ [CHAVE_VISITAS]: misturado })).map((v) => v.id),
    ).toEqual(["ok"]);
  });
});

describe("arquivo da visita", () => {
  it("faz ida e volta", () => {
    const v = visitaCompleta();
    v.naoConformidades = [{ id: "n1", descricao: "Anotar caldas", prazo: "2026-12-20" }];
    v.observacoes = "Linha 1\nLinha 2";
    const resultado = visitaDeArquivo(visitaParaArquivo(v));
    expect(resultado).toEqual({ ok: true, visita: v });
  });

  it("recusa arquivos que não são visita", () => {
    expect(visitaDeArquivo("oi")).toMatchObject({ ok: false });
    expect(visitaDeArquivo('{"formato":"outro"}')).toMatchObject({ ok: false });
    expect(
      visitaDeArquivo('{"formato":"caderno-de-bolso/visita","versao":9,"visita":{}}'),
    ).toMatchObject({ ok: false, mensagem: expect.stringContaining("versão") });
  });

  it("limpa valores fora do esperado", () => {
    const v = normalizarVisita({
      id: "x",
      tipo: "inventado",
      parecer: "talvez",
      data: "ontem",
      culturasSensiveis: ["milho", "trigo"],
      respostas: {
        doc_caderno: { r: "sim", obs: 5 },
        item_falso: { r: "sim" },
        doc_dtc: { r: "?" },
      },
      naoConformidades: [{ descricao: "x", prazo: "amanhã" }, "lixo"],
    });
    expect(v).not.toBeNull();
    expect(v!.tipo).toBe("");
    expect(v!.parecer).toBe("");
    expect(v!.data).toBe("");
    expect(v!.culturasSensiveis).toEqual(["milho"]);
    expect(v!.respostas).toEqual({ doc_caderno: { r: "sim", obs: "" } });
    expect(v!.naoConformidades).toHaveLength(1);
    expect(v!.naoConformidades[0].prazo).toBe("");
  });

  it("dá nome legível ao arquivo", () => {
    const v = visitaCompleta();
    v.produtor.nome = "Zé Carlos da Conceição";
    expect(nomeDoArquivo(v)).toBe("visita-ze-carlos-da-conceicao-2026-11-20.json");
  });
});
