// Depois do build: grava em out/sw.js uma versão tirada do próprio conteúdo
// do site. Qualquer mudança no build gera outra versão, o navegador instala o
// service worker novo e ele apaga o cache antigo.
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PASTA = path.resolve("out");
const SW = path.join(PASTA, "sw.js");
const MARCA = "__VERSAO_DO_BUILD__";

async function listar(pasta) {
  const entradas = await readdir(pasta, { withFileTypes: true });
  const arquivos = await Promise.all(
    entradas.map((e) => {
      const completo = path.join(pasta, e.name);
      return e.isDirectory() ? listar(completo) : [completo];
    }),
  );
  return arquivos.flat();
}

const arquivos = (await listar(PASTA)).filter((a) => a !== SW).sort();
const hash = createHash("sha256");
for (const arquivo of arquivos) {
  hash.update(path.relative(PASTA, arquivo));
  hash.update(await readFile(arquivo));
}
const versao = hash.digest("hex").slice(0, 12);

const sw = await readFile(SW, "utf8");
if (!sw.includes(MARCA)) {
  console.error(`versao-sw: marca ${MARCA} não encontrada em out/sw.js`);
  process.exit(1);
}
await writeFile(SW, sw.replace(MARCA, versao));
console.log(`versao-sw: service worker na versão ${versao}`);
