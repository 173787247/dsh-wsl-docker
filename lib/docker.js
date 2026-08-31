import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function notWsl() {
  return { ok: false, error: "not running in WSL" };
}

export function parameters() {
  return { type: "object", additionalProperties: false, properties: {} };
}

export function outputSchema() {
  return { type: "object", additionalProperties: true };
}

export function format(v) {
  const lines = [`docker_doctor ok=${v.ok}`];
  if (v.which) lines.push(`which: ${v.which}`);
  if (v.context) lines.push(`context: ${v.context}`);
  if (v.serverVersion) lines.push(`server: ${v.serverVersion}`);
  for (const a of v.advice || []) lines.push(`- ${a}`);
  if (v.error) lines.push(`error: ${v.error}`);
  return lines.join("\n");
}

async function run(cmd, args) {
  try {
    const { stdout } = await execFileAsync(cmd, args, { timeout: 15_000, encoding: "utf8" });
    return String(stdout).trim();
  } catch (err) {
    return "";
  }
}

export async function execute() {
  const which = await run("bash", ["-lc", "command -v docker || true"]);
  if (!which) {
    return {
      ok: false,
      error: "docker CLI not found in WSL",
      advice: ["Install Docker Engine in WSL, or install Docker Desktop and enable WSL integration."],
    };
  }
  const context = await run("docker", ["context", "show"]);
  const serverVersion = await run("docker", ["version", "--format", "{{.Server.Version}}"]);
  const advice = [];
  if (!serverVersion) advice.push("CLI present but daemon not reachable — start Docker Desktop or dockerd.");
  if (/desktop/i.test(context)) advice.push("Context looks like Docker Desktop.");
  else if (context) advice.push(`Active context: ${context}`);
  return { ok: Boolean(serverVersion), which, context, serverVersion, advice };
}
