/**
 * Modelo do roteiro de apoio à visita de pares.
 *
 * As perguntas são dados (o array ITENS), não JSX repetido: a tela, o resumo,
 * a folha de impressão e o cálculo de progresso leem todos daqui.
 */

export type Resposta = "sim" | "parte" | "nao" | "na";

export const OPCOES_RESPOSTA: ReadonlyArray<{ valor: Resposta; rotulo: string }> = [
  { valor: "sim", rotulo: "Sim" },
  { valor: "parte", rotulo: "Em parte" },
  { valor: "nao", rotulo: "Não" },
  { valor: "na", rotulo: "Não se aplica" },
];

export const ROTULO_RESPOSTA: Record<Resposta, string> = {
  sim: "Sim",
  parte: "Em parte",
  nao: "Não",
  na: "Não se aplica",
};

export type EtapaId =
  | "identificacao"
  | "documentos"
  | "sementes"
  | "insumos"
  | "colheita"
  | "controle"
  | "fechamento";

export type Etapa = { id: EtapaId; titulo: string; resumo: string };

export const ETAPAS: ReadonlyArray<Etapa> = [
  { id: "identificacao", titulo: "Quem e quando", resumo: "Produtor visitado, data e quem visita." },
  { id: "documentos", titulo: "Documentos", resumo: "Caderno de campo, notas, DTCs e plano de manejo." },
  { id: "sementes", titulo: "Sementes e mudas", resumo: "De onde vem o que foi plantado." },
  { id: "insumos", titulo: "Insumos e manejo", resumo: "O que vai na terra e nas plantas." },
  {
    id: "colheita",
    titulo: "Colheita, armazenamento e transporte",
    resumo: "Como o produto é guardado e levado.",
  },
  { id: "controle", titulo: "Controle", resumo: "Anotações de custos, colheita e venda." },
  { id: "fechamento", titulo: "Fechamento", resumo: "O que precisa corrigir e o parecer do grupo." },
];

/** Culturas que pedem comprovação da origem do material plantado. */
export const CULTURAS_SENSIVEIS = ["algodão", "feijão", "milho", "soja"] as const;
export type CulturaSensivel = (typeof CULTURAS_SENSIVEIS)[number];

export type UsoArmazenamento = "exclusivo" | "compartilhado";

export type Parecer = "conforme" | "pendencias" | "nao_conforme";

export const OPCOES_PARECER: ReadonlyArray<{ valor: Parecer; rotulo: string; ajuda: string }> = [
  { valor: "conforme", rotulo: "Conforme", ajuda: "Está tudo de acordo." },
  {
    valor: "pendencias",
    rotulo: "Conforme com pendências",
    ajuda: "Está de acordo, mas tem coisas para corrigir no prazo.",
  },
  { valor: "nao_conforme", rotulo: "Não conforme", ajuda: "Tem problema que impede a conformidade." },
];

export type TipoVisita = "pares" | "externo";

export type NaoConformidade = { id: string; descricao: string; prazo: string };

export type RespostaItem = { r?: Resposta; obs: string };

export type Visita = {
  id: string;
  criadaEm: string;
  atualizadaEm: string;
  produtor: { nome: string; municipio: string; culturas: string[] };
  data: string;
  visitantes: string;
  tipo: TipoVisita | "";
  culturasSensiveis: CulturaSensivel[];
  usoArmazenamento: UsoArmazenamento | "";
  separacao: string;
  respostas: Record<string, RespostaItem>;
  naoConformidades: NaoConformidade[];
  pontosFortes: string;
  observacoes: string;
  parecer: Parecer | "";
};

export type Item = {
  id: string;
  etapa: EtapaId;
  texto: string;
  ajuda?: string;
  /** Quando existe, o item só aparece se a função devolver true. */
  mostrarSe?: (visita: Visita) => boolean;
};

export const ITENS: ReadonlyArray<Item> = [
  // Documentos
  {
    id: "doc_caderno",
    etapa: "documentos",
    texto: "O caderno de campo foi apresentado?",
  },
  {
    id: "doc_caderno_em_dia",
    etapa: "documentos",
    texto: "O caderno de campo está em dia?",
    ajuda: "Plantios, tratos, colheitas e vendas anotados até a semana da visita.",
  },
  {
    id: "doc_notas",
    etapa: "documentos",
    texto: "As notas fiscais e recibos de compra e venda estão guardados?",
  },
  {
    id: "doc_dtc",
    etapa: "documentos",
    texto: "As DTCs entregues aos compradores estão guardadas?",
    ajuda: "Cópia ou registro de cada declaração entregue.",
  },
  {
    id: "doc_plano",
    etapa: "documentos",
    texto: "O plano de manejo está atualizado?",
  },
  {
    id: "doc_plano_bate",
    etapa: "documentos",
    texto: "O plano de manejo bate com o que foi visto na roça?",
  },
  // Sementes e mudas
  {
    id: "sem_origem",
    etapa: "sementes",
    texto: "A origem das sementes e mudas está anotada?",
    ajuda: "Semente própria, troca, casa de sementes ou compra.",
  },
  {
    id: "sem_comprovacao",
    etapa: "sementes",
    texto: "Há comprovação de origem do material plantado dessas culturas?",
    ajuda: "Declaração de que não é transgênico, nota de compra ou registro da troca.",
    mostrarSe: (v) => v.culturasSensiveis.length > 0,
  },
  // Insumos e manejo
  {
    id: "ins_permitidos",
    etapa: "insumos",
    texto: "Os insumos usados são permitidos na produção orgânica?",
  },
  {
    id: "ins_origem",
    etapa: "insumos",
    texto: "A origem dos insumos está registrada?",
    ajuda: "De onde veio o esterco, o composto, o pó de rocha e os demais.",
  },
  {
    id: "ins_anotados",
    etapa: "insumos",
    texto: "As caldas e adubos aplicados estão anotados no caderno?",
  },
  {
    id: "ins_barreiras",
    etapa: "insumos",
    texto: "Há proteção contra contaminação vinda do vizinho?",
    ajuda: "Barreira de plantas, distância ou outro cuidado onde há risco.",
  },
  // Colheita, armazenamento e transporte
  {
    id: "col_registrada",
    etapa: "colheita",
    texto: "A colheita está anotada no caderno?",
  },
  {
    id: "col_separacao_ok",
    etapa: "colheita",
    texto: "A separação do produto orgânico está sendo feita e anotada?",
    mostrarSe: (v) => v.usoArmazenamento === "compartilhado",
  },
  {
    id: "col_embalagem",
    etapa: "colheita",
    texto: "As embalagens e sacarias estão limpas e identificadas?",
  },
  // Controle
  {
    id: "ctl_custos",
    etapa: "controle",
    texto: "A família anota custos e produção?",
  },
  {
    id: "ctl_coerencia",
    etapa: "controle",
    texto: "As quantidades colhidas e vendidas fazem sentido entre si?",
    ajuda: "Não se vende mais do que se colheu.",
  },
];

