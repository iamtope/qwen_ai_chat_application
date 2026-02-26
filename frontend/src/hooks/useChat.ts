import { useState, useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Message, Conversation, ConversationSummary, GenerationMetadata } from "../types";
import {
  streamChat,
  deleteConversation as apiDeleteConversation,
} from "../services/api";

const STORAGE_KEY = "chat_conversations";

function loadFromStorage(): Record<string, Conversation> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveToStorage(conversations: Record<string, Conversation>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    /* storage full — non-critical */
  }
}

export function useChat() {
  const [conversations, setConversations] = useState<Record<string, Conversation>>(loadFromStorage);
  const [activeId, setActiveId] = useState<string>(() => {
    const saved = loadFromStorage();
    const ids = Object.keys(saved);
    return ids.length > 0 ? ids[0]! : uuidv4();
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [metadata, setMetadata] = useState<GenerationMetadata | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    saveToStorage(conversations);
  }, [conversations]);

  const activeConversation = conversations[activeId] ?? {
    id: activeId,
    title: "New conversation",
    messages: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || isStreaming) return;

      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      const assistantMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };

      setConversations((prev) => {
        const convo = prev[activeId] ?? {
          id: activeId,
          title: content.trim().slice(0, 50) + (content.trim().length > 50 ? "..." : ""),
          messages: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const title =
          convo.messages.length === 0
            ? content.trim().slice(0, 50) + (content.trim().length > 50 ? "..." : "")
            : convo.title;

        return {
          ...prev,
          [activeId]: {
            ...convo,
            title,
            messages: [...convo.messages, userMessage, assistantMessage],
            updated_at: new Date().toISOString(),
          },
        };
      });

      setIsStreaming(true);
      setMetadata(null);

      const controller = streamChat(activeId, content.trim(), {
        onToken: (token) => {
          setConversations((prev) => {
            const convo = prev[activeId];
            if (!convo) return prev;

            const messages = [...convo.messages];
            const last = messages[messages.length - 1];
            if (last?.role === "assistant") {
              messages[messages.length - 1] = {
                ...last,
                content: last.content + token,
              };
            }

            return {
              ...prev,
              [activeId]: { ...convo, messages, updated_at: new Date().toISOString() },
            };
          });
        },
        onMetadata: (data) => {
          setMetadata({
            tokens_generated: data.tokens_generated,
            elapsed_s: data.elapsed_s,
          });
        },
        onError: (error) => {
          setConversations((prev) => {
            const convo = prev[activeId];
            if (!convo) return prev;

            const messages = [...convo.messages];
            const last = messages[messages.length - 1];
            if (last?.role === "assistant") {
              messages[messages.length - 1] = {
                ...last,
                content: last.content || `Error: ${error}`,
              };
            }

            return {
              ...prev,
              [activeId]: { ...convo, messages },
            };
          });
          setIsStreaming(false);
        },
        onDone: () => {
          setIsStreaming(false);
        },
      });

      abortRef.current = controller;
    },
    [activeId, isStreaming],
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const regenerateLastResponse = useCallback(() => {
    if (isStreaming) return;

    const convo = conversations[activeId];
    if (!convo || convo.messages.length < 2) return;

    const lastUserMsg = [...convo.messages]
      .reverse()
      .find((m) => m.role === "user");
    if (!lastUserMsg) return;

    const newAssistant: Message = {
      id: uuidv4(),
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };

    setConversations((prev) => {
      const c = prev[activeId];
      if (!c) return prev;
      const trimmed = c.messages.slice(0, -1);
      return {
        ...prev,
        [activeId]: {
          ...c,
          messages: [...trimmed, newAssistant],
          updated_at: new Date().toISOString(),
        },
      };
    });

    setIsStreaming(true);
    setMetadata(null);

    const controller = streamChat(activeId, lastUserMsg.content, {
      onToken: (token) => {
        setConversations((prev) => {
          const c = prev[activeId];
          if (!c) return prev;
          const messages = [...c.messages];
          const last = messages[messages.length - 1];
          if (last?.role === "assistant") {
            messages[messages.length - 1] = { ...last, content: last.content + token };
          }
          return { ...prev, [activeId]: { ...c, messages, updated_at: new Date().toISOString() } };
        });
      },
      onMetadata: (data) => {
        setMetadata({ tokens_generated: data.tokens_generated, elapsed_s: data.elapsed_s });
      },
      onError: (error) => {
        setConversations((prev) => {
          const c = prev[activeId];
          if (!c) return prev;
          const messages = [...c.messages];
          const last = messages[messages.length - 1];
          if (last?.role === "assistant") {
            messages[messages.length - 1] = { ...last, content: last.content || `Error: ${error}` };
          }
          return { ...prev, [activeId]: { ...c, messages } };
        });
        setIsStreaming(false);
      },
      onDone: () => {
        setIsStreaming(false);
      },
    });

    abortRef.current = controller;
  }, [activeId, isStreaming, conversations]);

  const createConversation = useCallback(() => {
    const id = uuidv4();
    setActiveId(id);
    setMetadata(null);
  }, []);

  const switchConversation = useCallback((id: string) => {
    setActiveId(id);
    setMetadata(null);
  }, []);

  const removeConversation = useCallback(
    (id: string) => {
      apiDeleteConversation(id).catch(() => {});

      setConversations((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      if (id === activeId) {
        const remaining = Object.keys(conversations).filter((k) => k !== id);
        setActiveId(remaining[0] ?? uuidv4());
      }
    },
    [activeId, conversations],
  );

  const conversationList: ConversationSummary[] = Object.values(conversations)
    .map((c) => ({
      id: c.id,
      title: c.title,
      created_at: c.created_at,
      updated_at: c.updated_at,
      message_count: c.messages.length,
    }))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return {
    activeConversation,
    conversationList,
    isStreaming,
    metadata,
    sendMessage,
    stopGeneration,
    createConversation,
    switchConversation,
    removeConversation,
    regenerateLastResponse,
  };
}
