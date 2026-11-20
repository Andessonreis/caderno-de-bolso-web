import type { NextConfig } from "next";
import { normalizarBasePath } from "./src/lib/caminho";

// Prefixo quando o site não está na raiz (GitHub Pages). Vazio = raiz.
const basePath = normalizarBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const nextConfig: NextConfig = {
  // Site 100% estático: tudo roda no navegador, sem servidor.
  output: "export",
  // Gera /ficha/index.html em vez de /ficha.html, que funciona em qualquer hospedagem estática.
  trailingSlash: true,
  images: { unoptimized: true },
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
