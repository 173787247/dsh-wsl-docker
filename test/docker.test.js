import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildVllmHints, format, parameters } from "../lib/docker.js";

describe("docker_doctor", () => {
  it("formats", () => {
    assert.match(
      format({
        ok: true,
        containers: [{ name: "vllm", image: "vllm/vllm-openai", ports: "0.0.0.0:8000->8000/tcp" }],
        vllmHints: ["check host_reach"],
      }),
      /vllm/i,
    );
  });

  it("exposes focus parameter", () => {
    assert.ok(parameters().properties.focus.enum.includes("vllm"));
  });

  it("hints when no vllm container", () => {
    const hints = buildVllmHints([], { daemonOk: true });
    assert.ok(hints.some((h) => /docker run/i.test(h) || /No obvious/i.test(h)));
  });

  it("names matching containers", () => {
    const hints = buildVllmHints(
      [{ name: "my-vllm", image: "vllm/vllm-openai:latest", ports: "8000/tcp" }],
      { daemonOk: true },
    );
    assert.ok(hints.some((h) => /my-vllm/.test(h)));
  });
});
