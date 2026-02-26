import type { ConversationSummary } from "../types";

interface SidebarProps {
  conversations: ConversationSummary[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onClose: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  open,
  onClose,
}: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-14 left-0 bottom-0 z-30 w-72 bg-gray-50 dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-800
          transform transition-transform duration-200 ease-in-out
          lg:relative lg:top-0 lg:translate-x-0 lg:z-0
          flex flex-col
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-3">
          <button
            onClick={onNew}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5
              rounded-lg border border-gray-300 dark:border-gray-700
              hover:bg-gray-100 dark:hover:bg-gray-800
              transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {conversations.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">
              No conversations yet
            </p>
          )}

          {conversations.map((convo) => (
            <div
              key={convo.id}
              className={`
                group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer
                transition-colors text-sm
                ${
                  convo.id === activeId
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                }
              `}
              onClick={() => onSelect(convo.id)}
            >
              <svg
                className="w-4 h-4 shrink-0 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>

              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{convo.title}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {formatRelativeTime(convo.updated_at)}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(convo.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded
                  hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                aria-label="Delete conversation"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
