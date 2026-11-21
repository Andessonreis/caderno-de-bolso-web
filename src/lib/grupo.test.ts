import { describe, expect, it } from "vitest";
import {
  ALFABETO_CODIGO,
  CHAVE_GRUPO_LEMBRADO,
  COLUNAS_FIXAS,
  TAMANHO_CHAVE,
  adaptarVisitaRecebida,
  celulaCsv,
  chaveValida,
  codigoValido,
  dataCurta,
  dataHora,
  filtrarVisitas,
  formatarCodigo,
  gerarChave,
  gerarCodigo,
  grupoValido,
  lerDadosDoGrupo,
  lerGrupoLembrado,
  lerLinkDaCoordenacao,
  limparCodigo,
  linkDaCoordenacao,
  linkDoAplicativo,
  nomeDaPlanilha,
  planilhaDasVisitas,
  resumirGrupo,
  type VisitaRecebida,
} from "./grupo";
import { ITENS, novaVisita, type Visita } from "./visita";

const GRUPO = "6797ed3a-a876-4b6f-914d-f36573ba888f";
const CHAVE = "a".repeat(43);

/** Sorteio previsível: devolve os bytes da lista, em ciclo. */
function sorteioFixo(bytes: number[]) {
  let i = 0;
  return (n: number) => Uint8Array.from({ length: n }, () => bytes[i++ % bytes.length]);
}

function recebida(
  id: string,
  mudar: (v: Visita) => void = () => {},
  recebidaEm = "2026-11-20T10:00:00Z",
): VisitaRecebida {
  const visita = novaVisita(new Date("2026-11-20T09:00:00Z"), `v-${id}`);
  mudar(visita);
  return { id, recebidaEm, visita };
}

describe("código do grupo", () => {
  it("tem 10 letras do alfabeto sem letras parecidas", () => {
    for (let i = 0; i < 50; i++) {
      const codigo = gerarCodigo();
      expect(codigo).toHaveLength(10);
      expect(codigoValido(codigo)).toBe(true);
      expect(codigo).not.toMatch(/[ILO01]/);
    }
  });

  it("descarta bytes que deixariam o sorteio torto", () => {
    // 31 letras: 248 é o primeiro byte descartado (248 = 8 × 31).
    const codigo = gerarCodigo(sorteioFixo([255, 248, 0, 30, 247]));
    // 255 e 248 saem; 0 é a primeira letra; 30 e 247 (247 % 31 = 30) são a última.
    expect(codigo).toBe("A99A99A99A");
    expect(ALFABETO_CODIGO[30]).toBe("9");
  });

  it("sorteia as 31 letras com a mesma frequência", () => {
    // Os bytes 0 a 239, uma vez cada: cada letra sai 7 ou 8 vezes, nunca mais torto que isso.
    let proximo = 0;
    const dezBytes = () => Uint8Array.from({ length: 10 }, () => proximo++);
    const contagem = new Map<string, number>();
    for (let i = 0; i < 24; i++) {
      for (const c of gerarCodigo(dezBytes)) contagem.set(c, (contagem.get(c) ?? 0) + 1);
    }
    expect(contagem.size).toBe(31);
    const vezes = Array.from(contagem.values());
    expect(Math.max(...vezes) - Math.min(...vezes)).toBeLessThanOrEqual(1);
  });

  it("formata, limpa e confere", () => {
    expect(formatarCodigo("ABCDEFGHJK")).toBe("ABCDE-FGHJK");
    expect(limparCodigo(" abcde-fghjk ")).toBe("ABCDEFGHJK");
    expect(codigoValido("abcde fghjk")).toBe(true);
    expect(codigoValido("ABCDE-FGHJ")).toBe(false);
    expect(codigoValido("ABCDE-FGHJ1")).toBe(false);
    expect(codigoValido("ABCDE-FGHJO")).toBe(false);
  });

  it("vira link que abre o aplicativo", () => {
    expect(linkDoAplicativo("ABCDE-FGHJK")).toBe("cadernodebolso://grupo?c=ABCDEFGHJK");
  });
});

