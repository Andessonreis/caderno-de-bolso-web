"use client";

import { useState } from "react";
import { Icone } from "@/components/Icone";
import { BASE_PATH } from "@/lib/caminho";
import { CHAVE_GRUPO_LEMBRADO, lerGrupoLembrado, lerLinkDaCoordenacao } from "@/lib/grupo";
import { useHash } from "@/lib/useHash";
import { useChaveLocal, useDoNavegador } from "@/lib/useNavegador";
import { type GrupoCriado } from "@/lib/servidorGrupo";
import { CriarGrupo } from "./CriarGrupo";
import { lembrarGrupo } from "./lembrar";
import { PainelGrupo } from "./PainelGrupo";
import estilos from "./grupo.module.css";

/** Tira o "#g=...&k=..." do endereço sem recarregar a página. */
function limparEndereco() {
  history.pushState(null, "", window.location.pathname);
}

export function PaginaGrupo() {
  const hash = useHash();
  const lembradoCru = useChaveLocal(CHAVE_GRUPO_LEMBRADO);
  const origem = useDoNavegador(() => window.location.origin, "");
  const [criando, setCriando] = useState(false);
  const [aviso, setAviso] = useState("");
  // Fica aqui, e não no formulário, para o código e o link não sumirem quando a
  // pessoa abre o painel e volta pelo navegador.
  const [criado, setCriado] = useState<GrupoCriado | null>(null);

  if (hash === null || lembradoCru === undefined || !origem) {
    return (
      <div className={`conteiner ${estilos.pagina}`}>
        <p className="ajuda" role="status">
          Abrindo a página do grupo…
        </p>
      </div>
    );
  }

  const site = origem + BASE_PATH;
  const link = lerLinkDaCoordenacao(hash);
  const lembrado = lerGrupoLembrado(lembradoCru);

  if (link.tipo === "invalido") {
    return (
      <div className={`conteiner ${estilos.pagina}`}>
        <p className="etiqueta">Visitas do grupo</p>
        <h1>Não conseguimos ler este link</h1>
        <p className={estilos.chamada}>
          O link da coordenação está incompleto ou foi alterado. Confira se ele foi copiado inteiro,
          até o fim.
        </p>
        <button
          type="button"
          className="botao botao-secundario"
          onClick={() => {
            limparEndereco();
            setCriado(null);
            setCriando(true);
          }}
        >
          <Icone nome="setaEsquerda" />
          Ir para o começo da página do grupo
        </button>
      </div>
    );
  }

  const credenciais = link.tipo === "ok" ? link : !criando && lembrado ? lembrado : null;

  if (credenciais) {
    return (
      <PainelGrupo
        key={`${credenciais.grupo}:${credenciais.chave}`}
        grupo={credenciais.grupo}
        chave={credenciais.chave}
        site={site}
        lembrado={lembrado?.grupo === credenciais.grupo ? lembrado : null}
        aoCriarOutro={() => {
          limparEndereco();
          setAviso("");
          setCriado(null);
          setCriando(true);
        }}
        aoApagar={(nome) => {
          if (lembrado?.grupo === credenciais.grupo) lembrarGrupo(null);
          limparEndereco();
          setCriado(null);
          setCriando(true);
          setAviso(`O grupo ${nome} foi apagado, com todas as visitas reunidas.`);
        }}
      />
    );
  }

  return (
    <CriarGrupo
      site={site}
      aviso={aviso}
      lembrado={lembrado}
      criado={criado}
      aoCriar={(grupo) => {
        setCriado(grupo);
        setCriando(true);
      }}
      aoAbrirLembrado={() => {
        setAviso("");
        setCriando(false);
      }}
    />
  );
}
