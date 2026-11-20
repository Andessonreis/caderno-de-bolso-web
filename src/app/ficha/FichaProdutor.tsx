"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { BotaoCopiar } from "@/components/BotaoCopiar";
import { Icone } from "@/components/Icone";
import {
  FICHA_EXEMPLO,
  dataPorExtenso,
  decodeFicha,
  encodeFicha,
  payloadDoHash,
  type Ficha,
} from "@/lib/ficha";
import { useHash } from "@/lib/useHash";
import { useDoNavegador } from "@/lib/useNavegador";
import estilos from "./ficha.module.css";

export function FichaProdutor() {
  const hash = useHash();
  const resultado = useMemo(
    () => (hash === null ? null : decodeFicha(payloadDoHash(hash))),
    [hash],
  );

  useEffect(() => {
    if (resultado?.ok) document.title = `${resultado.ficha.n} · Caderno de Bolso`;
  }, [resultado]);

  if (resultado === null) {
    return (
      <div className={`conteiner ${estilos.pagina}`}>
        <p className={estilos.carregando} role="status">
          Abrindo a ficha do produtor…
        </p>
      </div>
    );
  }

  if (resultado.ok) return <FichaValida ficha={resultado.ficha} />;

  if (resultado.motivo === "vazio") return <SemFicha />;

  return (
    <div className={`conteiner ${estilos.pagina}`}>
      <div className={estilos.estado} role="alert">
        <span className={estilos.estadoIcone}>
          <Icone nome="alerta" tamanho={32} />
        </span>
        <h1 className={estilos.estadoTitulo}>Não conseguimos ler este código.</h1>
        <p>
          {resultado.motivo === "versao"
            ? "Ele foi feito por uma versão mais nova do aplicativo. Peça ao produtor para gerar de novo."
            : "Peça ao produtor para gerar de novo."}
        </p>
        <BotaoExemplo />
      </div>
    </div>
  );
}

function BotaoExemplo() {
  return (
    <button
      type="button"
      className="botao botao-secundario"
      onClick={() => {
        window.location.hash = `d=${encodeFicha(FICHA_EXEMPLO)}`;
        window.scrollTo({ top: 0 });
      }}
    >
      <Icone nome="qr" />
      Ver ficha de exemplo
    </button>
  );
}

function SemFicha() {
  return (
    <div className={`conteiner ${estilos.pagina}`}>
      <div className={estilos.estado}>
        <span className={estilos.estadoIcone}>
          <Icone nome="qr" tamanho={32} />
        </span>
        <h1 className={estilos.estadoTitulo}>Ficha do produtor</h1>
        <p>
          Esta página mostra quem produziu o alimento, o que planta e como conferir a certificação.
          Ela abre quando você aponta a câmera do celular para o QR na banca do produtor.
        </p>
        <div className="grupo-botoes">
          <BotaoExemplo />
          <Link className="botao botao-discreto" href="/ficha/criar/">
            <Icone nome="lapis" />
            Fazer uma ficha
          </Link>
        </div>
      </div>
    </div>
  );
}

