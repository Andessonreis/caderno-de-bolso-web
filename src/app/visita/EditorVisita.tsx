"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icone } from "@/components/Icone";
import { nomeDoArquivo, salvarVisita, visitaParaArquivo } from "@/lib/armazenamento";
import {
  CULTURAS_SENSIVEIS,
  ETAPAS,
  OPCOES_PARECER,
  itensDaEtapa,
  novoId,
  pendencias,
  progresso,
  type EtapaId,
  type RespostaItem,
  type UsoArmazenamento,
  type Visita,
} from "@/lib/visita";
import { Escolha } from "./Escolha";
import { FolhaImpressao } from "./FolhaImpressao";
import { ImportarFicha } from "./ImportarFicha";
import { PerguntaItem } from "./PerguntaItem";
import estilos from "./visita.module.css";

/** Índice ETAPAS.length é a tela de resumo. */
const RESUMO = ETAPAS.length;

type EstadoSalvo = "salvo" | "erro" | null;

export function EditorVisita({ inicial, aoSair }: { inicial: Visita; aoSair: () => void }) {
  const [visita, setVisita] = useState(inicial);
  const [indice, setIndice] = useState(0);
  const [salvo, setSalvo] = useState<EstadoSalvo>(null);
  const tituloEtapa = useRef<HTMLHeadingElement>(null);
  const primeiraRenderizacao = useRef(true);
  const id = useId();

  // Ao trocar de etapa, leva o foco e a tela para o título dela.
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    tituloEtapa.current?.focus();
  }, [indice]);

  /** Toda mudança passa por aqui e é salva no aparelho na mesma hora. */
  function atualizar(mudar: (v: Visita) => Visita) {
    const nova = { ...mudar(visita), atualizadaEm: new Date().toISOString() };
    setVisita(nova);
    try {
      salvarVisita(localStorage, nova);
      setSalvo("salvo");
    } catch {
      setSalvo("erro");
    }
  }

  function responder(itemId: string, resposta: RespostaItem) {
    atualizar((v) => ({ ...v, respostas: { ...v.respostas, [itemId]: resposta } }));
  }

  function irPara(etapa: EtapaId | "resumo") {
    setIndice(etapa === "resumo" ? RESUMO : ETAPAS.findIndex((e) => e.id === etapa));
  }

  const p = progresso(visita);
  const etapa = indice < RESUMO ? ETAPAS[indice] : null;
  const proxima = indice + 1 < RESUMO ? ETAPAS[indice + 1] : null;

  function baixarArquivo() {
    const blob = new Blob([visitaParaArquivo(visita)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeDoArquivo(visita);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <div className={`conteiner ${estilos.pagina} nao-imprimir`}>
        <div className={estilos.barraTopo}>
          <button type="button" className="botao botao-discreto" onClick={aoSair}>
            <Icone nome="setaEsquerda" />
            Lista de visitas
          </button>
          <p className={estilos.salvo} role="status" aria-live="polite">
            {salvo === "salvo" ? (
              <>
                <Icone nome="certo" tamanho={18} />
                Salvo neste aparelho
              </>
            ) : null}
            {salvo === "erro" ? (
              <span className={estilos.salvoErro}>
                <Icone nome="alerta" tamanho={18} />
                Não foi possível salvar: aparelho sem espaço
              </span>
            ) : null}
          </p>
        </div>

        <p className={estilos.produtorAtual}>
          {visita.produtor.nome ? `Visita a ${visita.produtor.nome}` : "Nova visita"}
        </p>

        <div className={estilos.progresso}>
          <div
            className={estilos.progressoBarra}
            role="progressbar"
            aria-label="Perguntas respondidas"
            aria-valuemin={0}
            aria-valuemax={p.total}
            aria-valuenow={p.feitos}
            aria-valuetext={`${p.feitos} de ${p.total} respondidas`}
          >
            <span style={{ width: `${Math.round(p.fracao * 100)}%` }} />
          </div>
          <p className={estilos.progressoTexto}>
            {p.feitos} de {p.total} respondidas
          </p>
        </div>

        <nav aria-label="Etapas da visita">
          <ol className={estilos.etapas}>
            {ETAPAS.map((e, i) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={estilos.etapaBotao}
                  aria-current={i === indice ? "step" : undefined}
                  aria-label={`Etapa ${i + 1}: ${e.titulo}`}
                  title={e.titulo}
                  onClick={() => setIndice(i)}
                >
                  {i + 1}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className={`${estilos.etapaBotao} ${estilos.etapaResumo}`}
                aria-current={indice === RESUMO ? "step" : undefined}
                onClick={() => setIndice(RESUMO)}
              >
                Resumo
              </button>
            </li>
          </ol>
        </nav>

        <section className={estilos.etapa} aria-labelledby={`${id}-titulo`}>
          <p className={estilos.etapaNumero}>
            {etapa ? `Etapa ${indice + 1} de ${ETAPAS.length}` : "Fim da visita"}
          </p>
          <h1 id={`${id}-titulo`} ref={tituloEtapa} tabIndex={-1} className={estilos.etapaTitulo}>
            {etapa ? etapa.titulo : "Resumo"}
          </h1>
          {etapa ? <p className={estilos.etapaResumoTexto}>{etapa.resumo}</p> : null}

          {etapa?.id === "identificacao" ? (
            <Identificacao visita={visita} atualizar={atualizar} />
          ) : null}

          {etapa?.id === "sementes" ? (
            <fieldset className={estilos.escolha}>
              <legend className={estilos.pergunta}>
                Tem algodão, feijão, milho ou soja plantado?
              </legend>
              <p className={`ajuda ${estilos.perguntaAjuda}`}>
                Marque as que tiver. Para essas culturas o roteiro pede a comprovação de origem.
              </p>
              <div className={estilos.opcoes} data-colunas={2}>
                {CULTURAS_SENSIVEIS.map((cultura) => (
                  <label key={cultura} className={estilos.opcao}>
                    <input
                      type="checkbox"
                      checked={visita.culturasSensiveis.includes(cultura)}
                      onChange={(e) =>
                        atualizar((v) => ({
                          ...v,
                          culturasSensiveis: e.target.checked
                            ? CULTURAS_SENSIVEIS.filter(
                                (c) => c === cultura || v.culturasSensiveis.includes(c),
                              )
                            : v.culturasSensiveis.filter((c) => c !== cultura),
                        }))
                      }
                    />
                    <span className={estilos.opcaoTexto}>
                      <span className={estilos.capitalizar}>{cultura}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {etapa?.id === "colheita" ? (
            <>
              <Escolha<UsoArmazenamento>
                nome={`${id}-uso`}
                legenda="O armazém e o transporte são:"
                opcoes={[
                  { valor: "exclusivo", rotulo: "Só para orgânico" },
                  {
                    valor: "compartilhado",
                    rotulo: "Compartilhados com convencional",
                  },
                ]}
                valor={visita.usoArmazenamento}
                aoMudar={(uso) => atualizar((v) => ({ ...v, usoArmazenamento: uso }))}
              />
              {visita.usoArmazenamento === "compartilhado" ? (
                <div className="campo">
                  <label htmlFor={`${id}-separacao`}>Como a separação é feita e registrada?</label>
                  <p className="ajuda" id={`${id}-separacao-ajuda`}>
                    Por exemplo: sacaria marcada, lugar separado no depósito, anotação no caderno.
                  </p>
                  <textarea
                    id={`${id}-separacao`}
                    className="entrada"
                    rows={3}
                    aria-describedby={`${id}-separacao-ajuda`}
                    value={visita.separacao}
                    onChange={(e) => atualizar((v) => ({ ...v, separacao: e.target.value }))}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {etapa
            ? itensDaEtapa(visita, etapa.id).map((item) => (
                <PerguntaItem
                  key={item.id}
                  item={item}
                  resposta={visita.respostas[item.id]}
                  aoMudar={(r) => responder(item.id, r)}
                />
              ))
            : null}

          {etapa?.id === "fechamento" ? <Fechamento visita={visita} atualizar={atualizar} /> : null}

          {indice === RESUMO ? (
            <Resumo
              visita={visita}
              irPara={irPara}
              aoImprimir={() => window.print()}
              aoBaixar={baixarArquivo}
            />
          ) : null}
        </section>

        <div className={estilos.navegacao}>
          {indice > 0 ? (
            <button
              type="button"
              className="botao botao-discreto"
              onClick={() => setIndice(indice - 1)}
            >
              <Icone nome="setaEsquerda" />
              Voltar
            </button>
          ) : (
            <span />
          )}
          {indice < RESUMO ? (
            <button
              type="button"
              className="botao botao-primario"
              onClick={() => setIndice(indice + 1)}
            >
              {proxima ? "Próxima etapa" : "Ver resumo"}
              <Icone nome="setaDireita" />
            </button>
          ) : null}
        </div>
      </div>

      <FolhaImpressao visita={visita} />
    </>
  );
}

type Atualizar = (mudar: (v: Visita) => Visita) => void;

function Identificacao({ visita, atualizar }: { visita: Visita; atualizar: Atualizar }) {
  const id = useId();
  return (
    <>
      <ImportarFicha
        aoImportar={(ficha, sensiveis) =>
          atualizar((v) => ({
            ...v,
            produtor: {
              nome: ficha.n,
              municipio: ficha.m ?? v.produtor.municipio,
              culturas: ficha.cu ?? [],
            },
            culturasSensiveis: sensiveis.length ? sensiveis : v.culturasSensiveis,
          }))
        }
      />

      <div className="campo">
        <label htmlFor={`${id}-nome`}>Nome do produtor visitado</label>
        <input
          id={`${id}-nome`}
          className="entrada"
          type="text"
          maxLength={80}
          autoComplete="off"
          value={visita.produtor.nome}
          onChange={(e) =>
            atualizar((v) => ({ ...v, produtor: { ...v.produtor, nome: e.target.value } }))
          }
        />
      </div>
      <div className="campo">
        <label htmlFor={`${id}-municipio`}>Município</label>
        <input
          id={`${id}-municipio`}
          className="entrada"
          type="text"
          maxLength={60}
          autoComplete="off"
          value={visita.produtor.municipio}
          onChange={(e) =>
            atualizar((v) => ({ ...v, produtor: { ...v.produtor, municipio: e.target.value } }))
          }
        />
      </div>
      {visita.produtor.culturas.length ? (
        <p className="ajuda">Culturas na ficha: {visita.produtor.culturas.join(", ")}.</p>
      ) : null}
      <div className="campo">
        <label htmlFor={`${id}-data`}>Data da visita</label>
        <input
          id={`${id}-data`}
          className="entrada"
          type="date"
          value={visita.data}
          onChange={(e) => atualizar((v) => ({ ...v, data: e.target.value }))}
        />
      </div>
      <div className="campo">
        <label htmlFor={`${id}-visitantes`}>Quem está visitando</label>
        <p className="ajuda" id={`${id}-visitantes-ajuda`}>
          Os nomes, separados por vírgula.
        </p>
        <input
          id={`${id}-visitantes`}
          className="entrada"
          type="text"
          maxLength={120}
          autoComplete="off"
          aria-describedby={`${id}-visitantes-ajuda`}
          value={visita.visitantes}
          onChange={(e) => atualizar((v) => ({ ...v, visitantes: e.target.value }))}
        />
      </div>
      <Escolha
        nome={`${id}-tipo`}
        legenda="Tipo de visita"
        opcoes={[
          { valor: "pares", rotulo: "Visita de pares", ajuda: "Feita por agricultores do grupo." },
          { valor: "externo", rotulo: "Olhar externo", ajuda: "Com alguém de fora do grupo." },
        ]}
        valor={visita.tipo}
        aoMudar={(tipo) => atualizar((v) => ({ ...v, tipo }))}
      />
    </>
  );
}

function Fechamento({ visita, atualizar }: { visita: Visita; atualizar: Atualizar }) {
  const id = useId();

  function mudarNc(ncId: string, campo: "descricao" | "prazo", valor: string) {
    atualizar((v) => ({
      ...v,
      naoConformidades: v.naoConformidades.map((n) =>
        n.id === ncId ? { ...n, [campo]: valor } : n,
      ),
    }));
  }

  return (
    <>
      <section className={estilos.bloco} aria-labelledby={`${id}-nc`}>
        <h2 id={`${id}-nc`} className={estilos.pergunta}>
          O que precisa corrigir
        </h2>
        <p className={`ajuda ${estilos.perguntaAjuda}`}>
          Cada não conformidade com o prazo combinado para corrigir.
        </p>
        {visita.naoConformidades.length === 0 ? (
          <p className={estilos.listaVazia}>Nenhuma anotada.</p>
        ) : (
          <ol className={estilos.ncs}>
            {visita.naoConformidades.map((nc, i) => (
              <li key={nc.id} className={estilos.nc}>
                <div className="campo">
                  <label htmlFor={`${id}-nc-${nc.id}`}>O que precisa corrigir ({i + 1})</label>
                  <textarea
                    id={`${id}-nc-${nc.id}`}
                    className="entrada"
                    rows={2}
                    value={nc.descricao}
                    onChange={(e) => mudarNc(nc.id, "descricao", e.target.value)}
                  />
                </div>
                <div className="campo">
                  <label htmlFor={`${id}-prazo-${nc.id}`}>Prazo para corrigir</label>
                  <input
                    id={`${id}-prazo-${nc.id}`}
                    className="entrada"
                    type="date"
                    value={nc.prazo}
                    onChange={(e) => mudarNc(nc.id, "prazo", e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="botao botao-discreto"
                  onClick={() =>
                    atualizar((v) => ({
                      ...v,
                      naoConformidades: v.naoConformidades.filter((n) => n.id !== nc.id),
                    }))
                  }
                >
                  <Icone nome="lixeira" />
                  Tirar este item
                </button>
              </li>
            ))}
          </ol>
        )}
        <button
          type="button"
          className="botao botao-secundario"
          onClick={() =>
            atualizar((v) => ({
              ...v,
              naoConformidades: [...v.naoConformidades, { id: novoId(), descricao: "", prazo: "" }],
            }))
          }
        >
          <Icone nome="mais" />
          Anotar não conformidade
        </button>
      </section>

      <div className={`campo ${estilos.bloco}`}>
        <label htmlFor={`${id}-fortes`}>Pontos fortes</label>
        <p className="ajuda" id={`${id}-fortes-ajuda`}>
          O que a família está fazendo bem e pode servir de exemplo.
        </p>
        <textarea
          id={`${id}-fortes`}
          className="entrada"
          rows={3}
          aria-describedby={`${id}-fortes-ajuda`}
          value={visita.pontosFortes}
          onChange={(e) => atualizar((v) => ({ ...v, pontosFortes: e.target.value }))}
        />
      </div>

      <div className="campo">
        <label htmlFor={`${id}-obs`}>Observações</label>
        <textarea
          id={`${id}-obs`}
          className="entrada"
          rows={3}
          value={visita.observacoes}
          onChange={(e) => atualizar((v) => ({ ...v, observacoes: e.target.value }))}
        />
      </div>

      <Escolha
        nome={`${id}-parecer`}
        legenda="Parecer da visita"
        opcoes={OPCOES_PARECER}
        valor={visita.parecer}
        colunas={1}
        aoMudar={(parecer) => atualizar((v) => ({ ...v, parecer }))}
      />
    </>
  );
}

function Resumo({
  visita,
  irPara,
  aoImprimir,
  aoBaixar,
}: {
  visita: Visita;
  irPara: (etapa: EtapaId) => void;
  aoImprimir: () => void;
  aoBaixar: () => void;
}) {
  const lista = pendencias(visita);
  const porEtapa = ETAPAS.map((e) => ({
    etapa: e,
    itens: lista.filter((p) => p.etapa === e.id),
  })).filter((g) => g.itens.length > 0);

  return (
    <>
      {lista.length === 0 ? (
        <p className={estilos.msgOk}>Tudo respondido. Pode imprimir ou guardar o arquivo.</p>
      ) : (
        <div className={estilos.bloco}>
          <h2 className={estilos.pergunta}>
            {lista.length === 1 ? "Falta 1 resposta" : `Faltam ${lista.length} respostas`}
          </h2>
          <p className={`ajuda ${estilos.perguntaAjuda}`}>
            Pode imprimir assim mesmo: o que ficou sem resposta sai em branco na folha.
          </p>
          <ul className={estilos.pendencias}>
            {porEtapa.map(({ etapa, itens }) => (
              <li key={etapa.id} className={estilos.pendenciaGrupo}>
                <h3 className={estilos.pendenciaTitulo}>{etapa.titulo}</h3>
                <ul>
                  {itens.map((p) => (
                    <li key={p.rotulo}>{p.rotulo}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="botao botao-secundario"
                  onClick={() => irPara(etapa.id)}
                >
                  Responder agora
                  <Icone nome="setaDireita" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={`${estilos.bloco} ${estilos.acoesResumo}`}>
        <button type="button" className="botao botao-primario" onClick={aoImprimir}>
          <Icone nome="imprimir" />
          Imprimir / Salvar em PDF
        </button>
        <button type="button" className="botao botao-secundario" onClick={aoBaixar}>
          <Icone nome="baixar" />
          Baixar arquivo
        </button>
        <p className="ajuda">
          O arquivo serve para levar a visita a outro aparelho: lá, use{" "}
          <strong>Abrir arquivo de visita</strong> na lista.
        </p>
      </div>
    </>
  );
}
