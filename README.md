# Caderno de Bolso — site

Complemento do caderno de campo para agricultores familiares agroecológicos com certificação
participativa (SPG) do Território de Irecê, Bahia. Projeto da disciplina de Empreendedorismo do
curso de Análise e Desenvolvimento de Sistemas do IFBA, Campus Irecê, equipe Rastreabilidade de
Grãos.

O caderno de papel continua sendo o registro do agricultor. O Caderno de Bolso só tira peso dele:
o aplicativo de celular (repositório separado) serve para anotar na roça sem internet, e este site
cuida de duas outras pontas, a ficha que o comprador abre na feira e o roteiro da visita de pares.

## As páginas

| Endereço       | Para quem          | O que faz                                                                                                                                 |
| -------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `/`            | todo mundo         | Explica o projeto em linguagem simples e leva às ferramentas e a uma ficha de exemplo.                                                    |
| `/ficha`       | comprador na feira | Abre ao ler o QR da banca. Mostra quem produz, o que planta e como conferir a certificação.                                               |
| `/ficha/criar` | produtor, grupo    | Formulário para gerar a ficha, o QR e um cartão A6 para imprimir, sem precisar do app.                                                    |
| `/visita`      | quem faz a visita  | Roteiro de apoio à visita de pares, em etapas, salvo no aparelho a cada toque. Imprime a folha com assinaturas e exporta/importa arquivo. |

Depois de aberto uma vez, o site funciona sem internet (service worker em `public/sw.js`). Isso
importa principalmente para o `/visita`, que costuma ser usado na roça.

## Contrato da ficha

O app e o site combinam o formato abaixo. O código está em `src/lib/ficha.ts`
(`encodeFicha` / `decodeFicha`), com testes em `src/lib/ficha.test.ts`.

```
/ficha/#d=<payload>
payload = base64url, sem "=", dos bytes UTF-8 de JSON.stringify(objeto)
```

O site gera `/ficha/#d=` (com barra, que é o arquivo que existe em qualquer hospedagem
estática). `/ficha#d=` também funciona: a hospedagem redireciona para `/ficha/` e o navegador
mantém o `#d=`. Quando o site está num subcaminho, o prefixo vem antes:
`https://andessonreis.github.io/caderno-de-bolso-web/ficha/#d=...`.

```jsonc
{
  "v": 1, // versão do formato
  "n": "nome do produtor", // obrigatório
  "m": "município",
  "c": "cooperativa ou núcleo",
  "o": "organismo de certificação (OPAC)",
  "ct": "identificação do certificado",
  "d": 2020, // certificado desde (ano)
  "r": "registro no cadastro nacional de produtores orgânicos",
  "s": "código do sistema de rastreio que já usa",
  "cu": ["milho crioulo", "feijão"], // até 12 culturas
  "u": "2026-11-20", // última anotação no caderno (AAAA-MM-DD)
}
```

Chaves vazias são omitidas. Como o payload vem de fora, a leitura é defensiva: confere tipos,
limpa caracteres de controle, corta textos longos, trunca a lista de culturas e descarta campos
desconhecidos. Nada disso é inserido como HTML. Versão diferente de `1` e payload estragado
aparecem para o comprador como "Não conseguimos ler este código. Peça ao produtor para gerar de
novo." O dado fica no `#`, então nunca chega a servidor nenhum.

## Como rodar

Precisa de Node.js 20.9 ou mais novo.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # testes (vitest)
npm run lint
npm run typecheck
npm run build      # gera o site estático em out/
```

Para conferir o build como ele vai para o ar:

```bash
npx serve out      # ou: cd out && python3 -m http.server
```

O service worker só é registrado no build de produção.

### Variáveis de ambiente (opcionais)

| Variável                      | Para quê                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BASE_PATH`       | Prefixo quando o site não fica na raiz do domínio, como `/caderno-de-bolso-web`. Vazio = raiz. |
| `NEXT_PUBLIC_MOBILE_REPO_URL` | Endereço do repositório do app. Sem ela, o botão "Conhecer o aplicativo" some.                 |
| `NEXT_PUBLIC_SITE_URL`        | Endereço público do site, usado como base dos metadados de compartilhamento.                   |

O prefixo vale para tudo: links, ícones, manifesto, service worker e o link que vai no QR.

Depois do `next build`, o `postbuild` (`scripts/versao-sw.mjs`) grava em `out/sw.js` uma versão
tirada do conteúdo do build. Assim cada publicação instala um service worker novo, que apaga o
cache da versão anterior.

## Como publicar

O build é só HTML, CSS e JavaScript na pasta `out/`, sem servidor.

- **GitHub Pages**: o workflow `.github/workflows/pages.yml` roda lint, testes e build com
  `NEXT_PUBLIC_BASE_PATH=/caderno-de-bolso-web` a cada push no `main` e publica a pasta `out`.
  No repositório, em Settings → Pages, escolha "GitHub Actions" como origem. O arquivo
  `public/.nojekyll` impede o GitHub de esconder a pasta `_next`.
- **Vercel**: importe o repositório, deixe o preset Next.js e publique, sem `NEXT_PUBLIC_BASE_PATH`.
  As outras variáveis vão em Settings → Environment Variables.
- **Qualquer hospedagem estática** (GitHub Pages, Netlify, servidor com nginx): rode
  `npm run build` e envie a pasta `out/`. Os endereços terminam em barra (`/ficha/`), então
  funcionam sem regra de reescrita. Use HTTPS: sem ele o navegador não ativa o modo sem internet.

## Limitações

- É um protótipo acadêmico. Não é ferramenta oficial de certificadora nem de órgão público, e o
  roteiro de visita é só um apoio: não substitui o roteiro nem os documentos do grupo.
- A ficha mostra o que o produtor declarou. Ela não é certificado. A própria página orienta o
  comprador a pedir o certificado ou consultar o Cadastro Nacional de Produtores Orgânicos.
- Não há cadastro, login nem banco de dados. As visitas e o rascunho da ficha ficam no
  `localStorage` do aparelho: limpar os dados do navegador apaga tudo. Para levar uma visita a
  outro aparelho, use "Baixar arquivo" e "Abrir arquivo de visita". Se o arquivo aberto for mais
  antigo que a cópia do aparelho, o site pergunta antes de substituir e oferece guardar como cópia.
- Se o que está guardado no aparelho estragar, o site copia o conteúdo cru para uma reserva antes
  de regravar a lista, avisa a pessoa e deixa baixar essa cópia.
- A leitura do QR pela câmera dentro do roteiro depende do navegador ter a API de leitura de
  códigos (Chrome no Android tem). Onde não houver, o botão não aparece e dá para colar o link.
- A ficha de exemplo é de uma pessoa inventada.
