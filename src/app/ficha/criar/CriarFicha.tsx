"use client";

import QRCode from "qrcode";
import { useEffect, useId, useMemo, useState } from "react";
import { BotaoCopiar } from "@/components/BotaoCopiar";
import { Contador } from "@/components/Contador";
import { Icone } from "@/components/Icone";
import { ANO_MAXIMO, ANO_MINIMO, LIMITES, linkDaFicha, normalizarFicha } from "@/lib/ficha";
import { useDoNavegador } from "@/lib/useNavegador";
import { BASE_PATH } from "@/lib/caminho";
import estilos from "./criar.module.css";

const CHAVE_RASCUNHO = "caderno-de-bolso:ficha-rascunho:v1";
/** Tamanho do campo de culturas: 12 culturas de até 40 letras, com vírgulas. */
const LIMITE_TEXTO_CULTURAS = LIMITES.culturas * (LIMITES.cultura + 2);

type Formulario = {
  n: string;
  m: string;
  c: string;
  o: string;
  ct: string;
  d: string;
  r: string;
  s: string;
  cu: string;
  u: string;
};

const VAZIO: Formulario = {
  n: "",
  m: "",
  c: "",
  o: "",
  ct: "",
  d: "",
  r: "",
  s: "",
  cu: "",
  u: "",
};

type Campo = {
  nome: Exclude<keyof Formulario, "cu" | "u" | "d">;
  rotulo: string;
  ajuda?: string;
  limite: number;
  autoComplete?: string;
};

const CAMPOS_PESSOA: Campo[] = [
  { nome: "n", rotulo: "Nome do produtor", limite: LIMITES.n, autoComplete: "name" },
  { nome: "m", rotulo: "Município", ajuda: "Por exemplo: Canarana-BA", limite: LIMITES.m },
  { nome: "c", rotulo: "Cooperativa ou núcleo", limite: LIMITES.c },
];

const CAMPOS_CERTIFICADO: Campo[] = [
  {
    nome: "o",
    rotulo: "Quem certifica",
    ajuda: "Nome do organismo de certificação participativa do seu grupo.",
    limite: LIMITES.o,
  },
  { nome: "ct", rotulo: "Número ou identificação do certificado", limite: LIMITES.ct },
  {
    nome: "r",
    rotulo: "Registro no cadastro nacional de produtores orgânicos",
    limite: LIMITES.r,
  },
  {
    nome: "s",
    rotulo: "Código de rastreio",
    ajuda: "Só se você já usa algum sistema de rastreio.",
    limite: LIMITES.s,
  },
];

function separarCulturas(texto: string): string[] {
  return texto
    .split(/[,;\n]/)
    .map((c) => c.trim())
    .filter(Boolean);
}

function lerRascunho(cru: string): Formulario {
  const recuperado = { ...VAZIO };
  try {
    const salvo: unknown = JSON.parse(cru);
    if (salvo && typeof salvo === "object") {
      const obj = salvo as Record<string, unknown>;
      for (const chave of Object.keys(VAZIO) as (keyof Formulario)[]) {
        const valor = obj[chave];
        if (typeof valor === "string") recuperado[chave] = valor.slice(0, LIMITE_TEXTO_CULTURAS);
      }
    }
  } catch {
    // Rascunho estragado: começa do zero.
  }
  return recuperado;
}

function lerRascunhoCru(): string {
  try {
    return localStorage.getItem(CHAVE_RASCUNHO) ?? "";
  } catch {
    return "";
  }
}

export function CriarFicha() {
  // O rascunho e o endereço do site só existem no navegador.
  const rascunho = useDoNavegador(lerRascunhoCru, null);
  const origem = useDoNavegador(() => window.location.origin, "");

  return (
    <div className={`conteiner ${estilos.pagina}`}>
      {/* Folha A6 só nesta página: some quando a pessoa sai dela. */}
      <style>{"@media print { @page { size: A6 portrait; margin: 6mm; } }"}</style>

      <header className={`${estilos.topo} nao-imprimir`}>
        <p className="etiqueta">Ficha do produtor</p>
        <h1>Fazer uma ficha</h1>
        <p className={estilos.chamada}>
          Preencha os dados, confira o cartão e imprima para deixar na banca. Funciona sem o
          aplicativo, e o que você escreve fica guardado só neste aparelho.
        </p>
      </header>

      {rascunho === null || !origem ? (
        <p className="ajuda" role="status">
          Preparando o formulário…
        </p>
      ) : (
        <FormularioFicha inicial={lerRascunho(rascunho)} origem={origem} />
      )}
    </div>
  );
}

