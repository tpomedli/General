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
  if (ipv4) return isBlockedIpv4(ipv4);

  const ipv6 = host.startsWith("[") ? host.slice(1, -1) : host;
  if (!ipv6.includes(":")) return false;
  const groups = expandIpv6(ipv6);
  if (!groups) return true;
  const loopback = groups[7] === 1 && groups.slice(0, 7).every((part) => part === 0);
  if (groups.every((part) => part === 0) || loopback) return true;
  if ((groups[0] & 0xffc0) === 0xfe80 || (groups[0] & 0xfe00) === 0xfc00) return true;
  const embedded = embeddedIpv4(groups);
  return embedded ? isBlockedIpv4(embedded) : false;
}

function expandIpv6(address) {
  let text = address.toLowerCase();
  const dotted = /:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(text);
  if (dotted) {
    const parts = ipv4Parts(dotted[1]);
    if (!parts) return null;
    const hi = ((parts[0] << 8) | parts[1]).toString(16);
    const lo = ((parts[2] << 8) | parts[3]).toString(16);
    text = `${text.slice(0, dotted.index)}:${hi}:${lo}`;
  }
  const sides = text.split("::");
  if (sides.length > 2) return null;
  const parseSide = (side) => {
    if (!side) return [];
    return side.split(":").map((part) => (/^[0-9a-f]{1,4}$/.test(part) ? Number.parseInt(part, 16) : Number.NaN));
  };
  const left = parseSide(sides[0]);
  const right = sides.length === 2 ? parseSide(sides[1]) : [];
  if ([...left, ...right].some((part) => Number.isNaN(part))) return null;
  if (sides.length === 1) return left.length === 8 ? left : null;
  const missing = 8 - left.length - right.length;
  if (missing < 1) return null;
  return [...left, ...Array(missing).fill(0), ...right];
}

function embeddedIpv4(groups) {
  const [a, b, c, d, e, f, g, h] = groups;
  const tail = [(g >> 8) & 255, g & 255, (h >> 8) & 255, h & 255];
  const prefix = a === 0 && b === 0 && c === 0 && d === 0 && e === 0;
  const mapped = prefix && f === 0xffff;
  const compatible = prefix && f === 0;
  const nat64 = a === 0x64 && b === 0xff9b && c === 0 && d === 0 && e === 0 && f === 0;
  const nat64Local = a === 0x64 && b === 0xff9b && c === 1 && d === 0 && e === 0 && f === 0;
  return mapped || compatible || nat64 || nat64Local ? tail : null;
}

function isBlockedIpv4(parts) {
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export function isBlockedIp(address) {
  return typeof address === "string" && isBlockedHost(address);
}

export function choosePublicAddress(addresses, family) {
  const list = (Array.isArray(addresses) ? addresses : []).filter((item) => item && typeof item.address === "string");
  const wanted = family === 4 || family === 6 ? family : 0;
  if (!list.length || list.some((item) => isBlockedIp(item.address))) {
    throw new InputError("That host is not available.");
  }
  return list.find((item) => !wanted || item.family === wanted) || list[0];
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
    throw new InputError("That host is not available.");
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
