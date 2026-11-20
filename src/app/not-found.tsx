import type { Metadata } from "next";
import Link from "next/link";
import { Icone } from "@/components/Icone";
import estilos from "./nao-encontrada.module.css";

export const metadata: Metadata = {
  title: "Página não encontrada",
};

export default function NaoEncontrada() {
  return (
    <div className={`conteiner ${estilos.pagina}`}>
      <p className="etiqueta">Página não encontrada</p>
      <h1>Essa página não está aqui.</h1>
      <p className={estilos.texto}>
        Pode ser um link com algum pedaço faltando. Se você estava abrindo a ficha de um produtor,
        peça para ele mostrar o QR de novo.
      </p>
      <div className="grupo-botoes">
        <Link className="botao botao-primario" href="/">
          <Icone nome="casa" />
          Ir para o início
        </Link>
        <Link className="botao botao-secundario" href="/visita/">
          <Icone nome="prancheta" />
          Roteiro de visita
        </Link>
      </div>
    </div>
  );
}
