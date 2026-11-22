import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnvFile } from "./env.js";
import { searchWeb } from "./search.js";
import { downloadVideo, findLinkedVideos } from "./videos.js";
import { InputError, publicHttpUrl } from "./validate.js";

loadEnvFile();

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
  if (/subscription-token|api[_-]?key|bearer /i.test(message)) {
    return { status: 502, error: "Search could not run that query." };
  }
  return { status: 502, error: message.slice(0, 300) };
}

function readBody(req) {
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
      const raw = Buffer.concat(chunks).toString("utf8");
      const type = String(req.headers["content-type"] || "");
      if (!raw) {
        resolve({});
        return;
      }
      if (type.includes("application/x-www-form-urlencoded")) {
        resolve(Object.fromEntries(new URLSearchParams(raw)));
        return;
      }
      try {
        resolve(JSON.parse(raw));
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

export function createApp(options = {}) {
  const search = options.search || ((query) => searchWeb(query));
  const findVideos = options.findVideos || ((url) => findLinkedVideos(url));
  const download = options.download || ((url) => downloadVideo(url));

  return createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (!sameOrigin(req)) {
      sendJson(res, 403, { error: "Cross-origin requests are refused." });
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

    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    const ip = req.socket.remoteAddress || "local";
    if (limited(ip)) {
      sendJson(res, 429, { error: "Too many requests. Wait a minute and try again." });
      return;
    }

    try {
      const body = await readBody(req);
      if (url.pathname === "/api/search") {
        const found = await search(body.query);
        let videos = [];
        if (publicHttpUrl(found.query) || publicHttpUrl(body.query)) {
          const page = publicHttpUrl(body.query) || found.query;
          try {
            videos = (await findVideos(page)).videos;
          } catch (error) {
            found.videoError = error instanceof Error ? error.message : "No videos found.";
          }
        }
        sendJson(res, 200, { ...found, videos });
        return;
      }
      if (url.pathname === "/api/videos") {
        sendJson(res, 200, await findVideos(body.url));
        return;
      }
      if (url.pathname === "/api/download") {
        const file = await download(body.url);
        const filename = file.filename.replace(/["\r\n]/g, "");
        const headers = {
          "content-type": file.contentType,
          "content-length": file.bytes.length,
          "content-disposition": `attachment; filename="${filename}"`,
          "x-content-type-options": "nosniff",
          "cache-control": "no-store",
        };
        if (typeof body.token === "string" && /^dl\d{8,}$/.test(body.token)) {
          headers["set-cookie"] = `${body.token}=1; Path=/; SameSite=Strict; Max-Age=120`;
        }
        res.writeHead(200, headers);
        res.end(file.bytes);
        return;
      }
      sendJson(res, 404, { error: "Not found." });
    } catch (error) {
      if (res.headersSent) return;
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
    console.log(`Search listening on http://127.0.0.1:${port}`);
  });
}
