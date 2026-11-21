/*
 * Service worker do Caderno de Bolso.
 *
 * Objetivo único: depois da primeira visita, as páginas (principalmente o
 * roteiro de visita) abrem mesmo sem internet.
 *
 * - Arquivos de _next/static/ têm nome com hash e nunca mudam: cache primeiro.
 * - Páginas: rede primeiro, com tempo limite curto; se a rede falhar ou
 *   demorar, usa a cópia guardada.
 * - Na instalação, baixa as páginas principais e os arquivos que cada uma usa.
 * - Pedidos a outros domínios (o servidor do grupo) e pedidos que não são GET
 *   passam direto, sem cache: as visitas de um grupo nunca ficam guardadas
 *   aqui. Sem internet, a página do grupo abre e mostra o aviso de conexão.
 *
 * O site pode estar num subcaminho (GitHub Pages). O prefixo vem do escopo
 * com que o service worker foi registrado, então este arquivo serve para
 * qualquer endereço.
 *
 * VERSAO é trocada a cada build por scripts/versao-sw.mjs. Um build novo gera
 * um sw.js diferente, o navegador instala a versão nova e o "activate" apaga
 * os caches das versões anteriores.
 */

const VERSAO = "__VERSAO_DO_BUILD__";
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const PREFIXO_CACHE = `caderno-de-bolso:${BASE || "/"}:`;
const CACHE = `${PREFIXO_CACHE}${VERSAO}`;
const PAGINAS = ["/", "/visita/", "/ficha/", "/ficha/criar/", "/grupo/"].map((p) => BASE + p);
const ESTATICOS = `${BASE}/_next/static/`;
const TEMPO_LIMITE_MS = 4000;

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ARQUIVOS_NO_HTML = new RegExp(`(?:href|src)="(${escaparRegex(ESTATICOS)}[^"]+)"`, "g");

async function guardarPaginaEArquivos(cache, url) {
  const resposta = await fetch(url, { cache: "reload" });
  if (!resposta.ok) return;
  await cache.put(url, resposta.clone());
  const html = await resposta.text();
  const arquivos = new Set();
  for (const achado of html.matchAll(ARQUIVOS_NO_HTML)) arquivos.add(achado[1]);
  await Promise.all(
    [...arquivos].map(async (arquivo) => {
      if (await cache.match(arquivo)) return;
      const r = await fetch(arquivo);
      if (r.ok) await cache.put(arquivo, r);
    }),
  );
}

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const pagina of PAGINAS) {
        try {
          await guardarPaginaEArquivos(cache, pagina);
        } catch {
          // Uma página que falhar agora será guardada na próxima vez que abrir.
        }
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      // Só mexe nos caches deste site (outros sites podem dividir o mesmo domínio).
      const nomes = await caches.keys();
      await Promise.all(
        nomes
          .filter((nome) => nome.startsWith(PREFIXO_CACHE) && nome !== CACHE)
          .map((nome) => caches.delete(nome)),
      );
      await self.clients.claim();
    })(),
  );
});

async function cachePrimeiro(requisicao) {
  const cache = await caches.open(CACHE);
  const guardada = await cache.match(requisicao);
  if (guardada) return guardada;
  const resposta = await fetch(requisicao);
  if (resposta.ok) cache.put(requisicao, resposta.clone());
  return resposta;
}

/** Endereço da página guardada: "/visita" e "/visita/" são a mesma página. */
function chaveDaPagina(url) {
  const ultimo = url.pathname.split("/").pop();
  return url.pathname.endsWith("/") || ultimo.includes(".") ? url.pathname : `${url.pathname}/`;
}

async function redePrimeiro(requisicao, ehPagina) {
  const cache = await caches.open(CACHE);
  const url = new URL(requisicao.url);
  const chave = ehPagina ? chaveDaPagina(url) : requisicao;
  const guardada = await cache.match(chave, { ignoreSearch: true });

  const daRede = fetch(requisicao).then((resposta) => {
    if (resposta.ok && resposta.type === "basic") cache.put(chave, resposta.clone());
    return resposta;
  });

  if (!guardada) {
    try {
      return await daRede;
    } catch {
      const inicio = ehPagina ? await cache.match(`${BASE}/`) : undefined;
      return inicio ?? Response.error();
    }
  }

  const tempoEsgotado = new Promise((resolver) => {
    setTimeout(() => resolver(guardada), TEMPO_LIMITE_MS);
  });
  return Promise.race([daRede.catch(() => guardada), tempoEsgotado]);
}

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Fora do domínio ou fora do prefixo deste site: não é com a gente.
  if (url.origin !== self.location.origin) return;
  if (url.pathname !== BASE && !url.pathname.startsWith(`${BASE}/`)) return;

  if (url.pathname.startsWith(ESTATICOS)) {
    evento.respondWith(cachePrimeiro(request));
    return;
  }
  evento.respondWith(redePrimeiro(request, request.mode === "navigate"));
});
