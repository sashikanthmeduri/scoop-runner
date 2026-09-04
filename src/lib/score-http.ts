import { countryFromLocale, countryFromTimezone, isIsoCountry } from "@/lib/countries";

export type ScoreRow = {
  id: number;
  playerName: string;
  score: number;
  countryCode: string;
  stories: number;
  createdAt: string;
};

function headerCountry(headers: Headers): string | null {
  const keys = [
    "x-vercel-ip-country",
    "cf-ipcountry",
    "x-country-code",
    "cloudfront-viewer-country",
    "x-appengine-country",
  ];
  for (const key of keys) {
    const raw = headers.get(key)?.trim().toUpperCase();
    if (isIsoCountry(raw ?? null)) return raw as string;
  }
  return null;
}

function isPrivateIp(ip: string): boolean {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("127.")) return true;
  const m = /^172\.(\d+)\./.exec(ip);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  return false;
}

function clientIp(headers: Headers): string | null {
  const raw =
    headers.get("x-forwarded-for") ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("true-client-ip") ||
    "";
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  for (const ip of parts) {
    if (!isPrivateIp(ip)) return ip;
  }
  return null;
}

async function lookupIpCountry(ip: string): Promise<string | null> {
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=country_code,success`, {
      signal: AbortSignal.timeout(1200),
    });
    const json = (await res.json()) as { success?: boolean; country_code?: string };
    const code = json.country_code?.toUpperCase();
    if (json.success && isIsoCountry(code ?? null)) return code as string;
  } catch {
    /* ignore */
  }
  return null;
}

async function resolveCountry(
  headers: Headers,
  timezone?: string,
  locale?: string,
  hinted?: string,
): Promise<string> {
  if (isIsoCountry(hinted ?? null) && hinted !== "UN") return hinted as string;
  const fromTz = countryFromTimezone(timezone);
  if (fromTz) return fromTz;
  const ip = clientIp(headers);
  if (ip) {
    const fromIp = await lookupIpCountry(ip);
    if (fromIp) return fromIp;
  }
  const fromHeader = headerCountry(headers);
  if (fromHeader) return fromHeader;
  return countryFromLocale(locale) || "UN";
}

function mapRows(
  rows: {
    id: number;
    player_name: string;
    score: number;
    country_code: string;
    stories: number;
    created_at: string;
  }[],
): ScoreRow[] {
  return rows.map((row) => ({
    id: row.id,
    playerName: row.player_name,
    score: row.score,
    countryCode: row.country_code,
    stories: row.stories,
    createdAt: row.created_at,
  }));
}

export async function handleScoreHttp(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const headers = { "content-type": "application/json", "cache-control": "no-store" };

  if (url.pathname === "/api/country" && request.method === "POST") {
    let body: { timezone?: string; locale?: string; countryCode?: string } = {};
    try {
      body = (await request.json()) as { timezone?: string; locale?: string; countryCode?: string };
    } catch {
      body = {};
    }
    const countryCode = await resolveCountry(request.headers, body.timezone, body.locale, body.countryCode);
    return new Response(JSON.stringify({ countryCode }), { headers });
  }

  const { getSql } = await import("@/lib/db");
  const sql = await getSql();

  if (url.pathname === "/api/scores" && request.method === "GET") {
    const rows = await sql<{
      id: number;
      player_name: string;
      score: number;
      country_code: string;
      stories: number;
      created_at: string;
    }>`
      select id, player_name, score, country_code, stories, created_at
      from scores
      order by score desc, created_at asc
      limit 50
    `;
    return new Response(JSON.stringify(mapRows(rows)), { headers });
  }

  if (url.pathname === "/api/scores" && request.method === "POST") {
    let data: {
      name?: string;
      score?: number;
      stories?: number;
      timezone?: string;
      locale?: string;
      countryCode?: string;
    };
    try {
      data = (await request.json()) as typeof data;
    } catch {
      return new Response(JSON.stringify({ error: "invalid json" }), { status: 400, headers });
    }
    const name = String(data.name ?? "").trim();
    if (!/^[A-Za-z0-9 _.-]{2,16}$/.test(name)) {
      return new Response(JSON.stringify({ error: "invalid name" }), { status: 400, headers });
    }
    const score = Math.max(0, Math.min(10_000_000, Math.floor(Number(data.score) || 0)));
    const stories = Math.max(0, Math.min(100_000, Math.floor(Number(data.stories) || 0)));
    const countryCode = await resolveCountry(request.headers, data.timezone, data.locale, data.countryCode);
    const inserted = await sql<{ id: number }>`
      insert into scores (player_name, score, country_code, stories)
      values (${name}, ${score}, ${countryCode}, ${stories})
      returning id
    `;
    const board = await sql<{
      id: number;
      player_name: string;
      score: number;
      country_code: string;
      stories: number;
      created_at: string;
    }>`
      select id, player_name, score, country_code, stories, created_at
      from scores
      order by score desc, created_at asc
      limit 50
    `;
    return new Response(
      JSON.stringify({
        id: inserted[0]?.id ?? 0,
        countryCode,
        scores: mapRows(board),
      }),
      { headers },
    );
  }

  return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers });
}
