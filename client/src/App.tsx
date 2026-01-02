import { useState, useEffect } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { WorkOrderCard } from "./components/WorkOrderCard";
import { SourcesList } from "./components/SourcesList";
import { AgentActions } from "./components/AgentActions";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";

// ==================== TYPES ====================

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  unit: string;
  moveInDate: string;
  maintenanceHistory: Array<{
    id: string;
    date: string;
    issue: string;
    status: string;
    resolution?: string;
  }>;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: Date;
  workOrder?: any;
  sources?: any[];
  toolCalls?: any[];
}

// ==================== SAMPLE MESSAGES ====================

const SAMPLE_ISSUES = [
  "My smoke alarm keeps beeping every 30 seconds",
  "The boiler pressure is showing below 1 bar and heating isn't working",
  "Half my flat has no electricity - bedroom works but kitchen doesn't",
  "There's water coming through my bathroom ceiling!",
  "I can smell gas in my kitchen",
  "I've locked myself out and my medication is inside",
  "The toilet won't stop running",
  "There's a crack appearing in my wall that's getting bigger",
];

// ==================== COMPONENT ====================

function App() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch tenants on mount
  useEffect(() => {
    fetch("/api/tenants")
      .then((res) => res.json())
      .then((data) => {
        setTenants(data);
        if (data.length > 0) {
          setSelectedTenantId(data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Add welcome message when tenant changes
  useEffect(() => {
    if (selectedTenantId) {
      const tenant = tenants.find((t) => t.id === selectedTenantId);
      if (tenant) {
        setMessages([
          {
            id: "welcome",
            role: "system",
            content: `Chat started for ${tenant.name} (${tenant.unit})`,
            timestamp: new Date(),
          },
          {
            id: "greeting",
            role: "assistant",
            content: `Hello! I'm the Maintenance Support Agent. How can I help you today?\n\nYou can describe any maintenance issue you're experiencing, and I'll try to help resolve it or arrange for a contractor if needed.`,
            timestamp: new Date(),
          },
        ]);
      }
    }
  }, [selectedTenantId, tenants]);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsProcessing(true);

    try {
      const apiMessages = messages
        .filter((m) => m.role !== "system")
        .concat(userMessage)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          tenantId: selectedTenantId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      let workOrder = undefined;
      let sources = undefined;

      if (data.toolResults) {
        for (const result of data.toolResults) {
          const content = JSON.parse(result.content);
          if (result.name === "create_work_order") {
            workOrder = content;
          } else if (result.name === "search_knowledge_base") {
            sources = content;
          }
        }
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: data.message.content || "I've processed your request.",
        timestamp: new Date(),
        workOrder,
        sources,
        toolCalls: data.toolCalls,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "system",
        content: "Error communicating with the agent. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = () => {
    handleSendMessage();
  };

  const handleSampleClick = (sample: string) => {
    setInputValue(sample);
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Maintenance AI</h1>
          <span className="badge-version">Agent v0.1</span>
        </div>

        <div className="tenant-selector">
          <label>Active Tenant</label>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}>
            {tenants.map((tenant) => (
              <option
                key={tenant.id}
                value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
          {selectedTenant && (
            <div className="tenant-info">
              <p>{selectedTenant.unit}</p>
              <p className="tenant-email">{selectedTenant.email}</p>
            </div>
          )}
        </div>

        <div className="sample-issues">
          <label>Sample Issues</label>
          <div className="sample-list">
            {SAMPLE_ISSUES.map((sample, i) => (
              <button
                key={i}
                className="sample-button"
                onClick={() => handleSampleClick(sample)}>
                {sample}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <p>
            Build your agent to handle these messages and create work orders.
          </p>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col min-w-0 bg-background">
        <Conversation className="flex-1">
          <ConversationContent className="gap-4 px-4 py-6">
            {messages.map((message) => {
              // System messages - render as centered badge
              if (message.role === "system") {
                return (
                  <div
                    key={message.id}
                    className="flex justify-center">
                    <div className="system-message">{message.content}</div>
                  </div>
                );
              }

              // User and assistant messages
              return (
                <Message
                  key={message.id}
                  from={message.role === "user" ? "user" : "assistant"}>
                  {/* Message header with sender name and time */}
                  <div
                    className={cn(
                      "flex items-center gap-2 text-xs text-muted-foreground mb-1",
                      message.role === "user" && "justify-end"
                    )}>
                    <span className="font-medium text-foreground">
                      {message.role === "user"
                        ? selectedTenant?.name || "Tenant"
                        : "Maintenance Agent"}
                    </span>
                    <span className="font-mono">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <MessageContent>
                    {/* Sources - shown before content for assistant */}
                    {message.sources && message.sources.length > 0 && (
                      <SourcesList sources={message.sources} />
                    )}

                    {/* Main message text */}
                    <MessageResponse>{message.content}</MessageResponse>

                    {/* Tool calls display */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <AgentActions toolCalls={message.toolCalls} />
                    )}

                    {/* Work order card */}
                    {message.workOrder && (
                      <WorkOrderCard workOrder={message.workOrder} />
                    )}
                  </MessageContent>
                </Message>
              );
            })}

            {/* Loading indicator */}
            {isProcessing && (
              <Message from="assistant">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-foreground">
                    Maintenance Agent
                  </span>
                </div>
                <MessageContent>
                  <Shimmer className="text-sm">Thinking...</Shimmer>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Input Area */}
        <div className="border-t bg-background p-4">
          <PromptInput
            onSubmit={handleSubmit}
            className="max-w-none">
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="Describe your maintenance issue..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isProcessing}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit
                disabled={!inputValue.trim() || isProcessing}
                status={isProcessing ? "streaming" : "ready"}
              />
            </PromptInputFooter>
          </PromptInput>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
