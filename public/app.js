const form = document.querySelector("#job");
const query = document.querySelector("#query");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const videos = document.querySelector("#videos");
const runButton = document.querySelector("#run");

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

function domainOf(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function post(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const type = response.headers.get("content-type") || "";
  if (type.includes("json")) {
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Request failed.");
    return payload;
  }
  if (!response.ok) throw new Error("Request failed.");
  return response;
}

function saveVideo(url, button) {
  if (button.disabled) return;
  const token = `dl${Date.now()}`;
  button.disabled = true;
  button.textContent = "Saving…";
  const frame = el("iframe", null, { name: token, title: "Download", class: "downloads" });
  document.body.append(frame);
  let settled = false;
  const finish = (label, message) => {
    if (settled) return;
    settled = true;
    clearInterval(timer);
    clearTimeout(giveUp);
    button.disabled = false;
    button.textContent = label;
    if (message) status.textContent = message;
    document.cookie = `${token}=; Max-Age=0; Path=/`;
    setTimeout(() => frame.remove(), 30_000);
  };
  frame.addEventListener("load", () => {
    if (document.cookie.split("; ").includes(`${token}=1`)) {
      finish("Saved");
      return;
    }
    let message = "";
    try {
      const text = frame.contentDocument?.body?.textContent || "";
      message = text ? JSON.parse(text).error || "" : "";
    } catch {
      message = "";
    }
    if (message) finish("Download", message);
  });
  const timer = setInterval(() => {
    if (document.cookie.split("; ").includes(`${token}=1`)) finish("Saved");
  }, 200);
  const giveUp = setTimeout(() => finish("Download", "That video took too long to save."), 60_000);
  const form = el("form");
  form.method = "POST";
  form.action = "/api/download";
  form.target = token;
  form.append(el("input", null, { type: "hidden", name: "url", value: url }));
  form.append(el("input", null, { type: "hidden", name: "token", value: token }));
  document.body.append(form);
  form.submit();
  form.remove();
}

function videoRow(url) {
  const safe = safeUrl(url);
  const row = el("div", null, { class: "video-row" });
  if (!safe) {
    row.append(el("p", "Skipped an unsafe video link."));
    return row;
  }
  row.append(el("a", safe, { href: safe, target: "_blank", rel: "noopener noreferrer" }));
  const button = el("button", "Download", { type: "button", class: "secondary" });
  button.addEventListener("click", () => saveVideo(safe, button));
  row.append(button);
  return row;
}

function renderVideos(list, error) {
  videos.replaceChildren();
  if (!list?.length && !error) {
    videos.hidden = true;
    return;
  }
  videos.hidden = false;
  videos.append(el("h2", "Direct videos"));
  videos.append(el("p", "These are video files the address links to. Players that hide the file, including YouTube, are not saved."));
  if (error) videos.append(el("p", error));
  for (const url of list || []) videos.append(videoRow(url));
}

function renderResults(payload) {
  results.replaceChildren();
  status.textContent = payload.note || `${payload.results?.length || 0} results from ${payload.source === "brave" ? "Brave Search" : "keyless search"}.`;
  for (const item of payload.results || []) {
    const row = el("li");
    const href = safeUrl(item.url);
    if (href) {
      row.append(el("a", item.title || href, { href, target: "_blank", rel: "noopener noreferrer" }));
      row.append(el("span", domainOf(href), { class: "domain" }));
    } else {
      row.append(el("strong", item.title || "Untitled"));
    }
    if (item.description) row.append(el("p", item.description));
    if (href) {
      const button = el("button", "Linked videos", { type: "button", class: "secondary" });
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const found = await post("/api/videos", { url: href });
          const slot = el("div");
          if (!found.videos?.length) slot.append(el("p", "No direct video files on that page."));
          for (const videoUrl of found.videos || []) slot.append(videoRow(videoUrl));
          button.replaceWith(slot);
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : "Could not look for videos.";
          button.disabled = false;
        }
      });
      row.append(button);
    }
    results.append(row);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = query.value.trim();
  status.textContent = "Searching…";
  runButton.disabled = true;
  results.replaceChildren();
  videos.hidden = true;
  try {
    const payload = await post("/api/search", { query: input });
    renderVideos(payload.videos, payload.videoError);
    renderResults(payload);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Search failed.";
  } finally {
    runButton.disabled = false;
  }
});

query.focus();
