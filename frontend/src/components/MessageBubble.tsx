import { useState, useCallback, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Message } from "../types";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
}

function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);

  const code = String(children).replace(/\n$/, "");

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="relative group/code">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md
          bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white
          opacity-0 group-hover/code:opacity-100 transition-all text-xs"
        aria-label="Copy code"
      >
        {copied ? (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </span>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
      <pre className={className}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default function MessageBubble({ message, isStreaming, isLastAssistant, onRegenerate }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-medium
          ${
            isUser
              ? "bg-primary-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
          }
        `}
      >
        {isUser ? "U" : "AI"}
      </div>

      <div className="flex flex-col max-w-[80%]">
        <div
          className={`
            rounded-2xl px-4 py-3 text-sm leading-relaxed
            ${
              isUser
                ? "bg-primary-600 text-white rounded-br-md"
                : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md"
            }
          `}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2 prose-ul:my-1 prose-ol:my-1">
              {message.content ? (
                <ReactMarkdown
                  components={{
                    pre({ children }) {
                      return <>{children}</>;
                    },
                    code({ className, children }) {
                      const isBlock = className || String(children).includes("\n");
                      if (isBlock) {
                        return <CodeBlock className={className}>{children}</CodeBlock>;
                      }
                      return <code className={className}>{children}</code>;
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : isStreaming ? (
                <div className="flex items-center gap-1.5 py-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                </div>
              ) : (
                <p className="text-gray-400 italic">Empty response</p>
              )}
            </div>
          )}

          {isStreaming && message.content && !isUser && (
            <span className="inline-block w-1.5 h-4 bg-gray-400 dark:bg-gray-500 ml-0.5 animate-pulse" />
          )}

          <p
            className={`text-[10px] mt-1.5 ${
              isUser ? "text-primary-200" : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {isLastAssistant && !isStreaming && onRegenerate && message.content && (
          <button
            onClick={onRegenerate}
            className="self-start mt-1 ml-1 flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500
              hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Regenerate response"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Regenerate
          </button>
        )}
      </div>
    </div>
  );
}
