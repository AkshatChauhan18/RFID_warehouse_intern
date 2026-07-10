import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const handler = (await import("./dist/server/server.js")).default;

const MIME = {
  ".html": "text/html;charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");

    // Serve static assets from dist/client
    let filePath = join("./dist/client", url.pathname === "/" ? "/index.html" : url.pathname);
    if (existsSync(filePath) && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/_")) {
      const ext = extname(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(readFileSync(filePath));
      return;
    }

    // Fallback to SSR
    let body = "";
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await new Promise((resolve) => {
        let data = "";
        req.on("data", (c) => (data += c));
        req.on("end", () => resolve(data));
      });
    }

    const webReq = new Request(`http://localhost${req.url}`, {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).filter(([_, v]) => v !== undefined)
      ),
      body: body || undefined,
    });

    const webRes = await handler.fetch(webReq, {}, {});
    res.writeHead(webRes.status, Object.fromEntries(webRes.headers));
    res.end(await webRes.text());
  } catch (err) {
    console.error("SSR error:", err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
}).listen(3000, () => console.log("Server running on http://localhost:3000"));
