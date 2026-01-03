import "dotenv/config";
import express from "express";
import cors from "cors";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { readJSON, writeJSON } from "./server/db.js";
import { chatHandler } from "./server/agent/chat.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/api/knowledge", (req, res) => {
  res.json(readJSON("knowledge.json"));
});

app.post("/api/chat", chatHandler);

app.get("/api/tenants", (req, res) => {
  res.json(readJSON("tenants.json"));
});

app.get("/api/tenants/:id", (req, res) => {
  const tenants = readJSON("tenants.json");
  const tenant = tenants.find((t) => t.id === req.params.id);
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }
  res.json(tenant);
});

app.get("/api/work-orders/:tenantId", (req, res) => {
  const workOrders = readJSON("work_orders.json") || [];
  const tenantId = req.params.tenantId;

  const tenantOrders = workOrders.filter(
    (wo) => wo.tenant_id === tenantId || wo.tenantId === tenantId
  );

  const normalizedOrders = tenantOrders.map((wo) => ({
    id: wo.id,
    tenant_id: wo.tenant_id || wo.tenantId,
    issue_summary: wo.issue_summary || wo.issueDescription,
    contractor_id: wo.contractor_id || wo.contractorId,
    contractor_name: wo.contractor_name || null,
    trade: wo.trade || null,
    priority: wo.priority,
    status: wo.status,
    created_at: wo.created_at || wo.createdAt,
    scheduled_date: wo.scheduledDate || null,
    scheduled_time: wo.scheduledTime || null,
    attachments: wo.attachments || [],
  }));

  res.json(normalizedOrders);
});

app.patch("/api/work-orders/:id", (req, res) => {
  const workOrders = readJSON("work_orders.json") || [];
  const workOrderId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  const validStatuses = [
    "assigned",
    "pending",
    "in_progress",
    "completed",
    "solved",
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    });
  }

  const orderIndex = workOrders.findIndex((wo) => wo.id === workOrderId);
  if (orderIndex === -1) {
    return res.status(404).json({ error: "Work order not found" });
  }

  workOrders[orderIndex].status = status;
  workOrders[orderIndex].updated_at = new Date().toISOString();

  if (status === "solved" || status === "completed") {
    workOrders[orderIndex].resolved_at = new Date().toISOString();
  }

  const success = writeJSON("work_orders.json", workOrders);
  if (!success) {
    return res.status(500).json({ error: "Failed to update work order" });
  }

  res.json(workOrders[orderIndex]);
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
