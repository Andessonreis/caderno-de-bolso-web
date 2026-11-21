"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { BotaoCopiar } from "@/components/BotaoCopiar";
import { Icone } from "@/components/Icone";
import { dataPorExtenso } from "@/lib/ficha";
import {
  LIMITE_VISITAS_GRUPO,
  ROTULO_TIPO,
  dataHora,
  filtrarVisitas,
  formatarCodigo,
  linkDaCoordenacao,
  nomeDaPlanilha,
  planilhaDasVisitas,
  resumirGrupo,
  rotuloParecer,
  type DadosDoGrupo,
  type FiltroParecer,
  type GrupoLembrado,
  type VisitaRecebida,
} from "@/lib/grupo";
import { apagarGrupo, listarGrupo, type Problema } from "@/lib/servidorGrupo";
import { hojeIso, progresso } from "@/lib/visita";
import { FolhaImpressao } from "../visita/FolhaImpressao";
import { LembrarNesteAparelho, Privacidade } from "./CriarGrupo";
import { lembrarGrupo } from "./lembrar";
import estilos from "./grupo.module.css";

const PROBLEMA_AO_CARREGAR: Record<Problema, string> = {
  semInternet: "Sem internet agora. Confira a conexão e toque em Atualizar.",
  naoConfere:
    "Este link não abre nenhum grupo. Pode ser que o grupo tenha sido apagado ou que o link tenha sido copiado pela metade.",
  recusado: "Este link não abre nenhum grupo. Confira se ele foi copiado inteiro, até o fim.",
  muitosGrupos: "O servidor teve um problema. Tente atualizar daqui a pouco.",
  servidor: "O servidor teve um problema. Tente atualizar daqui a pouco.",
};

const PROBLEMA_AO_APAGAR: Record<Problema, string> = {
  semInternet: "Sem internet agora. Nada foi apagado. Tente de novo quando estiver conectado.",
  naoConfere: "O servidor não reconheceu este link. Nada foi apagado.",
  recusado: "O servidor não reconheceu este link. Nada foi apagado.",
  muitosGrupos: "O servidor teve um problema. Nada foi apagado. Tente de novo daqui a pouco.",
  servidor: "O servidor teve um problema. Nada foi apagado. Tente de novo daqui a pouco.",
};

const FILTROS: ReadonlyArray<{ valor: FiltroParecer; rotulo: string }> = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "conforme", rotulo: "Conforme" },
  { valor: "pendencias", rotulo: "Conforme com pendências" },
  { valor: "nao_conforme", rotulo: "Não conforme" },
  { valor: "sem", rotulo: "Sem parecer" },
];

