import assert from "node:assert/strict";
import test from "node:test";
import { assertUrl, choosePublicAddress, InputError, publicHttpUrl } from "../src/validate.js";

function refused(value) {
  assert.throws(() => assertUrl(value), InputError);
  assert.equal(publicHttpUrl(value), "");
}

test("private and mapped addresses are refused", () => {
  refused("http://127.0.0.1/secret.mp4");
  refused("http://[::ffff:127.0.0.1]/secret.mp4");
  refused("http://[::ffff:7f00:1]/secret.mp4");
  refused("http://[::ffff:169.254.169.254]/latest/meta-data");
  refused("http://[::ffff:a9fe:a9fe]/latest/meta-data");
  refused("http://[::127.0.0.1]/secret.mp4");
  refused("http://[64:ff9b::127.0.0.1]/secret.mp4");
  refused("http://[fe80::1]/");
  refused("http://[fc00::1]/");
});

test("names that resolve to a private address are refused", () => {
  assert.throws(
    () => choosePublicAddress([{ address: "127.0.0.1", family: 4 }, { address: "8.8.8.8", family: 4 }]),
    /not available/,
  );
  assert.equal(choosePublicAddress([{ address: "8.8.8.8", family: 4 }]).address, "8.8.8.8");
});

test("public addresses stay available", () => {
  assert.equal(assertUrl("https://example.com/a.mp4"), "https://example.com/a.mp4");
  assert.equal(publicHttpUrl("http://[::ffff:8.8.8.8]/clip.mp4"), "http://[::ffff:808:808]/clip.mp4");
  assert.equal(publicHttpUrl("http://[2001:db8::1]/clip.mp4"), "http://[2001:db8::1]/clip.mp4");
});
