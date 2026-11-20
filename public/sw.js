/*
 * Service worker do Caderno de Bolso.
 *
 * Objetivo único: depois da primeira visita, as páginas (principalmente o
 * roteiro de visita) abrem mesmo sem internet.
 *
 * - Arquivos de /_next/static/ têm nome com hash e nunca mudam: cache primeiro.
 * - Páginas: rede primeiro, com tempo limite curto; se a rede falhar ou
 *   demorar, usa a cópia guardada.
 * - Na instalação, baixa as páginas principais e os arquivos que cada uma usa.
 *
 * Ao mudar a lógica deste arquivo, aumente VERSAO para descartar o cache antigo.
 */

const VERSAO = "v1";
const CACHE = `caderno-de-bolso-${VERSAO}`;
const PAGINAS = ["/", "/visita/", "/ficha/", "/ficha/criar/"];
const TEMPO_LIMITE_MS = 4000;

async function guardarPaginaEArquivos(cache, url) {
  const resposta = await fetch(url, { cache: "reload" });
  if (!resposta.ok) return;
  await cache.put(url, resposta.clone());
  const html = await resposta.text();
  const arquivos = new Set();
  for (const achado of html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)) {
    arquivos.add(achado[1]);
  }
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
      const nomes = await caches.keys();
      await Promise.all(
        nomes
          .filter((nome) => nome.startsWith("caderno-de-bolso-") && nome !== CACHE)
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
  const caminho = url.pathname.endsWith("/") || url.pathname.includes(".")
    ? url.pathname
    : `${url.pathname}/`;
  return caminho;
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
      const inicio = ehPagina ? await cache.match("/") : undefined;
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
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    evento.respondWith(cachePrimeiro(request));
    return;
  }
  evento.respondWith(redePrimeiro(request, request.mode === "navigate"));
});
