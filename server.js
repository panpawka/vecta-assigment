import "dotenv/config"; // Load .env file
import express from "express";
import cors from "cors";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { readJSON } from "./server/db.js";
import { chatHandler } from "./server/agent/chat.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// GET /api/knowledge - Knowledge base articles
app.get("/api/knowledge", (req, res) => {
  res.json(readJSON("knowledge.json"));
});

// POST /api/chat - Chat endpoint
app.post("/api/chat", chatHandler);

// GET /api/tenants - All tenants
app.get("/api/tenants", (req, res) => {
  res.json(readJSON("tenants.json"));
});

// GET /api/tenants/:id - Single tenant
app.get("/api/tenants/:id", (req, res) => {
  const tenants = readJSON("tenants.json");
  const tenant = tenants.find((t) => t.id === req.params.id);
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }
  res.json(tenant);
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
