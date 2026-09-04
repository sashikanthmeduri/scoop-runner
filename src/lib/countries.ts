/** Map IANA time zones to ISO 3166-1 alpha-2. Used when IP country headers are absent. */
export const TZ_COUNTRY: Record<string, string> = {
  "Africa/Cairo": "EG",
  "Africa/Casablanca": "MA",
  "Africa/Johannesburg": "ZA",
  "Africa/Lagos": "NG",
  "Africa/Nairobi": "KE",
  "America/Anchorage": "US",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Bogota": "CO",
  "America/Caracas": "VE",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Edmonton": "CA",
  "America/Halifax": "CA",
  "America/Lima": "PE",
  "America/Los_Angeles": "US",
  "America/Mexico_City": "MX",
  "America/New_York": "US",
  "America/Phoenix": "US",
  "America/Santiago": "CL",
  "America/Sao_Paulo": "BR",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "Asia/Baghdad": "IQ",
  "Asia/Bangkok": "TH",
  "Asia/Calcutta": "IN",
  "Asia/Colombo": "LK",
  "Asia/Dhaka": "BD",
  "Asia/Dubai": "AE",
  "Asia/Ho_Chi_Minh": "VN",
  "Asia/Hong_Kong": "HK",
  "Asia/Jakarta": "ID",
  "Asia/Jerusalem": "IL",
  "Asia/Karachi": "PK",
  "Asia/Kolkata": "IN",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Manila": "PH",
  "Asia/Riyadh": "SA",
  "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN",
  "Asia/Singapore": "SG",
  "Asia/Taipei": "TW",
  "Asia/Tehran": "IR",
  "Asia/Tokyo": "JP",
  "Australia/Adelaide": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Perth": "AU",
  "Australia/Sydney": "AU",
  "Europe/Amsterdam": "NL",
  "Europe/Athens": "GR",
  "Europe/Berlin": "DE",
  "Europe/Brussels": "BE",
  "Europe/Bucharest": "RO",
  "Europe/Budapest": "HU",
  "Europe/Copenhagen": "DK",
  "Europe/Dublin": "IE",
  "Europe/Helsinki": "FI",
  "Europe/Istanbul": "TR",
  "Europe/Kiev": "UA",
  "Europe/Kyiv": "UA",
  "Europe/Lisbon": "PT",
  "Europe/London": "GB",
  "Europe/Madrid": "ES",
  "Europe/Moscow": "RU",
  "Europe/Oslo": "NO",
  "Europe/Paris": "FR",
  "Europe/Prague": "CZ",
  "Europe/Rome": "IT",
  "Europe/Stockholm": "SE",
  "Europe/Vienna": "AT",
  "Europe/Warsaw": "PL",
  "Europe/Zurich": "CH",
  "Pacific/Auckland": "NZ",
  "Pacific/Honolulu": "US",
};

export function countryFromTimezone(tz?: string | null): string | null {
  if (!tz) return null;
  if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
  if (tz.startsWith("Australia/")) return "AU";
  if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") return "IN";
  return null;
}

export function countryFromLocale(locale?: string | null): string | null {
  if (!locale) return null;
  const parts = locale.replace("_", "-").split("-");
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1];
  if (!last || last.length !== 2) return null;
  const code = last.toUpperCase();
  // Browser language (en-US) is not a location. Indians, etc. often keep en-US.
  if (code === "US" || code === "GB" || code === "EN" || code === "ZH") return null;
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return code;
}

export function guessCountryClient(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return countryFromTimezone(tz);
  } catch {
    return null;
  }
}

export function isIsoCountry(code: string | null | undefined): code is string {
  return !!code && /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1";
}

export function flagUrl(code: string, w = 40) {
  return `https://flagcdn.com/w${w}/${code.toLowerCase()}.png`;
}
