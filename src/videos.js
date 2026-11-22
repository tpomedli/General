import http from "node:http";
import https from "node:https";
import { lookup } from "node:dns";
import { assertUrl, choosePublicAddress, InputError, publicHttpUrl } from "./validate.js";

const VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)$/i;
const MAX_HTML = 1_500_000;
const MAX_VIDEO = 80 * 1024 * 1024;

function videoPath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

function extensionFor(url, contentType) {
  const match = VIDEO_EXT.exec(videoPath(url));
  if (match) return `.${match[1].toLowerCase() === "ogv" ? "ogg" : match[1].toLowerCase()}`;
  if (contentType.includes("webm")) return ".webm";
  if (contentType.includes("ogg")) return ".ogg";
  if (contentType.includes("quicktime")) return ".mov";
  return ".mp4";
}

export function isDirectVideo(url, contentType = "") {
  const type = contentType.toLowerCase().split(";")[0].trim();
  return VIDEO_EXT.test(videoPath(url)) || type.startsWith("video/");
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
    if (!VIDEO_EXT.test(videoPath(absolute))) continue;
    const safe = publicHttpUrl(absolute);
    if (!safe || seen.has(safe)) continue;
    seen.add(safe);
    found.push(safe);
    if (found.length >= 20) break;
  }
  return found;
}

export function createSafeLookup(resolveNames = lookup) {
  return function safeLookup(hostname, options, callback) {
    resolveNames(hostname, { all: true, verbatim: true }, (error, addresses) => {
      if (error) {
        callback(error);
        return;
      }
      try {
        choosePublicAddress(addresses, options?.family);
      } catch (blocked) {
        callback(blocked);
        return;
      }
      if (options?.all) {
        callback(null, addresses);
        return;
      }
      const wanted = options?.family === 4 || options?.family === 6 ? options.family : 0;
      const chosen = addresses.find((item) => !wanted || item.family === wanted) || addresses[0];
      callback(null, chosen.address, chosen.family);
    });
  };
}

export function incomingResponse(incoming) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(incoming.headers)) {
    if (value == null) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }
  let closed = false;
  let failed = null;
  let ended = false;
  let waiting = null;
  const finish = (controller, action) => {
    if (closed) return;
    closed = true;
    action(controller);
  };
  const wake = () => {
    const current = waiting;
    waiting = null;
    current?.();
  };
  incoming.on("error", (error) => {
    if (closed || failed) return;
    failed = error;
    wake();
  });
  incoming.on("end", () => {
    ended = true;
    wake();
  });
  incoming.on("readable", wake);
  const stream = new ReadableStream({
    pull(controller) {
      if (closed) return;
      if (failed) {
        finish(controller, (active) => active.error(failed));
        return;
      }
      const chunk = incoming.read();
      if (chunk) {
        controller.enqueue(new Uint8Array(chunk));
        return;
      }
      if (ended || incoming.readableEnded) {
        finish(controller, (active) => active.close());
        return;
      }
      return new Promise((resolve) => {
        waiting = () => {
          if (closed) {
            resolve();
            return;
          }
          if (failed) {
            finish(controller, (active) => active.error(failed));
            resolve();
            return;
          }
          const next = incoming.read();
          if (next) controller.enqueue(new Uint8Array(next));
          else if (ended || incoming.readableEnded) finish(controller, (active) => active.close());
          resolve();
        };
      });
    },
    cancel() {
      closed = true;
      waiting = null;
      incoming.destroy();
    },
  });
  return new Response(stream, { status: incoming.statusCode || 0, headers });
}

function publicRequest(url, { headers } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === "https:" ? https : http;
    const req = transport.request(target, {
      method: "GET",
      headers,
      lookup: createSafeLookup(),
    }, (incoming) => {
      resolve(incomingResponse(incoming));
    });
    req.setTimeout(20_000, () => {
      req.destroy(new InputError("That host did not respond."));
    });
    req.on("error", (error) => {
      if (error instanceof InputError) reject(error);
      else if (error?.code === "ENOTFOUND") reject(new InputError("That host is not available."));
      else reject(error);
    });
    req.end();
  });
}

async function fetchPublic(url, fetchImpl, headers) {
  const request = fetchImpl || publicRequest;
  let current = assertUrl(url);
  for (let hop = 0; hop < 4; hop += 1) {
    const response = await request(current, { redirect: "manual", headers });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new InputError("The video link redirected nowhere.");
      await response.body?.cancel();
      current = assertUrl(new URL(location, current).href);
      continue;
    }
    return { response, url: current };
  }
  throw new InputError("That link redirected too many times.");
}

async function discard(response) {
  const body = response?.body;
  if (!body || body.locked) return;
  try {
    await body.cancel();
  } catch {
    // The body was already read or closed.
  }
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
      try {
        reader.releaseLock();
      } catch {
        // A pending read keeps the lock; cancel through the reader instead.
      }
      try {
        if (response.body?.locked) await reader.cancel();
        else await response.body?.cancel();
      } catch {
        // The body is already closed.
      }
      throw new InputError(max > 2_000_000 ? "That video is larger than 80 MB." : "That page is too large to scan.");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export async function findLinkedVideos(url, fetchImpl) {
  const start = assertUrl(url);
  if (VIDEO_EXT.test(videoPath(start))) return { url: start, videos: [start] };
  const { response, url: finalUrl } = await fetchPublic(start, fetchImpl, { accept: "text/html,video/*;q=0.9,*/*;q=0.1" });
  try {
    if (!response.ok) throw new InputError("That page could not be opened.");
    const type = (response.headers.get("content-type") || "").toLowerCase();
    if (isDirectVideo(finalUrl, type)) return { url: finalUrl, videos: [finalUrl] };
    if (!type.includes("html") && !type.includes("xml") && !type.includes("text/plain")) {
      return { url: finalUrl, videos: [] };
    }
    const html = (await readLimited(response, MAX_HTML)).toString("utf8");
    return { url: finalUrl, videos: videoLinksFromHtml(html, finalUrl) };
  } finally {
    await discard(response);
  }
}

export async function downloadVideo(url, fetchImpl) {
  const { response, url: finalUrl } = await fetchPublic(assertUrl(url), fetchImpl, { accept: "video/*,*/*;q=0.1" });
  try {
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
  } finally {
    await discard(response);
  }
}
