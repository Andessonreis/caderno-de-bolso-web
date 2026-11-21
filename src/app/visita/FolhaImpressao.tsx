import { dataPorExtenso } from "@/lib/ficha";
import { ETAPAS, OPCOES_PARECER, ROTULO_RESPOSTA, itensDaEtapa, type Visita } from "@/lib/visita";
import estilos from "./impressao.module.css";

const VAZIO = "________________";

/**
 * Folha limpa para imprimir ou salvar em PDF. Só aparece na impressão, a não
 * ser com `naTela` (leitura de uma visita recebida pelo grupo).
 */
export function FolhaImpressao({ visita, naTela = false }: { visita: Visita; naTela?: boolean }) {
  const parecer = OPCOES_PARECER.find((o) => o.valor === visita.parecer);

  return (
    <article
      className={naTela ? `${estilos.folha} ${estilos.naTela}` : `so-impressao ${estilos.folha}`}
      aria-hidden={naTela ? undefined : true}
    >
      <header className={estilos.cabecalho}>
        <h1 className={estilos.titulo}>Roteiro de apoio à visita</h1>
        <p className={estilos.subtitulo}>
          Caderno de Bolso · folha de apoio, não substitui os documentos do grupo
        </p>
      </header>

      <table className={estilos.dados}>
        <tbody>
          <tr>
            <th scope="row">Produtor visitado</th>
            <td>{visita.produtor.nome || VAZIO}</td>
            <th scope="row">Município</th>
            <td>{visita.produtor.municipio || VAZIO}</td>
          </tr>
          <tr>
            <th scope="row">Data</th>
            <td>{visita.data ? dataPorExtenso(visita.data) : VAZIO}</td>
            <th scope="row">Tipo</th>
            <td>
              {visita.tipo === "pares"
                ? "Visita de pares"
                : visita.tipo === "externo"
                  ? "Olhar externo"
                  : VAZIO}
            </td>
          </tr>
          <tr>
            <th scope="row">Quem visitou</th>
            <td colSpan={3}>{visita.visitantes || VAZIO}</td>
          </tr>
        </tbody>
      </table>

      {ETAPAS.filter((e) => e.id !== "identificacao" && e.id !== "fechamento").map((etapa) => (
        <section key={etapa.id} className={estilos.etapa}>
          <h2 className={estilos.etapaTitulo}>{etapa.titulo}</h2>
          {etapa.id === "sementes" ? (
            <p className={estilos.linha}>
              Culturas com comprovação de origem exigida:{" "}
              {visita.culturasSensiveis.length ? visita.culturasSensiveis.join(", ") : "nenhuma"}
            </p>
          ) : null}
          {etapa.id === "colheita" ? (
            <p className={estilos.linha}>
              Armazém e transporte:{" "}
              {visita.usoArmazenamento === "exclusivo"
                ? "só para orgânico"
                : visita.usoArmazenamento === "compartilhado"
                  ? `compartilhados com convencional. Separação: ${visita.separacao || VAZIO}`
                  : VAZIO}
            </p>
          ) : null}
          <table className={estilos.itens}>
            <thead>
              <tr>
                <th scope="col">Pergunta</th>
                <th scope="col">Resposta</th>
                <th scope="col">Observação</th>
              </tr>
            </thead>
            <tbody>
              {itensDaEtapa(visita, etapa.id).map((item) => {
                const r = visita.respostas[item.id];
                return (
                  <tr key={item.id}>
                    <td>{item.texto}</td>
                    <td className={estilos.resposta}>{r?.r ? ROTULO_RESPOSTA[r.r] : ""}</td>
                    <td className={estilos.observacao}>{r?.obs}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      <section className={estilos.etapa}>
        <h2 className={estilos.etapaTitulo}>Não conformidades</h2>
        {visita.naoConformidades.length ? (
          <table className={estilos.itens}>
            <thead>
              <tr>
                <th scope="col">O que precisa corrigir</th>
                <th scope="col">Prazo</th>
              </tr>
            </thead>
            <tbody>
              {visita.naoConformidades.map((nc) => (
                <tr key={nc.id}>
                  <td className={estilos.observacao}>{nc.descricao}</td>
                  <td>{nc.prazo ? dataPorExtenso(nc.prazo) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={estilos.linha}>Nenhuma anotada.</p>
        )}
      </section>

      <section className={estilos.etapa}>
        <h2 className={estilos.etapaTitulo}>Pontos fortes</h2>
        <p className={estilos.texto}>{visita.pontosFortes || VAZIO}</p>
        <h2 className={estilos.etapaTitulo}>Observações</h2>
        <p className={estilos.texto}>{visita.observacoes || VAZIO}</p>
        <h2 className={estilos.etapaTitulo}>Parecer</h2>
        <ul className={estilos.parecer}>
          {OPCOES_PARECER.map((o) => (
            <li key={o.valor}>
              <span className={estilos.marca}>{parecer?.valor === o.valor ? "X" : ""}</span>
              {o.rotulo}
            </li>
          ))}
        </ul>
      </section>

      <section className={estilos.assinaturas}>
        <div>
          <span className={estilos.linhaAssinatura} />
          Produtor visitado
        </div>
        <div>
          <span className={estilos.linhaAssinatura} />
          Quem visitou
        </div>
        <div>
          <span className={estilos.linhaAssinatura} />
          Quem visitou
        </div>
      </section>
    </article>
  );
}
