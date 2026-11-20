import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Caderno de Bolso",
    short_name: "Caderno",
    description:
      "Roteiro de apoio à visita de pares e ficha do produtor. Funciona sem internet depois de aberto uma vez.",
    lang: "pt-BR",
    start_url: "/visita/",
    scope: "/",
    display: "standalone",
    background_color: "#faf5ea",
    theme_color: "#2e5e34",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icones/icone-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
