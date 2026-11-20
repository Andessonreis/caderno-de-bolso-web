/**
 * Ícones de traço simples, desenhados para o projeto. São sempre decorativos
 * (aria-hidden): todo ícone aparece ao lado de um texto que diz o que ele é.
 */

const CAMINHOS = {
  folha: "M5 19c0-8 5-13 14-14 0 9-5 14-13 14H5Zm0 0 8-8",
  caderno: "M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6V3Zm0 0v18M3 7h3M3 12h3M3 17h3M10 8h6M10 12h6",
  prancheta:
    "M9 4h6v3H9V4Zm-3 1h3m6 0h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm2 8 2.5 2.5L16 10",
  qr: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h2v2h-2v-2Zm4 0h2v2h-2v-2Zm-4 4h2v2h-2v-2Zm4 0h2v2h-2v-2Z",
  celular: "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 17h2",
  semInternet:
    "M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4.5-2.5M19 13a10 10 0 0 0-2.4-1.7M12 20h.01",
  pino: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  copiar: "M9 9h10v12H9V9Zm-4 6H4V3h11v2",
  compartilhar: "M12 3v12m0-12L7.5 7.5M12 3l4.5 4.5M5 12v8h14v-8",
  imprimir: "M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7v-7Z",
  baixar: "M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 20h16",
  abrir: "M12 21V9m0 0-4.5 4.5M12 9l4.5 4.5M4 4h16",
  lixeira: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  setaDireita: "M5 12h14m0 0-6-6m6 6-6 6",
  setaEsquerda: "M19 12H5m0 0 6-6m-6 6 6 6",
  certo: "M4 12.5 9.5 18 20 7",
  alerta: "M12 3 2 20h20L12 3Zm0 6v5m0 3h.01",
  mais: "M12 5v14M5 12h14",
  camera: "M4 8h3l2-3h6l2 3h3v11H4V8Zm8 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  lapis: "M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4",
  pessoas:
    "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5a6 6 0 0 1 3 5.5",
  casa: "M3 11 12 4l9 7M5 10v10h14V10",
} as const;

export type NomeIcone = keyof typeof CAMINHOS;

export function Icone({ nome, tamanho = 24 }: { nome: NomeIcone; tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}
