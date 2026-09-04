import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function notWsl() {
  return { ok: false, error: "not running in WSL", containers: [], vllmHints: [] };
}

export function parameters() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      focus: {
        type: "string",
        enum: ["all", "daemon", "vllm"],
        description: "all (default) = daemon + vLLM-ish containers; daemon = CLI/context only; vllm = containers/ports for OpenAI server.",
      },
    },
  };
}

export function outputSchema() {
  return { type: "object", additionalProperties: true };
}

export function format(v) {
  const lines = [`docker_doctor ok=${v.ok}`];
  if (v.which) lines.push(`which: ${v.which}`);
  if (v.context) lines.push(`context: ${v.context}`);
  if (v.serverVersion) lines.push(`server: ${v.serverVersion}`);
  if (v.gpuHint) lines.push(`gpu: ${v.gpuHint}`);
  if (v.gpuOnHits != null) lines.push(`gpuOnHits: ${v.gpuOnHits}`);
  if (v.portHealth) {
    lines.push(
      `portHealth: ${v.portHealth.url} ${v.portHealth.ok ? "ok" : "FAIL"} ${v.portHealth.status || v.portHealth.error || ""}`,
    );
  }
  for (const c of v.containers || []) {
    lines.push(
      `container: ${c.name} image=${c.image} ports=${c.ports}${c.publishes8000 ? " [8000]" : ""}`,
    );
  }
  for (const a of v.advice || []) lines.push(`- ${a}`);
  for (const a of v.vllmHints || []) lines.push(`vllm: ${a}`);
  if (v.error) lines.push(`error: ${v.error}`);
  return lines.join("\n");
}

async function run(cmd, args) {
  try {
    const { stdout } = await execFileAsync(cmd, args, {
      timeout: 15_000,
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
    });
    return String(stdout).trim();
  } catch {
    return "";
  }
}

function parseContainers(psOut) {
  if (!psOut) return [];
  return psOut
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", image = "", ports = ""] = line.split("\t");
      const publishes8000 = /(?:^|[\s,])(?:0\.0\.0\.0:|:::|127\.0\.0\.1:)?8000->|\b8000\/tcp\b/.test(ports);
      return { name, image, ports, publishes8000 };
    });
}

function looksLikeVllm(c) {
  const blob = `${c.name} ${c.image} ${c.ports}`.toLowerCase();
  return /vllm|openai|8000|llm/.test(blob) && /8000|vllm|openai/.test(blob);
}

export function containerHasGpuRuntime(inspectJson) {
  const text = typeof inspectJson === "string" ? inspectJson : JSON.stringify(inspectJson || {});
  return /HostConfig.*?Runtime.*?nvidia|"Runtime"\s*:\s*"nvidia"|DeviceRequests|nvidia.com\/gpu/i.test(text);
}

export async function probeHttpHealth(url, { timeoutMs = 2500, fetchFn = fetch } = {}) {
  try {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
    return { ok: res.status > 0 && res.status < 500, status: res.status, error: "", url };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
      url,
    };
  }
}

export function buildVllmHints(containers, { daemonOk, portHealth = null, gpuOnHits = null } = {}) {
  const hints = [
    "vLLM usually runs in Docker/WSL (not native Windows). Typical OpenAI port: 8000 → host_reach profile=vllm.",
    "After the container is up, paste host_reach providerSnippets for id=vllm into ~/.dsh/settings.yaml (export VLLM_API_KEY=vllm).",
    "GPU: prefer nvidia-container-toolkit / Docker Desktop GPU. Cross-check VRAM with gpu_doctor.",
  ];
  const hits = containers.filter(looksLikeVllm);
  const on8000 = containers.filter((c) => c.publishes8000);
  if (!daemonOk) {
    hints.unshift("Docker daemon not reachable — start Docker Desktop (WSL integration) or dockerd before starting vLLM.");
    return hints;
  }
  if (on8000.length) {
    hints.unshift(
      `Container(s) publishing :8000: ${on8000.map((c) => c.name).join(", ")}.`,
    );
  }
  if (portHealth) {
    hints.unshift(
      portHealth.ok
        ? `HTTP health ${portHealth.url} → status ${portHealth.status}.`
        : `HTTP health ${portHealth.url} failed (${portHealth.error || portHealth.status}). Port publish ≠ API ready — check logs; then host_reach profile=vllm.`,
    );
  }
  if (gpuOnHits === false) {
    hints.unshift("vLLM-related container(s) do not show an nvidia/GPU runtime — expect CPU-only or failed CUDA init; fix Docker GPU then gpu_doctor.");
  } else if (gpuOnHits === true) {
    hints.unshift("vLLM-related container appears to request nvidia/GPU runtime.");
  }
  if (!hits.length) {
    hints.unshift(
      "No obvious vLLM/OpenAI container on :8000. Example: docker run --gpus all -p 8000:8000 vllm/vllm-openai:latest --model <HF_ID>",
    );
  } else {
    hints.unshift(
      `Possible vLLM-related container(s): ${hits.map((c) => c.name).join(", ")}. Confirm /v1 with host_reach (profile=vllm).`,
    );
  }
  return hints;
}

