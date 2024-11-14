import { createRequestHandler } from "@remix-run/express";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import chalk from "chalk";
import dotenv from "dotenv";

dotenv.config();

const logger = {
  info: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.log(
      chalk.blue(`[${timestamp}] INFO: ${message}`),
      Object.keys(meta).length ? chalk.gray(JSON.stringify(meta)) : ""
    );
  },
  warn: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.log(
      chalk.yellow(`[${timestamp}] WARN: ${message}`),
      Object.keys(meta).length ? chalk.gray(JSON.stringify(meta)) : ""
    );
  },
  error: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.error(
      chalk.red(`[${timestamp}] ERROR: ${message}`),
      Object.keys(meta).length ? chalk.gray(JSON.stringify(meta)) : ""
    );
  },
  success: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.log(
      chalk.green(`[${timestamp}] SUCCESS: ${message}`),
      Object.keys(meta).length ? chalk.gray(JSON.stringify(meta)) : ""
    );
  },
};

const AUTHORIZATION_KEY = process.env.AUTHORIZATION_KEY;
if (!AUTHORIZATION_KEY) {
  logger.error("AUTHORIZATION_KEY is required");
  process.exit(1);
}

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) => {
        logger.info("Starting Vite dev server...");
        return vite.createServer({
          server: { middlewareMode: true },
        });
      });

if (viteDevServer) {
  logger.success("Vite dev server started");
}

const remixHandler = createRequestHandler({
  build: viteDevServer
    ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
    : await import("./build/server/index.js"),
});

const app = express();

morgan.token("colored-status", (req, res) => {
  const status = res.statusCode;
  const color =
    status >= 500
      ? chalk.red
      : status >= 400
      ? chalk.yellow
      : status >= 300
      ? chalk.cyan
      : chalk.green;
  return color(status);
});

morgan.token("colored-method", (req) => {
  const method = req.method;
  const color =
    method === "GET"
      ? chalk.green
      : method === "POST"
      ? chalk.yellow
      : method === "DELETE"
      ? chalk.red
      : method === "PUT"
      ? chalk.blue
      : chalk.white;
  return color(method);
});

app.use(
  morgan((tokens, req, res) => {
    return [
      chalk.gray(`[${new Date().toISOString()}]`),
      tokens["colored-method"](req, res),
      tokens.url(req, res),
      tokens["colored-status"](req, res),
      chalk.gray(tokens["response-time"](req, res), "ms"),
      chalk.gray(tokens["remote-addr"](req, res)),
    ].join(" ");
  })
);

app.use(compression());
app.disable("x-powered-by");

if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  logger.info("Setting up static assets handling for production");
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" })
  );
}

app.use(express.static("build/client", { maxAge: "1h" }));

app.all("*", remixHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.success(`Server started successfully`, {
    port,
    env: process.env.NODE_ENV || "development",
    url: `http://localhost:${port}`,
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  });
  setTimeout(() => process.exit(1), 1000);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Promise Rejection", {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});