function baixarPlanilha(conteudo: string, nome: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function horaCurta(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function PainelGrupo({
  grupo,
  chave,
  site,
  lembrado,
  aoCriarOutro,
  aoApagar,
}: {
  grupo: string;
  chave: string;
  site: string;
  lembrado: GrupoLembrado | null;
  aoCriarOutro: () => void;
  aoApagar: (nome: string) => void;
}) {
  // A última lista carregada fica só na memória desta página, nunca no aparelho.
  const [dados, setDados] = useState<{ valor: DadosDoGrupo; em: string } | null>(null);
  const [problema, setProblema] = useState<Problema | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<VisitaRecebida | null>(null);
  const [anuncio, setAnuncio] = useState("Carregando as visitas do grupo…");
  const tituloPainel = useRef<HTMLHeadingElement>(null);
  const tituloVisita = useRef<HTMLParagraphElement>(null);

  const aplicar = useCallback((r: Awaited<ReturnType<typeof listarGrupo>>) => {
    if (r.ok) {
      setDados({ valor: r.valor, em: new Date().toISOString() });
      setProblema(null);
      const n = r.valor.total;
      setAnuncio(`Lista atualizada: ${n} ${n === 1 ? "visita" : "visitas"}.`);
    } else {
      setProblema(r.problema);
      setAnuncio(PROBLEMA_AO_CARREGAR[r.problema]);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    let ativo = true;
    void listarGrupo({ grupo, chave }).then((r) => {
      if (ativo) aplicar(r);
    });
    return () => {
      ativo = false;
    };
  }, [grupo, chave, aplicar]);

  function atualizar() {
    setCarregando(true);
    setAnuncio("Carregando as visitas do grupo…");
    void listarGrupo({ grupo, chave }).then(aplicar);
  }

  function abrir(v: VisitaRecebida) {
    setAberta(v);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => tituloVisita.current?.focus());
  }

  function voltar() {
    setAberta(null);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => tituloPainel.current?.focus());
  }

  if (aberta) {
    return (
      <div className={`conteiner ${estilos.pagina} ${estilos.paginaLarga}`}>
        <div className={`grupo-botoes nao-imprimir ${estilos.barra}`}>
          <button type="button" className="botao botao-discreto" onClick={voltar}>
            <Icone nome="setaEsquerda" />
            Voltar para a lista
          </button>
          <button type="button" className="botao botao-primario" onClick={() => window.print()}>
            <Icone nome="imprimir" />
            Imprimir / Salvar em PDF
          </button>
        </div>
        <p ref={tituloVisita} tabIndex={-1} className={`${estilos.visitaAberta} nao-imprimir`}>
          Visita a {aberta.visita.produtor.nome || "produtor sem nome"}
        </p>
        <p className="ajuda nao-imprimir">
          Recebida em {dataHora(aberta.recebidaEm) || "data desconhecida"}. Só leitura: quem fez a
          visita é quem pode mudar, no aplicativo, e enviar de novo.
        </p>
        <FolhaImpressao visita={aberta.visita} naTela />
      </div>
    );
  }

  const nome = dados?.valor.nome || lembrado?.nome || "Grupo";

  return (
    <div className={`conteiner ${estilos.pagina} ${estilos.paginaLarga}`}>
      <header className={estilos.topo}>
        <p className="etiqueta">Visitas do grupo</p>
        <h1 ref={tituloPainel} tabIndex={-1} className={estilos.semContorno}>
          {nome}
        </h1>
        {dados ? (
          <p className={estilos.chamada}>
            {dados.valor.total === 1 ? "1 visita reunida" : `${dados.valor.total} visitas reunidas`}
            {dados.valor.visitas.length
              ? ` · última recebida em ${dataHora(resumirGrupo(dados.valor.visitas).ultimaRecebida)}`
              : ""}
          </p>
        ) : null}
        <div className="grupo-botoes nao-imprimir">
          <button
            type="button"
            className="botao botao-secundario"
            onClick={atualizar}
            disabled={carregando}
          >
            <Icone nome="abrir" />
            {carregando ? "Atualizando…" : "Atualizar"}
          </button>
          {dados?.valor.visitas.length ? (
            <button
              type="button"
              className="botao botao-discreto"
              onClick={() =>
                baixarPlanilha(
                  planilhaDasVisitas(dados.valor.visitas),
                  nomeDaPlanilha(dados.valor.nome, hojeIso()),
                )
              }
            >
              <Icone nome="baixar" />
              Baixar planilha (CSV)
            </button>
          ) : null}
        </div>
      </header>

      <p role="status" className="sr-only">
        {anuncio}
      </p>

      {carregando && !dados ? (
        <p className={estilos.carregando}>Carregando as visitas do grupo…</p>
      ) : null}

      {problema ? (
        <div className={`aviso nao-imprimir ${estilos.bloco}`}>
          <p>
            <strong>{PROBLEMA_AO_CARREGAR[problema]}</strong>
          </p>
          {dados ? (
            <p>
              Mostrando o que foi carregado às {horaCurta(dados.em)}. Esta cópia fica só nesta
              página e some ao fechar.
            </p>
          ) : null}
          {problema === "naoConfere" || problema === "recusado" ? (
            <div className="grupo-botoes">
              {lembrado ? (
                <button
                  type="button"
                  className="botao botao-discreto"
                  onClick={() => lembrarGrupo(null)}
                >
                  <Icone nome="lixeira" />
                  Esquecer este grupo neste aparelho
                </button>
              ) : null}
              <button type="button" className="botao botao-secundario" onClick={aoCriarOutro}>
                <Icone nome="mais" />
                Criar um grupo
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {dados ? <Conteudo dados={dados.valor} aoAbrir={abrir} /> : null}

      {dados || (problema !== "naoConfere" && problema !== "recusado") ? (
        <>
          {lembrado?.codigo ? (
            <section
              className={`cartao ${estilos.bloco} nao-imprimir`}
              aria-labelledby="titulo-cod"
            >
              <h2 id="titulo-cod" className={estilos.subtitulo}>
                Código do grupo
              </h2>
              <p className={estilos.codigoMenor}>{formatarCodigo(lembrado.codigo)}</p>
              <p className="ajuda">É o que os membros digitam no aplicativo para enviar visitas.</p>
              <BotaoCopiar
                texto={lembrado.codigo}
                rotulo="Copiar código"
                descricao="do grupo"
                className={`botao botao-discreto ${estilos.depois}`}
              />
            </section>
          ) : null}

          <section className={`${estilos.bloco} nao-imprimir`} aria-labelledby="titulo-aparelho">
            <h2 id="titulo-aparelho" className={estilos.subtitulo}>
              Neste aparelho
            </h2>
            <LembrarNesteAparelho
              marcado={Boolean(lembrado)}
              aoMudar={(sim) =>
                lembrarGrupo(
                  sim
                    ? {
                        grupo,
                        chave,
                        nome: dados?.valor.nome ?? "",
                        ...(lembrado?.codigo ? { codigo: lembrado.codigo } : {}),
                      }
                    : null,
                )
              }
            />
            <div className={`grupo-botoes ${estilos.depois}`}>
              <BotaoCopiar
                texto={linkDaCoordenacao(site, { grupo, chave })}
                rotulo="Copiar link da coordenação"
                className="botao botao-discreto"
              />
              <button type="button" className="botao botao-discreto" onClick={aoCriarOutro}>
                <Icone nome="mais" />
                Criar outro grupo
              </button>
            </div>
          </section>

          {dados ? (
            <ApagarGrupo
              nome={dados.valor.nome}
              total={dados.valor.total}
              aoApagar={async () => {
                const r = await apagarGrupo({ grupo, chave });
                if (r.ok) aoApagar(dados.valor.nome);
                return r.ok ? "" : PROBLEMA_AO_APAGAR[r.problema];
              }}
            />
          ) : null}
        </>
      ) : null}

      <div className="nao-imprimir">
        <Privacidade />
      </div>
    </div>
  );
}

function Conteudo({
  dados,
  aoAbrir,
}: {
  dados: DadosDoGrupo;
  aoAbrir: (v: VisitaRecebida) => void;
}) {
  const [parecer, setParecer] = useState<FiltroParecer>("todos");
  const [busca, setBusca] = useState("");
  const id = useId();
  const resumo = useMemo(() => resumirGrupo(dados.visitas), [dados.visitas]);
  const lista = useMemo(
    () => filtrarVisitas(dados.visitas, { parecer, busca }),
    [dados.visitas, parecer, busca],
  );

  if (!dados.visitas.length) {
    return (
      <section className={`${estilos.bloco} ${estilos.vazio}`} aria-labelledby="titulo-vazio">
        <h2 id="titulo-vazio" className={estilos.subtitulo}>
          Nenhuma visita chegou ainda
        </h2>
        <p>
          Cada membro abre o aplicativo Caderno de Bolso, vai na aba <strong>Visita</strong>, toca
          em <strong>Visitar outra roça</strong> e depois em <strong>Grupo</strong>, e digita o
          código do grupo. As visitas que ele escolher enviar aparecem aqui. Toque em{" "}
          <strong>Atualizar</strong> para conferir.
        </p>
      </section>
    );
  }

  const maior = Math.max(1, ...resumo.perguntas.map((p) => p.nao + p.parte));
  const pareceres: ReadonlyArray<[string, number]> = [
    ["Conforme", resumo.porParecer.conforme],
    ["Com pendências", resumo.porParecer.pendencias],
    ["Não conforme", resumo.porParecer.nao_conforme],
    ["Sem parecer", resumo.porParecer.sem],
  ];

  return (
    <>
      {dados.total > dados.visitas.length ? (
        <p className="aviso" role="note">
          Este grupo tem {dados.total} visitas. A lista mostra as {LIMITE_VISITAS_GRUPO} mais
          recentes.
        </p>
      ) : null}
      <section className={estilos.bloco} aria-labelledby="titulo-resumo">
        <h2 id="titulo-resumo" className={estilos.subtitulo}>
          Resumo
        </h2>
        <p className="ajuda">O resumo vale para as visitas mostradas na lista.</p>
        <dl className={estilos.numeros}>
          <div>
            <dt>Visitas</dt>
            <dd>{resumo.total}</dd>
          </div>
          <div>
            <dt>Produtores visitados</dt>
            <dd>{resumo.produtores}</dd>
          </div>
          {pareceres.map(([rotulo, n]) => (
            <div key={rotulo}>
              <dt>{rotulo}</dt>
              <dd>{n}</dd>
            </div>
          ))}
        </dl>

        {resumo.perguntas.length ? (
          <div
            className={estilos.rolagem}
            role="region"
            aria-labelledby={`${id}-cap-perg`}
            tabIndex={0}
          >
            <table className={estilos.tabela}>
              <caption id={`${id}-cap-perg`}>Perguntas com mais respostas Não e Em parte</caption>
              <thead>
                <tr>
                  <th scope="col">Pergunta</th>
                  <th scope="col" className={estilos.numero}>
                    Não
                  </th>
                  <th scope="col" className={estilos.numero}>
                    Em parte
                  </th>
                </tr>
              </thead>
              <tbody>
                {resumo.perguntas.slice(0, 8).map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.texto}
                      <span className={estilos.barraFundo} aria-hidden="true">
                        <span
                          className={estilos.barraNao}
                          style={{ width: `${(p.nao / maior) * 100}%` }}
                        />
                        <span
                          className={estilos.barraParte}
                          style={{ width: `${(p.parte / maior) * 100}%` }}
                        />
                      </span>
                    </td>
                    <td className={estilos.numero}>{p.nao}</td>
                    <td className={estilos.numero}>{p.parte}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ajuda">Nenhuma resposta Não ou Em parte nas visitas recebidas.</p>
        )}
      </section>

      <section className={estilos.bloco} aria-labelledby="titulo-visitas">
        <h2 id="titulo-visitas" className={estilos.subtitulo}>
          Visitas recebidas
        </h2>
        <div className={`${estilos.filtros} nao-imprimir`}>
          <div className="campo">
            <label htmlFor={`${id}-parecer`}>Parecer</label>
            <select
              id={`${id}-parecer`}
              className="entrada"
              value={parecer}
              onChange={(e) => setParecer(e.target.value as FiltroParecer)}
            >
              {FILTROS.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor={`${id}-busca`}>Buscar pelo nome do produtor</label>
            <input
              id={`${id}-busca`}
              className="entrada"
              type="search"
              value={busca}
              maxLength={80}
              autoComplete="off"
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
        <p className="ajuda" aria-live="polite">
          {lista.length === dados.visitas.length
            ? lista.length === 1
              ? "Mostrando a única visita."
              : `Mostrando todas as ${lista.length} visitas.`
            : `Mostrando ${lista.length} de ${dados.visitas.length} visitas.`}
        </p>

        {lista.length ? (
          <div
            className={estilos.rolagem}
            role="region"
            aria-labelledby={`${id}-cap-vis`}
            tabIndex={0}
          >
            <table className={`${estilos.tabela} ${estilos.tabelaVisitas}`}>
              <caption id={`${id}-cap-vis`}>
                <span className={estilos.legendaFixa}>
                  Da mais nova para a mais antiga. Toque no nome para ver a visita inteira.
                </span>
              </caption>
              <thead>
                <tr>
                  <th scope="col">Produtor visitado</th>
                  <th scope="col">Município</th>
                  <th scope="col">Data da visita</th>
                  <th scope="col">Quem visitou</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Parecer</th>
                  <th scope="col">Respondidas</th>
                  <th scope="col">Recebida em</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((v) => {
                  const p = progresso(v.visita);
                  const nomeProdutor = v.visita.produtor.nome || "Produtor sem nome";
                  return (
                    <tr key={v.id}>
                      <th scope="row">
                        <button
                          type="button"
                          className={estilos.botaoNome}
                          onClick={() => aoAbrir(v)}
                          aria-label={`Ver a visita a ${nomeProdutor}`}
                        >
                          {nomeProdutor}
                        </button>
                      </th>
                      <td>{v.visita.produtor.municipio}</td>
                      <td>{v.visita.data ? dataPorExtenso(v.visita.data) : ""}</td>
                      <td>{v.visita.visitantes}</td>
                      <td>{ROTULO_TIPO[v.visita.tipo]}</td>
                      <td>{rotuloParecer(v.visita.parecer)}</td>
                      <td className={estilos.numero}>
                        {p.feitos} de {p.total}
                      </td>
                      <td>{dataHora(v.recebidaEm)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={estilos.vazio}>Nenhuma visita com esse filtro.</p>
        )}
      </section>
    </>
  );
}

function ApagarGrupo({
  nome,
  total,
  aoApagar,
}: {
  nome: string;
  total: number;
  aoApagar: () => Promise<string>;
}) {
  const [etapa, setEtapa] = useState<"parado" | "confirmar" | "apagando">("parado");
  const [erro, setErro] = useState("");
  const confirmar = useRef<HTMLDivElement>(null);

  async function apagar() {
    setEtapa("apagando");
    setErro("");
    const problema = await aoApagar();
    if (problema) {
      setErro(problema);
      setEtapa("confirmar");
    }
  }

  return (
    <section className={`${estilos.bloco} nao-imprimir`} aria-labelledby="titulo-apagar">
      <h2 id="titulo-apagar" className={estilos.subtitulo}>
        Apagar este grupo
      </h2>
      {etapa === "parado" ? (
        <>
          <p className="ajuda">
            Use quando o grupo não for mais usado. Apaga o grupo e todas as visitas reunidas.
          </p>
          <button
            type="button"
            className="botao botao-discreto"
            onClick={() => {
              setEtapa("confirmar");
              requestAnimationFrame(() => confirmar.current?.focus());
            }}
          >
            <Icone nome="lixeira" />
            Apagar este grupo
          </button>
        </>
      ) : (
        <div
          ref={confirmar}
          tabIndex={-1}
          className={estilos.confirmar}
          role="group"
          aria-labelledby="pergunta-apagar"
        >
          <p id="pergunta-apagar">
            Apagar o grupo {nome} e as{" "}
            {total === 1 ? "1 visita reunida" : `${total} visitas reunidas`}? Tudo some do servidor
            para sempre, não dá para desfazer, e o código deixa de funcionar no aplicativo dos
            membros.
          </p>
          <div role="alert">{erro ? <p className={estilos.msgErro}>{erro}</p> : null}</div>
          <div className="grupo-botoes">
            <button
              type="button"
              className="botao botao-perigo"
              onClick={() => void apagar()}
              disabled={etapa === "apagando"}
            >
              <Icone nome="lixeira" />
              {etapa === "apagando" ? "Apagando…" : "Sim, apagar tudo"}
            </button>
            <button
              type="button"
              className="botao botao-discreto"
              onClick={() => {
                setEtapa("parado");
                setErro("");
              }}
              disabled={etapa === "apagando"}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
