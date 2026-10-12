// Vaultline Care addition. Real HTTP tests exercise session-derived tenant scope and CSRF.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCareServer } from "./server.mjs";
import { request as httpRequest } from "node:http";

async function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), "care-http-"));
  const instance = await createCareServer({
    directory,
    port: 0,
    frontend: false,
  });
  await new Promise((resolve) =>
    instance.server.listen(0, "127.0.0.1", resolve),
  );
  const base = `http://127.0.0.1:${instance.server.address().port}`;
  t.after(async () => {
    await instance.close();
    rmSync(directory, { recursive: true, force: true });
  });
  async function login(identity) {
    const response = await fetch(`${base}/api/session`, {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({ identity }),
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    return {
      cookie: response.headers.get("set-cookie").split(";")[0],
      csrf: data.csrf,
    };
  }
  async function call(session, path, data, extra = {}) {
    const response = await fetch(`${base}${path}`, {
      method: data ? "POST" : "GET",
      headers: {
        Cookie: session?.cookie || "",
        ...(data
          ? {
              Origin: base,
              "Content-Type": "application/json",
              "X-Care-CSRF": session?.csrf || "",
            }
          : {}),
        ...extra,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return { status: response.status, body: await response.json() };
  }
  return { ...instance, base, login, call };
}

test("HTTP end-to-end: open case, inspect citations, approve, execute, verify, persist and handoff", async (t) => {
  const { login, call } = await setup(t),
    client = await login("demo-north");
  let result = await call(client, "/api/cases", {
    deploymentId: "north-edit",
    message: "My transfer stalled.",
  });
  assert.equal(result.status, 201);
  const c = result.body,
    p = c.proposals[0],
    prefix = `/api/cases/${c.id}`;
  assert.equal(c.status, "awaiting_approval");
  assert.equal(
    (await call(client, `${prefix}/evidence/${c.evidence[0].id}`)).status,
    200,
  );
  assert.equal(
    (
      await call(
        client,
        "/api/deployments/north-edit/documents/north-relay-guide",
      )
    ).status,
    200,
  );
  assert.equal(
    (await call(client, `${prefix}/proposals/${p.id}/execute`, {})).status,
    403,
  );
  assert.equal(
    (
      await call(client, `${prefix}/proposals/${p.id}/approve`, {
        fingerprint: p.fingerprint,
      })
    ).status,
    200,
  );
  const runs = await Promise.all([
    call(client, `${prefix}/proposals/${p.id}/execute`, {}),
    call(client, `${prefix}/proposals/${p.id}/execute`, {}),
  ]);
  assert.equal(runs.filter((r) => r.status === 200).length, 1);
  result = await call(client, prefix);
  assert.equal(result.body.proposals[0].verification.passed, true);
  assert.equal(result.body.attemptedActions.length, 1);
  assert.match(result.body.messages.at(-1).text, /43%/);
  const handoff = await call(client, `${prefix}/handoff`, {});
  assert.equal(handoff.body.case.messages.length, 3);
  assert.ok(handoff.body.case.audit.some((e) => e.type === "action.approved"));
  assert.ok(handoff.body.case.audit.some((e) => e.type === "action.verified"));
  assert.equal(handoff.body.auditIntegrity, true);
  const operator = await login("demo-jake");
  assert.ok(
    (await call(operator, "/api/workspace")).body.cases.some(
      (row) => row.id === c.id,
    ),
  );
});

test("HTTP cannot select another tenant through body, query, header, case/evidence IDs or docs", async (t) => {
  const { login, call } = await setup(t),
    a = await login("demo-north"),
    b = await login("demo-south");
  const c = (
    await call(a, "/api/cases", {
      deploymentId: "north-edit",
      message: "My transfer stalled.",
    })
  ).body;
  for (const path of [
    `/api/cases/${c.id}`,
    `/api/cases/${c.id}/evidence/${c.evidence[0].id}`,
    "/api/deployments/north-edit/documents/north-relay-guide",
  ]) {
    assert.equal(
      (
        await call(b, `${path}?tenantId=north`, undefined, {
          "X-Tenant-ID": "north",
        })
      ).status,
      404,
    );
  }
  assert.equal(
    (
      await call(b, "/api/cases", {
        deploymentId: "north-edit",
        message: "test",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await call(b, "/api/cases", {
        deploymentId: "south-edit",
        message: "test",
        tenantId: "north",
      })
    ).status,
    400,
  );
  assert.equal((await call(b, `/api/cases/${c.id}/handoff`, {})).status, 404);
  assert.equal(
    (
      await call(
        b,
        `/api/cases/${c.id}/proposals/${c.proposals[0].id}/approve`,
        { fingerprint: c.proposals[0].fingerprint },
      )
    ).status,
    404,
  );
  const workspace = (await call(b, "/api/workspace?deploymentId=north-edit"))
    .body;
  assert.deepEqual(
    workspace.profiles.map((p) => p.id),
    ["south-edit"],
  );
  assert.equal(workspace.cases.length, 0);
});

test("HTTP sessions are required; origin, host, CSRF, JSON and custom actions fail closed", async (t) => {
  const { login, call, base } = await setup(t);
  assert.equal((await call(null, "/api/workspace")).status, 401);
  const client = await login("demo-north");
  assert.equal(
    (
      await call(
        client,
        "/api/cases",
        { deploymentId: "north-edit", message: "test" },
        { Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        client,
        "/api/cases",
        { deploymentId: "north-edit", message: "test" },
        { "X-Care-CSRF": "wrong" },
      )
    ).status,
    403,
  );
  // Node fetch normalizes Host to the URL host; use a raw request to test rebinding.
  const badHostStatus = await new Promise((resolve, reject) => {
    const req = httpRequest(
      `${base}/api/workspace`,
      { headers: { Host: "evil.example", Cookie: client.cookie } },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on("error", reject);
    req.end();
  });
  assert.equal(badHostStatus, 403);
  const malformed = await fetch(`${base}/api/session`, {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: "broken",
  });
  assert.equal(malformed.status, 400);
  const c = (
    await call(client, "/api/cases", {
      deploymentId: "north-edit",
      message: "test",
    })
  ).body;
  assert.equal(
    (
      await call(client, `/api/cases/${c.id}/proposals`, {
        action: "demo.reconnect_destination",
        command: "rm -rf /",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(client, `/api/cases/${c.id}/diagnostics`, {
        operation: "shell",
        args: { command: "anything" },
      })
    ).status,
    400,
  );
});

test("unresolved South case is visible to Jake with limitations and full history", async (t) => {
  const { login, call } = await setup(t);
  const client = await login("demo-south");
  const c = (
    await call(client, "/api/cases", {
      deploymentId: "south-edit",
      message: "My transfer stalled.",
    })
  ).body;
  assert.equal(c.status, "needs_jake");
  assert.equal(c.proposals.length, 0);
  await call(client, `/api/cases/${c.id}/messages`, {
    message: "Our delivery is due today.",
  });
  await call(client, `/api/cases/${c.id}/handoff`, {});
  const operator = await login("demo-jake");
  const result = (await call(operator, `/api/cases/${c.id}`)).body;
  assert.ok(result.handoff);
  assert.ok(result.messages.some((m) => m.text.includes("due today")));
  assert.ok(result.evidence.some((e) => !e.available));
  assert.equal(
    (await call(client, `/api/cases/${c.id}/resolve`, {})).status,
    409,
  );
});

test("one process owns a vault; a second server cannot race persisted approvals", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "care-lock-"));
  const instance = await createCareServer({ directory, frontend: false });
  await new Promise((resolve) =>
    instance.server.listen(0, "127.0.0.1", resolve),
  );
  t.after(async () => {
    await instance.close();
    rmSync(directory, { recursive: true, force: true });
  });
  await assert.rejects(
    createCareServer({ directory, frontend: false }),
    /already locked/,
  );
});
