import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("__dirname:", __dirname);
console.log("resolve(..):", resolve(__dirname, ".."));
console.log("resolve(.., ..):", resolve(__dirname, "..", ".."));
console.log(
  "Expected db path:",
  join(resolve(__dirname, ".."), "db", "tenants.json")
);
