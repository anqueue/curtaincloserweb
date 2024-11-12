import { createRequestHandler } from "@remix-run/express";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import { JSONFilePreset } from "lowdb/node";
import crypto from "crypto";

import dotenv from "dotenv";
dotenv.config();

const AUTHORIZATION_KEY = process.env.AUTHORIZATION_KEY;
if (!AUTHORIZATION_KEY) {
  console.error("AUTHORIZATION_KEY is required");
  process.exit(1);
}

const DB = await JSONFilePreset("db.json", { state: "closed", authTokens: [] });

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        })
      );

const remixHandler = createRequestHandler({
  build: viteDevServer
    ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
    : await import("./build/server/index.js"),
});

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// handle asset requests
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  // Vite fingerprints its assets so we can cache forever.
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" })
  );
}

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("build/client", { maxAge: "1h" }));

app.use(morgan("tiny"));

let clients = [];
app.get("/api/events", (req, res) => {
  const headers = {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  };
  res.writeHead(200, headers);

  const data = `${Math.random()}\n\n`;

  res.write(data);

  const clientId = Date.now();

  const newClient = {
    id: clientId,
    res,
  };

  clients.push(newClient);

  req.on("close", () => {
    console.log(`${clientId} Connection closed`);
    clients = clients.filter((client) => client.id !== clientId);
  });
});

function broadcast(data) {
  clients.forEach((client) => client.res.write(data));
}

app.post("/api/send", express.json(), (req, res) => {
  const { authorization } = req.headers;
  const { message } = req.body;
  if (authorization.startsWith("temp_")) {
    const authToken = DB.data.authTokens.find(
      (token) => token.token === authorization
    );

    if (!authToken || authToken.expiresAt < Date.now()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  } else if (authorization !== AUTHORIZATION_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (clients.length === 0) {
    return res.status(503).json({ error: "No clients connected" });
  }

  broadcast(`${message}\n\n`);

  res.json({ success: true });
});

app.get("/api/status", (req, res) => {
  res.json({ clients: clients.length });
});

app.post("/api/token", express.json(), async (req, res) => {
  const { authorization } = req.headers;
  if (authorization !== AUTHORIZATION_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const newToken = {
    token: `temp_${crypto.randomBytes(16).toString("hex")}`,
    expiresAt: Date.now() + 1000 * 60,
  };

  await DB.data.authTokens.push(newToken);

  res.json(newToken);
});

function cleanupTokens() {
  DB.data.authTokens = DB.data.authTokens.filter(
    (token) => token.expiresAt > Date.now()
  );
}

function isTempAuthorized(req) {
  const { authorization } = req.headers;
  if (authorization.startsWith("temp_")) {
    return DB.data.authTokens.some((token) => token.token === authorization);
  }
}

function isMasterAuthorized(req) {
  return req.headers.authorization === AUTHORIZATION_KEY;
}

function isAuthorized(req) {
  return isMasterAuthorized(req) || isTempAuthorized(req);
}

// handle other SSR requests
app.all("*", remixHandler);

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`Express server listening at http://localhost:${port}`)
);
