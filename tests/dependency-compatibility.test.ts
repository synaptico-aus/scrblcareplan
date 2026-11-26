import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, signupSchema, updateUserProfileSchema } from "../shared/schema";
import { clinicalContentSchema } from "../shared/care-plan-document";

test("Zod, Drizzle schemas and form resolvers retain validation behavior", async () => {
  const valid = { email: "person@example.invalid", password: "test-password" };
  assert.deepEqual(loginSchema.parse(valid), valid);
  assert.equal(signupSchema.safeParse(valid).success, false);
  assert.equal(updateUserProfileSchema.safeParse({}).success, false);
  const resolver = zodResolver(loginSchema);
  const options = { fields: {}, shouldUseNativeValidation: false };
  assert.deepEqual((await resolver(valid, undefined, options)).errors, {});
  const invalid = await resolver({ email: "invalid", password: "x" }, undefined, options);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.password);
  const sparse = clinicalContentSchema.parse({});
  assert.equal(sparse.medical.allergies, null);
  assert.deepEqual(clinicalContentSchema.parse(sparse), sparse, "Defaults must survive document round trips");
  assert.throws(() => clinicalContentSchema.parse({ evidence: { allergy: "not an array" } }));
});

test("Google HTTP clients can still load CommonJS UUID v4 after security overrides", () => {
  const require = createRequire(import.meta.url);
  for (const parent of ["gaxios", "teeny-request"]) {
    const parentRequire = createRequire(require.resolve(parent));
    const uuid = parentRequire("uuid");
    assert.ok(uuid.validate(uuid.v4()));
    assert.ok(require(parent));
  }
});

test("Express parsing, proxy trust, upload limits and rate limiting remain functional", async () => {
  const app = express();
  app.set("trust proxy", "loopback");
  app.use(express.json({ limit: "1kb" }));
  app.post("/json", (req, res) => res.json({ body: req.body, ip: req.ip }));
  app.post("/upload", multer({ limits: { fileSize: 16 } }).single("file"),
    (req, res) => res.json({ size: req.file?.size }));
  app.get("/limited", rateLimit({ windowMs: 60_000, limit: 1 }), (_req, res) => res.sendStatus(200));
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error instanceof multer.MulterError ? 413 : error.status || 500).json({ error: error.code || error.type });
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(`${base}/json`, { method: "POST", headers: {
      "Content-Type": "application/json", "X-Forwarded-For": "192.0.2.1",
    }, body: JSON.stringify({ ok: true }) });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { body: { ok: true }, ip: "192.0.2.1" });
    assert.equal((await fetch(`${base}/json`, { method: "POST", headers: {
      "Content-Type": "application/json",
    }, body: JSON.stringify({ data: "x".repeat(2048) }) })).status, 413);
    for (const [size, expected] of [[4, 200], [32, 413]]) {
      const form = new FormData();
      form.append("file", new Blob(["x".repeat(size)]), "test.txt");
      const uploaded = await fetch(`${base}/upload`, { method: "POST", body: form });
      assert.equal(uploaded.status, expected);
      if (expected === 200) assert.deepEqual(await uploaded.json(), { size });
    }
    assert.equal((await fetch(`${base}/limited`)).status, 200);
    assert.equal((await fetch(`${base}/limited`)).status, 429);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
