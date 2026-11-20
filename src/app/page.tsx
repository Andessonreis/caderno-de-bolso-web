import Link from "next/link";
import { Icone, type NomeIcone } from "@/components/Icone";
import { FICHA_EXEMPLO, encodeFicha } from "@/lib/ficha";
import estilos from "./inicio.module.css";

const LINK_EXEMPLO = `/ficha/#d=${encodeFicha(FICHA_EXEMPLO)}`;
const REPOSITORIO_APP = process.env.NEXT_PUBLIC_MOBILE_REPO_URL?.trim();

const BLOCOS: ReadonlyArray<{
  icone: NomeIcone;
  titulo: string;
  texto: string;
}> = [
  {
    icone: "semInternet",
    titulo: "Anote na roça, sem internet",
    texto:
      "No aplicativo de celular você anota o plantio, a calda, a colheita e a venda na hora em que faz. Funciona sem sinal. Depois, passar para o caderno de papel fica mais fácil.",
  },
  {
    icone: "prancheta",
    titulo: "Passe a limpo mais rápido",
    texto:
      "Na visita de pares, quem visita segue um roteiro de apoio no celular ou no tablet: toca nas respostas, anota o que precisa corrigir e imprime a folha no fim.",
  },
  {
    icone: "qr",
    titulo: "Mostre de onde vem",
    texto:
      "Um QR na banca abre a sua ficha: quem você é, o que planta e como conferir o seu certificado. O comprador olha sozinho, sem você precisar mostrar foto toda vez.",
  },
];

const PASSOS: ReadonlyArray<{ titulo: string; texto: string }> = [
  {
    titulo: "Anote enquanto trabalha",
    texto:
      "Use o aplicativo ou continue só no papel. O caderno de campo segue sendo o seu registro.",
  },
  {
    titulo: "Gere a ficha e o QR",
    texto:
      "Pelo aplicativo ou nesta página, preencha seus dados e imprima o cartão para a banca.",
  },
  {
    titulo: "O comprador confere",
    texto:
      "Ele aponta a câmera do celular para o QR e vê sua ficha na hora, sem baixar nada.",
  },
];

const PUBLICO: ReadonlyArray<{
  icone: NomeIcone;
  titulo: string;
  texto: string;
}> = [
  {
    icone: "folha",
    titulo: "Agricultor e agricultora",
    texto:
      "Para quem já é certificado de forma participativa e mantém o caderno de campo: milho crioulo, feijão, hortaliças.",
  },
  {
    icone: "pessoas",
    titulo: "Grupo e cooperativa",
    texto:
      "Para organizar as visitas de pares, guardar o roteiro preenchido e fazer as fichas de quem ainda não usa o aplicativo.",
  },
  {
    icone: "qr",
    titulo: "Quem compra na feira",
    texto:
      "Para saber de quem está comprando e como conferir, em poucos segundos.",
  },
];

