import assert from "node:assert/strict";
import test from "node:test";
import { createSafeLookup, downloadVideo, findLinkedVideos, videoLinksFromHtml } from "../src/videos.js";

test("lookup refuses a name that points at loopback", () => {
  const lookup = createSafeLookup((_hostname, _options, callback) => {
    callback(null, [{ address: "127.0.0.1", family: 4 }]);
  });
  lookup("loopback.test", {}, (error, address) => {
    assert.match(error.message, /not available/);
    assert.equal(address, undefined);
  });
});

test("videoLinksFromHtml keeps direct files and drops other links", () => {
  const html = `
    <video src="/clip.mp4"></video>
    <a href="https://cdn.example.com/film.webm">film</a>
    <a href="https://youtube.com/watch?v=abc">player</a>
    <a href="https://example.com/watch?file=nope.mp4">query</a>
    <a href="https://cdn.example.com/clip.mp4?token=1">file</a>
    <a href="javascript:alert(1)">bad</a>
  `;
  assert.deepEqual(videoLinksFromHtml(html, "https://example.com/watch"), [
    "https://example.com/clip.mp4",
    "https://cdn.example.com/film.webm",
    "https://cdn.example.com/clip.mp4?token=1",
  ]);
});

function responseFor(body, { status = 200, type = "text/html", url = "https://example.com/watch" } = {}) {
  return new Response(body, { status, headers: { "content-type": type, location: url } });
}

test("findLinkedVideos reads video files from a page", async () => {
  const found = await findLinkedVideos("https://example.com/watch", async () => responseFor('<video src="clip.mp4"></video>'));
  assert.deepEqual(found.videos, ["https://example.com/clip.mp4"]);
});

test("a query ending in .mp4 is still scanned as a page", async () => {
  let fetched = false;
  const found = await findLinkedVideos("https://example.com/watch?file=clip.mp4", async () => {
    fetched = true;
    return responseFor('<a href="/real.mp4"></a>');
  });
  assert.equal(fetched, true);
  assert.deepEqual(found.videos, ["https://example.com/real.mp4"]);
});

test("downloadVideo saves a direct file and refuses a page", async () => {
  const saved = await downloadVideo("https://cdn.example.com/clip.mp4", async () => responseFor("videobytes", { type: "video/mp4" }));
  assert.equal(saved.filename, "clip.mp4");
  assert.equal(saved.bytes.toString(), "videobytes");

  await assert.rejects(
    () => downloadVideo("https://example.com/watch", async () => responseFor("<html></html>")),
    /not a direct video file/,
  );
  await assert.rejects(
    () => downloadVideo("https://example.com/watch?file=clip.mp4", async () => responseFor("<html></html>")),
    /not a direct video file/,
  );
});
