"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icone } from "@/components/Icone";
import {
  CHAVE_RESERVA,
  CHAVE_VISITAS,
  apagarVisita,
  avaliarImportacao,
  comoCopia,
  lerReserva,
  lerVisitas,
  listarVisitas,
  protegerConteudoEstragado,
  salvarVisita,
  visitaDeArquivo,
} from "@/lib/armazenamento";
import { dataPorExtenso } from "@/lib/ficha";
import { avisarMudancaNasVisitas, useChaveLocal } from "@/lib/useNavegador";
import { novaVisita, progresso, type Visita } from "@/lib/visita";
import { EditorVisita } from "./EditorVisita";
import estilos from "./visita.module.css";

type Tela = { tipo: "lista" } | { tipo: "editor"; visita: Visita };

type Conflito = { importada: Visita; local: Visita };

const SEM_ESPACO = "O aparelho está sem espaço para guardar a visita.";

function quando(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime())
    ? "em data desconhecida"
    : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function baixarTexto(conteudo: string, nome: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function RoteiroVisita() {
  // localStorage só existe no navegador; no HTML do build a lista fica "procurando".
  const cru = useChaveLocal(CHAVE_VISITAS);
  const leitura = useMemo(() => (cru === undefined ? null : lerVisitas(cru)), [cru]);
  const visitas = leitura?.visitas ?? null;
  const reservaCru = useChaveLocal(CHAVE_RESERVA);
  const reserva = useMemo(() => lerReserva(reservaCru ?? null), [reservaCru]);
  const [conflito, setConflito] = useState<Conflito | null>(null);
  const [confirmarApagarReserva, setConfirmarApagarReserva] = useState(false);
  const [tela, setTela] = useState<Tela>({ tipo: "lista" });
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [confirmarApagar, setConfirmarApagar] = useState<string | null>(null);
  const entradaArquivo = useRef<HTMLInputElement>(null);
  const tituloLista = useRef<HTMLHeadingElement>(null);

  // Achou conteúdo estragado: guarda uma cópia já, antes de qualquer regravação.
  useEffect(() => {
    if (!leitura?.estragado) return;
    try {
      protegerConteudoEstragado(localStorage);
      avisarMudancaNasVisitas();
    } catch {
      // Sem espaço: as gravações seguintes também tentam e avisam o erro.
    }
  }, [leitura]);

  function abrir(visita: Visita) {
    setMensagem(null);
    setTela({ tipo: "editor", visita });
    window.scrollTo({ top: 0 });
  }

  function criar() {
    const visita = novaVisita();
    try {
      salvarVisita(localStorage, visita);
    } catch {
      setMensagem({ tipo: "erro", texto: SEM_ESPACO });
      return;
    }
    avisarMudancaNasVisitas();
    abrir(visita);
  }

  function voltarParaLista() {
    avisarMudancaNasVisitas();
    setTela({ tipo: "lista" });
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => tituloLista.current?.focus());
  }

  async function abrirArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    if (arquivo.size > 1_000_000) {
      setMensagem({ tipo: "erro", texto: "Este arquivo é grande demais para ser uma visita." });
      return;
    }
    const resultado = visitaDeArquivo(await arquivo.text());
    if (!resultado.ok) {
      setMensagem({ tipo: "erro", texto: resultado.mensagem });
      return;
    }
    const avaliacao = avaliarImportacao(listarVisitas(localStorage), resultado.visita);
    if (avaliacao.tipo === "localMaisNova") {
      setMensagem(null);
      setConflito({ importada: resultado.visita, local: avaliacao.local });
      return;
    }
    guardarImportada(
      resultado.visita,
      avaliacao.tipo === "nova"
        ? "Visita aberta e guardada neste aparelho."
        : "Visita aberta. A do arquivo era mais nova e substituiu a que estava neste aparelho.",
    );
  }

  function guardarImportada(visita: Visita, texto: string) {
    try {
      salvarVisita(localStorage, visita);
    } catch {
      setMensagem({ tipo: "erro", texto: SEM_ESPACO });
      return;
    }
    avisarMudancaNasVisitas();
    setConflito(null);
    setMensagem({ tipo: "ok", texto });
  }

  if (tela.tipo === "editor") {
    return <EditorVisita inicial={tela.visita} aoSair={voltarParaLista} />;
  }

  return (
    <div className={`conteiner ${estilos.pagina}`}>
      <header className={estilos.topoLista}>
        <p className="etiqueta">Visita de pares</p>
        <h1 ref={tituloLista} tabIndex={-1}>
          Roteiro de apoio à visita
        </h1>
        <p className={estilos.chamada}>
          Para quem faz a visita preencher no celular ou no tablet, tocando nas respostas. Fica
          salvo neste aparelho a cada toque e funciona sem internet depois de aberto uma vez.
        </p>
        <p className="ajuda">
          É um apoio para organizar a visita. Não substitui o roteiro nem os documentos do seu
          grupo.
        </p>
      </header>

      <div className={estilos.acoesLista}>
        <button type="button" className="botao botao-primario" onClick={criar}>
          <Icone nome="mais" />
          Começar nova visita
        </button>
        <button
          type="button"
          className="botao botao-discreto"
          onClick={() => entradaArquivo.current?.click()}
        >
          <Icone nome="abrir" />
          Abrir arquivo de visita
        </button>
        <input
          ref={entradaArquivo}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            void abrirArquivo(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {conflito ? (
        <div className={estilos.conflito} role="alertdialog" aria-labelledby="titulo-conflito">
          <h2 id="titulo-conflito" className={estilos.pergunta}>
            Este aparelho tem uma versão mais nova desta visita
          </h2>
          <p>
            A visita de {conflito.local.produtor.nome || "produtor sem nome"} foi alterada aqui em{" "}
            {quando(conflito.local.atualizadaEm)}. A do arquivo é de{" "}
            {quando(conflito.importada.atualizadaEm)}.
          </p>
          <div className={estilos.acoesConflito}>
            <button
              type="button"
              className="botao botao-primario"
              onClick={() =>
                guardarImportada(
                  comoCopia(conflito.importada),
                  "A visita do arquivo foi guardada como cópia. A deste aparelho continua igual.",
                )
              }
            >
              <Icone nome="mais" />
              Guardar o arquivo como cópia
            </button>
            <button
              type="button"
              className="botao botao-perigo"
              onClick={() =>
                guardarImportada(
                  conflito.importada,
                  "A visita deste aparelho foi substituída pela do arquivo.",
                )
              }
            >
              <Icone nome="abrir" />
              Substituir pela do arquivo
            </button>
            <button
              type="button"
              className="botao botao-discreto"
              onClick={() => {
                setConflito(null);
                setMensagem({ tipo: "ok", texto: "Nada foi mudado." });
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {leitura?.estragado || reserva.length > 0 ? (
        <div className={`aviso ${estilos.avisoReserva}`} role="status">
          {leitura?.estragado ? (
            <p>
              <strong>Algumas visitas guardadas neste aparelho estão estragadas</strong> e não dá
              para abri-las aqui.{visitas?.length ? " As outras continuam normais." : ""}
            </p>
          ) : null}
          {reserva.length > 0 ? (
            <>
              <p>
                Guardamos uma cópia do que estava estragado. Você pode baixar essa cópia e mostrar
                para quem cuida do projeto tentar recuperar.
              </p>
              <div className="grupo-botoes">
                <button
                  type="button"
                  className="botao botao-secundario"
                  onClick={() =>
                    baixarTexto(JSON.stringify(reserva, null, 2), "copia-visitas-estragadas.json")
                  }
                >
                  <Icone nome="baixar" />
                  Baixar a cópia guardada
                </button>
                {confirmarApagarReserva ? (
                  <button
                    type="button"
                    className="botao botao-perigo"
                    onClick={() => {
                      localStorage.removeItem(CHAVE_RESERVA);
                      avisarMudancaNasVisitas();
                      setConfirmarApagarReserva(false);
                    }}
                  >
                    <Icone nome="lixeira" />
                    Sim, apagar a cópia
                  </button>
                ) : (
                  <button
                    type="button"
                    className="botao botao-discreto"
                    onClick={() => setConfirmarApagarReserva(true)}
                  >
                    <Icone nome="lixeira" />
                    Apagar a cópia guardada
                  </button>
                )}
              </div>
            </>
          ) : (
            <p>Não houve espaço para guardar uma cópia do que estava estragado.</p>
          )}
        </div>
      ) : null}

      <div role="status" aria-live="polite">
        {mensagem ? (
          <p className={mensagem.tipo === "erro" ? estilos.msgErro : estilos.msgOk}>
            {mensagem.texto}
          </p>
        ) : null}
      </div>

      <section aria-labelledby="titulo-guardadas" className={estilos.guardadas}>
        <h2 id="titulo-guardadas" className={estilos.subtitulo}>
          Visitas guardadas neste aparelho
        </h2>
        {visitas === null ? (
          <p className="ajuda">Procurando visitas guardadas…</p>
        ) : visitas.length === 0 ? (
          <p className={estilos.listaVazia}>
            Nenhuma visita ainda. Toque em <strong>Começar nova visita</strong>.
          </p>
        ) : (
          <ul className={estilos.lista}>
            {visitas.map((v) => {
              const p = progresso(v);
              const nome = v.produtor.nome || "Produtor sem nome";
              return (
                <li key={v.id} className={estilos.cartaoVisita}>
                  <div>
                    <h3 className={estilos.cartaoVisitaNome}>{nome}</h3>
                    <p className={estilos.cartaoVisitaInfo}>
                      {v.data ? dataPorExtenso(v.data) : "Sem data"}
                      {v.produtor.municipio ? ` · ${v.produtor.municipio}` : ""}
                    </p>
                    <div className={estilos.miniProgresso} aria-hidden="true">
                      <span style={{ width: `${Math.round(p.fracao * 100)}%` }} />
                    </div>
                    <p className={estilos.cartaoVisitaInfo}>
                      {p.feitos} de {p.total} respondidas
                    </p>
                  </div>
                  {confirmarApagar === v.id ? (
                    <div className={estilos.confirmar} role="group" aria-label="Confirmar">
                      <p>Apagar a visita de {nome}? Não dá para desfazer.</p>
                      <div className="grupo-botoes">
                        <button
                          type="button"
                          className="botao botao-perigo"
                          onClick={() => {
                            apagarVisita(localStorage, v.id);
                            avisarMudancaNasVisitas();
                            setConfirmarApagar(null);
                            setMensagem({ tipo: "ok", texto: `Visita de ${nome} apagada.` });
                          }}
                        >
                          <Icone nome="lixeira" />
                          Sim, apagar
                        </button>
                        <button
                          type="button"
                          className="botao botao-discreto"
                          onClick={() => setConfirmarApagar(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grupo-botoes">
                      <button
                        type="button"
                        className="botao botao-secundario"
                        onClick={() => abrir(v)}
                        aria-label={`Continuar a visita de ${nome}`}
                      >
                        <Icone nome="lapis" />
                        Continuar
                      </button>
                      <button
                        type="button"
                        className="botao botao-discreto"
                        onClick={() => setConfirmarApagar(v.id)}
                        aria-label={`Apagar a visita de ${nome}`}
                      >
                        <Icone nome="lixeira" />
                        Apagar
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