export async function execute(args = {}, deps = {}) {
  const focus = ["all", "daemon", "vllm"].includes(args?.focus) ? args.focus : "all";
  const runFn = deps.run || run;
  const which = await runFn("bash", ["-lc", "command -v docker || true"]);
  if (!which) {
    return {
      ok: false,
      error: "docker CLI not found in WSL",
      containers: [],
      vllmHints: buildVllmHints([], { daemonOk: false }),
      portHealth: null,
      advice: [
        "Install Docker Engine in WSL, or install Docker Desktop and enable WSL integration.",
        "For local LLM ports without Docker, use host_reach (Ollama/LM Studio/llama-server).",
      ],
    };
  }

  const context = await runFn("docker", ["context", "show"]);
  const serverVersion = await runFn("docker", ["version", "--format", "{{.Server.Version}}"]);
  const daemonOk = Boolean(serverVersion);
  const advice = [];
  if (!daemonOk) advice.push("CLI present but daemon not reachable — start Docker Desktop or dockerd.");
  if (/desktop/i.test(context)) advice.push("Context looks like Docker Desktop.");
  else if (context) advice.push(`Active context: ${context}`);

  let containers = [];
  let gpuHint = "";
  let gpuOnHits = null;
  let portHealth = null;
  if (daemonOk && focus !== "daemon") {
    const ps = await runFn("docker", [
      "ps",
      "--format",
      "{{.Names}}\t{{.Image}}\t{{.Ports}}",
    ]);
    containers = parseContainers(ps);
    if (focus === "vllm") containers = containers.filter((c) => looksLikeVllm(c) || c.publishes8000);
    const runtime = await runFn("docker", ["info", "--format", "{{.Runtimes}}"]);
    if (/nvidia/i.test(runtime)) gpuHint = "nvidia runtime present";
    else gpuHint = "nvidia runtime not obvious — check Docker Desktop GPU / nvidia-container-toolkit";

    const hits = containers.filter(looksLikeVllm);
    if (hits.length) {
      let anyGpu = false;
      let inspected = false;
      for (const c of hits.slice(0, 3)) {
        const raw = await runFn("docker", ["inspect", c.name]);
        if (raw) {
          inspected = true;
          if (containerHasGpuRuntime(raw)) anyGpu = true;
        }
      }
      if (inspected) gpuOnHits = anyGpu;
    }

    const publish8000 = containers.some((c) => c.publishes8000) || focus === "vllm";
    if (publish8000 || hits.length) {
      portHealth = await probeHttpHealth("http://127.0.0.1:8000/v1/models", {
        fetchFn: deps.fetchFn,
      });
    }
  }

  const vllmHints = focus === "daemon" ? [] : buildVllmHints(containers, { daemonOk, portHealth, gpuOnHits });
  if (daemonOk && focus !== "daemon") {
    advice.push("Cross-check OpenAI port with host_reach (profile=vllm or all) from a dsh session.");
    advice.push("If GPU VRAM looks exhausted, run gpu_doctor before starting another inference stack.");
  }

  return {
    ok: daemonOk,
    which,
    context,
    serverVersion,
    gpuHint,
    gpuOnHits,
    containers: focus === "daemon" ? [] : containers,
    portHealth,
    vllmHints,
    advice,
  };
}
