const form = document.querySelector("#job");
const query = document.querySelector("#query");
const limit = document.querySelector("#limit");
const limitWrap = document.querySelector("#limit-wrap");
const fieldLabel = document.querySelector("#field-label");
const status = document.querySelector("#status");
const result = document.querySelector("#result");
const linkList = document.querySelector("#link-list");
const runButton = document.querySelector("#run");

const modes = {
  scrape: { label: "Page", placeholder: "https://example.com", limit: false },
  search: { label: "Query", placeholder: "web scraping tools", limit: true },
  map: { label: "Site", placeholder: "https://example.com", limit: true },
};

let mode = "scrape";

function setMode(next) {
  mode = next;
  const spec = modes[next];
  fieldLabel.textContent = spec.label;
  query.placeholder = spec.placeholder;
  limitWrap.hidden = !spec.limit;
  for (const button of document.querySelectorAll(".modes button")) {
    button.setAttribute("aria-selected", String(button.dataset.mode === next));
  }
}

for (const button of document.querySelectorAll(".modes button")) {
  button.addEventListener("click", () => setMode(button.dataset.mode));
}

function el(tag, text, attrs = {}) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    return "";
  }
  return "";
}

function renderLinks(links) {
  linkList.replaceChildren();
  for (const link of links) {
    const item = el("li", null, { class: "link-row" });
    const copy = el("div");
    const anchor = el("a", link.title, { href: link.url, target: "_blank", rel: "noopener noreferrer" });
    copy.append(anchor, el("p", link.detail || link.url));
    const scrape = el("button", "Scrape", { type: "button" });
    scrape.addEventListener("click", () => {
      setMode("scrape");
      query.value = link.url;
      form.requestSubmit();
    });
    item.append(copy, scrape);
    linkList.append(item);
  }
}

function addInline(parent, text) {
  const visible = text.replace(/!\[[^\]]*\]\((?:https?:\/\/[^)\s]+)\)/g, "");
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|`([^`]+)`/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(visible))) {
    if (match.index > last) parent.append(visible.slice(last, match.index));
    if (match[3]) parent.append(el("code", match[3]));
    else {
      const href = safeUrl(match[2]);
      parent.append(href ? el("a", match[1], { href, target: "_blank", rel: "noopener noreferrer" }) : match[1]);
    }
    last = match.index + match[0].length;
  }
  if (last < visible.length) parent.append(visible.slice(last));
}

function renderMarkdown(markdown) {
  const root = document.createDocumentFragment();
  const lines = markdown.split("\n");
  let list = null;
  let code = null;
  const flushList = () => {
    if (list) root.append(list);
    list = null;
  };
  for (const line of lines) {
    if (line.startsWith("```")) {
      if (code) {
        root.append(code);
        code = null;
      } else {
        flushList();
        code = el("pre");
      }
      continue;
    }
    if (code) {
      code.append(`${line}\n`);
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!list) list = el("ul");
      const item = el("li");
      addInline(item, line.slice(2));
      list.append(item);
      continue;
    }
    flushList();
    if (!line.trim()) continue;
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const node = el(`h${heading[1].length + 1}`);
      addInline(node, heading[2]);
      root.append(node);
      continue;
    }
    const paragraph = el("p");
    addInline(paragraph, line);
    root.append(paragraph);
  }
  flushList();
  if (code) root.append(code);
  return root;
}

function renderPayload(payload) {
  result.replaceChildren();
  if (payload.mode === "scrape") {
    if (payload.title) result.append(el("h2", payload.title));
    const source = safeUrl(payload.url);
    if (source) result.append(el("a", source, { href: source, target: "_blank", rel: "noopener noreferrer" }));
    result.append(renderMarkdown(payload.markdown || "This page returned no markdown."));
    return;
  }
  if (payload.mode === "search") {
    const list = el("ol", null, { class: "result-list" });
    if (!payload.results?.length) list.append(el("li", "No web results."));
    for (const item of payload.results || []) {
      const row = el("li");
      const href = safeUrl(item.url);
      row.append(href ? el("a", item.title || href, { href, target: "_blank", rel: "noopener noreferrer" }) : el("strong", item.title || "Untitled"));
      if (item.description) row.append(el("p", item.description));
      list.append(row);
    }
    result.append(list);
    return;
  }
  const list = el("ul", null, { class: "result-list" });
  if (!payload.links?.length) list.append(el("li", "No links found."));
  for (const href of payload.links || []) {
    const safe = safeUrl(href);
    if (!safe) continue;
    const item = el("li");
    item.append(el("a", safe, { href: safe, target: "_blank", rel: "noopener noreferrer" }));
    list.append(item);
  }
  result.append(list);
}

async function loadLinks() {
  const fallback = [
    {
      title: "Claude",
      url: "https://ultimatewebscraper.com/claude",
      detail: "Give Claude web scraping powers",
    },
  ];
  try {
    const response = await fetch("/api/links");
    const payload = await response.json();
    renderLinks(Array.isArray(payload.links) && payload.links.length ? payload.links : fallback);
  } catch {
    renderLinks(fallback);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = query.value.trim();
  status.textContent = "Working…";
  runButton.disabled = true;
  result.replaceChildren();
  const path = mode === "search" ? "/api/search" : mode === "map" ? "/api/map" : "/api/scrape";
  const body = mode === "search"
    ? { query: input, limit: Number(limit.value) }
    : mode === "map"
      ? { url: input, limit: Number(limit.value) }
      : { url: input };
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Request failed.");
    status.textContent = "";
    renderPayload(payload);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Request failed.";
  } finally {
    runButton.disabled = false;
  }
});

setMode("scrape");
loadLinks();
