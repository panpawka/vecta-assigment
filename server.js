import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Helper to read/write JSON files
const dbPath = (file) => join(__dirname, 'db', file);

const readJSON = (file) => {
  return JSON.parse(readFileSync(dbPath(file), 'utf-8'));
};

const writeJSON = (file, data) => {
  writeFileSync(dbPath(file), JSON.stringify(data, null, 2));
};

// GET /api/knowledge - Knowledge base articles
app.get('/api/knowledge', (req, res) => {
  res.json(readJSON('knowledge.json'));
});

// GET /api/tenants - All tenants
app.get('/api/tenants', (req, res) => {
  res.json(readJSON('tenants.json'));
});

// GET /api/tenants/:id - Single tenant
app.get('/api/tenants/:id', (req, res) => {
  const tenants = readJSON('tenants.json');
  const tenant = tenants.find((t) => t.id === req.params.id);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }
  res.json(tenant);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
