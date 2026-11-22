import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { links } from "../src/links.js";
import { createApp } from "../src/server.js";

function throwingSearch() {
  const data = {};
  Object.defineProperty(data, "data", {
    get() {
      throw new Error("SearchData has no '.data'");
    },
  });
  return data;
}

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
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, text, json };
}

test("the Claude page is the first link", () => {
  assert.equal(links[0].url, "https://ultimatewebscraper.com/claude");
});

test("the app serves that link and refuses a bad scrape", async () => {
  const server = createApp({
    async scrape(url) {
      return { markdown: `Scraped ${url}`, metadata: { title: "Fetched" } };
    },
    async search() {
      return throwingSearch();
    },
    async map() {
      return { links: ["https://example.com/a", "javascript:alert(1)"] };
    },
  });
  const port = await listen(server);
  try {
    const page = await request(port, "/");
    assert.equal(page.status, 200);
    assert.match(page.text, /ultimatewebscraper\.com\/claude/);

    const listed = await request(port, "/api/links");
    assert.equal(listed.json.links[0].url, "https://ultimatewebscraper.com/claude");

    const blocked = await request(port, "/api/scrape", {
      method: "POST",
      body: { url: "http://127.0.0.1/secret" },
    });
    assert.equal(blocked.status, 400);

    const foreign = await request(port, "/api/scrape", {
      method: "POST",
      origin: "https://evil.example",
      body: { url: "https://example.com" },
    });
    assert.equal(foreign.status, 403);

    const scraped = await request(port, "/api/scrape", {
      method: "POST",
      body: { url: "https://ultimatewebscraper.com/claude" },
    });
    assert.equal(scraped.status, 200);
    assert.match(scraped.json.markdown, /ultimatewebscraper\.com\/claude/);

    const searched = await request(port, "/api/search", {
      method: "POST",
      body: { query: "nothing here", limit: 3 },
    });
    assert.equal(searched.status, 200);
    assert.deepEqual(searched.json.results, []);

    const mapped = await request(port, "/api/map", {
      method: "POST",
      body: { url: "https://example.com", limit: 5 },
    });
    assert.deepEqual(mapped.json.links, ["https://example.com/a"]);
  } finally {
    server.close();
  }
});
