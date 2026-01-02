import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Assuming the db folder is at the root of the project, which is one level up from 'server'
// Update: server.js is at root, so db is at root.
// This file is in server/db.js, so we need to go up two levels?
// Wait, the project structure is:
// root/
//   server.js
//   db/
//   server/
//     db.js
// So from server/db.js, we go up one level to 'server', then up one level to 'root', then into 'db'.
// Actually simpler: process.cwd() is usually the project root when running npm run dev.
// Let's use process.cwd() or robust relative paths.

const projectRoot = resolve(__dirname, "..");
const dbDir = join(projectRoot, "db");

export const dbPath = (file) => join(dbDir, file);

export const readJSON = (file) => {
  try {
    return JSON.parse(readFileSync(dbPath(file), "utf-8"));
  } catch (error) {
    console.error(`Error reading ${file}:`, error);
    return null;
  }
};

export const writeJSON = (file, data) => {
  try {
    writeFileSync(dbPath(file), JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing to ${file}:`, error);
    return false;
  }
};