function FormularioFicha({ inicial, origem }: { inicial: Formulario; origem: string }) {
  const [form, setForm] = useState<Formulario>(inicial);
  const [qr, setQr] = useState<{ para: string; url: string } | null>(null);
  const idBase = useId();

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(form));
    } catch {
      // Sem espaço: o formulário continua funcionando, só não fica guardado.
    }
  }, [form]);

  const ficha = useMemo(() => {
    const ano = form.d.trim() ? Number(form.d) : undefined;
    return normalizarFicha({
      v: 1,
      ...form,
      d: ano,
      cu: separarCulturas(form.cu),
    });
  }, [form]);

  const link = ficha && origem ? linkDaFicha(origem + BASE_PATH, ficha) : "";

  useEffect(() => {
    if (!link) return;
    let ativo = true;
    QRCode.toDataURL(link, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 640,
      color: { dark: "#2a1e15", light: "#ffffff" },
    })
      .then((url) => {
        if (ativo) setQr({ para: link, url });
      })
      .catch(() => {
        if (ativo) setQr(null);
      });
    return () => {
      ativo = false;
    };
  }, [link]);

  const anoDigitado = form.d.trim();
  const anoInvalido =
    anoDigitado !== "" &&
    (!/^\d{4}$/.test(anoDigitado) ||
      Number(anoDigitado) < ANO_MINIMO ||
      Number(anoDigitado) > ANO_MAXIMO);
  const culturas = separarCulturas(form.cu);
  const culturasDemais = culturas.length > LIMITES.culturas;
  const culturasLongas = culturas.filter((c) => Array.from(c).length > LIMITES.cultura);
  const errosCulturas = [
    culturasDemais ? `${idBase}-cu-erro` : "",
    culturasLongas.length ? `${idBase}-cu-longas` : "",
  ]
    .filter(Boolean)
    .join(" ");

  function mudar(campo: keyof Formulario, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function renderCampo(campo: Campo) {
    const id = `${idBase}-${campo.nome}`;
    return (
      <div className="campo" key={campo.nome}>
        <label htmlFor={id}>
          {campo.rotulo}
          {campo.nome === "n" ? <span className={estilos.obrigatorio}> (obrigatório)</span> : null}
        </label>
        {campo.ajuda ? (
          <p className="ajuda" id={`${id}-ajuda`}>
            {campo.ajuda}
          </p>
        ) : null}
        <input
          id={id}
          className="entrada"
          type="text"
          value={form[campo.nome]}
          maxLength={campo.limite}
          autoComplete={campo.autoComplete ?? "off"}
          aria-describedby={[campo.ajuda ? `${id}-ajuda` : "", `${id}-contador`].join(" ").trim()}
          required={campo.nome === "n"}
          onChange={(e) => mudar(campo.nome, e.target.value)}
        />
        <Contador id={`${id}-contador`} valor={form[campo.nome]} limite={campo.limite} />
      </div>
    );
  }

  const temCertificacao = Boolean(ficha?.o || ficha?.ct);
  const imagemQr = qr && qr.para === link ? qr.url : "";

  return (
    <div className={estilos.grade}>
      <form className="nao-imprimir" onSubmit={(e) => e.preventDefault()} noValidate>
        <fieldset className={estilos.grupo}>
          <legend className={estilos.legenda}>Quem produz</legend>
          {CAMPOS_PESSOA.map(renderCampo)}
        </fieldset>

        <fieldset className={estilos.grupo}>
          <legend className={estilos.legenda}>O que planta</legend>
          <div className="campo">
            <label htmlFor={`${idBase}-cu`}>Culturas</label>
            <p className="ajuda" id={`${idBase}-cu-ajuda`}>
              Separe com vírgula. Por exemplo: milho crioulo, feijão, coentro.
            </p>
            <textarea
              id={`${idBase}-cu`}
              className="entrada"
              rows={3}
              maxLength={LIMITE_TEXTO_CULTURAS}
              value={form.cu}
              aria-describedby={`${idBase}-cu-ajuda ${idBase}-cu-contador ${errosCulturas}`.trim()}
              aria-invalid={errosCulturas ? true : undefined}
              onChange={(e) => mudar("cu", e.target.value)}
            />
            <Contador id={`${idBase}-cu-contador`} valor={form.cu} limite={LIMITE_TEXTO_CULTURAS} />
            {culturasLongas.length ? (
              <p className={estilos.erro} id={`${idBase}-cu-longas`}>
                Cada cultura cabe em até {LIMITES.cultura} letras. Encurte:{" "}
                {culturasLongas.join(", ")}.
              </p>
            ) : null}
            {culturasDemais ? (
              <p className={estilos.erro} id={`${idBase}-cu-erro`}>
                A ficha mostra até {LIMITES.culturas} culturas. As outras ficam de fora.
              </p>
            ) : null}
          </div>
          <div className="campo">
            <label htmlFor={`${idBase}-u`}>Última anotação no caderno de campo</label>
            <input
              id={`${idBase}-u`}
              className="entrada"
              type="date"
              value={form.u}
              onChange={(e) => mudar("u", e.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className={estilos.grupo}>
          <legend className={estilos.legenda}>Certificação</legend>
          <p className="ajuda">Deixe em branco o que não tiver.</p>
          {CAMPOS_CERTIFICADO.map(renderCampo)}
          <div className="campo">
            <label htmlFor={`${idBase}-d`}>Certificado desde (ano)</label>
            <input
              id={`${idBase}-d`}
              className="entrada"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={form.d}
              aria-invalid={anoInvalido || undefined}
              aria-describedby={anoInvalido ? `${idBase}-d-erro` : undefined}
              onChange={(e) => mudar("d", e.target.value.replace(/\D/g, ""))}
            />
            {anoInvalido ? (
              <p className={estilos.erro} id={`${idBase}-d-erro`}>
                Escreva o ano com quatro números, por exemplo 2020.
              </p>
            ) : null}
          </div>
        </fieldset>

        <button type="button" className="botao botao-discreto" onClick={() => setForm(VAZIO)}>
          <Icone nome="lixeira" />
          Limpar formulário
        </button>
      </form>

      <section className={estilos.previa} aria-labelledby="titulo-previa">
        <h2 id="titulo-previa" className={`${estilos.previaTitulo} nao-imprimir`}>
          Cartão para a banca
        </h2>

        {ficha && link ? (
          <>
            <div className={estilos.cartao}>
              <p className={estilos.cartaoNome}>{ficha.n}</p>
              {ficha.m ? <p className={estilos.cartaoLugar}>{ficha.m}</p> : null}
              {temCertificacao ? (
                <p className={estilos.cartaoSelo}>
                  Produtor orgânico
                  <br />
                  certificação participativa
                </p>
              ) : null}
              {imagemQr ? (
                // eslint-disable-next-line @next/next/no-img-element -- imagem gerada no navegador
                <img
                  className={estilos.cartaoQr}
                  src={imagemQr}
                  width={640}
                  height={640}
                  alt={`QR que abre a ficha de ${ficha.n}`}
                />
              ) : (
                <div className={estilos.cartaoQrVazio} />
              )}
              <p className={estilos.cartaoInstrucao}>
                Aponte a câmera do celular para ver de onde vem
              </p>
              {ficha.cu?.length ? (
                <p className={estilos.cartaoCulturas}>{ficha.cu.slice(0, 4).join(" · ")}</p>
              ) : null}
            </div>

            <div className={`${estilos.acoes} nao-imprimir`}>
              <button
                type="button"
                className="botao botao-primario botao-largo"
                onClick={() => window.print()}
              >
                <Icone nome="imprimir" />
                Imprimir cartão
              </button>
              <a className="botao botao-secundario botao-largo" href={link}>
                <Icone nome="qr" />
                Abrir a ficha
              </a>
              <BotaoCopiar
                texto={link}
                rotulo="Copiar link"
                className="botao botao-discreto botao-largo"
              />
              {imagemQr ? (
                <a
                  className="botao botao-discreto botao-largo"
                  href={imagemQr}
                  download={`qr-ficha-${ficha.n.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`}
                >
                  <Icone nome="baixar" />
                  Baixar imagem do QR
                </a>
              ) : null}
            </div>
            <p className={`ajuda nao-imprimir ${estilos.dica}`}>
              Na hora de imprimir, escolha o papel A6 ou imprima em A4 e recorte.
            </p>
          </>
        ) : (
          <p className={`${estilos.vazio} nao-imprimir`}>
            Escreva o nome do produtor para ver o cartão e o QR.
          </p>
        )}
      </section>
    </div>
  );
}
