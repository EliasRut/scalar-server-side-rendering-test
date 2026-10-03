# Measurements: Scalar server-side rendering, static site generation example

## Abstract

We ran the static site generation example from Scalar's server-side rendering
documentation exactly as written, with a minimal `package.json` and the Galaxy
OpenAPI document used by the same page's examples. We measured the bytes of
the generated HTML, the inline CSS inside it, and the JavaScript bundle the
page loads. The inline stylesheet is about 305 KB uncompressed (about 2,540
rules). The JavaScript bundle is about 4.38 MB uncompressed (about 1.26 MB
gzipped). Both are present in the default output. The stylesheet is identical
for two different specifications rendered with the same package version. No
timing or Lighthouse measurements are reported here.

## 1. Scope

**Measured:** byte sizes of the files written by `generate-docs.mjs`.

**Not measured in this document:**

- The Basic usage example (`renderApiReference` with a remote `url`, served from
  a Hono app). It needs a server, so it was not run.
- Runtime performance (TBT, Lighthouse, CPU time) of this output. That is a
  separate question, and this document does not answer it.
- Scalar's Nuxt integration. The documentation states that Nuxt "does not need
  this package." Measurements of a Nuxt build were taken elsewhere and are not
  reproduced here.

## 2. Source

- Documentation: <https://scalar.com/products/api-references/server-side-rendering>
  (text snapshot used for this work: `wiki-api/docs/scalar-api-reference__Server-Side-Rendering.md`)
- Code: the "Static site generation" example, reproduced unchanged in
  `generate-docs.mjs`. Only the `package.json` around it is ours.

## 3. Environment

| Item                                                 | Value                                                                                                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Date of measurement                                  | 2026-10-03                                                                                                                                    |
| Operating system                                     | Linux 6.18.40.1-microsoft-standard-WSL2 (WSL2)                                                                                                |
| Node.js                                              | v24.21.0                                                                                                                                      |
| npm                                                  | 11.19.0                                                                                                                                       |
| `@scalar/server-side-rendering`                      | 0.1.56 (pinned in `package-lock.json`)                                                                                                        |
| `serve` (dev dependency, used only to serve `dist/`) | 14.2.6                                                                                                                                        |
| Specification                                        | Galaxy, `https://registry.scalar.com/@scalar/apis/galaxy?format=json`, saved as `openapi.json` (35,544 bytes, 7 paths, title "Scalar Galaxy") |

The page does not say which specification to save as `openapi.json`. We used
the Galaxy document because both of the page's examples use that URL.

## 4. Method

1. Download the specification to `openapi.json`.
2. Run `npm run generate`, which runs `generate-docs.mjs` unchanged.
3. Read the sizes of `dist/docs/index.html` and `dist/docs/scalar.js`.
4. Count the `<style>` blocks in `index.html` and their sizes.
5. Compress each file with gzip at level 9 to estimate transfer size.

Sizes are reported in raw bytes as stored on disk. Gzip figures are
`gzip -9`-equivalent output from Python's `gzip` module. The server may use a
different compression level, so the gzip column is an estimate, not a measured
transfer size.

We also checked that the stylesheet does not depend on the specification. We
rendered Galaxy and Petstore (`https://petstore3.swagger.io/api/v3/openapi.json`)
with the same package and compared the inline stylesheet. The `pageTitle` was
different in that check, which accounts for the difference in total HTML size.

## 5. Results

### 5.1 Output of `npm run generate` (Galaxy)

| File                                         | Raw bytes |     Gzip -9 bytes |
| -------------------------------------------- | --------: | ----------------: |
| `dist/docs/index.html`                       |   549,262 |            80,387 |
| Inline `<style>` block 1 (about 2,538 rules) |   312,185 | (within the HTML) |
| Inline `<style>` block 2 (about 24 rules)    |     9,302 | (within the HTML) |
| `dist/docs/scalar.js`                        | 4,381,105 |         1,263,386 |

Rule counts are approximate (count of `{` characters in the stylesheet).

### 5.2 Stylesheet independence check (same package version)

| Specification | Total HTML bytes | Inline stylesheet bytes | Gzip -9 of HTML |
| ------------- | ---------------: | ----------------------: | --------------: |
| Galaxy        |          549,247 |                 312,185 |          80,613 |
| Petstore      |          707,761 |                 312,185 |          85,036 |

The HTML totals and gzip figures in this table use `pageTitle: "x"`, not
`"My API Reference"`, which accounts for the 15-byte difference from 5.1.

## 6. Reproduction

Requirements: Node.js 24 (any recent Node should work, but this was not tested
on other versions) and npm.

```sh
npm ci                # installs the locked versions
npm run generate      # writes dist/docs/index.html and dist/docs/scalar.js
npm run serve         # serves dist/ on http://localhost:3000
```

Open `http://localhost:3000/docs/` in a browser.

Measure the output:

```sh
python3 - <<'PY'
import re, gzip
html = open('dist/docs/index.html').read()
styles = re.findall(r'<style[^>]*>(.*?)</style>', html, re.S)
print("index.html:", len(html.encode()), "bytes;", len(gzip.compress(html.encode(), 9)), "gzip")
for i, s in enumerate(styles):
    print(f"inline style {i}: {len(s.encode())} bytes")
js = open('dist/docs/scalar.js', 'rb').read()
print("scalar.js:", len(js), "bytes;", len(gzip.compress(js, 9)), "gzip")
PY
```

Expected output matches section 5.1 for the same package version and
specification.

## 7. Findings from the setup

- **Trailing slash matters.** `generate-docs.mjs` writes a relative
  `cdn: "./scalar.js"`. Served at `/docs/`, the bundle loads from
  `/docs/scalar.js`. Served at `/docs` (no slash), the page returns 200, but
  `./scalar.js` resolves to `/scalar.js`, which returns 404. The page's own
  documentation says the same. We confirmed it with `serve`.
- **The stylesheet is inlined by the package, not by the build.** The output
  has no separate stylesheet file. Every page carries the same 312 KB block.
- **The bundle is the same for every specification.** `scalar.js` is produced
  by `getJsAsset()` and does not depend on the document.

## 8. Limitations

- Byte counts only. These numbers say how much is shipped, not how long it
  takes to run.
- One specification, one package version, one Node version, one operating
  system.
- No hosting test. The output was served locally with `serve`.
- Gzip figures are estimates (see section 4).
