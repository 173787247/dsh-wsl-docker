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
  for (const c of v.containers || []) {
    lines.push(`container: ${c.name} image=${c.image} ports=${c.ports}`);
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
      return { name, image, ports };
    });
}

function looksLikeVllm(c) {
  const blob = `${c.name} ${c.image} ${c.ports}`.toLowerCase();
  return /vllm|openai|8000|llm/.test(blob) && (/8000|vllm|openai/.test(blob));
}

export function buildVllmHints(containers, { daemonOk } = {}) {
  const hints = [
    "vLLM usually runs in Docker/WSL (not native Windows). Typical OpenAI port: 8000 → host_reach profile=vllm.",
    "After the container is up, paste host_reach providerSnippets for id=vllm into ~/.dsh/settings.yaml (export VLLM_API_KEY=vllm).",
    "GPU: prefer nvidia-container-toolkit / Docker Desktop GPU. Do not co-load Ollama + vLLM on 16GB without headroom.",
  ];
  const hits = containers.filter(looksLikeVllm);
  if (!daemonOk) {
    hints.unshift("Docker daemon not reachable — start Docker Desktop (WSL integration) or dockerd before starting vLLM.");
    return hints;
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

export async function execute(args = {}) {
  const focus = ["all", "daemon", "vllm"].includes(args?.focus) ? args.focus : "all";
  const which = await run("bash", ["-lc", "command -v docker || true"]);
  if (!which) {
    return {
      ok: false,
      error: "docker CLI not found in WSL",
      containers: [],
      vllmHints: buildVllmHints([], { daemonOk: false }),
      advice: [
        "Install Docker Engine in WSL, or install Docker Desktop and enable WSL integration.",
        "For local LLM ports without Docker, use host_reach (Ollama/LM Studio/llama-server).",
      ],
    };
  }

  const context = await run("docker", ["context", "show"]);
  const serverVersion = await run("docker", ["version", "--format", "{{.Server.Version}}"]);
  const daemonOk = Boolean(serverVersion);
  const advice = [];
  if (!daemonOk) advice.push("CLI present but daemon not reachable — start Docker Desktop or dockerd.");
  if (/desktop/i.test(context)) advice.push("Context looks like Docker Desktop.");
  else if (context) advice.push(`Active context: ${context}`);

  let containers = [];
  let gpuHint = "";
  if (daemonOk && focus !== "daemon") {
    const ps = await run("docker", [
      "ps",
      "--format",
      "{{.Names}}\t{{.Image}}\t{{.Ports}}",
    ]);
    containers = parseContainers(ps);
    if (focus === "vllm") containers = containers.filter(looksLikeVllm);
    const runtime = await run("docker", ["info", "--format", "{{.Runtimes}}"]);
    if (/nvidia/i.test(runtime)) gpuHint = "nvidia runtime present";
    else gpuHint = "nvidia runtime not obvious — check Docker Desktop GPU / nvidia-container-toolkit";
  }

  const vllmHints = focus === "daemon" ? [] : buildVllmHints(containers, { daemonOk });
  if (daemonOk && focus !== "daemon") {
    advice.push("Cross-check OpenAI port with host_reach (profile=vllm or all) from a dsh session.");
  }

  return {
    ok: daemonOk,
    which,
    context,
    serverVersion,
    gpuHint,
    containers: focus === "daemon" ? [] : containers,
    vllmHints,
    advice,
  };
}
