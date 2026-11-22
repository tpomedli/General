import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mapSite, scrapePage, searchWeb } from "./actions.js";
import { createClient } from "./client.js";
import { links } from "./links.js";
import { InputError } from "./validate.js";

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((time) => now - time < 60_000);
  if (recent.length >= 30) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(payload);
}

function publicError(error) {
  if (error instanceof InputError) return { status: 400, error: error.message };
  const message = error instanceof Error ? error.message : "Request failed.";
  if (/fc-|bearer|api[_-]?key/i.test(message)) {
    return { status: 502, error: "Firecrawl could not complete that request." };
  }
  return { status: 502, error: message.slice(0, 300) };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 16_384) {
        reject(new InputError("Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (size === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new InputError("Send a JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return url.host === req.headers.host && (url.protocol === "http:" || url.protocol === "https:");
  } catch {
    return false;
  }
}

function staticFile(urlPath) {
  let decoded = "/";
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const file = path.resolve(publicDir, relative);
  if (file !== publicDir && !file.startsWith(publicDir + path.sep)) return null;
  if (!existsSync(file) || !statSync(file).isFile()) return null;
  return file;
}

export function createApp(client = createClient()) {
  return createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (!sameOrigin(req)) {
      sendJson(res, 403, { error: "Cross-origin requests are refused." });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/links") {
      sendJson(res, 200, { links });
      return;
    }

    if (req.method === "GET") {
      const file = staticFile(url.pathname);
      if (!file) {
        sendJson(res, 404, { error: "Not found." });
        return;
      }
      res.writeHead(200, {
        "content-type": types[path.extname(file)] || "application/octet-stream",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
      createReadStream(file).pipe(res);
      return;
    }

    if (req.method !== "POST" || !url.pathname.startsWith("/api/")) {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    const ip = req.socket.remoteAddress || "local";
    if (limited(ip)) {
      sendJson(res, 429, { error: "Too many requests. Wait a minute and try again." });
      return;
    }

    try {
      const body = await readJson(req);
      if (url.pathname === "/api/scrape") {
        sendJson(res, 200, await scrapePage(client, body.url));
        return;
      }
      if (url.pathname === "/api/search") {
        sendJson(res, 200, await searchWeb(client, body.query, body.limit));
        return;
      }
      if (url.pathname === "/api/map") {
        sendJson(res, 200, await mapSite(client, body.url, body.limit));
        return;
      }
      sendJson(res, 404, { error: "Not found." });
    } catch (error) {
      const payload = publicError(error);
      sendJson(res, payload.status, { error: payload.error });
    }
  });
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const port = Number(process.env.PORT) || 4173;
  const server = createApp();
  server.listen(port, "127.0.0.1", () => {
    console.log(`Scraper listening on http://127.0.0.1:${port}`);
  });
}
