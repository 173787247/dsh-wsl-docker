import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { format } from "../lib/docker.js";

describe("docker_doctor", () => {
  it("formats", () => {
    assert.match(format({ ok: true }), /ok/i);
  });
});
