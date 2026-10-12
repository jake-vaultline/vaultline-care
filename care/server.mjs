// Vaultline Care addition. Local demo gateway; no general OpenIT PTY/FS authority is exposed.
import { createServer as createHttpServer } from "node:http";
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { Store, CareError, fail } from "./store.mjs";
import { CareService } from "./service.mjs";
import { identities } from "./fixtures.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const token = () => randomBytes(32).toString("hex");
export async function createCareServer({
  directory = process.env.CARE_DATA_DIR ||
    join(homedir(), ".vaultline-care-demo"),
  port = Number(process.env.CARE_PORT || 4317),
  frontend = true,
  service,
} = {}) {
  if ((process.env.CARE_MODE || "demo") !== "demo")
    throw new Error(
      "Production mode is unavailable. This demo cannot accept real clients.",
    );
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const lock = join(directory, ".server.lock");
  try {
    writeFileSync(lock, String(process.pid), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error(
        `Care vault is already locked. Use another CARE_DATA_DIR. After confirming the prior process stopped, remove only ${lock}.`,
      );
    throw error;
  }
  const releaseLock = () => {
    if (existsSync(lock) && readFileSync(lock, "utf8") === String(process.pid))
      unlinkSync(lock);
  };
  let app;
  try {
    app = service || new CareService(new Store(directory));
  } catch (error) {
    releaseLock();
    throw error;
  }
  const sessions = new Map();
  let queue = Promise.resolve();
  let vite;
  if (frontend && !process.argv.includes("--production")) {
    const { createServer } = await import("vite");
    try {
      vite = await createServer({
        root,
        configFile: join(root, "vite.care.config.ts"),
        server: { middlewareMode: true },
      });
    } catch (error) {
      releaseLock();
      throw error;
    }
  }
  const server = createHttpServer((request, response) => {
    // Serialize requests: prevents double dispatch / stale approval races within this single process.
    queue = queue
      .then(() => handle(request, response))
      .catch(() => {
        if (!response.headersSent)
          send(response, 500, {
            error: "Care could not complete the request.",
          });
      });
  });
  server.on("close", releaseLock);
  server.on("error", releaseLock);
  const send = (res, status, body, headers = {}) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...headers,
    });
    res.end(JSON.stringify(body));
  };
  const body = async (req) => {
    if (!(req.headers["content-type"] || "").startsWith("application/json"))
      fail(415, "Use a JSON request.");
    let bytes = 0,
      chunks = [];
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 16384) fail(413, "Request too large.");
      chunks.push(chunk);
    }
    try {
      const data = JSON.parse(Buffer.concat(chunks).toString());
      if (!data || Array.isArray(data) || typeof data !== "object")
        fail(400, "Use a JSON object.");
      return data;
    } catch (e) {
      if (e instanceof CareError) throw e;
      fail(400, "Invalid JSON.");
    }
  };
  async function handle(req, res) {
    try {
      const address = server.address();
      const expected = `127.0.0.1:${typeof address === "object" ? address.port : port}`;
      if (req.headers.host !== expected)
        fail(403, "Use the local Care address.");
      const origin = `http://${expected}`;
      if (req.headers.origin && req.headers.origin !== origin)
        fail(403, "Cross-origin access is not allowed.");
      if (
        req.headers["sec-fetch-site"] &&
        !["same-origin", "none"].includes(req.headers["sec-fetch-site"])
      )
        fail(403, "Cross-site access is not allowed.");
      const url = new URL(req.url, origin),
        path = url.pathname;
      if (!path.startsWith("/api/")) {
        if (!frontend) fail(404, "Not found.");
        if (vite) {
          vite.middlewares(req, res);
          return;
        }
        // Same-origin static production serving; never use this path to serve the vault.
        const relative = path === "/" ? "index.html" : path.slice(1);
        const file = resolve(root, "dist-care", relative),
          dist = resolve(root, "dist-care");
        if (!file.startsWith(`${dist}/`) || !existsSync(file))
          fail(404, "Not found. Build with npm run care:build.");
        const mime = file.endsWith(".html")
          ? "text/html"
          : file.endsWith(".js")
            ? "text/javascript"
            : file.endsWith(".css")
              ? "text/css"
              : file.endsWith(".woff2")
                ? "font/woff2"
                : "application/octet-stream";
        res.writeHead(200, {
          "Content-Type": mime,
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'",
        });
        res.end(readFileSync(file));
        return;
      }
      if (req.method === "GET" && path === "/api/health")
        return send(res, 200, {
          product: "Vaultline Care",
          mode: "synthetic-demo",
          productionEnabled: false,
        });
      if (req.method === "GET" && path === "/api/demo-identities")
        return send(
          res,
          200,
          Object.values(identities).map(({ id, name }) => ({ id, name })),
        );
      if (req.method === "POST" && path === "/api/session") {
        if (req.headers.origin !== origin)
          fail(403, "Local browser origin required.");
        const data = await body(req);
        if (
          Object.keys(data).some((k) => k !== "identity") ||
          !Object.hasOwn(identities, data.identity)
        )
          fail(400, "Choose a synthetic demo identity.");
        const old = (req.headers.cookie || "").match(
          /(?:^|;\s*)care_session=([a-f0-9]{64})(?:;|$)/,
        )?.[1];
        if (old) sessions.delete(old);
        const sid = token(),
          session = {
            principal: identities[data.identity],
            csrf: token(),
            expires: Date.now() + 4 * 60 * 60 * 1000,
          };
        sessions.set(sid, session);
        return send(
          res,
          200,
          { principal: session.principal, csrf: session.csrf },
          {
            "Set-Cookie": `care_session=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=14400`,
          },
        );
      }
      const sid = (req.headers.cookie || "").match(
        /(?:^|;\s*)care_session=([a-f0-9]{64})(?:;|$)/,
      )?.[1];
      const session = sessions.get(sid);
      if (!session || session.expires < Date.now())
        fail(401, "Choose a demo identity to continue.");
      const principal = session.principal;
      if (req.method === "GET" && path === "/api/session")
        return send(res, 200, { principal, csrf: session.csrf });
      if (
        req.method !== "GET" &&
        (req.headers.origin !== origin ||
          req.headers["x-care-csrf"] !== session.csrf)
      )
        fail(403, "Request authorization failed.");
      if (req.method === "GET" && path === "/api/workspace")
        return send(res, 200, app.workspace(principal));
      const doc = path.match(
        /^\/api\/deployments\/([^/]+)\/documents\/([^/]+)$/,
      );
      if (req.method === "GET" && doc)
        return send(res, 200, app.document(principal, doc[1], doc[2]));
      if (req.method === "POST" && path === "/api/cases") {
        const data = await body(req);
        exact(data, ["deploymentId", "message"]);
        const c = app.create(principal, data.deploymentId, data.message);
        return send(res, 201, await app.diagnose(principal, c.id));
      }
      const match = path.match(/^\/api\/cases\/([^/]+)(?:\/(.*))?$/);
      if (!match) fail(404, "Not found.");
      const [, id, route] = match;
      app.store.case(principal, id); // before operation dispatch or body interpretation
      if (req.method === "GET" && !route)
        return send(res, 200, app.view(principal, id));
      const ev = route?.match(/^evidence\/([^/]+)$/);
      if (req.method === "GET" && ev) {
        const e = app.view(principal, id).evidence.find((e) => e.id === ev[1]);
        if (!e) fail(404, "Evidence not found.");
        return send(res, 200, e);
      }
      if (req.method !== "POST") fail(405, "Method not supported.");
      const data = await body(req);
      if (route === "messages") {
        exact(data, ["message"]);
        return send(res, 200, await app.message(principal, id, data.message));
      }
      if (route === "diagnose") {
        exact(data, []);
        return send(res, 200, await app.diagnose(principal, id));
      }
      if (route === "diagnostics") {
        exact(data, ["operation", "args"]);
        await app.diagnostic(principal, id, data.operation, data.args);
        return send(res, 200, app.view(principal, id));
      }
      if (route === "proposals") {
        exact(data, ["action"]);
        app.propose(principal, id, data.action);
        return send(res, 200, app.view(principal, id));
      }
      if (route === "handoff") {
        exact(data, []);
        return send(res, 200, app.handoff(principal, id));
      }
      if (route === "resolve") {
        exact(data, []);
        return send(res, 200, app.resolve(principal, id));
      }
      const action = route?.match(/^proposals\/([^/]+)\/(approve|execute)$/);
      if (action) {
        if (action[2] === "approve") {
          exact(data, ["fingerprint"]);
          return send(
            res,
            200,
            app.approve(principal, id, action[1], data.fingerprint),
          );
        }
        exact(data, []);
        return send(res, 200, await app.execute(principal, id, action[1]));
      }
      fail(404, "Operation not supported.");
    } catch (error) {
      send(res, error.status || 500, {
        error: error.status
          ? error.message
          : "Care could not complete the request. No unsupported action was authorized.",
      });
    }
  }
  return {
    server,
    app,
    close: async () => {
      await vite?.close();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
function exact(data, keys) {
  if (
    Object.keys(data).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(data, k))
  )
    fail(400, "Unexpected or missing request fields.");
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const { server, close } = await createCareServer();
  const port = Number(process.env.CARE_PORT || 4317);
  server.listen(port, "127.0.0.1", () =>
    process.stdout.write(
      `Vaultline Care · synthetic demo · http://127.0.0.1:${port}\n`,
    ),
  );
  const shutdown = () => {
    void close().then(() => process.exit(0));
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