function FichaValida({ ficha }: { ficha: Ficha }) {
  const temCertificacao = Boolean(ficha.o || ficha.ct);
  const ehExemplo = ficha.ct === FICHA_EXEMPLO.ct && ficha.n === FICHA_EXEMPLO.n;

  return (
    <article className={`conteiner ${estilos.pagina}`} aria-labelledby="nome-produtor">
      {ehExemplo ? (
        <p className={estilos.faixaExemplo}>
          Esta é uma ficha de exemplo, com uma pessoa inventada.
        </p>
      ) : null}

      <header className={estilos.topo}>
        <p className="etiqueta">Ficha do produtor</p>
        <h1 id="nome-produtor" className={estilos.nome}>
          {ficha.n}
        </h1>
        {ficha.m ? (
          <p className={estilos.lugar}>
            <Icone nome="pino" tamanho={22} />
            <span>{ficha.m}</span>
          </p>
        ) : null}
      </header>

      {temCertificacao ? (
        <div className={estilos.selo}>
          <Icone nome="folha" tamanho={30} />
          <div>
            <p className={estilos.seloTexto}>Produtor orgânico com certificação participativa</p>
            {ficha.d ? <p className={estilos.seloDesde}>Certificado desde {ficha.d}</p> : null}
          </div>
        </div>
      ) : ficha.d ? (
        <p className={estilos.linhaSimples}>Certificado desde {ficha.d}</p>
      ) : null}

      {ficha.c ? (
        <p className={estilos.linhaSimples}>
          <span className={estilos.rotuloLinha}>Faz parte de</span> {ficha.c}
        </p>
      ) : null}

      {ficha.cu?.length ? (
        <section className={estilos.bloco} aria-labelledby="titulo-planta">
          <h2 id="titulo-planta" className={estilos.blocoTitulo}>
            O que planta
          </h2>
          <ul className={estilos.chips}>
            {ficha.cu.map((cultura) => (
              <li key={cultura}>{cultura}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {ficha.u ? (
        <p className={estilos.caderno}>
          <Icone nome="caderno" tamanho={24} />
          <span>
            Caderno de campo atualizado em <strong>{dataPorExtenso(ficha.u)}</strong>
          </span>
        </p>
      ) : null}

      {ficha.o || ficha.ct || ficha.r || ficha.s ? (
        <section className={estilos.bloco} aria-labelledby="titulo-conferir">
          <h2 id="titulo-conferir" className={estilos.blocoTitulo}>
            Para conferir
          </h2>
          <dl className={estilos.dados}>
            {ficha.o ? (
              <Dado rotulo="Quem certifica">
                <dd>{ficha.o}</dd>
              </Dado>
            ) : null}
            {ficha.ct ? (
              <Dado rotulo="Certificado">
                <dd className={estilos.codigo}>{ficha.ct}</dd>
                <dd>
                  <BotaoCopiar texto={ficha.ct} descricao="o número do certificado" />
                </dd>
              </Dado>
            ) : null}
            {ficha.r ? (
              <Dado rotulo="Registro no cadastro nacional">
                <dd className={estilos.codigo}>{ficha.r}</dd>
                <dd>
                  <BotaoCopiar texto={ficha.r} descricao="o número do registro" />
                </dd>
              </Dado>
            ) : null}
            {ficha.s ? (
              <Dado rotulo="Código de rastreio">
                <dd className={estilos.codigo}>{ficha.s}</dd>
                <dd>
                  <BotaoCopiar texto={ficha.s} descricao="o código de rastreio" />
                </dd>
              </Dado>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className={estilos.bloco} aria-labelledby="titulo-spg">
        <h2 id="titulo-spg" className={estilos.blocoTitulo}>
          O que é certificação participativa?
        </h2>
        <p>
          É quando os agricultores de um grupo visitam as roças uns dos outros, conferem o caderno
          de campo e respondem juntos pela produção orgânica. No Brasil, essa forma de certificação
          é reconhecida por lei.
        </p>
      </section>

      <div className={`aviso ${estilos.honestidade}`}>
        <p>
          <strong>Informações declaradas pelo produtor.</strong> Esta ficha não é um certificado.
          Para confirmar, peça o certificado ao produtor ou consulte o Cadastro Nacional de
          Produtores Orgânicos, do Ministério da Agricultura, buscando pelo nome dele.
        </p>
      </div>

      <div className={estilos.acoes}>
        <BotaoCompartilhar nome={ficha.n} />
      </div>
    </article>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className={estilos.dado}>
      <dt>{rotulo}</dt>
      {children}
    </div>
  );
}

function BotaoCompartilhar({ nome }: { nome: string }) {
  // No HTML do build não existe navigator nem endereço: o botão aparece no navegador.
  const podeCompartilhar = useDoNavegador(() => typeof navigator.share === "function", false);
  const link = useDoNavegador(() => window.location.href, "");

  if (!link) return null;

  if (!podeCompartilhar) {
    return (
      <BotaoCopiar
        texto={link}
        rotulo="Copiar link da ficha"
        className="botao botao-primario botao-largo"
      />
    );
  }

  return (
    <button
      type="button"
      className="botao botao-primario botao-largo"
      onClick={() => {
        navigator
          .share({ title: `Ficha de ${nome}`, text: `Ficha do produtor ${nome}`, url: link })
          .catch(() => {
            // A pessoa fechou a janela de compartilhar: nada a fazer.
          });
      }}
    >
      <Icone nome="compartilhar" />
      Compartilhar
    </button>
  );
}
