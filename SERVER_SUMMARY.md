# Server Implementation Summary

## Overview

This is an AI-powered maintenance support agent built for property management companies. The system enables tenants to report maintenance issues, receive self-help guidance via RAG (Retrieval-Augmented Generation), and automatically coordinate professional help when needed.

**Tech Stack:**

- **Backend:** Node.js + Express
- **AI Provider:** OpenAI (GPT-4o-mini with function calling)
- **Storage:** JSON file-based persistence
- **Key Libraries:** OpenAI SDK, Zod (validation), dotenv, cors

**Core Capabilities:**

1. **Knowledge Base Search (RAG):** Semantic retrieval from maintenance guides
2. **Contractor Dispatch:** Automated booking and work order creation
3. **Work Order Management:** Full lifecycle tracking (create, update, complete, delete)
4. **Duplicate Prevention:** LLM-based semantic comparison to avoid duplicate work orders
5. **Photo Attachments:** Base64-encoded image support for visual issue documentation

---

## Architecture

### API Structure

The server is built as a RESTful Express API with the following endpoints:

- `POST /api/chat` - Main agent chat interface (handles tool calling loop)
- `GET /api/knowledge` - Retrieve knowledge base articles
- `GET /api/tenants` - List all tenants
- `GET /api/tenants/:id` - Get single tenant details
- `GET /api/work-orders/:tenantId` - Get tenant's work orders
- `PATCH /api/work-orders/:id` - Update work order status
- `GET /api/health` - Health check endpoint

### Agent Loop Architecture

The chat handler implements an iterative agent loop:

1. **Context Injection:** Tenant information injected into system prompt
2. **History Management:** Keeps last 4 messages to prevent token overflow
3. **Tool Calling Loop:** Up to 5 iterations with OpenAI function calling
4. **Sequential Execution:** `parallel_tool_calls: false` prevents race conditions
5. **Result Accumulation:** All tool calls and results tracked for frontend display

### Data Storage

Simple JSON file-based persistence in `/db`:

- `knowledge.json` - Self-help guides (read-only)
- `tenants.json` - Tenant profiles (read-only)
- `contractors.json` - Available contractors (read-only)
- `property_managers.json` - Property managers (read-only)
- `work_orders.json` - Work orders (read/write with atomic operations)

---

## Beyond the Basic PRD

The implementation includes several production-grade features beyond the minimal requirements:

### 1. Photo Attachments

**Why:** Real-world maintenance issues often require visual documentation. A tenant describing "water damage" is ambiguous; a photo provides clarity.

**Implementation:**

- Base64 encoding with 50MB payload limit
- Photos stored with work orders in `work_orders.json`
- Attachments stripped from LLM responses to prevent token overflow
- Only attachment count returned to LLM

**Trade-offs:** Large JSON files, but no external storage service needed.

### 2. Duplicate Detection (LLM-Based Semantic Comparison)

**Why:** Tenants may report the same issue multiple times with different wording ("locked out" vs "can't access my flat"). String matching fails; LLM-based semantic comparison succeeds.

**Implementation:**

- `check_similar_issues` tool runs BEFORE every work order creation
- Uses GPT-4o-mini to compare new issue against active work orders
- Structured JSON output with reasoning
- Agent must ask tenant to confirm if issues are truly different

**Example:**

```
Existing: "Kitchen tap is dripping"
New: "Faucet in kitchen won't stop leaking"
→ Detected as similar, prevents duplicate
```

### 3. Full Work Order Lifecycle Management

**Why:** The PRD only required creation, but real-world usage demands updates, completion tracking, and error correction.

**Tools Implemented:**

- `get_work_orders` - Check status, list all orders
- `update_work_order` - Modify summary, priority, or status
- `complete_work_order` - Mark as solved with resolution notes
- `delete_work_order` - Remove duplicates/errors (used sparingly)

**Status Flow:**

```
assigned → pending → in_progress → completed/solved
```

### 4. Conversation History Management

