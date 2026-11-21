"use client";

import { useId, useRef, useState } from "react";
import { BotaoCopiar } from "@/components/BotaoCopiar";
import { Contador } from "@/components/Contador";
import { Icone } from "@/components/Icone";
import { LIMITE_NOME_GRUPO, linkDaCoordenacao, type GrupoLembrado } from "@/lib/grupo";
import { criarGrupo, type GrupoCriado, type Problema } from "@/lib/servidorGrupo";
import { CartaoCodigo } from "./CartaoCodigo";
import { lembrarGrupo } from "./lembrar";
import estilos from "./grupo.module.css";

const ERRO_AO_CRIAR: Record<Problema, string> = {
  semInternet: "Sem internet agora. Para criar o grupo é preciso estar conectado. Tente de novo.",
  recusado: "Escreva o nome do grupo, com até 80 letras.",
  naoConfere: "O servidor não aceitou o pedido. Tente de novo daqui a pouco.",
  muitosGrupos:
    "Muitos grupos foram criados agora há pouco. Espere alguns minutos e tente de novo.",
  servidor: "O servidor teve um problema e o grupo não foi criado. Tente de novo daqui a pouco.",
};

export function CriarGrupo({
  site,
  aviso,
  lembrado,
  criado,
  aoCriar,
  aoAbrirLembrado,
}: {
  site: string;
  aviso: string;
  lembrado: GrupoLembrado | null;
  criado: GrupoCriado | null;
  aoCriar: (grupo: GrupoCriado) => void;
  aoAbrirLembrado: () => void;
}) {
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const tituloCriado = useRef<HTMLHeadingElement>(null);
  const id = useId();

  async function criar() {
    if (enviando) return;
    if (!nome.trim()) {
      setErro("Escreva o nome do grupo para continuar.");
      return;
    }
    setEnviando(true);
    setErro("");
    const r = await criarGrupo(nome);
    setEnviando(false);
    if (!r.ok) {
      setErro(ERRO_AO_CRIAR[r.problema]);
      return;
    }
    aoCriar(r.valor);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => tituloCriado.current?.focus());
  }

  if (criado) {
    return (
      <GrupoCriadoAgora
        criado={criado}
        site={site}
        lembradoAqui={lembrado?.grupo === criado.grupo}
        titulo={tituloCriado}
      />
    );
  }

  return (
    <div className={`conteiner ${estilos.pagina}`}>
      <header className={estilos.topo}>
        <p className="etiqueta">Para a coordenação do grupo</p>
        <h1>Reunir as visitas do grupo</h1>
        <p className={estilos.chamada}>
          Os produtores do núcleo, associação ou cooperativa fazem as visitas de pares no
          aplicativo. Aqui a coordenação recebe todas num lugar só, para acompanhar, imprimir e
          baixar em planilha.
        </p>
      </header>

      <div role="status" aria-live="polite">
        {aviso ? <p className={estilos.msgOk}>{aviso}</p> : null}
      </div>

      {lembrado ? (
        <div className={`cartao ${estilos.bloco}`}>
          <h2 className={estilos.subtitulo}>Grupo lembrado neste aparelho</h2>
          <p>{lembrado.nome || "Grupo sem nome"}</p>
          <button type="button" className="botao botao-secundario" onClick={aoAbrirLembrado}>
            <Icone nome="pessoas" />
            Abrir as visitas deste grupo
          </button>
        </div>
      ) : null}

      <section className={estilos.bloco} aria-labelledby="titulo-como">
        <h2 id="titulo-como" className={estilos.subtitulo}>
          Como funciona
        </h2>
        <ol className={estilos.passos}>
          <li>
            Você cria o grupo aqui e recebe duas coisas: o <strong>código do grupo</strong>, para
            entregar aos membros, e o <strong>link da coordenação</strong>, só seu.
          </li>
          <li>
            Cada membro digita o código no aplicativo e escolhe quais visitas enviar ao grupo.
          </li>
          <li>Pelo link da coordenação, você vê as visitas que chegaram, neste site.</li>
        </ol>
      </section>

      <form
        className={`cartao ${estilos.bloco}`}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void criar();
        }}
        aria-labelledby="titulo-criar"
      >
        <h2 id="titulo-criar" className={estilos.subtitulo}>
          Criar um grupo
        </h2>
        <div className="campo">
          <label htmlFor={`${id}-nome`}>Nome do grupo</label>
          <p className="ajuda" id={`${id}-ajuda`}>
            Do jeito que os membros conhecem. Por exemplo: Núcleo da Baixa Verde.
          </p>
          <input
            id={`${id}-nome`}
            className="entrada"
            type="text"
            value={nome}
            maxLength={LIMITE_NOME_GRUPO}
            autoComplete="off"
            required
            aria-invalid={erro && !nome.trim() ? true : undefined}
            aria-describedby={`${id}-ajuda ${id}-contador${erro ? ` ${id}-erro` : ""}`}
            onChange={(e) => setNome(e.target.value)}
          />
          <Contador id={`${id}-contador`} valor={nome} limite={LIMITE_NOME_GRUPO} />
        </div>
        <div role="alert">
          {erro ? (
            <p className={estilos.msgErro} id={`${id}-erro`}>
              {erro}
            </p>
          ) : null}
        </div>
        <button type="submit" className="botao botao-primario" disabled={enviando}>
          <Icone nome="mais" />
          {enviando ? "Criando o grupo…" : "Criar o grupo"}
        </button>
        <p className={`ajuda ${estilos.depois}`}>Precisa de internet para criar.</p>
      </form>

      <Privacidade />
    </div>
  );
}

