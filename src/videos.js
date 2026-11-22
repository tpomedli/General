import { assertUrl, InputError, publicHttpUrl } from "./validate.js";

const VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)(?:$|[?#])/i;
const MAX_HTML = 1_500_000;
const MAX_VIDEO = 80 * 1024 * 1024;

function extensionFor(url, contentType) {
  const match = VIDEO_EXT.exec(url);
  if (match) return `.${match[1].toLowerCase() === "ogv" ? "ogg" : match[1].toLowerCase()}`;
  if (contentType.includes("webm")) return ".webm";
  if (contentType.includes("ogg")) return ".ogg";
  if (contentType.includes("quicktime")) return ".mov";
  return ".mp4";
}

export function isDirectVideo(url, contentType = "") {
  const type = contentType.toLowerCase();
  return VIDEO_EXT.test(url) || type.startsWith("video/");
}

export function filenameFor(url, contentType = "") {
  let base = "video";
  try {
    const leaf = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    const cleaned = leaf.replace(/\.[a-z0-9]+$/i, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    if (cleaned) base = cleaned.slice(0, 60);
  } catch {
    base = "video";
  }
  return `${base}${extensionFor(url, contentType)}`;
}

export function videoLinksFromHtml(html, base) {
  const found = [];
  const seen = new Set();
  const pattern = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = pattern.exec(html))) {
    let absolute = "";
    try {
      absolute = new URL(match[1], base).href;
    } catch {
      continue;
    }
    if (!VIDEO_EXT.test(absolute)) continue;
    const safe = publicHttpUrl(absolute);
    if (!safe || seen.has(safe)) continue;
    seen.add(safe);
    found.push(safe);
    if (found.length >= 20) break;
  }
  return found;
}

async function fetchPublic(url, fetchImpl, headers) {
  let current = assertUrl(url);
  for (let hop = 0; hop < 4; hop += 1) {
    const response = await fetchImpl(current, { redirect: "manual", headers });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new InputError("The video link redirected nowhere.");
      current = assertUrl(new URL(location, current).href);
      continue;
    }
    return { response, url: current };
  }
  throw new InputError("That link redirected too many times.");
}

async function readLimited(response, max) {
  const reader = response.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new InputError(max > 2_000_000 ? "That video is larger than 80 MB." : "That page is too large to scan.");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export async function findLinkedVideos(url, fetchImpl = fetch) {
  const start = assertUrl(url);
  if (VIDEO_EXT.test(start)) return { url: start, videos: [start] };
  const { response, url: finalUrl } = await fetchPublic(start, fetchImpl, { accept: "text/html,video/*;q=0.9,*/*;q=0.1" });
  if (!response.ok) throw new InputError("That page could not be opened.");
  const type = (response.headers.get("content-type") || "").toLowerCase();
  if (isDirectVideo(finalUrl, type)) return { url: finalUrl, videos: [finalUrl] };
  if (!type.includes("html") && !type.includes("xml") && !type.includes("text/plain")) {
    return { url: finalUrl, videos: [] };
  }
  const html = (await readLimited(response, MAX_HTML)).toString("utf8");
  return { url: finalUrl, videos: videoLinksFromHtml(html, finalUrl) };
}

export async function downloadVideo(url, fetchImpl = fetch) {
  const { response, url: finalUrl } = await fetchPublic(assertUrl(url), fetchImpl, { accept: "video/*,*/*;q=0.1" });
  if (!response.ok) throw new InputError("That video could not be downloaded.");
  const type = (response.headers.get("content-type") || "application/octet-stream").split(";")[0].trim();
  if (!isDirectVideo(finalUrl, type)) {
    throw new InputError("That address is a page, not a direct video file. Look for linked videos first.");
  }
  const bytes = await readLimited(response, MAX_VIDEO);
  return {
    filename: filenameFor(finalUrl, type),
    contentType: type.startsWith("video/") ? type : "application/octet-stream",
    bytes,
  };
}
