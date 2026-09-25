# dsh-wsl-docker

> **Install set:** part of [dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit). Prefer `KIT_SET=daily` | `llm` | `github` | `full` (see kit README). Fault tree: [TROUBLESHOOTING.md](https://github.com/173787247/dsh-wsl-kit/blob/master/docs/TROUBLESHOOTING.md).

DeepSeek Harness plugin: Docker Desktop vs WSL engine doctor, plus **vLLM / OpenAI :8000** container hints.

[中文说明 → README.zh.md](./README.zh.md)

## Where it sits

Checks Docker Desktop versus the WSL context, and whether a local inference port is actually an API.

```mermaid
flowchart LR
  agent["dsh agent"] --> tool["docker_doctor"] --> docker["Docker context and local API"]
```

Suite diagram and version snapshot: [dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit#how-the-pieces-fit). This plugin is **0.2.2** (full; also in llm). Do not copy that matrix into this README.


## Compatibility

| Field | Value |
|-------|-------|
| **Plugin** | `dsh-wsl-docker` **0.2.2** |
| **Minimum dsh** | ≥ **0.1.2** (web UI one-shot `?token=` on Windows relay `:3081`) |
| **Latest verified** | See [dsh-wsl-kit Compatibility](https://github.com/173787247/dsh-wsl-kit#compatibility-2026-09) (currently **`0.1.7-alpha.2`**) — single source of truth for the suite |
| **Kit set** | `llm` / `full` (some also useful alone) |
| **Cloud Flash** | Use model id **`deepseek-flash`** (V4.1 Flash) in `~/.dsh/settings.yaml` / `llm-deepseek` — not configured by this plugin |
| **Agent Teams** | Upstream experimental; not required here |

Suite floor versions: kit [`check-plugin-versions.sh`](https://github.com/173787247/dsh-wsl-kit/blob/master/scripts/check-plugin-versions.sh). Fault tree: [TROUBLESHOOTING.md](https://github.com/173787247/dsh-wsl-kit/blob/master/docs/TROUBLESHOOTING.md).

## What it does

Tool **`docker_doctor`** (`focus`: `all` | `daemon` | `vllm`):

- Reports CLI path, context, server version, nvidia runtime hint
- Lists running containers; `focus=vllm` filters OpenAI/:8000-ish names
- Advises pairing with [`host_reach`](https://github.com/173787247/dsh-wsl-hostsvc) for `baseURL`

## Install

Included in `KIT_SET=llm` and `full`:

```sh
dsh plugin --profile web add github:173787247/dsh-wsl-docker
```

Restart `dsh web`; open a **new** session.

## License

MIT
