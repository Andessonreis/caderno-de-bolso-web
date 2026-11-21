"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { formatarCodigo, linkDoAplicativo } from "@/lib/grupo";
import estilos from "./grupo.module.css";

/** Cartão "Código do grupo", para imprimir e entregar aos membros. */
export function CartaoCodigo({ nome, codigo }: { nome: string; codigo: string }) {
  const conteudo = linkDoAplicativo(codigo);
  const [qr, setQr] = useState<{ para: string; url: string } | null>(null);

  useEffect(() => {
    let ativo = true;
    QRCode.toDataURL(conteudo, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 480,
      color: { dark: "#2a1e15", light: "#ffffff" },
    })
      .then((url) => {
        if (ativo) setQr({ para: conteudo, url });
      })
      .catch(() => {
        if (ativo) setQr(null);
      });
    return () => {
      ativo = false;
    };
  }, [conteudo]);

  const imagem = qr && qr.para === conteudo ? qr.url : "";

  return (
    <div className={estilos.cartaoCodigo}>
      <p className={estilos.cartaoTitulo}>Código do grupo</p>
      <p className={estilos.cartaoGrupo}>{nome}</p>
      <p className={estilos.codigo} aria-label={`Código: ${Array.from(codigo).join(" ")}`}>
        {formatarCodigo(codigo)}
      </p>
      {imagem ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagem gerada no navegador
        <img
          className={estilos.cartaoQr}
          src={imagem}
          width={480}
          height={480}
          alt="QR com o código do grupo, para abrir no aplicativo"
        />
      ) : (
        <div className={estilos.cartaoQrVazio} />
      )}
      <p className={estilos.cartaoTexto}>
        Para mandar à coordenação as visitas que você fizer, abra o aplicativo Caderno de Bolso, vá
        na aba Visita, toque em Visitar outra roça e depois em Grupo, e digite este código. Só vão
        as visitas que você escolher enviar.
      </p>
    </div>
  );
}
