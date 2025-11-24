// src/tools/dev-server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// __dirname per ESM/TypeScript
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve TUTTO quello che esce da tsc-dev
app.use("/out", express.static(path.resolve(__dirname, "../../out")));

// Serve il playground
app.use("/", express.static(path.resolve(__dirname, "../../playground")));

app.listen(3000, () => {
    console.log("Dev server running at http://localhost:3000");
});
