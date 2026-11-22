import assert from "node:assert/strict";
import test from "node:test";
import { downloadVideo, findLinkedVideos, videoLinksFromHtml } from "../src/videos.js";

test("videoLinksFromHtml keeps direct files and drops other links", () => {
  const html = `
    <video src="/clip.mp4"></video>
    <a href="https://cdn.example.com/film.webm">film</a>
    <a href="https://youtube.com/watch?v=abc">player</a>
    <a href="javascript:alert(1)">bad</a>
  `;
  assert.deepEqual(videoLinksFromHtml(html, "https://example.com/watch"), [
    "https://example.com/clip.mp4",
    "https://cdn.example.com/film.webm",
  ]);
});

function responseFor(body, { status = 200, type = "text/html", url = "https://example.com/watch" } = {}) {
  return new Response(body, { status, headers: { "content-type": type, location: url } });
}

test("findLinkedVideos reads video files from a page", async () => {
  const found = await findLinkedVideos("https://example.com/watch", async () => responseFor('<video src="clip.mp4"></video>'));
  assert.deepEqual(found.videos, ["https://example.com/clip.mp4"]);
});

test("downloadVideo saves a direct file and refuses a page", async () => {
  const saved = await downloadVideo("https://cdn.example.com/clip.mp4", async () => responseFor("videobytes", { type: "video/mp4" }));
  assert.equal(saved.filename, "clip.mp4");
  assert.equal(saved.bytes.toString(), "videobytes");

  await assert.rejects(
    () => downloadVideo("https://example.com/watch", async () => responseFor("<html></html>")),
    /not a direct video file/,
  );
});
