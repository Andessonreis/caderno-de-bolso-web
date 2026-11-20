"use client";

import { useMemo, useRef, useState } from "react";
import { Icone } from "@/components/Icone";
import { apagarVisita, listarVisitas, salvarVisita, visitaDeArquivo } from "@/lib/armazenamento";
import { dataPorExtenso } from "@/lib/ficha";
import { avisarMudancaNasVisitas, useVisitasGuardadasCru } from "@/lib/useNavegador";
import { novaVisita, progresso, type Visita } from "@/lib/visita";
import { EditorVisita } from "./EditorVisita";
import estilos from "./visita.module.css";

type Tela = { tipo: "lista" } | { tipo: "editor"; visita: Visita };

export function RoteiroVisita() {
  // localStorage só existe no navegador; no HTML do build a lista fica "procurando".
  const cru = useVisitasGuardadasCru();
  const visitas = useMemo(
    () => (cru === null ? null : listarVisitas({ getItem: () => cru, setItem: () => undefined })),
    [cru],
  );
  const [tela, setTela] = useState<Tela>({ tipo: "lista" });
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [confirmarApagar, setConfirmarApagar] = useState<string | null>(null);
  const entradaArquivo = useRef<HTMLInputElement>(null);
  const tituloLista = useRef<HTMLHeadingElement>(null);

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
      setMensagem({ tipo: "erro", texto: "O aparelho está sem espaço para guardar a visita." });
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
    const existentes = listarVisitas(localStorage);
    const jaExiste = existentes.some((v) => v.id === resultado.visita.id);
    try {
      salvarVisita(localStorage, resultado.visita);
    } catch {
      setMensagem({ tipo: "erro", texto: "O aparelho está sem espaço para guardar a visita." });
      return;
    }
    avisarMudancaNasVisitas();
    setMensagem({
      tipo: "ok",
      texto: jaExiste
        ? "Visita aberta. Ela substituiu a cópia que já estava neste aparelho."
        : "Visita aberta e guardada neste aparelho.",
    });
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
