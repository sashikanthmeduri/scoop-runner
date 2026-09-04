import playHtml from "../../public/play.html?raw";
import { handleScoreHttp } from "../../src/lib/score-http";

interface ScoopEvent {
  url: URL;
  req: Request;
}

export default async function scoopPageMiddleware(
  event: ScoopEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const method = (event.req.method ?? "GET").toUpperCase();
  const path = event.url.pathname;

  if (method === "GET" && (path === "/" || path === "/index.html")) {
    return new Response(playHtml, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  if ((path === "/api/scores" || path === "/api/country") && (method === "GET" || method === "POST")) {
    return handleScoreHttp(event.req);
  }

  return next();
}