describe("chave da coordenação", () => {
  it("tem 43 letras em base64url sem =", () => {
    const chave = gerarChave();
    expect(chave).toHaveLength(TAMANHO_CHAVE);
    expect(chave).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(chaveValida(chave)).toBe(true);
    expect(gerarChave(sorteioFixo([0xff]))).toBe("_".repeat(42) + "8");
  });

  it("recusa chave curta ou com caracteres estranhos", () => {
    expect(chaveValida("a".repeat(42))).toBe(false);
    expect(chaveValida("a".repeat(42) + "=")).toBe(false);
    expect(chaveValida(undefined)).toBe(false);
  });
});

describe("link da coordenação", () => {
  it("monta e lê de volta", () => {
    const link = linkDaCoordenacao("https://exemplo.org/caderno/", { grupo: GRUPO, chave: CHAVE });
    expect(link).toBe(`https://exemplo.org/caderno/grupo/#g=${GRUPO}&k=${CHAVE}`);
    const hash = link.slice(link.indexOf("#"));
    expect(lerLinkDaCoordenacao(hash)).toEqual({ tipo: "ok", grupo: GRUPO, chave: CHAVE });
  });

  it("diferencia link vazio de link estragado", () => {
    expect(lerLinkDaCoordenacao("")).toEqual({ tipo: "vazio" });
    expect(lerLinkDaCoordenacao("#")).toEqual({ tipo: "vazio" });
    expect(lerLinkDaCoordenacao("#outra=coisa")).toEqual({ tipo: "vazio" });
    expect(lerLinkDaCoordenacao(`#g=${GRUPO}`)).toEqual({ tipo: "invalido" });
    expect(lerLinkDaCoordenacao(`#g=123&k=${CHAVE}`)).toEqual({ tipo: "invalido" });
    expect(lerLinkDaCoordenacao(`#g=${GRUPO}&k=${CHAVE.slice(1)}`)).toEqual({ tipo: "invalido" });
  });

  it("confere o formato do id do grupo", () => {
    expect(grupoValido(GRUPO)).toBe(true);
    expect(grupoValido(GRUPO.toUpperCase())).toBe(true);
    expect(grupoValido("nao-e-uuid")).toBe(false);
  });
});

describe("grupo lembrado neste aparelho", () => {
  it("lê o que foi guardado e ignora o que estiver estragado", () => {
    expect(CHAVE_GRUPO_LEMBRADO.startsWith("caderno-de-bolso:")).toBe(true);
    const cru = JSON.stringify({
      grupo: GRUPO,
      chave: CHAVE,
      nome: " Núcleo ",
      codigo: "ABCDEFGHJK",
    });
    expect(lerGrupoLembrado(cru)).toEqual({
      grupo: GRUPO,
      chave: CHAVE,
      nome: "Núcleo",
      codigo: "ABCDEFGHJK",
    });
    expect(lerGrupoLembrado(JSON.stringify({ grupo: GRUPO, chave: CHAVE, codigo: "x" }))).toEqual({
      grupo: GRUPO,
      chave: CHAVE,
      nome: "",
    });
    expect(lerGrupoLembrado("{")).toBeNull();
    expect(lerGrupoLembrado(JSON.stringify({ grupo: "x", chave: CHAVE }))).toBeNull();
    expect(lerGrupoLembrado(null)).toBeNull();
  });
});

