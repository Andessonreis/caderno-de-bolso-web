"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icone } from "@/components/Icone";
import { decodeFicha, extrairPayload, type Ficha } from "@/lib/ficha";
import { culturasSensiveisDe, type CulturaSensivel } from "@/lib/visita";
import estilos from "./visita.module.css";

/** Parte da API de leitura de códigos do navegador que usamos (Chrome no Android tem). */
type LeitorDeCodigo = {
  detect: (imagem: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};
type ConstrutorLeitor = {
  new (opcoes: { formats: string[] }): LeitorDeCodigo;
  getSupportedFormats?: () => Promise<string[]>;
};

function construtorLeitor(): ConstrutorLeitor | null {
  const w = window as unknown as { BarcodeDetector?: ConstrutorLeitor };
  return w.BarcodeDetector ?? null;
}

export function ImportarFicha({
  aoImportar,
}: {
  aoImportar: (ficha: Ficha, sensiveis: CulturaSensivel[]) => void;
}) {
  const id = useId();
  const [texto, setTexto] = useState("");
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [temLeitor, setTemLeitor] = useState(false);
  const foto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const Leitor = construtorLeitor();
    if (!Leitor?.getSupportedFormats) return;
    Leitor.getSupportedFormats()
      .then((formatos) => setTemLeitor(formatos.includes("qr_code")))
      .catch(() => setTemLeitor(false));
  }, []);

  function usar(entrada: string) {
    const resultado = decodeFicha(extrairPayload(entrada));
    if (!resultado.ok) {
      setMensagem({
        tipo: "erro",
        texto:
          resultado.motivo === "vazio"
            ? "Cole o link da ficha que aparece ao ler o QR do produtor."
            : "Não conseguimos ler esta ficha. Confira se o link está completo.",
      });
      return;
    }
    const sensiveis = culturasSensiveisDe(resultado.ficha.cu ?? []);
    aoImportar(resultado.ficha, sensiveis);
    setTexto("");
    setMensagem({ tipo: "ok", texto: `Dados de ${resultado.ficha.n} preenchidos.` });
  }

  async function lerFoto(arquivo: File | undefined) {
    const Leitor = construtorLeitor();
    if (!arquivo || !Leitor) return;
    try {
      const imagem = await createImageBitmap(arquivo);
      const achados = await new Leitor({ formats: ["qr_code"] }).detect(imagem);
      if (!achados.length) {
        setMensagem({ tipo: "erro", texto: "Não achamos um QR na foto. Tente chegar mais perto." });
        return;
      }
      usar(achados[0].rawValue);
    } catch {
      setMensagem({ tipo: "erro", texto: "Não deu para ler a foto. Tente de novo." });
    }
  }

  return (
    <div className={estilos.importar}>
      <h2 className={estilos.importarTitulo}>Tem a ficha do produtor?</h2>
      <p className="ajuda">Use os dados dela para não precisar digitar. É opcional.</p>
      <div className="campo">
        <label htmlFor={`${id}-link`}>Link da ficha</label>
        <input
          id={`${id}-link`}
          className="entrada"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="Cole aqui o link"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              usar(texto);
            }
          }}
        />
      </div>
      <div className="grupo-botoes">
        <button type="button" className="botao botao-secundario" onClick={() => usar(texto)}>
          <Icone nome="certo" />
          Usar dados da ficha
        </button>
        {temLeitor ? (
          <>
            <button
              type="button"
              className="botao botao-discreto"
              onClick={() => foto.current?.click()}
            >
              <Icone nome="camera" />
              Ler o QR com a câmera
            </button>
            <input
              ref={foto}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                void lerFoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </>
        ) : null}
      </div>
      <p role="status" className={mensagem?.tipo === "erro" ? estilos.msgErro : estilos.msgOk}>
        {mensagem?.texto}
      </p>
    </div>
  );
}
