# dsh-wsl-docker

DeepSeek Harness plugin: Report whether Docker CLI points at Docker Desktop or a WSL engine.

Part of **[dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit)**.

[中文说明 → README.zh.md](./README.zh.md)

## Install

```sh
dsh plugin --profile web add github:173787247/dsh-wsl-docker
# or local:
dsh plugin --profile web add /absolute/path/to/dsh-wsl-docker
```

Restart `dsh web` and open a **new** session. Tool: `docker_doctor`.

## License

MIT