function GrupoCriadoAgora({
  criado,
  site,
  lembradoAqui,
  titulo,
}: {
  criado: GrupoCriado;
  site: string;
  lembradoAqui: boolean;
  titulo: React.RefObject<HTMLHeadingElement | null>;
}) {
  const link = linkDaCoordenacao(site, criado);
  const id = useId();

  return (
    <div className={`conteiner ${estilos.pagina}`}>
      <header className={`${estilos.topo} nao-imprimir`}>
        <p className="etiqueta">Grupo criado</p>
        <h1 ref={titulo} tabIndex={-1} className={estilos.semContorno}>
          {criado.nome}
        </h1>
        <p className={estilos.chamada}>
          Guarde as duas coisas abaixo agora. Elas não aparecem de novo.
        </p>
      </header>

      <section className={estilos.bloco} aria-labelledby={`${id}-codigo`}>
        <h2 id={`${id}-codigo`} className={`${estilos.subtitulo} nao-imprimir`}>
          1. Código do grupo, para os membros
        </h2>
        <p className="nao-imprimir">
          Entregue aos membros: eles digitam no aplicativo para enviar as visitas. O código só serve
          para enviar, não para ver as visitas.
        </p>
        <CartaoCodigo nome={criado.nome} codigo={criado.codigo} />
        <div className={`grupo-botoes nao-imprimir ${estilos.depois}`}>
          <BotaoCopiar
            texto={criado.codigo}
            rotulo="Copiar código"
            descricao="do grupo"
            className="botao botao-secundario"
          />
          <button type="button" className="botao botao-discreto" onClick={() => window.print()}>
            <Icone nome="imprimir" />
            Imprimir cartão do código
          </button>
        </div>
      </section>

      <section className={`${estilos.bloco} nao-imprimir`} aria-labelledby={`${id}-link`}>
        <h2 id={`${id}-link`} className={estilos.subtitulo}>
          2. Link da coordenação, só para você
        </h2>
        <div className={`aviso ${estilos.alerta}`}>
          <p>
            <strong>Quem tiver este link vê todas as visitas do grupo.</strong> Guarde num lugar
            seguro e não compartilhe. Se perder, não há como recuperar: será preciso criar outro
            grupo e entregar um código novo aos membros.
          </p>
        </div>
        <label className="rotulo" htmlFor={`${id}-campo-link`}>
          Link da coordenação
        </label>
        <textarea
          id={`${id}-campo-link`}
          className={`entrada ${estilos.campoLink}`}
          readOnly
          rows={3}
          value={link}
          onFocus={(e) => e.target.select()}
        />
        <div className={`grupo-botoes ${estilos.depois}`}>
          <BotaoCopiar
            texto={link}
            rotulo="Copiar link"
            descricao="da coordenação"
            className="botao botao-secundario"
          />
          <a className="botao botao-primario" href={link}>
            <Icone nome="pessoas" />
            Abrir a página do grupo
          </a>
        </div>
        <LembrarNesteAparelho
          marcado={lembradoAqui}
          aoMudar={(sim) =>
            lembrarGrupo(
              sim
                ? {
                    grupo: criado.grupo,
                    chave: criado.chave,
                    nome: criado.nome,
                    codigo: criado.codigo,
                  }
                : null,
            )
          }
        />
      </section>
    </div>
  );
}

export function LembrarNesteAparelho({
  marcado,
  aoMudar,
}: {
  marcado: boolean;
  aoMudar: (sim: boolean) => void;
}) {
  const id = useId();
  return (
    <div className={estilos.lembrar}>
      <input
        id={id}
        type="checkbox"
        className={estilos.caixa}
        checked={marcado}
        aria-describedby={`${id}-ajuda`}
        onChange={(e) => aoMudar(e.target.checked)}
      />
      <div>
        <label htmlFor={id} className="rotulo">
          Lembrar neste aparelho
        </label>
        <p className="ajuda" id={`${id}-ajuda`}>
          Ao abrir esta página de novo, o grupo aparece sem precisar do link. Marque só se o
          aparelho for seu: quem usar este navegador também vai ver as visitas.
        </p>
      </div>
    </div>
  );
}

export function Privacidade() {
  return (
    <section className={`${estilos.bloco} ${estilos.privacidade}`} aria-label="Sobre os dados">
      <p>
        As visitas mostradas aqui foram enviadas por membros que digitaram o código do grupo no
        aplicativo e concordaram em enviar. Elas trazem o nome do produtor visitado e o que foi
        visto na roça: use só para o trabalho do grupo.
      </p>
      <p>
        O servidor guarda as visitas enviadas. Do código e da chave, guarda só uma versão
        embaralhada, que não dá para desfazer. Esta página não guarda as visitas no aparelho: ao
        fechar, elas somem daqui.
      </p>
    </section>
  );
}
