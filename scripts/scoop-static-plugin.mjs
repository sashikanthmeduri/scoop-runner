import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Serve the single-file Scoop Runner on `/` so the live preview never waits
 * on 100+ Vite ESM requests (which stall as a white screen on some phones).
 */
function attach(server, root) {
  const playHtml = () => readFileSync(join(root, "public/play.html"), "utf8");

  server.middlewares.use(async (req, res, next) => {
    const rawUrl = req.url ?? "/";
    const pathOnly = rawUrl.split("?", 1)[0] ?? "/";
    const method = (req.method ?? "GET").toUpperCase();

    if (method === "GET" && (pathOnly === "/" || pathOnly === "/index.html")) {
      const body = Buffer.from(playHtml(), "utf8");
      res.statusCode = 200;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      res.setHeader("content-length", String(body.byteLength));
      res.end(body);
      return;
    }

    if (
      (pathOnly === "/api/scores" || pathOnly === "/api/country") &&
      (method === "GET" || method === "POST" || method === "OPTIONS")
    ) {
      if (method === "OPTIONS") {
        res.statusCode = 204;
        res.setHeader("access-control-allow-origin", "*");
        res.setHeader("access-control-allow-headers", "content-type");
        res.end();
        return;
      }
      try {
        const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:8080");
        const proto = String(req.headers["x-forwarded-proto"] ?? "http");
        const requestHeaders = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value === undefined) continue;
          if (Array.isArray(value)) for (const v of value) requestHeaders.append(key, v);
          else requestHeaders.set(key, value);
        }
        const chunks = [];
        if (method === "POST") {
          await new Promise((resolve, reject) => {
            req.on("data", (c) => chunks.push(c));
            req.on("end", resolve);
            req.on("error", reject);
          });
        }
        const init = { method, headers: requestHeaders };
        if (method === "POST") {
          init.body = Buffer.concat(chunks);
          init.duplex = "half";
        }
        const request = new Request(`${proto}://${host}${rawUrl}`, init);
        const loader = server.ssrLoadModule
          ? (id) => server.ssrLoadModule(id)
          : null;
        let mod;
        if (loader) {
          mod = await loader("/src/lib/score-http.ts");
        } else {
          mod = await import(join(root, "src/lib/score-http.ts"));
        }
        const response = await mod.handleScoreHttp(request);
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (err) {
        console.error("[scoop] api failed", err);
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ error: "desk closed" }));
      }
      return;
    }

    next();
  });
}

export function scoopStaticPlugin() {
  return {
    name: "scoop-static-preview",
    configureServer(server) {
      attach(server, server.config.root);
    },
    configurePreviewServer(server) {
      attach(server, server.config.root);
    },
  };
}
