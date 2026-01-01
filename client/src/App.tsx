import { useState, useEffect, useRef } from 'react';

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

interface WorkOrder {
  id: string;
  tenantId: string;
  contractorId: string;
  createdAt: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  priority: string;
  issueDescription: string;
  resolutionNotes: string | null;
  estimatedCost: number;
  actualCost: number | null;
  chargedToTenant: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  workOrder?: WorkOrder;
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
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch tenants on mount
  useEffect(() => {
    fetch('/api/tenants')
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
            id: 'welcome',
            role: 'system',
            content: `Chat started for ${tenant.name} (${tenant.unit})`,
            timestamp: new Date(),
          },
          {
            id: 'greeting',
            role: 'assistant',
            content: `Hello! I'm the Maintenance Support Agent. How can I help you today?\n\nYou can describe any maintenance issue you're experiencing, and I'll try to help resolve it or arrange for a contractor if needed.`,
            timestamp: new Date(),
          },
        ]);
      }
    }
  }, [selectedTenantId, tenants]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // TODO: Implement your AI agent logic here
    // You have access to:
    // - userMessage.content (the user's message)
    // - selectedTenant (tenant details and history)
    // - Various API endpoints (explore /api/... to see what's available)

    const mockResponse: Message = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: '(Agent not implemented)\n\nImplement your AI agent logic in the handleSendMessage function.',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, mockResponse]);
    setIsProcessing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
            onChange={(e) => setSelectedTenantId(e.target.value)}
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
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
                onClick={() => handleSampleClick(sample)}
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <p>Build your agent to handle these messages and create work orders.</p>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-container">
        <div className="chat-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message message-${message.role}`}
            >
              {message.role === 'system' ? (
                <div className="system-message">{message.content}</div>
              ) : (
                <>
                  <div className="message-avatar">
                    {message.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-sender">
                        {message.role === 'user' ? selectedTenant?.name || 'Tenant' : 'Maintenance Agent'}
                      </span>
                      <span className="message-time">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="message-text">{message.content}</div>
                    
                    {/* Work Order Card */}
                    {message.workOrder && (
                      <div className="work-order-card">
                        <div className="work-order-header">
                          <span className="work-order-icon">📋</span>
                          <span>Work Order Created</span>
                          <span className={`priority-badge priority-${message.workOrder.priority}`}>
                            {message.workOrder.priority}
                          </span>
                        </div>
                        <div className="work-order-details">
                          <div className="detail-row">
                            <span className="detail-label">ID:</span>
                            <span className="detail-value">{message.workOrder.id}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Scheduled:</span>
                            <span className="detail-value">
                              {message.workOrder.scheduledDate} at {message.workOrder.scheduledTime}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Contractor:</span>
                            <span className="detail-value">{message.workOrder.contractorId}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Est. Cost:</span>
                            <span className="detail-value">£{message.workOrder.estimatedCost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </>
              )}
            </div>
          ))}
          
          {isProcessing && (
            <div className="message message-assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <textarea
              className="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Describe your maintenance issue..."
              rows={1}
              disabled={isProcessing}
            />
            <button
              className="send-button"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </button>
          </div>
          <p className="input-hint">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </main>
    </div>
  );
}

export default App;
