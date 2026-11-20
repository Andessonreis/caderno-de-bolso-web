import Link from "next/link";
import estilos from "./Rodape.module.css";

export function Rodape() {
  return (
    <footer className={`${estilos.rodape} nao-imprimir`}>
      <div className={`conteiner ${estilos.grade}`}>
        <p className={estilos.texto}>
          <strong>Caderno de Bolso</strong> é um projeto acadêmico de estudantes de Análise e
          Desenvolvimento de Sistemas, no Território de Irecê, Bahia. Não é ferramenta oficial de
          nenhuma certificadora nem de órgão público.
        </p>
        <p className={estilos.texto}>
          Não tem cadastro nem senha. O que você escreve aqui fica guardado só neste aparelho.
        </p>
        <nav aria-label="Rodapé">
          <ul className={estilos.links}>
            <li>
              <Link href="/">Início</Link>
            </li>
            <li>
              <Link href="/ficha/criar/">Fazer uma ficha</Link>
            </li>
            <li>
              <Link href="/visita/">Roteiro de visita</Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
