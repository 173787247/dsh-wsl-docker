import { detectWsl } from "./lib/wsl-host.js";
import * as core from "./lib/docker.js";

export const name = "dsh-wsl-docker";
export const inject = ["tools", "systemPrompt"];

export function apply(ctx, config = {}) {
  const timeoutMs = positive(config.timeoutMs, 15_000);
  const wsl = detectWsl();

  ctx.systemPrompt.section({
    name: "tool:docker_doctor",
    order: 120,
    text: "Use docker_doctor for Docker Desktop vs WSL daemon confusion, and for vLLM/OpenAI containers on port 8000 (focus=vllm). Pair with host_reach when checking baseURL.",
  });

  ctx.tools.register({
    name: "docker_doctor",
    description: "Diagnose Docker in WSL (Desktop vs Engine) and list vLLM/OpenAI-like containers (port 8000). Use focus=vllm for LLM containers.",
    parameters: core.parameters(config),
    output: {
      schema: core.outputSchema(),
      render: (_args, value) => [{ type: "text", text: core.format(value) }],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args) {
      if (!wsl) return core.notWsl ? core.notWsl() : { ok: false, error: "not running in WSL" };
      return core.execute(args, config);
    },
    presentCall: () => ({ card: "generic", title: "docker_doctor" }),
    presentResult: (_args, result) => (
      result.isError
        ? { card: "generic", title: "docker_doctor failed", content: result.content }
        : { card: "generic", title: "docker_doctor", content: result.content }
    ),
  });
}

function positive(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
