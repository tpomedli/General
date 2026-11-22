import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createApp } from "../src/server.js";

function listen(server) {
  server.listen(0, "127.0.0.1");
  return once(server, "listening").then(() => server.address().port);
}

async function request(port, path, { method = "GET", body, origin } = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(origin ? { origin } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = response.headers.get("content-type") || "";
  if (type.includes("json") || type.startsWith("text/")) {
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: response.status, text, json, headers: response.headers };
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  return { status: response.status, bytes, headers: response.headers };
}

test("search returns one list and can include direct videos", async () => {
  const server = createApp({
    async search(query) {
      return {
        source: "brave",
        query,
        results: [{ title: "Example", url: "https://example.com", description: "A page" }],
      };
    },
    async findVideos(url) {
      assert.equal(url, "https://example.com/watch");
      return { videos: ["https://cdn.example.com/clip.mp4"] };
    },
    async download() {
      return { filename: "clip.mp4", contentType: "video/mp4", bytes: Buffer.from("videobytes") };
    },
  });
  const port = await listen(server);
  try {
    const page = await request(port, "/");
    assert.equal(page.status, 200);
    assert.match(page.text, /Look it up/);

    const searched = await request(port, "/api/search", {
      method: "POST",
      body: { query: "https://example.com/watch" },
    });
    assert.equal(searched.json.results[0].title, "Example");
    assert.deepEqual(searched.json.videos, ["https://cdn.example.com/clip.mp4"]);

    const foreign = await request(port, "/api/search", {
      method: "POST",
      origin: "https://evil.example",
      body: { query: "example" },
    });
    assert.equal(foreign.status, 403);

    const saved = await request(port, "/api/download", {
      method: "POST",
      body: { url: "https://cdn.example.com/clip.mp4" },
    });
    assert.equal(saved.bytes.toString(), "videobytes");
    assert.match(saved.headers.get("content-disposition"), /clip\.mp4/);

    const form = await fetch(`http://127.0.0.1:${port}/api/download`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ url: "https://cdn.example.com/clip.mp4" }),
    });
    assert.equal(form.status, 200);
    assert.equal(Buffer.from(await form.arrayBuffer()).toString(), "videobytes");
  } finally {
    server.close();
  }
});

test("download refuses a private address", async () => {
  const server = createApp();
  const port = await listen(server);
  try {
    const blocked = await request(port, "/api/download", {
      method: "POST",
      body: { url: "http://127.0.0.1/secret.mp4" },
    });
    assert.equal(blocked.status, 400);
  } finally {
    server.close();
  }
});
