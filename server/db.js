import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
