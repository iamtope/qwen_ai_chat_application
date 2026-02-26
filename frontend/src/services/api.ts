const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/conversations/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`);
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.model_loaded === true;
  } catch {
    return false;
  }
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onMetadata: (data: { tokens_generated: number; elapsed_s: number }) => void;
  onError: (error: string) => void;
  onDone: () => void;
}

function extractSSEValue(line: string, prefix: string): string {
  const raw = line.slice(prefix.length);
  return raw.startsWith(" ") ? raw.slice(1) : raw;
}

function parseSSE(
  chunk: string,
  callbacks: StreamCallbacks,
  state: { currentEvent: string },
): void {
  const lines = chunk.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");
    if (!line) continue;

    if (line.startsWith("event:")) {
      state.currentEvent = extractSSEValue(line, "event:").trim();
    } else if (line.startsWith("data:")) {
      const data = extractSSEValue(line, "data:");
      const eventType = state.currentEvent || "token";
      state.currentEvent = "";

      switch (eventType) {
        case "token":
          callbacks.onToken(data);
          break;
        case "metadata":
          try {
            callbacks.onMetadata(JSON.parse(data));
          } catch {
          }
          break;
        case "error":
          callbacks.onError(data);
          break;
        case "done":
          callbacks.onDone();
          break;
      }
    }
  }
}

export function streamChat(
  conversationId: string,
  message: string,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: conversationId,
      message,
    }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        callbacks.onError(`Server error: ${res.status}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        callbacks.onError("No response body");
        return;
      }

      const decoder = new TextDecoder();
      const state = { currentEvent: "" };
      let buffer = "";
      let finished = false;

      const guardedCallbacks: StreamCallbacks = {
        ...callbacks,
        onDone: () => {
          if (!finished) {
            finished = true;
            callbacks.onDone();
          }
        },
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

        const lastDoubleNewline = buffer.lastIndexOf("\n\n");
        if (lastDoubleNewline === -1) continue;

        const complete = buffer.slice(0, lastDoubleNewline + 2);
        buffer = buffer.slice(lastDoubleNewline + 2);

        parseSSE(complete, guardedCallbacks, state);
      }

      if (buffer.trim()) {
        parseSSE(buffer, guardedCallbacks, state);
      }

      guardedCallbacks.onDone();
    })
    .catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message =
        err instanceof Error ? err.message : "Connection failed";
      callbacks.onError(message);
    });

  return controller;
}
