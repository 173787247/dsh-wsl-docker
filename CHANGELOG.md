# Changelog

## 0.2.2

- `portHealth` HTTP 404: dedicated hint — publish open ≠ OpenAI `/v1/models` ready; align with `host_reach` `apiReady`.

## 0.2.1

- Mark containers publishing `:8000`; optional HTTP health on `/v1/models`.
- Inspect vLLM-ish containers for nvidia/GPU runtime; advice links `host_reach` / `gpu_doctor`.

## 0.2.0

- Daemon/context doctor plus vLLM container heuristics.
