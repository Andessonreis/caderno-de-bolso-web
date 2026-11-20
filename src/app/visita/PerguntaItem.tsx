"use client";

import { useId, useState } from "react";
import { Icone } from "@/components/Icone";
import { OPCOES_RESPOSTA, type Item, type RespostaItem, type Resposta } from "@/lib/visita";
import { Escolha } from "./Escolha";
import estilos from "./visita.module.css";

export function PerguntaItem({
  item,
  resposta,
  aoMudar,
}: {
  item: Item;
  resposta: RespostaItem | undefined;
  aoMudar: (nova: RespostaItem) => void;
}) {
  const id = useId();
  const obs = resposta?.obs ?? "";
  const [abrirObs, setAbrirObs] = useState(obs !== "");

  return (
    <div className={estilos.item} data-respondido={resposta?.r ? "sim" : undefined}>
      <Escolha<Resposta>
        nome={`${id}-r`}
        legenda={item.texto}
        ajuda={item.ajuda}
        opcoes={OPCOES_RESPOSTA}
        valor={resposta?.r}
        aoMudar={(r) => aoMudar({ obs, r })}
      />
      {abrirObs ? (
        <div className={estilos.obs}>
          <label htmlFor={`${id}-obs`} className="rotulo">
            Observação
          </label>
          <textarea
            id={`${id}-obs`}
            className="entrada"
            rows={2}
            value={obs}
            onChange={(e) => aoMudar({ ...resposta, obs: e.target.value })}
          />
        </div>
      ) : (
        <button
          type="button"
          className={`botao botao-discreto ${estilos.botaoObs}`}
          onClick={() => setAbrirObs(true)}
          aria-label={`Anotar observação: ${item.texto}`}
        >
          <Icone nome="lapis" />
          Anotar observação
        </button>
      )}
    </div>
  );
}
