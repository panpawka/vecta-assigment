# PRD: Maintenance AI Agent Assessment

## 1. Project Overview

**Goal:** Build an AI-powered tenant support agent that acts as a first line of defense for property management.
**Core Function:** The agent must triage maintenance requests, provide self-help guidance via RAG (Retrieval-Augmented Generation), and coordinate professional help (Contractors) via tool usage when necessary.
**Success Metric:** The agent successfully distinguishes between simple fixes (e.g., resetting a breaker) and professional repairs (e.g., pipe bursts), handling both workflows autonomously.

## 2. Tech Stack & Constraints

- **Frontend:** React (Vite), Tailwind CSS (optional but recommended).
- **Backend:** Express (Node.js).
- **Database:** Local JSON files (`/db` directory).
- **AI:** OpenAI/Anthropic (via SDK).
- **Constraint:** No real database; must read/write to the provided JSON files.

## 3. Data Dictionary & Schemas

The agent interacts with the following data sources located in `db/`:

| File               | Access         | Purpose                                            |
| :----------------- | :------------- | :------------------------------------------------- |
| `tenants.json`     | **Read**       | Context regarding who is speaking (simulate Auth). |
| `knowledge.json`   | **Read**       | Source for RAG (Self-help articles).               |
| `contractors.json` | **Read**       | Resource for finding trade professionals.          |
| `work_orders.json` | **Read/Write** | System of record for dispatched contractors.       |

## 4. Agent Capabilities & Tool Definitions

The LLM must have access to the following tools to interact with the "world":

### A. `search_knowledge_base`

- **Description:** Semantic or keyword search against `knowledge.json`.
- **Trigger:** User asks about an issue that might be solvable (e.g., "beeping", "pressure", "reset").
- **Logic:** If a relevant article is found, summarize the steps for the user. Ask if it solved the issue.

### B. `get_available_contractors`

- **Description:** Filters `contractors.json` by trade (e.g., "Plumber", "Electrician").
- **Trigger:** User issue cannot be self-resolved or is dangerous.

### C. `create_work_order`

- **Description:** Writes a new entry to `work_orders.json`.
- **Inputs:** `tenant_id`, `issue_summary`, `contractor_id`, `priority`.
- **Output:** Returns the created Work Order object to display in the UI.

## 5. User Logic Flow

1. **Identify:** Incoming message -> Retrieve Tenant Profile (Mock Context).
2. **Triage:**
   - Is it an emergency? (Fire/Flood) -> **Immediate Escalation**.
   - Is it a known simple issue? -> Call `search_knowledge_base`.
   - Is it a complex repair? -> Proceed to **Dispatch**.
3. **Dispatch (If needed):**
   - Identify Trade (e.g., Plumber).
   - Call `get_available_contractors`.
   - Confirm details with user.
   - Call `create_work_order`.
4. **Response:** Render structured UI card or text response.

## 6. Functional Requirements (Checklist)

### Phase 1: Infrastructure & Context

- [ ] **API:** Setup generic POST `/api/chat` endpoint.
- [ ] **Context:** Ensure `tenants.json` data is loaded and injected into the System Prompt (simulate logged-in user).
- [ ] **History:** Maintain a simple in-memory array of messages for the duration of the session so the AI remembers context.

### Phase 2: Knowledge Retrieval (RAG)

- [ ] **Tool:** Implement `search_knowledge()` helper function.
- [ ] **Prompting:** Instruct agent to always check knowledge base before offering a contractor.

### Phase 3: Action Taking

- [ ] **Tool:** Implement `create_work_order()` helper function (append to JSON file).
- [ ] **Logic:** Agent must select the correct contractor type based on the issue description.

### Phase 4: UI & Evaluation

- [ ] **Frontend:** Render Markdown responses from the agent.
- [ ] **Frontend:** Create a custom "Work Order Component" that renders when the API returns specific structured data.
- [ ] **Logging:** Log the agent's "Thought Process" (or tool calls) to the server console to satisfy the "Evaluation & Monitoring" requirement.

## 7. Evaluation & Monitoring Strategy

To meet the assessment criteria for "Evaluation":

1. **Server Logs:** We will log every Tool Call and the specific arguments used. This proves the agent is "reasoning" correctly.
2. **UI Feedback:** We will implement a small "Debug Panel" or expandable "Agent Thoughts" section in the UI (optional) to show what the agent decided to do.

## 8. Development Prompt for Cursor

_Copy-paste this into Chat if needed:_

> "I am working on the Maintenance AI Agent assessment. Please look at PRD.md and the file structure. Let's start by implementing the server.js chat endpoint with OpenAI integration and a helper to read the knowledge.json file."
