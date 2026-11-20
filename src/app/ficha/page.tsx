import type { Metadata } from "next";
import { FichaProdutor } from "./FichaProdutor";

export const metadata: Metadata = {
  title: "Ficha do produtor",
  description:
    "Quem produziu, o que planta e como conferir a certificação participativa. Informações declaradas pelo produtor.",
};

export default function PaginaFicha() {
  return <FichaProdutor />;
}
