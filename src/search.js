import { assertQuery, publicHttpUrl } from "./validate.js";

const BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

function resultItem(title, url, description) {
  const safeUrl = publicHttpUrl(url);
  if (!safeUrl) return null;
  return {
    title: String(title || safeUrl).replace(/\s+/g, " ").trim().slice(0, 180),
    url: safeUrl,
    description: String(description || "").replace(/\s+/g, " ").trim().slice(0, 240),
  };
}

export function braveResults(payload) {
  const results = payload?.web?.results;
  if (!Array.isArray(results)) return [];
  return results
    .slice(0, 10)
    .map((item) => resultItem(item?.title, item?.url, item?.description))
    .filter(Boolean);
}

function flattenTopics(topics, out = []) {
  for (const topic of topics || []) {
    if (Array.isArray(topic?.Topics)) flattenTopics(topic.Topics, out);
    else if (topic?.FirstURL) out.push(topic);
  }
  return out;
}

export function keylessResults({ wiki, duck }) {
  const items = [];
  if (Array.isArray(wiki) && Array.isArray(wiki[1])) {
    wiki[1].forEach((title, index) => {
      items.push(resultItem(title, wiki[3]?.[index], wiki[2]?.[index]));
    });
  }
  if (duck?.AbstractURL) {
    items.push(resultItem(duck.Heading || duck.AbstractSource, duck.AbstractURL, duck.Abstract));
  }
  for (const topic of flattenTopics(duck?.RelatedTopics)) {
    items.push(resultItem(topic.Text, topic.FirstURL, ""));
  }
  const seen = new Set();
  return items.filter((item) => {
    if (!item || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  }).slice(0, 10);
}

async function readJson(response) {
  if (!response.ok) throw new Error("Search could not run that query.");
  return response.json();
}

export async function searchBrave(query, { token, fetchImpl = fetch }) {
  const q = assertQuery(query);
  const url = new URL(BRAVE_ENDPOINT);
  url.searchParams.set("q", q);
  url.searchParams.set("count", "10");
  const response = await fetchImpl(url, {
    headers: {
      accept: "application/json",
      "x-subscription-token": token,
    },
  });
  const payload = await readJson(response);
  return { source: "brave", query: q, results: braveResults(payload) };
}

export async function searchKeyless(query, fetchImpl = fetch) {
  const q = assertQuery(query);
  const wikiUrl = new URL("https://en.wikipedia.org/w/api.php");
  wikiUrl.searchParams.set("action", "opensearch");
  wikiUrl.searchParams.set("search", q);
  wikiUrl.searchParams.set("limit", "6");
  wikiUrl.searchParams.set("namespace", "0");
  wikiUrl.searchParams.set("format", "json");
  const duckUrl = new URL("https://api.duckduckgo.com/");
  duckUrl.searchParams.set("q", q);
  duckUrl.searchParams.set("format", "json");
  duckUrl.searchParams.set("no_html", "1");
  duckUrl.searchParams.set("skip_disambig", "1");
  const [wikiResponse, duckResponse] = await Promise.all([
    fetchImpl(wikiUrl, { headers: { accept: "application/json" } }),
    fetchImpl(duckUrl, { headers: { accept: "application/json" } }),
  ]);
  const [wiki, duck] = await Promise.all([readJson(wikiResponse), readJson(duckResponse)]);
  return {
    source: "keyless",
    query: q,
    note: "Wikipedia and DuckDuckGo instant answers. Add BRAVE_SEARCH_API_KEY for full web results.",
    results: keylessResults({ wiki, duck }),
  };
}

export async function searchWeb(query, { token = process.env.BRAVE_SEARCH_API_KEY, fetchImpl = fetch } = {}) {
  const secret = (token || "").trim();
  if (secret) return searchBrave(query, { token: secret, fetchImpl });
  return searchKeyless(query, fetchImpl);
}
