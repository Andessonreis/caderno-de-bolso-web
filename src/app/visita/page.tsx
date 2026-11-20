import type { Metadata } from "next";
import { RoteiroVisita } from "./RoteiroVisita";

export const metadata: Metadata = {
  title: "Roteiro de apoio à visita",
  description:
    "Roteiro de apoio à visita de pares para preencher no celular ou tablet, mesmo sem internet. Fica salvo no aparelho e pode ser impresso.",
};

export default function PaginaVisita() {
  return <RoteiroVisita />;
}
