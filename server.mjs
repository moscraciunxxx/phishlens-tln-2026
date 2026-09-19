import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzePayload, runScenarioEvaluation } from "./src/analysis.mjs";
import { reviewWithOllama } from "./src/ai.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = resolve(root, "public");
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon"
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(JSON.stringify(payload));
}

function readBody(req, maxBytes = 50_000) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    let size = 0;
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > maxBytes) {
        reject(new Error("Request is too large."));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on("end", () => resolveBody(body));
    req.on("error", reject);
  });
}

async function parseRequest(req) {
  const raw = await readBody(req);
  return JSON.parse(raw || "{}");
}

async function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const target = resolve(publicDir, `.${normalize(requested)}`);
  if (!target.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(target);
    if (!fileStat.isFile()) throw new Error("Not a file");
    const body = await readFile(target);
    res.writeHead(200, {
      "content-type": contentTypes[extname(target)] || "application/octet-stream",
      "cache-control": "no-cache",
      "content-security-policy": "default-src 'self'; base-uri 'none'; form-action 'none'; img-src 'self' data:; script-src 'self'; style-src 'self'; connect-src 'self'",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff"
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  try {
    if (req.method === "POST" && url.pathname === "/api/analyze") {
      sendJson(res, 200, analyzePayload(await parseRequest(req)));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/ai-review") {
      const payload = await parseRequest(req);
      const result = analyzePayload(payload);
      sendJson(res, 200, await reviewWithOllama(result.input, result));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/evaluate") {
      sendJson(res, 200, runScenarioEvaluation());
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { allow: "GET, HEAD, POST" });
      res.end("Method not allowed");
      return;
    }
    await serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Unable to process this request." });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`PhishLens listening at http://127.0.0.1:${port}`);
});
