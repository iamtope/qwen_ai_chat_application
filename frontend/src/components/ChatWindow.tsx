import { useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import type { Conversation, GenerationMetadata } from "../types";

interface ChatWindowProps {
  conversation: Conversation;
  isStreaming: boolean;
  metadata: GenerationMetadata | null;
  onSend: (message: string) => void;
  onStop: () => void;
  onRegenerate: () => void;
  modelReady: boolean;
}

export default function ChatWindow({
  conversation,
  isStreaming,
  metadata,
  onSend,
  onStop,
  onRegenerate,
  modelReady,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages, isStreaming]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {conversation.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-6">
                <svg
                  className="w-8 h-8 text-primary-600 dark:text-primary-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Start a conversation</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
                Send a message to begin chatting with the AI assistant.
                The model runs locally on your machine.
              </p>

              {!modelReady && (
                <div className="mt-6 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Model is loading...
                </div>
              )}
            </div>
          )}

          {conversation.messages.map((msg, i) => {
            const isLastAssistant =
              msg.role === "assistant" && i === conversation.messages.length - 1;
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={isStreaming && isLastAssistant}
                isLastAssistant={isLastAssistant}
                onRegenerate={isLastAssistant ? onRegenerate : undefined}
              />
            );
          })}

          {metadata && !isStreaming && (
            <div className="flex justify-center">
              <span className="text-[11px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 px-3 py-1 rounded-full">
                {metadata.tokens_generated} tokens in {metadata.elapsed_s}s
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <MessageInput
        onSend={onSend}
        onStop={onStop}
        isStreaming={isStreaming}
        disabled={!modelReady}
      />
    </div>
  );
}
