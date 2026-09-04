import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { countryFromLocale, countryFromTimezone, isIsoCountry } from "@/lib/countries";

export type ScoreRow = {
  id: number;
  playerName: string;
  score: number;
  countryCode: string;
  stories: number;
  createdAt: string;
};

const submitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .regex(/^[A-Za-z0-9 _.-]+$/),
  score: z.number().int().min(0).max(10_000_000),
  stories: z.number().int().min(0).max(100_000),
  timezone: z.string().max(80).optional(),
  locale: z.string().max(32).optional(),
  countryCode: z.string().length(2).optional(),
});

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

function fallbackCountry(timezone?: string, locale?: string): string {
  return countryFromTimezone(timezone) || countryFromLocale(locale) || "UN";
}

function isPrivateIp(ip: string): boolean {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("127.")) return true;
  const m = /^172\.(\d+)\./.exec(ip);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  return false;
}

async function resolveCountry(opts: {
  timezone?: string;
  locale?: string;
  countryCode?: string;
}): Promise<string> {
  if (isIsoCountry(opts.countryCode ?? null) && opts.countryCode !== "UN") return opts.countryCode as string;
  const fromTz = countryFromTimezone(opts.timezone);
  if (fromTz) return fromTz;
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    if (request) {
      const raw =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        request.headers.get("cf-connecting-ip") ||
        "";
      const ip = raw.split(",").map((s) => s.trim()).find((s) => s && !isPrivateIp(s));
      if (ip) {
        try {
          const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=country_code,success`, {
            signal: AbortSignal.timeout(1500),
          });
          const json = (await res.json()) as { success?: boolean; country_code?: string };
          const code = json.country_code?.toUpperCase();
          if (json.success && isIsoCountry(code ?? null)) return code as string;
        } catch {
          /* ignore geo lookup */
        }
      }
      const fromHeader = headerCountry(request.headers);
      if (fromHeader) return fromHeader;
    }
  } catch {
    /* preview without request context */
  }
  return fallbackCountry(opts.timezone, opts.locale);
}

export const detectCountry = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        timezone: z.string().max(80).optional(),
        locale: z.string().max(32).optional(),
        countryCode: z.string().length(2).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const countryCode = await resolveCountry(data);
    return { countryCode };
  });

export const listScores = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
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
  return rows.map((row) => ({
    id: row.id,
    playerName: row.player_name,
    score: row.score,
    countryCode: row.country_code,
    stories: row.stories,
    createdAt: row.created_at,
  })) satisfies ScoreRow[];
});

export const submitScore = createServerFn({ method: "POST" })
  .validator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data }) => {
    const countryCode = await resolveCountry({
      timezone: data.timezone,
      locale: data.locale,
      countryCode: data.countryCode,
    });
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const inserted = await sql<{ id: number }>`
      insert into scores (player_name, score, country_code, stories)
      values (${data.name}, ${data.score}, ${countryCode}, ${data.stories})
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
    return {
      id: inserted[0]?.id ?? 0,
      countryCode,
      scores: board.map((row) => ({
        id: row.id,
        playerName: row.player_name,
        score: row.score,
        countryCode: row.country_code,
        stories: row.stories,
        createdAt: row.created_at,
      })) satisfies ScoreRow[],
    };
  });