describe("visitas que chegam do aplicativo", () => {
  const doAplicativo = {
    id: "r1",
    atualizado_em: "2026-11-19T12:00:00Z",
    recebido_em: "2026-11-19T12:05:00Z",
    dados: {
      id: "app-1",
      criadaEm: "2026-11-18T08:00:00Z",
      updatedAt: "2026-11-19T11:59:00Z",
      produtor: { nome: "Maria‮ das Dores", municipio: "Irecê-BA", culturas: ["feijão"] },
      data: "2026-11-18",
      visitantes: "João, Ana",
      tipo: "pares",
      culturasSensiveis: ["feijão", "trigo"],
      usoArmazenamento: "exclusivo",
      separacao: "",
      respostas: { doc_caderno: { r: "nao", obs: "<b>sem caderno</b>" }, inventada: { r: "sim" } },
      naoConformidades: [{ id: "n1", descricao: "Anotar as vendas", prazo: "2026-12-01" }],
      pontosFortes: "",
      observacoes: "",
      parecer: "pendencias",
      campoNovo: { qualquer: true },
    },
  };

  it("traduz updatedAt e limpa o resto", () => {
    const v = adaptarVisitaRecebida(doAplicativo);
    expect(v).not.toBeNull();
    expect(v!.id).toBe("r1");
    expect(v!.recebidaEm).toBe("2026-11-19T12:05:00Z");
    expect(v!.visita.id).toBe("app-1");
    expect(v!.visita.atualizadaEm).toBe("2026-11-19T11:59:00Z");
    expect(v!.visita.produtor.nome).toBe("Maria das Dores");
    expect(v!.visita.culturasSensiveis).toEqual(["feijão"]);
    expect(v!.visita.respostas).toEqual({ doc_caderno: { r: "nao", obs: "<b>sem caderno</b>" } });
    expect(v!.visita.parecer).toBe("pendencias");
    expect(v!.visita).not.toHaveProperty("campoNovo");
  });

  it("não quebra com dados faltando ou de tipo errado", () => {
    for (const dados of [undefined, null, 42, "texto", [], { produtor: "x", respostas: [1] }]) {
      const v = adaptarVisitaRecebida({ id: "r2", dados });
      expect(v?.visita.produtor.nome).toBe("");
      expect(v?.visita.id).toBe("r2");
    }
    expect(adaptarVisitaRecebida({ dados: {} })).toBeNull();
    expect(adaptarVisitaRecebida("x")).toBeNull();
    expect(adaptarVisitaRecebida(null)).toBeNull();
  });

  it("lê a resposta do servidor, mais recente primeiro e sem repetir", () => {
    const dados = lerDadosDoGrupo({
      nome: "Núcleo Boa Vista",
      criado_em: "2026-11-01T00:00:00Z",
      visitas: [
        { id: "a", recebido_em: "2026-11-02T00:00:00Z", dados: {} },
        { id: "b", recebido_em: "2026-11-03T00:00:00Z", dados: {} },
        { id: "a", recebido_em: "2026-11-04T00:00:00Z", dados: {} },
        "lixo",
      ],
    });
    expect(dados?.nome).toBe("Núcleo Boa Vista");
    expect(dados?.visitas.map((v) => v.id)).toEqual(["b", "a"]);
    expect(lerDadosDoGrupo({ visitas: "não é lista" })).toEqual({
      nome: "Grupo sem nome",
      criadoEm: "",
      total: 0,
      visitas: [],
    });
    expect(lerDadosDoGrupo(null)).toBeNull();
    expect(lerDadosDoGrupo([])).toBeNull();
  });

  it("lê o total do grupo com tolerância", () => {
    const visitas = [{ id: "a", recebido_em: "2026-11-02T00:00:00Z", dados: {} }];
    // Resposta antiga, sem "total": vale o tamanho da lista.
    expect(lerDadosDoGrupo({ visitas })?.total).toBe(1);
    expect(lerDadosDoGrupo({ visitas, total: 3000 })?.total).toBe(3000);
    // Valor estranho ou menor que a lista não vale.
    for (const total of ["3000", -5, 1.5, null, Number.NaN, 0]) {
      expect(lerDadosDoGrupo({ visitas, total })?.total).toBe(1);
    }
  });
});

describe("filtro e resumo", () => {
  const visitas = [
    recebida(
      "1",
      (v) => {
        v.produtor.nome = "José Antônio";
        v.parecer = "conforme";
        v.respostas.doc_caderno = { r: "nao", obs: "" };
        v.respostas.doc_notas = { r: "parte", obs: "" };
      },
      "2026-11-20T10:00:00Z",
    ),
    recebida(
      "2",
      (v) => {
        v.produtor.nome = "jose antonio ";
        v.parecer = "nao_conforme";
        v.respostas.doc_caderno = { r: "nao", obs: "" };
        // Pergunta escondida (sem cultura sensível): não conta.
        v.respostas.sem_comprovacao = { r: "nao", obs: "" };
      },
      "2026-11-21T10:00:00Z",
    ),
    recebida(
      "3",
      (v) => {
        v.produtor.nome = "Rita";
      },
      "2026-11-19T10:00:00Z",
    ),
  ];

  it("filtra por parecer e por nome, sem ligar para acento", () => {
    expect(filtrarVisitas(visitas, { parecer: "todos", busca: "" })).toHaveLength(3);
    expect(filtrarVisitas(visitas, { parecer: "todos", busca: "JOSÉ" }).map((v) => v.id)).toEqual([
      "1",
      "2",
    ]);
    expect(filtrarVisitas(visitas, { parecer: "sem", busca: "" }).map((v) => v.id)).toEqual(["3"]);
    expect(filtrarVisitas(visitas, { parecer: "conforme", busca: "rita" })).toEqual([]);
  });

  it("conta pareceres, produtores e as perguntas com mais Não", () => {
    const r = resumirGrupo(visitas);
    expect(r.total).toBe(3);
    expect(r.porParecer).toEqual({ conforme: 1, pendencias: 0, nao_conforme: 1, sem: 1 });
    expect(r.produtores).toBe(2);
    expect(r.ultimaRecebida).toBe("2026-11-21T10:00:00Z");
    expect(r.perguntas).toEqual([
      { id: "doc_caderno", texto: ITENS[0].texto, nao: 2, parte: 0 },
      { id: "doc_notas", texto: ITENS[2].texto, nao: 0, parte: 1 },
    ]);
    expect(resumirGrupo([]).perguntas).toEqual([]);
  });
});

