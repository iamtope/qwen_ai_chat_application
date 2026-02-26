# Chat Model Integration

A full-stack chat application powered by a locally-running HuggingFace language model. Users interact with the AI through a custom-built React frontend, with responses streamed in real-time via Server-Sent Events.

## Quick Start

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **First run:** The backend downloads the GGUF model (~400 MB) on first startup. This takes 1–3 minutes depending on your connection. The frontend will show "Model is loading..." until it's ready. Subsequent starts use the cached model volume.

## Technology Stack

### Backend

- **Python 3.11** + **FastAPI** — REST API framework
- **Qwen/Qwen2.5-0.5B-Instruct** — 0.5B-parameter chat model (GGUF Q5_K_M quantized)
- **llama-cpp-python** — high-performance CPU inference engine via llama.cpp
- **huggingface-hub** — automated model download and caching
- **SSE (Server-Sent Events)** — real-time token streaming
- **Pydantic Settings** — type-safe, environment-driven configuration
- **pytest** — unit and integration test suite

### Frontend

- **React 18** + **TypeScript** — UI framework
- **Vite** — build tooling
- **TailwindCSS** — utility-first styling
- **react-markdown** — markdown rendering in model responses

### Infrastructure

- **Docker Compose** — single-command orchestration
- **nginx** — static file serving + API reverse proxy
- **Named volume** — persistent model cache across container restarts

## Architecture

```
┌─────────────────────────────────────────────────┐
│               Docker Compose                    │
│                                                 │
│  ┌──────────────┐    ┌────────────────────────┐ │
│  │  Frontend     │    │  Backend               │ │
│  │  nginx :3000  │───▶│  FastAPI :8000         │ │
│  │  React SPA    │    │  Qwen 0.5B (GGUF)     │ │
│  └──────────────┘    │  llama.cpp inference   │ │
│                      └────────────────────────┘ │
│                             │                   │
│                      ┌──────┴──────┐            │
│                      │ model-cache │            │
│                      │  (volume)   │            │
│                      └─────────────┘            │
└─────────────────────────────────────────────────┘
```

## API Endpoints

| Method   | Path                      | Description                                 |
| -------- | ------------------------- | ------------------------------------------- |
| `POST`   | `/api/chat`               | Send message, receive SSE-streamed response |
| `GET`    | `/api/conversations`      | List all conversations                      |
| `DELETE` | `/api/conversations/{id}` | Delete a conversation                       |
| `GET`    | `/api/health`             | Health check (model load status)            |

## Creative Choices

1. **Real-time token streaming (SSE):** Tokens stream to the frontend as they're generated, giving immediate feedback. A blinking cursor animation shows the model is actively generating.

2. **Multi-conversation support:** A sidebar lets users manage multiple conversation threads. Conversations persist in the browser's localStorage and synchronize with the backend for contextual continuity.

3. **Dark/light mode:** Theme toggle with system preference detection and localStorage persistence.

4. **Generation metadata:** After each response, the UI displays token count and generation time, giving users visibility into model performance.

5. **Responsive design:** The sidebar collapses into a mobile-friendly overlay on small screens.

6. **Performance budgets:** The backend logs warnings when generation exceeds the configured timeout, including token counts for debugging.

7. **Non-blocking startup:** The model loads in a background thread so the health endpoint is reachable immediately. The frontend polls health until the model is ready.

8. **GGUF quantization:** Using Q5_K_M quantization via llama.cpp for 3–5x faster CPU inference compared to full-precision PyTorch, with negligible quality loss at this model size.

## Environment Variables

All configuration is centralized via environment variables. See `backend/.env.example` 

| Variable               | Default                             | Description                                |
| ---------------------- | ----------------------------------- | ------------------------------------------ |
| `MODEL_REPO`           | `Qwen/Qwen2.5-0.5B-Instruct-GGUF`   | HuggingFace repo containing the GGUF model |
| `MODEL_FILENAME`       | `qwen2.5-0.5b-instruct-q5_k_m.gguf` | GGUF file to download                      |
| `N_CTX`                | `8192`                              | Context window size (tokens)               |
| `MAX_NEW_TOKENS`       | `200`                               | Maximum tokens per response                |
| `GENERATION_TIMEOUT_S` | `30.0`                              | Performance budget (seconds)               |
| `NUM_THREADS`          | `0`                                 | CPU threads (0 = auto-detect)              |
| `API_PORT`             | `8000`                              | Backend port                               |
| `FRONTEND_PORT`        | `3000`                              | Frontend port                              |
| `CORS_ORIGINS`         | `["http://localhost:3000"]`         | Allowed CORS origins                       |
| `LOG_LEVEL`            | `INFO`                              | Logging verbosity                          |
| `TEMPERATURE`          | `0.7`                               | Sampling temperature                       |
| `TOP_P`                | `0.9`                               | Nucleus sampling threshold                 |
| `REPETITION_PENALTY`   | `1.1`                               | Repetition penalty factor                  |
| `MAX_HISTORY_MESSAGES` | `10`                                | Conversation messages kept in context      |

## Running Tests

```bash
cd backend
pip install -r requirements.txt -r requirements-test.txt
pytest -v
```

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to the backend at `localhost:8000`.
