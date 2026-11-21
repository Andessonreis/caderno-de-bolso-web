import type { Metadata } from "next";
import { PaginaGrupo } from "./PaginaGrupo";

export const metadata: Metadata = {
  title: "Visitas do grupo",
  description:
    "Para a coordenação do grupo: crie o código que os membros digitam no aplicativo e veja num lugar só as visitas de pares que eles enviaram.",
};

export default function Grupo() {
  return <PaginaGrupo />;
}
