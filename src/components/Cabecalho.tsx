"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone, type NomeIcone } from "./Icone";
import { Marca } from "./Marca";
import estilos from "./Cabecalho.module.css";

const LINKS: ReadonlyArray<{ href: string; rotulo: string; icone: NomeIcone }> = [
  { href: "/ficha/", rotulo: "Ficha", icone: "qr" },
  { href: "/visita/", rotulo: "Visita", icone: "prancheta" },
];

export function Cabecalho() {
  const caminho = usePathname();

  return (
    <header className={`${estilos.cabecalho} nao-imprimir`}>
      <div className={`conteiner ${estilos.linha}`}>
        <Link href="/" className={estilos.marca} aria-label="Caderno de Bolso, página inicial">
          <Marca />
          <span>Caderno de Bolso</span>
        </Link>
        <nav aria-label="Principal">
          <ul className={estilos.menu}>
            {LINKS.map((link) => {
              const ativo = caminho?.startsWith(link.href.replace(/\/$/, ""));
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={estilos.link}
                    aria-current={ativo ? "page" : undefined}
                  >
                    <Icone nome={link.icone} tamanho={20} />
                    <span>{link.rotulo}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