export default function Inicio() {
  return (
    <>
      <section className={estilos.abertura} aria-labelledby="titulo-abertura">
        <div className={`conteiner ${estilos.aberturaGrade}`}>
          <div>
            <p className="etiqueta">Para quem já tem caderno de campo</p>
            <h1 id="titulo-abertura" className={estilos.titulo}>
              O caderno continua no bolso. O trabalho fica mais leve.
            </h1>
            <p className={estilos.chamada}>
              O Caderno de Bolso ajuda o agricultor agroecológico a anotar na
              roça, preparar a visita de pares e mostrar ao comprador de onde
              vem o que vende. Ele não substitui o caderno de papel: anda junto
              com ele.
            </p>
            <div className="grupo-botoes">
              <Link className="botao botao-primario" href={LINK_EXEMPLO}>
                <Icone nome="qr" />
                Ver ficha de exemplo
              </Link>
              <Link className="botao botao-secundario" href="/visita/">
                <Icone nome="prancheta" />
                Abrir roteiro de visita
              </Link>
            </div>
          </div>

          <figure
            className={estilos.etiquetaBanca}
            aria-label="Exemplo de cartão de banca"
          >
            <div className={estilos.furo} aria-hidden="true" />
            <p className={estilos.etiquetaNome}>Zé Carlos</p>
            <p className={estilos.etiquetaLugar}>Canarana-BA</p>
            <p className={estilos.carimbo}>
              Produtor orgânico
              <br />
              certificação participativa
            </p>
            <div className={estilos.etiquetaQr} aria-hidden="true">
              <Icone nome="qr" tamanho={64} />
            </div>
            <figcaption className={estilos.etiquetaLegenda}>
              Aponte a câmera para conferir
            </figcaption>
          </figure>
        </div>
      </section>

      <section
        className={`conteiner ${estilos.secao}`}
        aria-labelledby="titulo-blocos"
      >
        <h2 id="titulo-blocos" className="sr-only">
          O que o Caderno de Bolso faz
        </h2>
        <ul className={estilos.blocos}>
          {BLOCOS.map((bloco) => (
            <li key={bloco.titulo} className={estilos.bloco}>
              <span className={estilos.blocoIcone}>
                <Icone nome={bloco.icone} tamanho={28} />
              </span>
              <h3>{bloco.titulo}</h3>
              <p>{bloco.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={estilos.faixa} aria-labelledby="titulo-passos">
        <div className={`conteiner ${estilos.secao}`}>
          <h2 id="titulo-passos">Como funciona</h2>
          <ol className={estilos.passos}>
            {PASSOS.map((passo) => (
              <li key={passo.titulo} className={estilos.passo}>
                <h3>{passo.titulo}</h3>
                <p>{passo.texto}</p>
              </li>
            ))}
          </ol>
          <div className="grupo-botoes">
            <Link className="botao botao-secundario" href="/ficha/criar/">
              <Icone nome="lapis" />
              Fazer uma ficha agora
            </Link>
          </div>
        </div>
      </section>

      <section
        className={`conteiner ${estilos.secao}`}
        aria-labelledby="titulo-publico"
      >
        <h2 id="titulo-publico">Para quem é</h2>
        <ul className={estilos.publico}>
          {PUBLICO.map((item) => (
            <li key={item.titulo} className={estilos.publicoItem}>
              <span className={estilos.publicoIcone}>
                <Icone nome={item.icone} tamanho={26} />
              </span>
              <div>
                <h3>{item.titulo}</h3>
                <p>{item.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        className={`conteiner ${estilos.secao}`}
        aria-labelledby="titulo-app"
      >
        <div className={`cartao ${estilos.app}`}>
          <span className={estilos.blocoIcone}>
            <Icone nome="celular" tamanho={28} />
          </span>
          <div>
            <h2 id="titulo-app" className={estilos.appTitulo}>
              Existe também o aplicativo para celular
            </h2>
            <p>
              É nele que o agricultor anota na roça, mesmo sem internet, e gera
              o QR da sua ficha. Este site é o outro lado: a ficha que o
              comprador abre e o roteiro da visita de pares.
            </p>
            {REPOSITORIO_APP ? (
              <a className="botao botao-secundario" href={REPOSITORIO_APP}>
                <Icone nome="celular" />
                Conhecer o aplicativo
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section
        className={`conteiner ${estilos.secao}`}
        aria-labelledby="titulo-aviso"
      >
        <div className="aviso">
          <h2 id="titulo-aviso" className={estilos.avisoTitulo}>
            Um projeto acadêmico
          </h2>
          <p>
            O Caderno de Bolso é um protótipo feito por estudantes, em conversa
            com agricultores do Território de Irecê. Não é ferramenta oficial de
            certificadora nem de órgão público.
          </p>
          <p>
            Não há cadastro, senha nem servidor guardando seus dados. O que você
            escreve fica só no aparelho que está usando.
          </p>
        </div>
      </section>
    </>
  );
}
