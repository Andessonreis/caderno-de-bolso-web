import type { Metadata, Viewport } from "next";
import { Alegreya, Atkinson_Hyperlegible } from "next/font/google";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { RegistrarServiceWorker } from "@/components/RegistrarServiceWorker";
import "./globals.css";

// As fontes são baixadas no build e servidas pelo próprio site (nada de CDN em tempo de uso).
const alegreya = Alegreya({
  variable: "--fonte-alegreya",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const atkinson = Atkinson_Hyperlegible({
  variable: "--fonte-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const urlDoSite = process.env.NEXT_PUBLIC_SITE_URL;

const descricao =
  "Complemento do caderno de campo para agricultores agroecológicos: anote na roça sem internet, passe a limpo para a visita de pares e mostre ao comprador de onde vem o que você vende.";

export const metadata: Metadata = {
  ...(urlDoSite ? { metadataBase: new URL(urlDoSite) } : {}),
  title: {
    default: "Caderno de Bolso",
    template: "%s · Caderno de Bolso",
  },
  description: descricao,
  applicationName: "Caderno de Bolso",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Caderno de Bolso",
    title: "Caderno de Bolso",
    description: descricao,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#2e5e34",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${alegreya.variable} ${atkinson.variable}`}>
      <body>
        <a className="pular-para-conteudo" href="#conteudo">
          Pular para o conteúdo
        </a>
        <Cabecalho />
        <main id="conteudo" tabIndex={-1}>
          {children}
        </main>
        <Rodape />
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
