import type { Metadata } from "next";
import { CriarFicha } from "./CriarFicha";

export const metadata: Metadata = {
  title: "Fazer uma ficha",
  description:
    "Preencha os dados do produtor e gere o QR e o cartão para imprimir e deixar na banca da feira.",
};

export default function PaginaCriarFicha() {
  return <CriarFicha />;
}
