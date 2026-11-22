const MAX_URL_LENGTH = 2048;
const MAX_QUERY_LENGTH = 400;

export class InputError extends Error {
  constructor(message) {
    super(message);
    this.name = "InputError";
    this.status = 400;
  }
}

function ipv4Parts(host) {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  if (parts.some((part) => part > 255)) return null;
  return parts;
}

function isBlockedHost(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home.arpa")
  ) {
    return true;
  }

  const ipv4 = ipv4Parts(host);
  if (ipv4) {
    const [a, b] = ipv4;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }

  const ipv6 = host.startsWith("[") ? host.slice(1, -1) : host;
  if (ipv6.includes(":")) {
    const normalized = ipv6.toLowerCase();
    if (normalized === "::1" || normalized === "::") return true;
    if (normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) {
      return true;
    }
    const mapped = /::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized);
    if (mapped && isBlockedHost(mapped[1])) return true;
  }

  return false;
}

export function assertUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_URL_LENGTH) {
    throw new InputError("Enter an http or https URL.");
  }
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new InputError("Enter an http or https URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InputError("Enter an http or https URL.");
  }
  if (url.username || url.password) {
    throw new InputError("Remove the username and password from the URL.");
  }
  if (isBlockedHost(url.hostname)) {
    throw new InputError("That host is not available from this scraper.");
  }
  return url.toString();
}

export function assertQuery(value) {
  if (typeof value !== "string") throw new InputError("Enter a search query.");
  const query = value.trim().replace(/\s+/g, " ");
  if (!query || query.length > MAX_QUERY_LENGTH) {
    throw new InputError("Enter a search query of 400 characters or fewer.");
  }
  return query;
}

export function clampLimit(value, { fallback, max }) {
  if (value === undefined || value === null || value === "") return fallback;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new InputError(`Choose a limit from 1 to ${max}.`);
  }
  return Math.min(limit, max);
}

export function publicHttpUrl(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (isBlockedHost(url.hostname)) return "";
    return url.toString();
  } catch {
    return "";
  }
}
