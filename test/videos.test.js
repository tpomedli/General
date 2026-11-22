import assert from "node:assert/strict";
import test from "node:test";
import { PassThrough } from "node:stream";
import { createSafeLookup, downloadVideo, findLinkedVideos, incomingResponse, videoLinksFromHtml } from "../src/videos.js";

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

test("unread video responses are closed", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    cancel() {
      cancelled = true;
    },
  });
  const response = new Response(body, { status: 200, headers: { "content-type": "video/mp4" } });
  const found = await findLinkedVideos("https://cdn.example.com/watch", async () => response);
  assert.deepEqual(found.videos, ["https://cdn.example.com/watch"]);
  assert.equal(cancelled, true);
});

test("an oversized download stops and closes the body", async () => {
  let cancelled = false;
  const chunk = new Uint8Array(1024 * 1024);
  const body = new ReadableStream({
    pull(controller) {
      if (cancelled) return;
      controller.enqueue(chunk);
    },
    cancel() {
      cancelled = true;
    },
  });
  const response = new Response(body, { headers: { "content-type": "video/mp4" } });
  await assert.rejects(
    () => downloadVideo("https://cdn.example.com/big.mp4", async () => response),
    /larger than 80 MB/,
  );
  assert.equal(cancelled, true);
});

test("an oversized socket is destroyed", async () => {
  const incoming = new PassThrough();
  incoming.statusCode = 200;
  incoming.headers = { "content-type": "video/mp4" };
  let destroyed = false;
  const originalDestroy = incoming.destroy.bind(incoming);
  incoming.destroy = () => {
    destroyed = true;
    originalDestroy();
  };
  const response = incomingResponse(incoming);
  const chunk = Buffer.alloc(1024 * 1024, 1);
  const writing = (async () => {
    try {
      for (let i = 0; i < 90 && !destroyed; i += 1) {
        if (!incoming.write(chunk)) {
          await new Promise((resolve) => {
            const done = () => {
              incoming.off("drain", done);
              incoming.off("close", done);
              resolve();
            };
            incoming.on("drain", done);
            incoming.on("close", done);
          });
        }
      }
    } catch {
      // The capped reader destroys the socket.
    }
  })();
  await assert.rejects(
    () => downloadVideo("https://cdn.example.com/big.mp4", async () => response),
    /larger than 80 MB/,
  );
  await writing;
  assert.equal(destroyed, true);
});

test("an incoming response pauses until it is read", async () => {
  const incoming = new PassThrough();
  incoming.statusCode = 200;
  incoming.headers = { "content-type": "video/mp4" };
  const response = incomingResponse(incoming);
  const reader = response.body.getReader();
  incoming.write(Buffer.from("abcd"));
  const first = await reader.read();
  assert.equal(Buffer.from(first.value).toString(), "abcd");
  const chunk = Buffer.alloc(64 * 1024, 1);
  let writes = 0;
  for (; writes < 40; writes += 1) {
    if (!incoming.write(chunk)) break;
  }
  assert.ok(writes < 40);
  await reader.cancel();
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
