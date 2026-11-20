"use client";

import estilos from "./visita.module.css";

export type OpcaoEscolha<T extends string> = { valor: T; rotulo: string; ajuda?: string };

/**
 * Grupo de rádios com cara de botões grandes. Continua sendo um grupo de
 * rádio de verdade: setas do teclado e leitores de tela funcionam.
 */
export function Escolha<T extends string>({
  nome,
  legenda,
  ajuda,
  opcoes,
  valor,
  aoMudar,
  colunas = 2,
  legendaVisivel = true,
}: {
  nome: string;
  legenda: string;
  ajuda?: string;
  opcoes: ReadonlyArray<OpcaoEscolha<T>>;
  valor: T | "" | undefined;
  aoMudar: (valor: T) => void;
  colunas?: 1 | 2 | 4;
  legendaVisivel?: boolean;
}) {
  return (
    <fieldset className={estilos.escolha}>
      <legend className={legendaVisivel ? estilos.pergunta : "sr-only"}>{legenda}</legend>
      {ajuda ? <p className={`ajuda ${estilos.perguntaAjuda}`}>{ajuda}</p> : null}
      <div className={estilos.opcoes} data-colunas={colunas}>
        {opcoes.map((opcao) => (
          <label key={opcao.valor} className={estilos.opcao} data-valor={opcao.valor}>
            <input
              type="radio"
              name={nome}
              value={opcao.valor}
              checked={valor === opcao.valor}
              onChange={() => aoMudar(opcao.valor)}
            />
            <span className={estilos.opcaoTexto}>
              <span>{opcao.rotulo}</span>
              {opcao.ajuda ? <span className={estilos.opcaoAjuda}>{opcao.ajuda}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
