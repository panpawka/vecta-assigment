# Maintenance AI Agent 🤖

An AI-powered maintenance support agent for property management that handles tenant maintenance requests through intelligent conversation, knowledge base retrieval (RAG), and automated contractor dispatch.

> **Note:** This is a production-grade take-home assessment implementation demonstrating real-world AI agent architecture, tool calling, and full-stack engineering.

## What's Inside?

This is a complete AI agent system built with modern tools:

### Core Stack

- ⚛️ **[React 18](https://react.dev/)** + **[TypeScript](https://www.typescriptlang.org/)** - Type-safe frontend
- ⚡ **[Vite](https://vite.dev/)** - Lightning-fast dev server and builds
- 🎨 **[Tailwind CSS](https://tailwindcss.com/)** + **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful, accessible components
- 🚀 **[Express](https://expressjs.com/)** - Lightweight Node.js backend
- 🧠 **[OpenAI GPT-4o-mini](https://platform.openai.com/docs/)** - Function calling and reasoning
- 📦 **JSON file storage** - Simple, inspectable data persistence

### Key Features

- 💬 **Real-time chat interface** with conversation history
- 🔍 **Knowledge base search (RAG)** with source citations
- 🛠️ **Automated contractor dispatch** with work order creation
- 📸 **Photo attachments** for visual issue documentation
- 🔄 **Duplicate detection** using LLM-based semantic comparison
- ✅ **Full work order lifecycle** (create, update, complete, delete)
- 🎯 **Session persistence** across page reloads
- ♿ **Accessible UI** with keyboard navigation and ARIA labels
- 🚨 **Emergency handling** with safety protocols

### What Problems Does It Solve?

**For Tenants:**

- Report issues through natural conversation
- Get instant self-help guidance for common problems
- Automatically book contractors when needed
- Track work order status in real-time
- Attach photos to show the problem

**For Property Managers:**

- Reduce support ticket volume through self-service
- Automate contractor coordination
- Prevent duplicate work orders
- Track maintenance history per tenant
- Escalate complex issues to humans

## Getting Started

### Prerequisites

- **Node.js 18+** (with npm)
- **OpenAI API Key** ([get one here](https://platform.openai.com/api-keys))

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd full-stack-assessment

# Install all dependencies (both client and server)
npm run install:all
```

### Configuration

Create a `.env` file in the **root directory**:

```bash
# Required: OpenAI API Configuration
OPENAI_API_KEY=sk-proj-...your-key-here...

# Optional: Server Configuration
PORT=3001
```

⚠️ **Important:** Never commit your `.env` file to version control!

### Running the App

**Development Mode (recommended):**

```bash
# Start both frontend and backend in one command
npm run dev
```

This will start:

- 🎨 **Frontend:** http://localhost:5173
- 🔌 **Backend:** http://localhost:3001

**Separate Terminals (alternative):**

```bash
# Terminal 1: Start backend
npm run server

# Terminal 2: Start frontend
npm run client
```

### First Steps

1. **Open the app** at http://localhost:5173
2. **Select a tenant** from the dropdown (simulates authentication)
3. **Try a sample issue** or type your own maintenance request
4. **Watch the agent** search knowledge, book contractors, and create work orders!

### Sample Issues to Try

- "My boiler isn't working and the pressure is low"
- "I've locked myself out of my flat"
- "There's a leak under my kitchen sink"
- "The smoke alarm keeps beeping"
- "I smell gas in my kitchen" (emergency handling)

## Architecture & Implementation

This project includes **detailed technical documentation** for both frontend and backend:

📘 **[CLIENT_SUMMARY.md](./CLIENT_SUMMARY.md)** - Frontend architecture, component design, UI/UX decisions, accessibility, and state management.

📗 **[SERVER_SUMMARY.md](./SERVER_SUMMARY.md)** - Backend architecture, AI agent loop, tool definitions, RAG implementation, and design decisions.

### Quick Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    React Chat Interface                      │
│  (Tenant Selection, Message History, Work Order Cards)      │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP/JSON
┌─────────────────▼───────────────────────────────────────────┐
│                    Express API Server                        │
│  (/api/chat, /api/tenants, /api/work-orders)                │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                   AI Agent (chat.js)                         │
│  • Tenant context injection                                  │
│  • Conversation history management                           │
│  • Tool calling loop (up to 5 iterations)                    │
└─────────┬───────────────────────────────────────────────────┘
          │
          ├──► OpenAI GPT-4o-mini (Function Calling)
          │
          ├──► Tools:
          │    • search_knowledge_base (RAG)
          │    • check_similar_issues (duplicate detection)
          │    • get_available_contractors
          │    • create_work_order
          │    • update_work_order
          │    • complete_work_order
          │    • delete_work_order
          │
          └──► Data Storage (db/*.json):
               • knowledge.json (guides)
               • tenants.json (tenant profiles)
               • contractors.json (available contractors)
               • work_orders.json (created work orders)
```

## Project Structure

```
full-stack-assessment/
├── client/                      # React frontend
│   ├── src/
│   │   ├── App.tsx              # Main chat interface
│   │   ├── main.tsx             # React entry point
│   │   ├── styles.css           # Global styles
│   │   └── components/
│   │       ├── WorkOrderCard.tsx    # Work order display
│   │       ├── SourcesList.tsx      # Knowledge citations
│   │       ├── AgentActions.tsx     # Debug tool
│   │       └── ui/                  # shadcn/ui components
│   ├── package.json
│   └── vite.config.ts
│
├── server/                      # Backend modules
│   ├── agent/
│   │   ├── chat.js              # Main agent loop
│   │   └── tools.js             # Tool definitions
│   └── utils/
│       └── storage.js           # JSON file operations
│
├── db/                          # Data files
│   ├── knowledge.json           # Maintenance guides (read-only)
│   ├── tenants.json             # Tenant profiles (read-only)
│   ├── contractors.json         # Available contractors (read-only)
│   ├── property_managers.json   # Property managers (read-only)
│   └── work_orders.json         # Work orders (read/write)
│
├── server.js                    # Express API entry point
├── package.json                 # Root package (shared scripts)
├── .env                         # Environment variables (not committed)
├── README.md                    # This file
├── CLIENT_SUMMARY.md            # Frontend implementation details
└── SERVER_SUMMARY.md            # Backend implementation details
```

## API Endpoints

The Express server provides these endpoints:

| Method  | Endpoint                     | Description                         |
| ------- | ---------------------------- | ----------------------------------- |
| `POST`  | `/api/chat`                  | Main agent chat (tool calling loop) |
| `GET`   | `/api/knowledge`             | Retrieve knowledge base articles    |
| `GET`   | `/api/tenants`               | List all tenants                    |
| `GET`   | `/api/tenants/:id`           | Get single tenant details           |
| `GET`   | `/api/work-orders/:tenantId` | Get tenant's work orders            |
| `PATCH` | `/api/work-orders/:id`       | Update work order status            |
| `GET`   | `/api/health`                | Health check                        |

## Building for Production

### Frontend Build

```bash
cd client
npm run build
```

Output: `client/dist/` (static files ready for deployment)

### Deployment Options

**Frontend (Static):**

- [Vercel](https://vercel.com)
- [Netlify](https://netlify.com)
- [Cloudflare Pages](https://pages.cloudflare.com)

**Backend (Node.js):**

- [Railway](https://railway.app)
- [Render](https://render.com)
- [Fly.io](https://fly.io)

**Full-Stack (Recommended):**

- Deploy backend to Railway/Render
- Deploy frontend to Vercel/Netlify
- Set `CLIENT_URL` environment variable for CORS

### Environment Variables (Production)

```bash
# Backend (.env)
OPENAI_API_KEY=sk-proj-...
PORT=3001
CLIENT_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

## Development Workflow

### Code Style

- **TypeScript** for type safety (frontend)
- **JSDoc types** for backend (JavaScript)
- **ESLint** + **Prettier** (recommended, not configured)
- **Early returns** and descriptive names

### Making Changes

**Adding a New Tool:**

1. Define tool schema in `server/agent/tools.js`
2. Implement tool function
3. Add to `tools` array in `server/agent/chat.js`
4. Update UI to handle new tool results (if needed)

**Adding a Knowledge Article:**

1. Edit `db/knowledge.json`
2. Add new article with unique `id`
3. Use consistent `category` and `tags`
4. Test retrieval with agent

**Adding a UI Component:**

1. Create component in `client/src/components/`
2. Use shadcn/ui primitives where possible
3. Add TypeScript interfaces
4. Ensure accessibility (ARIA labels, keyboard nav)

## Troubleshooting

### Common Issues

**"OpenAI API key not found"**

- Ensure `.env` file exists in root directory
- Check that `OPENAI_API_KEY` is set correctly
- Restart the server after adding `.env`

**"Cannot connect to server"**

- Verify backend is running on port 3001
- Check for port conflicts: `lsof -i :3001`
- Ensure no firewall blocking localhost

**"Work order not appearing in sidebar"**

- Check browser console for errors
- Verify work order was created: inspect `db/work_orders.json`
- Try refreshing the page

**"Agent response is slow"**

- Normal: OpenAI API can take 2-5 seconds
- Check network tab for API latency
- Consider upgrading to `gpt-4o` (faster but pricier)

**"Conversation history lost on refresh"**

- Expected behavior for backend (no persistence)
- Frontend uses session storage (survives reload, lost on browser close)

## Known Limitations

These are **intentional trade-offs** for a take-home assessment:

1. **No authentication** - Tenant ID passed in request body (simulated auth)
2. **JSON file storage** - Not suitable for concurrent users (use PostgreSQL in production)
3. **No conversation persistence** - History not saved between sessions
4. **Simple RAG** - Keyword matching, not embedding-based search
5. **No rate limiting** - Vulnerable to abuse
6. **No monitoring** - Should track resolution rates, tool usage, escalations
7. **Limited error handling** - Some edge cases not covered

See [SERVER_SUMMARY.md](./SERVER_SUMMARY.md#production-readiness-gaps) for full production readiness analysis.

## What Makes This "Production-Grade"?

While this is a take-home assessment, it includes features that demonstrate real-world thinking:

✅ **Duplicate Prevention** - LLM-based semantic comparison prevents duplicate work orders  
✅ **Photo Attachments** - Essential for maintenance issues (show, don't tell)  
✅ **Full CRUD** - Complete work order lifecycle, not just creation  
✅ **Emergency Handling** - Safety protocols for dangerous situations  
✅ **Session Persistence** - Conversation history survives page reloads  
✅ **Accessible UI** - WCAG 2.1 Level AA compliance  
✅ **Token Management** - Conversation history trimming, attachment stripping  
✅ **Error Handling** - User-friendly error messages, graceful degradation

Read more about design decisions in [CLIENT_SUMMARY.md](./CLIENT_SUMMARY.md#why-beyond-barebones) and [SERVER_SUMMARY.md](./SERVER_SUMMARY.md#beyond-the-basic-prd).

## License

MIT License - feel free to use this as a template for your own projects!
