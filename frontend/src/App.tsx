import { useState, useEffect } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import { useChat } from "./hooks/useChat";
import { checkHealth } from "./services/api";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  const {
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
  } = useChat();

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      while (!cancelled) {
        const ready = await checkHealth();
        if (ready) {
          setModelReady(true);
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    };

    poll();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <Header
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        sidebarOpen={sidebarOpen}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          conversations={conversationList}
          activeId={activeConversation.id}
          onSelect={(id) => {
            switchConversation(id);
            setSidebarOpen(false);
          }}
          onNew={() => {
            createConversation();
            setSidebarOpen(false);
          }}
          onDelete={removeConversation}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <ChatWindow
          conversation={activeConversation}
          isStreaming={isStreaming}
          metadata={metadata}
          onSend={sendMessage}
          onStop={stopGeneration}
          onRegenerate={regenerateLastResponse}
          modelReady={modelReady}
        />
      </div>
    </div>
  );
}
