# dsh-wsl-docker

> **Install set:** part of [dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit). Prefer `KIT_SET=daily` | `llm` | `github` | `full` (see kit README). Fault tree: [TROUBLESHOOTING.md](https://github.com/173787247/dsh-wsl-kit/blob/master/docs/TROUBLESHOOTING.md).

DeepSeek Harness plugin: Docker Desktop vs WSL engine doctor, plus **vLLM / OpenAI :8000** container hints.

[中文说明 → README.zh.md](./README.zh.md)

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