/** Itens visíveis numa etapa, considerando as condições. */
export function itensDaEtapa(visita: Visita, etapa: EtapaId): Item[] {
  return ITENS.filter((i) => i.etapa === etapa && (!i.mostrarSe || i.mostrarSe(visita)));
}

/** Todos os itens visíveis, na ordem das etapas. */
export function itensVisiveis(visita: Visita): Item[] {
  return ETAPAS.flatMap((e) => itensDaEtapa(visita, e.id));
}

export type Pendencia = { etapa: EtapaId; rotulo: string };

/**
 * O que ainda falta responder. Conta os itens do roteiro e os campos que não
 * são opcionais: nome do produtor, data, tipo de visita, uso do armazém (e
 * como é feita a separação, se compartilhado) e o parecer.
 */
export function pendencias(visita: Visita): Pendencia[] {
  const lista: Pendencia[] = [];
  if (!visita.produtor.nome.trim()) lista.push({ etapa: "identificacao", rotulo: "Nome do produtor" });
  if (!visita.data) lista.push({ etapa: "identificacao", rotulo: "Data da visita" });
  if (!visita.tipo) lista.push({ etapa: "identificacao", rotulo: "Tipo de visita" });

  for (const etapa of ETAPAS) {
    if (etapa.id === "colheita") {
      if (!visita.usoArmazenamento) {
        lista.push({ etapa: "colheita", rotulo: "Armazém e transporte: exclusivo ou compartilhado" });
      } else if (visita.usoArmazenamento === "compartilhado" && !visita.separacao.trim()) {
        lista.push({ etapa: "colheita", rotulo: "Como é feita e registrada a separação" });
      }
    }
    for (const item of itensDaEtapa(visita, etapa.id)) {
      if (!visita.respostas[item.id]?.r) lista.push({ etapa: etapa.id, rotulo: item.texto });
    }
  }

  if (!visita.parecer) lista.push({ etapa: "fechamento", rotulo: "Parecer" });
  return lista;
}

/** Quantidade de perguntas obrigatórias na visita do jeito que está. */
export function totalDePerguntas(visita: Visita): number {
  const fixos = 3 /* nome, data, tipo */ + 1 /* uso do armazém */ + 1; /* parecer */
  const separacao = visita.usoArmazenamento === "compartilhado" ? 1 : 0;
  return fixos + separacao + itensVisiveis(visita).length;
}

export function progresso(visita: Visita): { feitos: number; total: number; fracao: number } {
  const total = totalDePerguntas(visita);
  const feitos = total - pendencias(visita).length;
  return { feitos, total, fracao: total ? feitos / total : 0 };
}

/** Identificador curto e único o bastante para uma lista local. */
export function novoId(agora: number = Date.now(), aleatorio: number = Math.random()): string {
  return `${agora.toString(36)}-${Math.floor(aleatorio * 1e9).toString(36)}`;
}

/** Data local de hoje em AAAA-MM-DD. */
export function hojeIso(agora: Date = new Date()): string {
  const m = String(agora.getMonth() + 1).padStart(2, "0");
  const d = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${m}-${d}`;
}

export function novaVisita(agora: Date = new Date(), id: string = novoId(agora.getTime())): Visita {
  const iso = agora.toISOString();
  return {
    id,
    criadaEm: iso,
    atualizadaEm: iso,
    produtor: { nome: "", municipio: "", culturas: [] },
    data: hojeIso(agora),
    visitantes: "",
    tipo: "",
    culturasSensiveis: [],
    usoArmazenamento: "",
    separacao: "",
    respostas: {},
    naoConformidades: [],
    pontosFortes: "",
    observacoes: "",
    parecer: "",
  };
}

/** Sem acento e em minúsculas, para comparar nomes de cultura. */
function simplificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** Marca automaticamente as culturas sensíveis citadas na lista do produtor. */
export function culturasSensiveisDe(culturas: string[]): CulturaSensivel[] {
  const nomes = culturas.map(simplificar);
  return CULTURAS_SENSIVEIS.filter((c) => nomes.some((n) => n.includes(simplificar(c))));
}