describe("planilha", () => {
  it("protege contra fórmulas e escapa o separador", () => {
    expect(celulaCsv("=1+1")).toBe("'=1+1");
    expect(celulaCsv("+55 74")).toBe("'+55 74");
    expect(celulaCsv("-2")).toBe("'-2");
    expect(celulaCsv("@SOMA(A1)")).toBe("'@SOMA(A1)");
    expect(celulaCsv('a;b "c"')).toBe('"a;b ""c"""');
    expect(celulaCsv("linha 1\nlinha 2")).toBe('"linha 1\nlinha 2"');
    expect(celulaCsv('=HYPERLINK("x";"y")')).toBe(`"'=HYPERLINK(""x"";""y"")"`);
    expect(celulaCsv(7)).toBe("7");
    expect(celulaCsv("Irecê")).toBe("Irecê");
  });

  it("tem BOM, cabeçalho com uma coluna por pergunta e uma linha por visita", () => {
    const v = recebida(
      "1",
      (x) => {
        x.produtor.nome = "=Maria";
        x.produtor.municipio = "Irecê-BA";
        x.data = "2026-11-18";
        x.tipo = "pares";
        x.parecer = "pendencias";
        x.respostas.doc_caderno = { r: "nao", obs: "" };
        x.respostas.doc_notas = { r: "sim", obs: "" };
        x.naoConformidades = [{ id: "n", descricao: "x", prazo: "" }];
      },
      "2026-11-19T15:05:00Z",
    );
    const csv = planilhaDasVisitas([v], "America/Bahia");
    expect(csv.startsWith("﻿")).toBe(true);
    const linhas = csv.slice(1).trimEnd().split("\r\n");
    expect(linhas).toHaveLength(2);
    const cabecalho = linhas[0].split(";");
    expect(cabecalho).toHaveLength(COLUNAS_FIXAS.length + ITENS.length);
    expect(cabecalho[0]).toBe("Produtor visitado");
    const celulas = linhas[1].split(";");
    expect(celulas.slice(0, 12)).toEqual([
      "'=Maria",
      "Irecê-BA",
      "18/11/2026",
      "",
      "Visita de pares",
      "Conforme com pendências",
      "6", // nome, data, tipo, parecer e duas perguntas
      String(5 + ITENS.length - 2),
      "19/11/2026, 12:05",
      "1",
      "0",
      "1",
    ]);
    expect(celulas[12]).toBe("Não");
    expect(celulas[14]).toBe("Sim");
  });

  it("dá um nome de arquivo simples", () => {
    expect(nomeDaPlanilha("Núcleo Boa Vista!", "2026-11-20")).toBe(
      "visitas-nucleo-boa-vista-2026-11-20.csv",
    );
    expect(nomeDaPlanilha("***", "2026-11-20")).toBe("visitas-grupo-2026-11-20.csv");
  });

  it("formata datas sem quebrar com lixo", () => {
    expect(dataCurta("2026-11-20")).toBe("20/11/2026");
    expect(dataCurta("ontem")).toBe("");
    expect(dataHora("")).toBe("");
    expect(dataHora("não é data")).toBe("");
  });
});
