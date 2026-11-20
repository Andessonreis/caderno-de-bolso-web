"use client";

import { useEffect, useState } from "react";
import { Icone } from "./Icone";

type Estado = "parado" | "copiado" | "falhou";

/** Copia um texto e avisa na tela (e para leitores de tela) se deu certo. */
export function BotaoCopiar({
  texto,
  rotulo = "Copiar",
  descricao,
  className = "botao botao-discreto",
}: {
  texto: string;
  rotulo?: string;
  /** Nome do que está sendo copiado, para leitores de tela. */
  descricao?: string;
  className?: string;
}) {
  const [estado, setEstado] = useState<Estado>("parado");

  useEffect(() => {
    if (estado === "parado") return;
    const t = setTimeout(() => setEstado("parado"), 2500);
    return () => clearTimeout(t);
  }, [estado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setEstado("copiado");
    } catch {
      setEstado("falhou");
    }
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={copiar}
        aria-label={descricao ? `${rotulo} ${descricao}` : undefined}
      >
        <Icone nome={estado === "copiado" ? "certo" : "copiar"} />
        {estado === "copiado" ? "Copiado" : rotulo}
      </button>
      <span role="status" className="sr-only">
        {estado === "copiado" ? "Copiado." : ""}
        {estado === "falhou" ? "Não deu para copiar. Toque e segure no texto para copiar." : ""}
      </span>
      {estado === "falhou" ? (
        <span className="ajuda" aria-hidden="true">
          Não deu para copiar. Toque e segure no texto.
        </span>
      ) : null}
    </>
  );
}
