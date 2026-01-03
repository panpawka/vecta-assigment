import { useState, useEffect, useCallback } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAttachment,
  MessageAttachments,
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
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputProvider,
  usePromptInputController,
  PromptInputActionAddAttachmentsButton,
} from "@/components/ai-elements/prompt-input";
import { WorkOrderCard } from "./components/WorkOrderCard";
import { SourcesList } from "./components/SourcesList";
import { AgentActions } from "./components/AgentActions";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";
import { Trash2Icon, CheckCircleIcon, ClipboardListIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  attachments?: any[];
}

interface WorkOrder {
  id: string;
  tenant_id: string;
  issue_summary: string;
  contractor_id: string;
  contractor_name: string | null;
  trade: string | null;
  priority: string;
  status: string;
  created_at: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
}

// Serializable version for sessionStorage
interface SerializedChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: string;
  workOrder?: any;
  sources?: any[];
  toolCalls?: any[];
  attachments?: any[];
}

// ==================== SESSION STORAGE HELPERS ====================

const getStorageKey = (tenantId: string) => `maintenance-chat-${tenantId}`;

const saveMessagesToSession = (tenantId: string, messages: ChatMessage[]) => {
  if (!tenantId) return;
  const serialized: SerializedChatMessage[] = messages.map((m) => ({
    ...m,
    timestamp: m.timestamp.toISOString(),
  }));
  sessionStorage.setItem(getStorageKey(tenantId), JSON.stringify(serialized));
};

