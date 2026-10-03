import { mkdir, readFile, writeFile } from "node:fs/promises";

import { getJsAsset, renderApiReference } from "@scalar/server-side-rendering";

const content = JSON.parse(await readFile("openapi.json", "utf8"));

const html = await renderApiReference({
  pageTitle: "My API Reference",
  config: { content },
  cdn: "./scalar.js",
});

await mkdir("dist/docs", { recursive: true });
await writeFile("dist/docs/index.html", html);
await writeFile("dist/docs/scalar.js", getJsAsset());
