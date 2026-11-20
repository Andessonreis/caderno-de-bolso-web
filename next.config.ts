import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Site 100% estático: tudo roda no navegador, sem servidor.
  output: "export",
  // Gera /ficha/index.html em vez de /ficha.html, que funciona em qualquer hospedagem estática.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
