# dsh-wsl-docker

> **套件安装：** 见 [dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit)。推荐 `KIT_SET=daily` | `llm` | `github` | `full`。故障树：[TROUBLESHOOTING.zh.md](https://github.com/173787247/dsh-wsl-kit/blob/master/docs/TROUBLESHOOTING.zh.md)。

DeepSeek Harness 插件：Docker Desktop vs WSL 引擎诊断，并提示 **vLLM / OpenAI :8000** 容器。

[English → README.md](./README.md)

## 做什么

工具 **`docker_doctor`**：

| focus | 作用 |
|-------|------|
| `all`（默认） | daemon/context + 列出容器 + vLLM 提示 |
| `daemon` | 只看 CLI / context / server |
| `vllm` | 筛疑似 vLLM/OpenAI/:8000 的容器 |

有 daemon 时还会看 nvidia runtime 是否明显。`baseURL` 仍用 [`host_reach`](https://github.com/173787247/dsh-wsl-hostsvc)（`profile=vllm`）。

示例（需 GPU 与镜像权限）：

```sh
docker run --gpus all -p 8000:8000 vllm/vllm-openai:latest --model <HF_ID>
```

然后在 dsh 会话里：`host_reach` → 粘贴 `providerSnippets`；`export VLLM_API_KEY=vllm`。

## 安装

```sh
# 已含在 KIT_SET=llm / full
dsh plugin --profile web add github:173787247/dsh-wsl-docker
```

重启 `dsh web`，开新会话。

## 许可

MIT
