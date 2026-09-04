import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildVllmHints, containerHasGpuRuntime, format, parameters, probeHttpHealth } from "../lib/docker.js";

describe("docker_doctor", () => {
  it("formats", () => {
    assert.match(
      format({
        ok: true,
        containers: [{ name: "vllm", image: "vllm/vllm-openai", ports: "0.0.0.0:8000->8000/tcp", publishes8000: true }],
        vllmHints: ["check host_reach"],
        portHealth: { ok: true, status: 200, url: "http://127.0.0.1:8000/v1/models" },
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
      [{ name: "my-vllm", image: "vllm/vllm-openai:latest", ports: "8000/tcp", publishes8000: true }],
      { daemonOk: true },
    );
    assert.ok(hints.some((h) => /my-vllm/.test(h)));
  });

  it("detects nvidia runtime and injectable health", async () => {
    assert.equal(containerHasGpuRuntime({ HostConfig: { Runtime: "nvidia" } }), true);
    const health = await probeHttpHealth("http://127.0.0.1:8000/v1/models", {
      fetchFn: async () => ({ ok: true, status: 200 }),
    });
    assert.equal(health.ok, true);
    const hints = buildVllmHints(
      [{ name: "v", image: "vllm/vllm-openai", ports: "0.0.0.0:8000->8000/tcp", publishes8000: true }],
      { daemonOk: true, portHealth: health, gpuOnHits: false },
    );
    const blob = hints.join("\n");
    assert.match(blob, /GPU runtime|nvidia/i);
    assert.match(blob, /host_reach|gpu_doctor/i);
  });

  it("hints http 404 separately from generic health fail", () => {
    const hints = buildVllmHints(
      [{ name: "v", image: "vllm/vllm-openai", ports: "0.0.0.0:8000->8000/tcp", publishes8000: true }],
      {
        daemonOk: true,
        portHealth: { ok: false, status: 404, url: "http://127.0.0.1:8000/v1/models", error: "" },
      },
    );
    assert.ok(hints.some((h) => /404/.test(h) && /apiReady/i.test(h)));
  });
});