const loadMessagesFromSession = (tenantId: string): ChatMessage[] | null => {
  if (!tenantId) return null;
  const stored = sessionStorage.getItem(getStorageKey(tenantId));
  if (!stored) return null;
  try {
    const parsed: SerializedChatMessage[] = JSON.parse(stored);
    return parsed.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch {
    return null;
  }
};

const clearMessagesFromSession = (tenantId: string) => {
  if (!tenantId) return;
  sessionStorage.removeItem(getStorageKey(tenantId));
};

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

// ==================== ACTIVE WORK ORDERS COMPONENT ====================

interface ActiveWorkOrdersProps {
  workOrders: WorkOrder[];
  onMarkAsSolved: (orderId: string) => void;
  isLoading: boolean;
}

const ActiveWorkOrders = ({
  workOrders,
  onMarkAsSolved,
  isLoading,
}: ActiveWorkOrdersProps) => {
  // Filter to show only active orders (assigned, pending, in_progress)
  const activeOrders = workOrders.filter(
    (wo) =>
      wo.status === "assigned" ||
      wo.status === "pending" ||
      wo.status === "in_progress"
  );

  if (isLoading) {
    return (
      <div className="active-work-orders">
        <label>
          <ClipboardListIcon className="inline-block w-3 h-3 mr-1" />
          Active Work Orders
        </label>
        <div className="text-xs text-sidebar-text-muted p-2">Loading...</div>
      </div>
    );
  }

  if (activeOrders.length === 0) {
    return (
      <div className="active-work-orders">
        <label>
          <ClipboardListIcon className="inline-block w-3 h-3 mr-1" />
          Active Work Orders
        </label>
        <div className="text-xs text-sidebar-text-muted p-2">
          No active work orders
        </div>
      </div>
    );
  }

  return (
    <div className="active-work-orders">
      <label>
        <ClipboardListIcon className="inline-block w-3 h-3 mr-1" />
        Active Work Orders ({activeOrders.length})
      </label>
      <div className="work-orders-list">
        {activeOrders.map((order) => (
          <div
            key={order.id}
            className="work-order-item">
            <div className="work-order-info">
              <div className="work-order-id">{order.id}</div>
              <div className="work-order-summary">
                {order.issue_summary?.substring(0, 50)}
                {order.issue_summary && order.issue_summary.length > 50
                  ? "..."
                  : ""}
              </div>
              <div className="work-order-meta">
                <span className={`status-badge status-${order.status}`}>
                  {order.status}
                </span>
                {order.trade && (
                  <span className="trade-badge">{order.trade}</span>
                )}
              </div>
            </div>
            <button
              className="solve-button"
              onClick={() => onMarkAsSolved(order.id)}
              title="Mark as Solved">
              <CheckCircleIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== COMPONENT ====================

function AppContent() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoadingWorkOrders, setIsLoadingWorkOrders] = useState(false);
  const promptController = usePromptInputController();

  // Create welcome messages for a tenant
  const createWelcomeMessages = useCallback((tenant: Tenant): ChatMessage[] => {
    return [
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
    ];
  }, []);

  // Fetch work orders for tenant
  const fetchWorkOrders = useCallback(async (tenantId: string) => {
    if (!tenantId) return;
    setIsLoadingWorkOrders(true);
    try {
      const response = await fetch(`/api/work-orders/${tenantId}`);
      const data = await response.json();
      setWorkOrders(data);
    } catch (error) {
      console.error("Error fetching work orders:", error);
      setWorkOrders([]);
    } finally {
      setIsLoadingWorkOrders(false);
    }
  }, []);

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

  // Load messages from session or create welcome messages when tenant changes
  useEffect(() => {
    if (selectedTenantId) {
      const tenant = tenants.find((t) => t.id === selectedTenantId);
      if (tenant) {
        // Try to load from session storage first
        const storedMessages = loadMessagesFromSession(selectedTenantId);
        if (storedMessages && storedMessages.length > 0) {
          setMessages(storedMessages);
        } else {
          // Create fresh welcome messages
          setMessages(createWelcomeMessages(tenant));
        }
        // Fetch work orders for this tenant
        fetchWorkOrders(selectedTenantId);
      }
    }
  }, [selectedTenantId, tenants, createWelcomeMessages, fetchWorkOrders]);

  // Save messages to session storage whenever they change
  useEffect(() => {
    if (selectedTenantId && messages.length > 0) {
      saveMessagesToSession(selectedTenantId, messages);
    }
  }, [messages, selectedTenantId]);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  const handleClearHistory = () => {
    if (!selectedTenantId || !selectedTenant) return;
    clearMessagesFromSession(selectedTenantId);
    setMessages(createWelcomeMessages(selectedTenant));
  };

  const handleMarkAsSolved = async (orderId: string) => {
    try {
      const response = await fetch(`/api/work-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "solved" }),
      });

      if (response.ok) {
        // Refresh work orders
        fetchWorkOrders(selectedTenantId);
      } else {
        console.error("Failed to update work order");
      }
    } catch (error) {
      console.error("Error updating work order:", error);
    }
  };

  const handleSendMessage = async (text: string, attachments: any[] = []) => {
    if (!text.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
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
          attachments: attachments.map((file) => ({
            id: `att-${Date.now()}-${Math.random()}`,
            url: file.url,
            filename: file.filename,
            mediaType: file.mediaType,
          })),
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
            // Fetch the full work order from API (with attachments)
            // The tool result has attachments stripped to save LLM tokens
            try {
              const woResponse = await fetch(
                `/api/work-orders/${selectedTenantId}`
              );
              const allOrders = await woResponse.json();
              // Find the work order that was just created by ID
              workOrder =
                allOrders.find((wo: any) => wo.id === content.id) || content;
            } catch (err) {
              console.error("Failed to fetch full work order:", err);
              workOrder = content; // Fallback to stripped version
            }
            // Refresh work orders list in sidebar
            fetchWorkOrders(selectedTenantId);
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

  const handleSubmit = (message: { text: string; files: any[] }) => {
    handleSendMessage(message.text, message.files);
  };

  const handleSampleClick = (sample: string) => {
    promptController.textInput.setInput(sample);
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
          <Select
            value={selectedTenantId}
            onValueChange={setSelectedTenantId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem
                  key={tenant.id}
                  value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTenant && (
            <div className="tenant-info">
              <p>{selectedTenant.unit}</p>
              <p className="tenant-email">{selectedTenant.email}</p>
            </div>
          )}
          <button
            className="clear-chat-button"
            onClick={handleClearHistory}>
            <Trash2Icon className="w-3 h-3" />
            Clear Chat History
          </button>
        </div>

        {/* Active Work Orders */}
        <ActiveWorkOrders
          workOrders={workOrders}
          onMarkAsSolved={handleMarkAsSolved}
          isLoading={isLoadingWorkOrders}
        />

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

              const isUser = message.role === "user";

              // User and assistant messages
              return (
                <Message
                  key={message.id}
                  from={isUser ? "user" : "assistant"}>
                  {/* Message header with sender name and time */}
                  <div
                    className={cn(
                      "flex items-center gap-2 text-xs text-muted-foreground mb-1",
                      isUser && "justify-end"
                    )}>
                    <span className="font-medium text-foreground">
                      {isUser
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

                  <MessageContent
                    className={cn(
                      !isUser &&
                        "bg-muted/50 rounded-lg px-4 py-3 group-[.is-assistant]:text-foreground"
                    )}>
                    {/* Sources - shown before content for assistant */}
                    {message.sources && message.sources.length > 0 && (
                      <SourcesList sources={message.sources} />
                    )}

                    {/* Message attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <MessageAttachments>
                        {message.attachments.map((attachment, index) => (
                          <MessageAttachment
                            key={`${attachment.id}-${index}`}
                            data={attachment}
                          />
                        ))}
                      </MessageAttachments>
                    )}

                    {/* Main message text */}
                    <MessageResponse>{message.content}</MessageResponse>

                    {/* Tool calls display - DEV ONLY */}
                    {import.meta.env.DEV &&
                      message.toolCalls &&
                      message.toolCalls.length > 0 && (
                        <AgentActions toolCalls={message.toolCalls} />
                      )}

                    {/* Work order card */}
                    {message.workOrder && !message.workOrder.duplicate && (
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
                <MessageContent className="bg-muted/50 rounded-lg px-4 py-3">
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
            accept="image/*"
            multiple={true}
            className="max-w-none">
            <PromptInputBody>
              <PromptInputAttachments>
                {(attachment) => (
                  <PromptInputAttachment
                    key={attachment.id}
                    data={attachment}
                  />
                )}
              </PromptInputAttachments>
              <PromptInputTextarea
                placeholder="Describe your maintenance issue (you can attach photos)..."
                disabled={isProcessing}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionAddAttachmentsButton variant="ghost" />
              </PromptInputTools>
              <PromptInputSubmit
                disabled={isProcessing}
                status={isProcessing ? "streaming" : "ready"}
              />
            </PromptInputFooter>
          </PromptInput>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line • Drag & drop or paste
            images
          </p>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <PromptInputProvider>
      <AppContent />
    </PromptInputProvider>
  );
}

export default App;