**Why:** OpenAI has token limits and rate limits. Sending full conversation history causes failures.

**Implementation:**

- Keeps only last 4 messages (2 user-assistant exchanges)
- Logs trimming action for debugging
- Prevents context overflow while maintaining recent context

**Trade-off:** Agent loses long-term memory, but avoids rate limit errors.

### 5. Attachment Stripping in Tool Results

**Why:** Base64 images in tool results bloat LLM conversation, wasting tokens and money.

**Implementation:**

- Attachments saved to work orders
- Tool results return `attachments_count` and `has_photos` instead of full data
- LLM knows photos exist without processing the data

---

## Tool Definitions

### Knowledge & Information Retrieval

**`search_knowledge_base`**

- Searches `knowledge.json` using keyword matching
- Returns top 3 articles with relevance scores
- Title matches get bonus scoring

### Duplicate Prevention

**`check_similar_issues`**

- Compares new issue against active work orders (assigned/pending/in_progress)
- Uses GPT-4o-mini for semantic comparison
- Returns structured JSON with similarity reasoning
- Fallback: Manual review if LLM call fails

### Contractor Management

**`get_available_contractors`**

- Filters contractors by trade (plumbing, electrical, gas, general, locksmith)
- Returns contractor ID, name, contact info, rates

### Work Order Operations

**`create_work_order`**

- Creates new work order with tenant_id, contractor_id, issue_summary, priority
- Supports photo attachments
- Returns work order ID for tracking

**`get_work_orders`**

- Lists all work orders for a tenant
- Optional status filter (assigned/pending/in_progress/completed/solved)

**`update_work_order`**

- Updates issue summary, priority, or status
- Adds `updated_at` timestamp

**`complete_work_order`**

- Marks work order as "solved"
- Adds `resolved_at` timestamp
- Accepts optional resolution notes

**`delete_work_order`**

- Removes work order (use cautiously)
- Returns deleted work order details

---

## Key Design Decisions

### Why JSON Files Instead of a Database?

**Decision:** Simple JSON file storage with atomic writes.

**Reasoning:**

- No database setup required (lowers barrier to evaluation)
- Sufficient for demo/prototype scale
- Easy to inspect and debug
- Atomic writes prevent data corruption

**Production Path:** Replace with PostgreSQL or similar for concurrency and scale.

### Why GPT-4o-mini?

**Decision:** Use `gpt-4o-mini` instead of `gpt-4` or `gpt-4-turbo`.

**Reasoning:**

- Better rate limits (important for take-home assessment)
- Lower cost (~60x cheaper than GPT-4)
- Sufficient capability for tool calling and reasoning
- Faster response times

### Why `parallel_tool_calls: false`?

**Decision:** Disable parallel tool execution.

**Reasoning:**

- Prevents race conditions in work order creation
- Enforces sequential workflow (check_similar_issues → get_contractors → create_work_order)
- More predictable behavior for duplicate detection
- Easier to debug

**Trade-off:** Slightly slower, but correctness > speed for this domain.

### Why Strip Attachments from Tool Results?

**Decision:** Remove base64 image data from LLM conversation.

**Reasoning:**

- Base64 images are massive (100KB+ per image)
- LLM doesn't process images in function call results anyway
- Prevents token overflow and saves costs
- Attachments still saved and retrievable via API

---

## Production Readiness Gaps

This is a take-home assessment, not production code. Key gaps:

1. **No Authentication:** Tenant ID passed in request body (simulated auth)
2. **No Rate Limiting:** Vulnerable to abuse
3. **No Proper Error Handling:** Many edge cases not covered
4. **No Tests:** Should have unit tests for retrieval, tools, duplicate detection
5. **File-Based Storage:** Not suitable for concurrent users
6. **No Monitoring:** Should track resolution rates, tool usage, escalations
7. **No Conversation Persistence:** History not saved between sessions
8. **Limited RAG:** Simple keyword matching, not embedding-based search

---
